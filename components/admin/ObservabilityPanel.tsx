"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/app/admin/admin.module.css";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Gauge,
} from "lucide-react";

/**
 * Centralized logging & observability panel.
 *
 * Reads /api/admin/observability (super admin only) and shows:
 * - health of the last 24h: request volume, error rate, p50/p95 latency
 * - breakdown by level and category
 * - per-route latency table and the routes failing most
 * - the live event feed with the JSON context behind each event
 */

interface LogEntry {
  id: string;
  ts: string;
  level: string;
  category: string;
  event: string;
  message: string | null;
  requestId: string | null;
  route: string | null;
  method: string | null;
  status: number | null;
  durationMs: number | null;
  actorEmail: string | null;
  ip: string | null;
  entityId: string | null;
  errorName: string | null;
  errorMessage: string | null;
  stack: string | null;
  context: unknown;
}

interface RouteStat {
  route: string;
  method: string;
  count: number;
  errors: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

interface WindowStats {
  hours: number;
  requests: number;
  serverErrors: number;
  clientErrors: number;
  errorRate: number;
  p50: number;
  p95: number;
}

interface ObservabilityData {
  entries: LogEntry[];
  total: number;
  levels: Record<string, number>;
  categories: Record<string, number>;
  window: WindowStats;
  routes: RouteStat[];
  failingRoutes: { route: string; count: number }[];
}

const LEVELS = ["debug", "info", "warn", "error", "fatal"];
const CATEGORIES = ["http", "auth", "db", "mail", "storage", "panel", "cubicon", "security", "system"];

const LEVEL_COLOR: Record<string, string> = {
  debug: "#868e96",
  info: "#1c7ed6",
  warn: "#e8590c",
  error: "#c92a2a",
  fatal: "#862e9c",
};

interface Props {
  role: string;
}

export default function ObservabilityPanel({ role }: Props) {
  const isSuper = role === "super_admin";

  const [data, setData] = useState<ObservabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    if (!isSuper) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (level) params.set("level", level);
      if (category) params.set("category", category);
      if (search.trim()) params.set("q", search.trim());
      if (routeFilter) params.set("route", routeFilter);
      const res = await fetch(`/api/admin/observability?${params.toString()}`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error || "Could not load log events.");
        return;
      }
      setData(body as ObservabilityData);
    } catch {
      setError("Could not reach the observability API.");
    } finally {
      setLoading(false);
    }
  }, [isSuper, level, category, search, routeFilter]);

  // Deferred one tick so the first fetch never sets state during the render commit.
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const exportCsv = () => {
    if (!data) return;
    const header = [
      "ts",
      "level",
      "category",
      "event",
      "message",
      "requestId",
      "route",
      "method",
      "status",
      "durationMs",
      "actorEmail",
      "ip",
      "errorMessage",
    ];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = data.entries.map((e) =>
      [
        e.ts,
        e.level,
        e.category,
        e.event,
        e.message,
        e.requestId,
        e.route,
        e.method,
        e.status,
        e.durationMs,
        e.actorEmail,
        e.ip,
        e.errorMessage,
      ]
        .map(escape)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buyfacts-log-events-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const purge = async () => {
    if (!window.confirm("Delete log events older than 30 days? This cannot be undone.")) return;
    const res = await fetch("/api/admin/observability?purge=30d", { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error || "Purge failed.");
      return;
    }
    load();
  };

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of LEVELS) counts[l] = data?.levels[l] ?? 0;
    return counts;
  }, [data]);

  if (!isSuper) {
    return (
      <section className={styles.securityCard}>
        <h3 className={styles.securityCardTitle}>
          <Activity size={16} /> Observability
        </h3>
        <p className={styles.securityCardHint}>
          The operational log is restricted to super admins. Ask a super admin if you need access to these events.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Health of the last 24 hours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
        <StatCard
          label={`Requests (${data?.window.hours ?? 24}h)`}
          value={data ? data.window.requests.toLocaleString() : "—"}
          icon={<Activity size={14} />}
        />
        <StatCard
          label="Error rate"
          value={data ? `${(data.window.errorRate * 100).toFixed(2)}%` : "—"}
          tone={data && data.window.errorRate > 0.02 ? "bad" : "good"}
          hint={data ? `${data.window.serverErrors} server · ${data.window.clientErrors} client` : undefined}
          icon={<AlertTriangle size={14} />}
        />
        <StatCard
          label="p50 / p95 latency"
          value={data ? `${data.window.p50} / ${data.window.p95} ms` : "—"}
          icon={<Gauge size={14} />}
        />
        <StatCard
          label="Events stored"
          value={data ? data.total.toLocaleString() : "—"}
          hint={data ? `${levelCounts.error + levelCounts.fatal} errors · ${levelCounts.warn} warnings` : undefined}
          icon={<Download size={14} />}
        />
      </div>

      {/* Level + category breakdown */}
      <section className={styles.securityCard}>
        <h3 className={styles.securityCardTitle}>
          <Activity size={16} /> Volume by level and category
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem" }}>
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(level === l ? "" : l)}
              className={level === l ? styles.submitBtn : styles.cancelBtn}
              style={{ borderLeft: `3px solid ${LEVEL_COLOR[l]}`, textTransform: "uppercase", fontSize: "0.7rem" }}
            >
              {l} · {levelCounts[l]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? "" : c)}
              className={category === c ? styles.submitBtn : styles.cancelBtn}
              style={{ fontSize: "0.72rem" }}
            >
              {c} · {data?.categories[c] ?? 0}
            </button>
          ))}
        </div>
      </section>

      {/* Per-route latency */}
      <section className={styles.securityCard}>
        <h3 className={styles.securityCardTitle}>
          <Gauge size={16} /> Route latency (last 24h)
        </h3>
        {data && data.failingRoutes.length > 0 && (
          <p className={styles.securityCardHint} style={{ color: "#c92a2a" }}>
            Failing most:{" "}
            {data.failingRoutes.map((f) => `${f.route} (${f.count})`).join(", ")}
          </p>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.4rem 0.5rem" }}>Route</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Requests</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Errors</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>p50</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>p95</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>p99</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Max</th>
              </tr>
            </thead>
            <tbody>
              {(data?.routes ?? []).map((r) => (
                <tr
                  key={`${r.method} ${r.route}`}
                  style={{ borderTop: "1px solid #f1f3f5", cursor: "pointer" }}
                  onClick={() => setRouteFilter(routeFilter === r.route ? "" : r.route)}
                  title="Click to filter the feed by this route"
                >
                  <td style={{ padding: "0.45rem 0.5rem" }}>
                    <strong>{r.method}</strong> {r.route}
                  </td>
                  <td style={{ padding: "0.45rem 0.5rem" }}>{r.count}</td>
                  <td style={{ padding: "0.45rem 0.5rem", color: r.errors > 0 ? "#c92a2a" : undefined }}>
                    {r.errors} {r.count > 0 && `(${(r.errorRate * 100).toFixed(1)}%)`}
                  </td>
                  <td style={{ padding: "0.45rem 0.5rem" }}>{r.p50} ms</td>
                  <td style={{ padding: "0.45rem 0.5rem" }}>{r.p95} ms</td>
                  <td style={{ padding: "0.45rem 0.5rem" }}>{r.p99} ms</td>
                  <td style={{ padding: "0.45rem 0.5rem" }}>{r.max} ms</td>
                </tr>
              ))}
              {data && data.routes.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "0.6rem 0.5rem", color: "var(--text-muted)" }}>
                    No HTTP events recorded yet. Requests appear here as they are served.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Event feed */}
      <section className={styles.securityCard}>
        <h3 className={styles.securityCardTitle}>
          <Search size={16} /> Event feed
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.6rem" }}>
          <input
            className={styles.formInput}
            style={{ flex: "1 1 220px", margin: 0 }}
            placeholder="Search event, message, route or request id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {routeFilter && (
            <button type="button" className={styles.cancelBtn} onClick={() => setRouteFilter("")}>
              route: {routeFilter} ✕
            </button>
          )}
          <label style={{ fontSize: "0.78rem", display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh 15s
          </label>
          <button type="button" className={styles.cancelBtn} onClick={load}>
            <RefreshCw size={12} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className={styles.cancelBtn} onClick={exportCsv} disabled={!data || data.entries.length === 0}>
            <Download size={12} /> CSV
          </button>
          <button type="button" className={styles.cancelBtn} onClick={purge} title="Retention: remove events older than 30 days">
            <Trash2 size={12} /> Purge &gt;30d
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {!error && data && data.entries.length === 0 && (
          <p className={styles.securityCardHint}>No events match these filters.</p>
        )}

        <div>
          {(data?.entries ?? []).map((entry) => {
            const isOpen = expanded === entry.id;
            return (
              <div key={entry.id} className={styles.auditRow} style={{ alignItems: "flex-start" }}>
                <span
                  className={styles.auditMeta}
                  style={{ color: LEVEL_COLOR[entry.level] || undefined, fontWeight: 600, minWidth: "4.5rem" }}
                >
                  {entry.level.toUpperCase()}
                </span>
                <span style={{ flex: 1 }}>
                  <span className={styles.auditAction}>{entry.event}</span>
                  <span className={styles.auditMeta}> · {entry.category}</span>
                  <br />
                  <span className={styles.auditMeta}>
                    {new Date(entry.ts).toLocaleString()}
                    {entry.method && entry.route ? ` · ${entry.method} ${entry.route}` : ""}
                    {entry.status ? ` · ${entry.status}` : ""}
                    {entry.durationMs != null ? ` · ${entry.durationMs}ms` : ""}
                    {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                    {entry.ip ? ` · ${entry.ip}` : ""}
                  </span>
                  {entry.message && (
                    <>
                      <br />
                      <span style={{ fontSize: "0.8rem" }}>{entry.message}</span>
                    </>
                  )}
                  {isOpen && (
                    <pre
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.5rem",
                        background: "#f8f9fa",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {JSON.stringify(
                        {
                          requestId: entry.requestId,
                          errorName: entry.errorName,
                          errorMessage: entry.errorMessage,
                          entityId: entry.entityId,
                          stack: entry.stack,
                          context: entry.context,
                        },
                        null,
                        2
                      )}
                    </pre>
                  )}
                </span>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  aria-label={isOpen ? "Hide details" : "Show details"}
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
  icon?: React.ReactNode;
}) {
  return (
    <div className={styles.securityCard} style={{ margin: 0 }}>
      <p className={styles.securityCardHint} style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
        {icon} {label}
      </p>
      <p
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          margin: "0.15rem 0",
          color: tone === "bad" ? "#c92a2a" : tone === "good" ? "#2b8a3e" : undefined,
        }}
      >
        {value}
      </p>
      {hint && <p className={styles.securityCardHint}>{hint}</p>}
    </div>
  );
}
