"use client";
import React from "react";
import Link from "next/link";

export default function AffinityEffectPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0c0a09" }}>
      <div style={{ padding: "8px 16px", background: "#1c1917", borderBottom: "1px solid #292524", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link href="/triad" style={{ color: "#fbbf24", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
            ← Back to TRIAD Suite
          </Link>
          <span style={{ color: "#e7e5e4", fontSize: "13px", fontWeight: 700 }}>
            The Affinity Effect — B2B 16-TRIAD Multi-Wave Assessment Engine
          </span>
        </div>
        <a href="/affinity-effect-app/Illustrations_Gallery.html" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontSize: "12px", fontWeight: 600 }}>
          Open 16-TRIAD SVG Gallery ↗
        </a>
      </div>
      <iframe
        src="/affinity-effect-app/index.html"
        title="The Affinity Effect B2B Multi-Wave Engine"
        style={{ width: "100%", flex: 1, border: "none", minHeight: "calc(100vh - 42px)", background: "#ffffff" }}
      />
    </div>
  );
}
