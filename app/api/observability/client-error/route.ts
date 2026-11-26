import { NextResponse } from "next/server";
import { logError } from "@/lib/observability/logger";
import { withRequestLogging } from "@/lib/observability/request";
import { checkRateLimitAsync, getClientIp } from "@/lib/security/rate-limiter";

/**
 * Receives render/runtime errors from the browser (app/error.tsx and
 * app/global-error.tsx) and records them next to the server-side events.
 */
async function handler(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const limit = await checkRateLimitAsync(ip, "client_error");
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many error reports." },
      { status: 429, headers: { "Retry-After": String(limit.resetSeconds) } }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message : "Unknown client error";
  const route = typeof body.route === "string" ? body.route : null;

  logError("system.client_error", message, {
    category: "system",
    route,
    ip,
    userAgent: request.headers.get("user-agent"),
    context: {
      stack: typeof body.stack === "string" ? body.stack.slice(0, 4000) : null,
      digest: body.digest ?? null,
      href: body.href ?? null,
    },
  });

  return NextResponse.json({ success: true });
}

export const POST = withRequestLogging(handler, { route: "/api/observability/client-error", category: "system" });
