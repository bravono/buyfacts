import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth/middleware";
import { normalizeRole } from "@/lib/auth/roles";
import { countActiveSuperAdmins } from "@/lib/auth/audit";

/**
 * Security dashboard: recent audit activity and the state of admin accounts.
 * Super admin only — this is the "who did what" view.
 */
export async function GET(request: Request) {
  const gate = await requireCapability(request, "manage_super_admins");
  if (!gate.ok) return gate.response!;

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const actionFilter = url.searchParams.get("action") || "";
  const actorFilter = (url.searchParams.get("actor") || "").trim().toLowerCase();
  const onlyDestructive = url.searchParams.get("destructive") === "true";

  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = { contains: actionFilter };
  if (actorFilter) where.actorEmail = { contains: actorFilter };
  if (onlyDestructive) where.action = { in: ["record.delete", "user.role_change", "user.deactivate"] };

  const [entries, total, failures, accounts] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { status: "failure", createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
      orderBy: { role: "asc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    entries: entries.map((e) => ({
      ...e,
      metadata: e.metadata ? safeParse(e.metadata) : null,
    })),
    total,
    failedLoginsLast24h: failures,
    activeSuperAdmins: await countActiveSuperAdmins(),
    accounts: accounts.map((a) => ({ ...a, role: normalizeRole(a.role) })),
  });
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
