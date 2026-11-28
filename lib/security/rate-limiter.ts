/**
 * Distributed / multi-instance throttling (Section 13).
 *
 * The original limiter kept a sliding window in a module-level Map, so each
 * server instance counted on its own: behind a load balancer with N instances
 * a caller got N times the allowance, and a cold start reset the window.
 *
 * This module fixes that by putting the counter in the shared PostgreSQL
 * database and doing the check-and-increment in ONE atomic statement:
 *
 *   INSERT ... ON CONFLICT (key, window_start) DO UPDATE
 *     SET count = count + 1
 *     WHERE count < max
 *   RETURNING count
 *
 * - No row returned  -> the caller is over the limit.
 * - A row returned   -> the caller was counted atomically; `count` is the new
 *                       value, which gives `remaining` without a second query.
 * Two instances (or two requests at the same instant) therefore share one
 * budget; PostgreSQL serialises the upsert on the primary key.
 *
 * The window is a fixed bucket of `windowSeconds` starting at epoch zero, which
 * is the same arithmetic on every instance, so no clock sharing is needed
 * beyond a reasonable NTP sync.
 *
 * Where a database is not reachable (unit tests, a local `next dev` with no
 * Postgres) the limiter degrades to the in-process store instead of failing the
 * request: `checkRateLimitAsync` reports which store answered in `store`.
 */
import { logWarn } from "@/lib/observability/logger";

// --- types -------------------------------------------------------------------

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  /** Which store answered: the shared database, or this process only. */
  store?: "db" | "memory";
  /** True when the database was expected to answer but did not. */
  degraded?: boolean;
}

/** The three statements the limiter needs; injected so it can be tested without a DB. */
export interface ThrottleStore {
  /**
   * Atomically count this hit in `windowStart`, which must be a window the
   * database has already issued (see `currentWindow`). Returns the new count,
   * or null when the caller is over the limit.
   */
  increment(key: string, windowStart: Date, windowSeconds: number, maxRequests: number): Promise<number | null>;
  /** Start of the window the database itself is in — the shared clock. */
  currentWindow(windowSeconds: number): Promise<Date>;
  /** Remove rows whose window has long passed. */
  prune(before: Date): Promise<number>;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  contact: { maxRequests: 5, windowSeconds: 600 }, // 5 requests per 10 minutes
  founding_client: { maxRequests: 5, windowSeconds: 600 },
  share: { maxRequests: 5, windowSeconds: 600 },
  feedback: { maxRequests: 10, windowSeconds: 600 },
  verify_resend: { maxRequests: 3, windowSeconds: 900 }, // 3 resends per 15 minutes
  password_reset: { maxRequests: 5, windowSeconds: 900 }, // 5 reset requests per 15 minutes
  client_error: { maxRequests: 20, windowSeconds: 600 }, // 20 browser error reports per 10 minutes
};

// --- shared key + window arithmetic ------------------------------------------

/** Namespace keys so several deployments can share one database. */
function namespace(): string {
  return (process.env.RATE_LIMIT_NAMESPACE || "buyfacts").trim();
}

/** The key every instance computes identically for a caller + action. */
export function throttleKey(identifier: string, action: string): string {
  return `${namespace()}:${action}:${identifier}`;
}

/** Start of the fixed window that `now` falls in (identical on every instance). */
export function windowStartFor(nowMs: number, windowSeconds: number): Date {
  const sizeMs = Math.max(1, windowSeconds) * 1000;
  return new Date(Math.floor(nowMs / sizeMs) * sizeMs);
}

/** Whole seconds until the current window ends (never 0, so Retry-After is useful). */
export function resetSecondsFor(nowMs: number, windowSeconds: number): number {
  const sizeMs = Math.max(1, windowSeconds) * 1000;
  const endsAt = Math.floor(nowMs / sizeMs) * sizeMs + sizeMs;
  return Math.max(1, Math.ceil((endsAt - nowMs) / 1000));
}

export function resolveConfig(action: string, customConfig?: RateLimitConfig): RateLimitConfig {
  return customConfig || RATE_LIMIT_CONFIGS[action] || { maxRequests: 10, windowSeconds: 600 };
}

// --- in-process fallback (single instance) -----------------------------------

interface MemoryEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryEntry>();

function checkMemory(identifier: string, action: string, config: RateLimitConfig, nowMs = Date.now()): RateLimitResult {
  const key = `${action}:${identifier}`;
  const windowStart = nowMs - config.windowSeconds * 1000;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + config.windowSeconds * 1000 - nowMs) / 1000));
    return { allowed: false, remaining: 0, resetSeconds, store: "memory" };
  }

  entry.timestamps.push(nowMs);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetSeconds: config.windowSeconds,
    store: "memory",
  };
}

// --- PostgreSQL store --------------------------------------------------------

const globalForThrottle = globalThis as unknown as {
  __buyfactsThrottleUnavailableUntil?: number;
  __buyfactsThrottleLastPrune?: number;
};

/** After a database failure, stay on the in-process store for this long. */
const DEGRADED_RETRY_MS = 30_000;
/** Prune expired windows at most this often, from whichever instance gets there first. */
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

function throttleTableMissing(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error);
  return /ThrottleCounter|does not exist|relation .* does not exist|P2021|P2022/i.test(message);
}

/**
 * The real store, backed by the `ThrottleCounter` table.
 * Imported lazily so the pure functions above stay testable without Prisma.
 */
