import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAY = 86400000;
const now = new Date();
const since = new Date(now.getTime() - 31 * DAY);

function iso(d: Date | null | undefined) {
  return d ? d.toISOString().replace(".000Z", "Z") : "—";
}

async function main() {
  console.log("WINDOW", iso(since), "->", iso(now));

  const total = await prisma.auditLog.count();
  const inWindow = await prisma.auditLog.count({ where: { createdAt: { gte: since } } });
  const oldest = await prisma.auditLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const newest = await prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  console.log("TOTAL_ROWS", total, "IN_WINDOW", inWindow);
  console.log("RANGE", iso(oldest?.createdAt), "->", iso(newest?.createdAt));

  const byAction = await prisma.auditLog.groupBy({
    by: ["action", "status"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { action: "desc" } },
  });
  console.log("\n== BY ACTION/STATUS ==");
  for (const r of byAction) console.log(`${r.action} [${r.status}] ${r._count._all}`);

  // Failed logins
  const failed = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      action: { in: ["auth.login", "auth.login.2fa"] },
      status: "failure",
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n== FAILED LOGINS (" + failed.length + ") ==");
  for (const f of failed) {
    let reason = "";
    try { reason = JSON.parse(f.metadata || "{}").reason ?? ""; } catch {}
    console.log([iso(f.createdAt), f.action, f.actorEmail ?? "(none)", f.actorRole ?? "-", "ip=" + (f.ip ?? "-"), reason].join(" | "));
  }

  const failByEmail: Record<string, number> = {};
  const failByIp: Record<string, number> = {};
  for (const f of failed) {
    const k = f.actorEmail ?? "(none)";
    failByEmail[k] = (failByEmail[k] ?? 0) + 1;
    const i = f.ip ?? "(none)";
    failByIp[i] = (failByIp[i] ?? 0) + 1;
  }
  console.log("FAILS_BY_EMAIL", JSON.stringify(failByEmail));
  console.log("FAILS_BY_IP", JSON.stringify(failByIp));

  // Successful logins
  const success = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      action: { in: ["auth.login", "auth.login.2fa"] },
      status: "success",
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n== SUCCESSFUL LOGINS (" + success.length + ") ==");
  for (const s of success) {
    console.log([iso(s.createdAt), s.action, s.actorEmail ?? "(none)", s.actorRole ?? "-", "ip=" + (s.ip ?? "-")].join(" | "));
  }

  // Everything except plain logins
  const rest = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      NOT: { action: { in: ["auth.login", "auth.login.2fa"] } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n== OTHER EVENTS (" + rest.length + ") ==");
  for (const r of rest) {
    console.log([iso(r.createdAt), r.action, r.status, r.actorEmail ?? "(none)", r.actorRole ?? "-", "target=" + (r.target ?? "-"), "targetId=" + (r.targetId ?? "-"), "ip=" + (r.ip ?? "-"), (r.metadata ?? "").slice(0, 300)].join(" | "));
  }

  // Users
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  console.log("\n== USERS (" + users.length + ") ==");
  for (const u of users) {
    console.log([u.id, u.email, u.role, u.isActive ? "active" : "INACTIVE", u.passwordHash ? "pw" : "NO_PASSWORD", u.totpEnabledAt ? "2fa" : "no-2fa", "lastLogin=" + iso(u.lastLoginAt), "failed=" + u.failedLoginAttempts, "lockedUntil=" + iso(u.lockedUntil)].join(" | "));
  }
  const activeSupers = users.filter((u) => u.role === "super_admin" && u.isActive);
  console.log("ACTIVE_SUPER_ADMINS", activeSupers.length, activeSupers.map((u) => u.email).join(","));
}

main()
  .catch((e) => {
    console.error("QUERY_FAILED", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
