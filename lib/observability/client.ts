/**
 * Client-side crash capture.
 *
 * The browser has no access to the server log, so a React render error is
 * reported to /api/observability/client-error, which writes it as a
 * `system.client_error` event with the same shape as a server event.
 */
"use client";

const MAX_REPORTS_PER_PAGE = 10;
let reportsSent = 0;

export interface ClientErrorReport {
  message: string;
  stack?: string | null;
  digest?: string | null;
  route?: string | null;
}

export function reportClientError(report: ClientErrorReport): void {
  if (typeof window === "undefined") return;
  if (reportsSent >= MAX_REPORTS_PER_PAGE) return;
  reportsSent += 1;

  const body = JSON.stringify({
    message: report.message,
    stack: report.stack ?? null,
    digest: report.digest ?? null,
    route: report.route ?? window.location.pathname,
    href: window.location.href,
  });

  try {
    // keepalive lets the report outlive a navigation triggered by the error screen
    void fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* reporting must never throw */
    });
  } catch {
    /* ignore */
  }
}