export const prismaThrottleStore: ThrottleStore = {
  async currentWindow(windowSeconds) {
    const { prisma } = await import("@/lib/prisma");
    // The database clock is the one clock every instance agrees on, so the
    // window is decided there and nowhere else.
    const rows = await prisma.$queryRaw<{ windowStart: Date }[]>`
      SELECT to_timestamp(floor(extract(epoch FROM NOW()) / ${windowSeconds}) * ${windowSeconds}) AS "windowStart"
    `;
    return new Date(rows[0].windowStart);
  },

  async increment(key, windowStart, windowSeconds, maxRequests) {
    const { prisma } = await import("@/lib/prisma");

    // One atomic upsert on the (key, windowStart) primary key: every instance
    // contends for the same row, so the budget cannot be overshot no matter how
    // many instances serve requests. No row is returned once the cap is hit.
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "ThrottleCounter" ("key", "windowStart", "windowSeconds", "count", "updatedAt")
      VALUES (${key}, ${windowStart}, ${windowSeconds}, 1, NOW())
      ON CONFLICT ("key", "windowStart") DO UPDATE
        SET "count" = "ThrottleCounter"."count" + 1,
            "updatedAt" = NOW()
        WHERE "ThrottleCounter"."count" < ${maxRequests}
      RETURNING "count"
    `;
    return rows.length > 0 ? Number(rows[0].count) : null;
  },

  async prune(before) {
    const { prisma } = await import("@/lib/prisma");
    const { count } = await prisma.throttleCounter.deleteMany({ where: { windowStart: { lt: before } } });
    return count;
  },
};

/** Swap the store (tests). Pass null to restore the PostgreSQL one. */
let store: ThrottleStore = prismaThrottleStore;
export function setThrottleStore(next: ThrottleStore | null): void {
  store = next ?? prismaThrottleStore;
}

/** Force the limiter back to the shared store (tests). */
export function resetThrottleHealth(): void {
  globalForThrottle.__buyfactsThrottleUnavailableUntil = undefined;
  globalForThrottle.__buyfactsThrottleLastPrune = undefined;
}

function markDegraded(err: unknown, action: string): void {
  globalForThrottle.__buyfactsThrottleUnavailableUntil = Date.now() + DEGRADED_RETRY_MS;
  logWarn(
    "security.throttle.degraded",
    throttleTableMissing(err)
      ? "ThrottleCounter table is missing; throttling this process only. Run the Prisma migration."
      : "Shared throttle store unavailable; throttling this process only.",
    {
      category: "security",
      context: { action, error: (err as Error)?.message ?? String(err) },
    }
  );
}

async function pruneIfDue(): Promise<void> {
  const last = globalForThrottle.__buyfactsThrottleLastPrune ?? 0;
  if (Date.now() - last < PRUNE_INTERVAL_MS) return;
  globalForThrottle.__buyfactsThrottleLastPrune = Date.now();
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const removed = await store.prune(cutoff);
    if (removed > 0) {
      logWarn("security.throttle.pruned", `Pruned ${removed} expired throttle windows`, {
        category: "security",
        context: { removed },
      });
    }
  } catch {
    /* pruning is housekeeping; never let it affect a request */
  }
}

function reportExceeded(identifier: string, action: string, config: RateLimitConfig, resetSeconds: number, via: "db" | "memory") {
  logWarn("security.rate_limit.exceeded", `Rate limit hit for "${action}" from ${identifier}`, {
    category: "security",
    ip: identifier,
    context: {
      action,
      maxRequests: config.maxRequests,
      windowSeconds: config.windowSeconds,
      resetSeconds,
      store: via,
    },
  });
}

// --- public API --------------------------------------------------------------

/**
 * Count a hit against the shared budget. Use this from route handlers.
 *
 * Never throws: if the database cannot answer, the request is still throttled,
 * just per process, and the result says `degraded: true`.
 */
export async function checkRateLimitAsync(
  identifier: string,
  action: string,
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const config = resolveConfig(action, customConfig);
  const now = Date.now();

  const unavailableUntil = globalForThrottle.__buyfactsThrottleUnavailableUntil ?? 0;
  if (now < unavailableUntil) {
    const fallback = checkMemory(identifier, action, config, now);
    if (!fallback.allowed) reportExceeded(identifier, action, config, fallback.resetSeconds, "memory");
    return { ...fallback, degraded: true };
  }

  try {
    // The window is the database's, not this instance's: clock skew between
    // servers must never open a second budget mid-window.
    const windowStart = await store.currentWindow(config.windowSeconds);
    const resetSeconds = resetSecondsFor(now, config.windowSeconds);

    const count = await store.increment(
      throttleKey(identifier, action),
      windowStart,
      config.windowSeconds,
      config.maxRequests
    );
    void pruneIfDue();

    if (count === null) {
      reportExceeded(identifier, action, config, resetSeconds, "db");
      return { allowed: false, remaining: 0, resetSeconds, store: "db" };
    }
    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - count),
      resetSeconds,
      store: "db",
    };
  } catch (err) {
    markDegraded(err, action);
    const fallback = checkMemory(identifier, action, config, now);
    if (!fallback.allowed) reportExceeded(identifier, action, config, fallback.resetSeconds, "memory");
    return { ...fallback, degraded: true };
  }
}

/**
 * Synchronous, single-process limiter.
 *
 * Kept for tests and for callers that cannot await; route handlers should use
 * checkRateLimitAsync so the budget is shared across instances.
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  customConfig?: RateLimitConfig
): RateLimitResult {
  const config = resolveConfig(action, customConfig);
  const result = checkMemory(identifier, action, config);
  if (!result.allowed) reportExceeded(identifier, action, config, result.resetSeconds, "memory");
  return result;
}

/**
 * Extracts a client IP from standard Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Clears the in-process store (used in testing).
 */
export function resetRateLimits(): void {
  memoryStore.clear();
}
