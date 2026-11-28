import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth/middleware";
import { logInfo } from "@/lib/observability/logger";
import { LOG_CATEGORIES, LOG_LEVELS } from "@/lib/observability/logger";

/**
 * Observability dashboard API.
 *
 * GET    /api/admin/observability?level=&category=&route=&q=&from=&to=&limit=&cursor=
 *        Counts by level and category, error rate, per-route latency percentiles,
 *        top failing routes and the matching event feed.
 * DELETE /api/admin/observability?purge=30d
 *        Retention: removes events older than the given window.
 *
 * Super-admin only, matching the existing /api/admin/audit gate.
 */

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function parseWindowDays(raw: string | null): number | null {
  if (!raw) return null;
  const match = /^(\d+)\s*d$/i.exec(raw.trim());
  if (!match) return null;
  const days = parseInt(match[1], 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  return days;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export async function GET(request: Request) {
  const gate = await requireCapability(request, "manage_super_admins");
  if (!gate.ok) return gate.response!;

  const url = new URL(request.url);
  const params = url.searchParams;

  const level = params.get("level")?.trim() || "";
  const category = params.get("category")?.trim() || "";
  const route = params.get("route")?.trim() || "";
  const search = (params.get("q") || "").trim();
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const cursor = params.get("cursor")?.trim() || "";

  const where: Record<string, unknown> = {};
  if ((LOG_LEVELS as readonly string[]).includes(level)) where.level = level;
  if ((LOG_CATEGORIES as readonly string[]).includes(category)) where.category = category;
  if (route) where.route = { contains: route };
  if (search) {
    where.OR = [
      { event: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
      { route: { contains: search, mode: "insensitive" } },
      { requestId: search },
    ];
  }

  const fromParam = params.get("from");
  const toParam = params.get("to");
  const tsFilter: Record<string, Date> = {};
  if (fromParam) {
    const from = new Date(fromParam);
    if (!Number.isNaN(from.getTime())) tsFilter.gte = from;
  }
  if (toParam) {
    const to = new Date(toParam);
    if (!Number.isNaN(to.getTime())) tsFilter.lte = to;
  }
  if (Object.keys(tsFilter).length > 0) where.ts = tsFilter;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [entries, total, byLevel, byCategory, windowRows, failingRoutes] = await Promise.all([
    prisma.logEvent.findMany({
      where,
      orderBy: { ts: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.logEvent.count({ where }),
    prisma.logEvent.groupBy({ by: ["level"], where, _count: { _all: true } }),
    prisma.logEvent.groupBy({ by: ["category"], where, _count: { _all: true } }),
    // Last 24h of http events drives the error rate and latency percentiles
    prisma.logEvent.findMany({
      where: { category: "http", ts: { gte: since24h } },
      select: { route: true, method: true, status: true, durationMs: true },
      take: 5000,
      orderBy: { ts: "desc" },
    }),
    prisma.logEvent.groupBy({
      by: ["route"],
      where: { level: { in: ["error", "fatal"] }, ts: { gte: since24h } },
      _count: { _all: true },
      orderBy: { _count: { route: "desc" } },
      take: 10,
    }),
  ]);

  const completed = windowRows.filter((r) => typeof r.status === "number");
  const serverErrors = completed.filter((r) => (r.status ?? 0) >= 500);
  const clientErrors = completed.filter((r) => (r.status ?? 0) >= 400 && (r.status ?? 0) < 500);

  const byRoute = new Map<string, { route: string; method: string; count: number; errors: number; durations: number[] }>();
  for (const row of completed) {
    const key = `${row.method ?? "GET"} ${row.route ?? "unknown"}`;
    let bucket = byRoute.get(key);
    if (!bucket) {
      bucket = { route: row.route ?? "unknown", method: row.method ?? "GET", count: 0, errors: 0, durations: [] };
      byRoute.set(key, bucket);
    }
    bucket.count += 1;
    if ((row.status ?? 0) >= 500) bucket.errors += 1;
    if (typeof row.durationMs === "number") bucket.durations.push(row.durationMs);
  }

  const routes = [...byRoute.values()]
    .map((b) => {
      const sorted = b.durations.sort((a, x) => a - x);
      return {
        route: b.route,
        method: b.method,
        count: b.count,
        errors: b.errors,
        errorRate: b.count ? b.errors / b.count : 0,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        max: sorted.length ? sorted[sorted.length - 1] : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  logInfo("observability.read", "Observability dashboard queried", {
    category: "system",
    actorEmail: gate.user?.email ?? null,
    route: "/api/admin/observability",
    context: { total, limit },
  });

  return NextResponse.json({
    success: true,
    entries: entries.map((e) => ({
      ...e,
      context: e.context ? safeParse(e.context) : null,
    })),
    nextCursor: entries.length === limit ? entries[entries.length - 1]?.id ?? null : null,
    total,
    levels: Object.fromEntries(byLevel.map((r) => [r.level, r._count._all])),
    categories: Object.fromEntries(byCategory.map((r) => [r.category, r._count._all])),
    window: {
      hours: 24,
      requests: completed.length,
      serverErrors: serverErrors.length,
      clientErrors: clientErrors.length,
      errorRate: completed.length ? serverErrors.length / completed.length : 0,
      p50: percentile(completed.map((r) => r.durationMs ?? 0).sort((a, b) => a - b), 50),
      p95: percentile(completed.map((r) => r.durationMs ?? 0).sort((a, b) => a - b), 95),
    },
    routes,
    failingRoutes: failingRoutes.map((r) => ({ route: r.route ?? "unknown", count: r._count._all })),
  });
}

export async function DELETE(request: Request) {
  const gate = await requireCapability(request, "manage_super_admins");
  if (!gate.ok) return gate.response!;

  const url = new URL(request.url);
  const days = parseWindowDays(url.searchParams.get("purge"));
  if (!days) {
    return NextResponse.json(
      { success: false, error: "Provide a retention window, e.g. ?purge=30d." },
      { status: 400 }
    );
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.logEvent.deleteMany({ where: { ts: { lt: cutoff } } });

  logInfo("observability.purge", `Purged ${count} log events older than ${days} days`, {
    category: "system",
    actorEmail: gate.user?.email ?? null,
    route: "/api/admin/observability",
    context: { days, count, cutoff: cutoff.toISOString() },
  });

  return NextResponse.json({ success: true, deleted: count, olderThanDays: days });
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
