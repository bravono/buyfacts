/**
 * Request correlation for the operational log.
 *
 * Every API route wrapped in withRequestLogging gets:
 * - a request id (inbound `x-request-id` reused, otherwise generated),
 * - an `http.request` start/end/error event carrying method, route, status and
 *   duration, so a request can be reconstructed from the log alone,
 * - the id echoed back in the `x-request-id` response header.
 *
 * Any log call made while the handler is running can pick the id up with
 * currentRequestId() and tag itself with it.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { log, logError, logInfo, logWarn, type LogContext } from "./logger";

export const REQUEST_ID_HEADER = "x-request-id";

interface RequestStore {
  requestId: string;
  route: string;
  method: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestStore>();

export function currentRequestId(): string | null {
  return storage.getStore()?.requestId ?? null;
}

/** Log context pre-filled from the active request, if any. */
export function requestLogContext(extra: LogContext = {}): LogContext {
  const store = storage.getStore();
  if (!store) return extra;
  return {
    requestId: store.requestId,
    route: store.route,
    method: store.method,
    ...extra,
  };
}

/** Derive a stable route label from a URL, e.g. /api/admin/users/42 -> /api/admin/users/[id]. */
export function routeLabel(url: string): string {
  try {
    const { pathname } = new URL(url, "http://localhost");
    // numeric ids, uuids and long hex tokens are collapsed so routes group together
    return pathname
      .replace(/\/\d+(?=\/|$)/g, "/[id]")
      .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\/|$)/g, "/[id]")
      .replace(/\/[0-9a-fA-F]{12,}(?=\/|$)/g, "/[id]");
  } catch {
    return url;
  }
}

export function clientIpOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/**
 * Wrap a route handler so the request is logged end to end.
 * The handler's own behaviour and return value are unchanged.
 */
export function withRequestLogging<A extends unknown[]>(
  handler: (request: Request, ...rest: A) => Promise<Response> | Response,
  options: { route?: string; category?: LogContext["category"] } = {}
): (request: Request, ...rest: A) => Promise<Response> {
  return async (request: Request, ...rest: A): Promise<Response> => {
    const inboundId = request.headers.get(REQUEST_ID_HEADER)?.trim();
    const store: RequestStore = {
      requestId: inboundId && inboundId.length <= 128 ? inboundId : randomUUID(),
      route: options.route || routeLabel(request.url),
      method: request.method || "GET",
      startedAt: Date.now(),
    };

    const base: LogContext = {
      category: options.category ?? "http",
      requestId: store.requestId,
      route: store.route,
      method: store.method,
      ip: clientIpOf(request),
      userAgent: request.headers.get("user-agent"),
    };

    // Everything below runs inside storage.run so nested log calls inherit the id.
    return storage.run(store, async (): Promise<Response> => {
      try {
        const response = await handler(request, ...rest);
        const durationMs = Date.now() - store.startedAt;
        const status = response?.status ?? 200;

        try {
          response.headers.set(REQUEST_ID_HEADER, store.requestId);
        } catch {
          /* immutable headers: nothing to do */
        }

        if (status >= 500) {
          log({
            level: "error",
            event: "http.request.error",
            message: `${store.method} ${store.route} -> ${status} in ${durationMs}ms`,
            ...base,
            status,
            durationMs,
          });
        } else if (status >= 400) {
          logWarn("http.request.failed", `${store.method} ${store.route} -> ${status} in ${durationMs}ms`, {
            ...base,
            status,
            durationMs,
          });
        } else {
          logInfo("http.request.end", `${store.method} ${store.route} -> ${status} in ${durationMs}ms`, {
            ...base,
            status,
            durationMs,
          });
        }

        return response;
      } catch (err) {
        const durationMs = Date.now() - store.startedAt;
        logError("http.request.exception", err, { ...base, status: 500, durationMs });
        return new Response(
          JSON.stringify({ success: false, error: "Internal server error.", requestId: store.requestId }),
          {
            status: 500,
            headers: { "content-type": "application/json", [REQUEST_ID_HEADER]: store.requestId },
          }
        );
      }
    });
  };
}
