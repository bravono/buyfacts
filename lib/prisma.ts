import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolve absolute path to SQLite db to avoid relative path resolution mismatches in Next.js server runtime
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, "")
  : path.join(process.cwd(), "dev.db");

const adapter = new PrismaBetterSqlite3({
  url: dbPath.startsWith("/") || dbPath.match(/^[a-zA-Z]:/) ? dbPath : path.join(process.cwd(), dbPath),
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

