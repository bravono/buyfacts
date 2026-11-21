import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const q = async (label: string, sql: string) => {
  try { const rows = await prisma.$queryRawUnsafe(sql); console.log(label, JSON.stringify(rows)); }
  catch (e: any) { console.log(label, "ERR", e?.message); }
};
(async () => {
  await q("user_count", `SELECT count(*)::int AS n FROM "User"`);
  await q("user_id_range", `SELECT min(id) AS mn, max(id) AS mx FROM "User"`);
  await q("audit_created_users", `SELECT "targetId" FROM "AuditLog" WHERE action='user.create' ORDER BY "createdAt"`);
  await q("audit_by_day", `SELECT to_char("createdAt",'YYYY-MM-DD') AS d, action, status, count(*)::int AS n FROM "AuditLog" GROUP BY 1,2,3 ORDER BY 1,2`);
  await q("audit_actor", `SELECT "actorEmail", "actorRole", action, status, count(*)::int AS n FROM "AuditLog" GROUP BY 1,2,3,4 ORDER BY n DESC`);
  await q("super_admins_all", `SELECT id, email, role, "isActive", ("passwordHash" IS NOT NULL) AS has_pw, "lockedUntil", "lastLoginAt", "failedLoginAttempts" FROM "User" WHERE role='super_admin'`);
  await q("inactive_or_nopw", `SELECT id, email, role, "isActive", ("passwordHash" IS NOT NULL) AS has_pw, "lockedUntil" FROM "User" WHERE "isActive"=false OR "passwordHash" IS NULL OR "lockedUntil" IS NOT NULL`);
  await q("audit_totals", `SELECT count(*)::int AS n, min("createdAt") AS first, max("createdAt") AS last FROM "AuditLog"`);
  await q("contact_inquiries", `SELECT count(*)::int AS n FROM "ContactInquiry"`);
})().finally(() => prisma.$disconnect());
