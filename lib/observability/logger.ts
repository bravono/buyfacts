/**
 * Centralized logger (BuyFacts observability).
 *
 * One entry point for every operational event the app emits:
 *
 *   import { logError, logWarn, logInfo } from "@/lib/observability/logger";
 *   logError("contact.error", err, { category: "http", route: "/api/contact" });
 *
 * Design rules:
 * - Never throws. A logging failure must not break the request it is recording;
 *   if the database write fails we fall back to console so the event is not lost.
 * - Never blocks the response. Writes are fire-and-forget with a bounded
 *   in-process queue, flushed in the background.
 * - Never stores secrets. Everything goes through redact.ts first.
 */
import { prisma } from "@/lib/prisma";
import { redact, redactMessage } from "./redact";

export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_CATEGORIES = [
  "http",
  "auth",
  "db",
  "mail",
  "storage",
  "panel",
  "cubicon",
  "security",
  "system",
] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/** Minimum level actually written. LOG_LEVEL env, default "info" in prod, "debug" otherwise. */
export function currentLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "").trim().toLowerCase();
  if ((LOG_LEVELS as readonly string[]).includes(raw)) return raw as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function shouldLog(level: LogLevel, min: LogLevel = currentLogLevel()): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

export interface LogContext {
  category?: LogCategory;
  requestId?: string | null;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  durationMs?: number | null;
  actorEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  entityId?: string | null;
  errorName?: string | null;
  errorMessage?: string | null;
  stack?: string | null;
  /** Anything else worth keeping; redacted and JSON-encoded. */
  context?: unknown;
}

export interface LogEventInput extends LogContext {
  level: LogLevel;
  event: string;
  message?: string | null;
  error?: unknown;
}

export interface LogEventRow {
  level: LogLevel;
  category: LogCategory;
  event: string;
  message: string | null;
  requestId: string | null;
  route: string | null;
  method: string | null;
  status: number | null;
  durationMs: number | null;
  actorEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  entityId: string | null;
  errorName: string | null;
  errorMessage: string | null;
  stack: string | null;
  context: string | null;
}

const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;
const MAX_QUEUE = 500;

type Sink = (row: LogEventRow) => Promise<void> | void;

let sink: Sink = async (row) => {
  await prisma.logEvent.create({ data: row });
};

/** Swap the write target (used by tests). */
export function setLogSink(next: Sink | null): void {
  sink =
    next ??
    (async (row) => {
      await prisma.logEvent.create({ data: row });
    });
}

function normalizeError(error: unknown): Pick<LogContext, "errorName" | "errorMessage" | "stack"> {
  if (error === null || error === undefined) {
    return { errorName: null, errorMessage: null, stack: null };
  }
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      errorMessage: redactMessage(error.message || String(error)).slice(0, MAX_MESSAGE),
      stack: error.stack ? redactMessage(error.stack).slice(0, MAX_STACK) : null,
    };
  }
  if (typeof error === "string") {
    return { errorName: "Error", errorMessage: redactMessage(error).slice(0, MAX_MESSAGE), stack: null };
  }
  return {
    errorName: "Error",
    errorMessage: redactMessage(safeStringify(error)).slice(0, MAX_MESSAGE),
    stack: null,
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Build the row that would be written — pure, so it can be unit tested. */
export function buildLogRow(input: LogEventInput): LogEventRow {
  const fromError = normalizeError(input.error);
  const message = input.message ?? fromError.errorMessage ?? null;
  return {
    level: input.level,
    category: input.category ?? "system",
    event: input.event,
    message: message ? redactMessage(message).slice(0, MAX_MESSAGE) : null,
    requestId: input.requestId ?? null,
    route: input.route ?? null,
    method: input.method ?? null,
    status: typeof input.status === "number" ? input.status : null,
    durationMs: typeof input.durationMs === "number" ? Math.round(input.durationMs) : null,
    actorEmail: input.actorEmail ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ? redactMessage(input.userAgent).slice(0, 300) : null,
    entityId: input.entityId ?? null,
    errorName: input.errorName ?? fromError.errorName ?? null,
    errorMessage: input.errorMessage ?? fromError.errorMessage ?? null,
    stack: input.stack ?? fromError.stack ?? null,
    context: input.context === undefined ? null : safeStringify(redact(input.context)),
  };
}

// --- bounded background queue -------------------------------------------------

const queue: LogEventRow[] = [];
let flushing = false;

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    while (queue.length > 0) {
      const row = queue.shift()!;
      try {
        await sink(row);
      } catch (err) {
        // Never let a logging failure surface to the caller.
        console.error("[observability] Failed to persist log event:", row.event, err);
      }
    }
  } finally {
    flushing = false;
  }
}

/** Await every queued write (used by tests and graceful shutdown). */
export async function flushLogs(): Promise<void> {
  await flush();
}

/** Drop everything queued (tests). */
export function resetLogQueue(): void {
  queue.length = 0;
  flushing = false;
}

/** Record an event. Returns immediately; the write happens in the background. */
export function log(input: LogEventInput): void {
  if (!shouldLog(input.level)) return;
  let row: LogEventRow;
  try {
    row = buildLogRow(input);
  } catch (err) {
    console.error("[observability] Failed to build log event:", input.event, err);
    return;
  }

  if (queue.length >= MAX_QUEUE) {
    // Under a burst, drop the oldest rather than grow without bound.
    queue.shift();
  }
  queue.push(row);

  void flush();
}

export const logDebug = (event: string, message?: string | null, ctx: LogContext = {}) =>
  log({ level: "debug", event, message, ...ctx });
export const logInfo = (event: string, message?: string | null, ctx: LogContext = {}) =>
  log({ level: "info", event, message, ...ctx });
export const logWarn = (event: string, message?: string | null, ctx: LogContext = {}) =>
  log({ level: "warn", event, message, ...ctx });
export const logError = (event: string, error?: unknown, ctx: LogContext = {}) =>
  log({ level: "error", event, error, ...ctx });
export const logFatal = (event: string, error?: unknown, ctx: LogContext = {}) =>
  log({ level: "fatal", event, error, ...ctx });
