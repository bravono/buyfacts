/**
 * Node.js-only instrumentation, loaded lazily from `instrumentation.ts`.
 *
 * This file is never compiled for the Edge runtime, so it may import Prisma and
 * the logger freely. It records the crashes that would otherwise only reach
 * stdout: unhandled promise rejections, uncaught exceptions and Node warnings.
 */
import { logError, logFatal } from "@/lib/observability/logger";

const globalFlags = globalThis as unknown as { __buyfactsLoggingHooked?: boolean };

export function installProcessLogging(): void {
  if (globalFlags.__buyfactsLoggingHooked) return;
  globalFlags.__buyfactsLoggingHooked = true;

  process.on("unhandledRejection", (reason) => {
    logError("system.unhandled_rejection", reason, { category: "system" });
  });

  process.on("uncaughtException", (error) => {
    logFatal("system.uncaught_exception", error, { category: "system" });
  });

  process.on("warning", (warning) => {
    logError("system.node_warning", warning, { category: "system" });
  });
}
