/**
 * Create the first super admin (or recover from a fully locked-out portal).
 *
 * Usage:
 *   npm run bootstrap-admin -- --email you@company.com --name "Your Name" [--password "..."]
 *
 * Behaviour:
 *  - If NO active super admin exists, any administrator account (or a brand new
 *    one) can be promoted. This is the break-glass path when everyone who knew
 *    the super admin password has left the company.
 *  - If a super admin already exists, the script refuses unless you also pass
 *    --force AND the BOOTSTRAP_ADMIN_FORCE_TOKEN environment variable, so the
 *    script cannot be used to silently seize control.
 *  - The password is never echoed. If omitted, a strong one is generated and printed
 *    once, to be changed at first sign-in.
 */
import "dotenv/config";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 20) chars.push(pick(all));
  return chars.sort(() => crypto.randomInt(3) - 1).join("");
}

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || "").trim().toLowerCase();
  const name = (args.name || "").trim();

  if (!email || !name) {
    console.error(
      "Usage: npm run bootstrap-admin -- --email you@company.com --name \"Your Name\" [--password \"...\"] [--force]"
    );
    process.exit(1);
  }

  const existingSupers = await prisma.user.count({
    where: { role: "super_admin", isActive: true },
  });

  if (existingSupers > 0) {
    const forceToken = process.env.BOOTSTRAP_ADMIN_FORCE_TOKEN;
    if (args.force !== "true" || !forceToken) {
      console.error(
        `Refusing to run: ${existingSupers} active super admin(s) already exist.\n` +
          "Ask one of them to promote this account in Admin → Users.\n" +
          "Break-glass override: set BOOTSTRAP_ADMIN_FORCE_TOKEN in the environment and pass --force."
      );
      process.exit(2);
    }
    console.warn("FORCE override accepted — creating an additional super admin.");
  }

  const password = args.password || generatePassword();
  const generated = !args.password;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "super_admin",
      isActive: true,
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
    create: {
      email,
      name,
      role: "super_admin",
      isActive: true,
      passwordHash,
      passwordChangedAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "user.bootstrap_super_admin",
      actorEmail: "system:bootstrap-admin",
      actorRole: "system",
      target: "user",
      targetId: String(user.id),
      metadata: JSON.stringify({ email: user.email, forced: existingSupers > 0 }),
    },
  });

  console.log("Super admin ready:");
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  name:  ${user.name}`);
  if (generated) {
    console.log(`  password (shown once): ${password}`);
    console.log("  → Sign in and change it immediately.");
  } else {
    console.log("  password: (the one you supplied)");
  }
  console.log("\nReminder: sign in and enrol two-factor authentication at Admin → Security.");
}

main()
  .catch((err) => {
    console.error("bootstrap-admin failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
