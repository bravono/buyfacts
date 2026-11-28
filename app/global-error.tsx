"use client";

import React, { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

/**
 * Last-resort error boundary (a failure in the root layout itself).
 * Reported to the centralized log as `system.client_error` with `fatal` scope.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error?.message || "Root layout error",
      stack: error?.stack ?? null,
      digest: error?.digest ?? null,
      route: "global",
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.4rem", margin: 0 }}>BuyFacts is temporarily unavailable</h1>
          <p style={{ color: "#868e96", margin: 0, maxWidth: "32rem" }}>
            The error has been recorded. Please reload the page in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.1rem",
              borderRadius: "6px",
              border: "1px solid #dee2e6",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
