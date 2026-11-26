"use client";

import React, { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

/**
 * Route-level error boundary: a render error is shown to the visitor and
 * reported to the centralized log as `system.client_error`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error?.message || "Route render error",
      stack: error?.stack ?? null,
      digest: error?.digest ?? null,
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Something went wrong</h1>
      <p style={{ color: "#868e96", margin: 0, maxWidth: "32rem" }}>
        The page could not be displayed. The error has been recorded and we will look into it.
      </p>
      {error?.digest && (
        <p style={{ color: "#adb5bd", fontSize: "0.75rem", margin: 0 }}>Reference: {error.digest}</p>
      )}
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
        Try again
      </button>
    </div>
  );
}
