"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, ShieldCheck, RefreshCw, Play, Maximize2 } from "lucide-react";

export default function CubiconPreviewPage() {
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0b192c",
        color: "#ffffff",
      }}
    >
      <Navbar />

      <main
        style={{
          flex: 1,
          paddingTop: "92px",
          paddingBottom: "24px",
          display: "flex",
          flexDirection: "column",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          paddingLeft: "1.25rem",
          paddingRight: "1.25rem",
          boxSizing: "border-box",
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1rem",
            background: "rgba(255, 255, 255, 0.06)",
            padding: "0.75rem 1.25rem",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href="/cubicon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                color: "#ffffff",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "0.45rem 0.95rem",
                borderRadius: "999px",
                fontSize: "0.84rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
              Back to Cubicon
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={20} style={{ color: "#ff9900" }} />
              <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                Cubicon™ Interactive Puzzle Validation Preview
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <button
              type="button"
              onClick={() => setIframeKey((prev) => prev + 1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 1rem",
                borderRadius: "999px",
                border: "1px solid rgba(255, 153, 0, 0.5)",
                background: "rgba(255, 153, 0, 0.15)",
                color: "#ffc164",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Load New Puzzle Sample
            </button>

            <Link
              href="/cubicon#founding-client"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 1.1rem",
                borderRadius: "999px",
                background: "#ff9900",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              Founding Client Program
            </Link>
          </div>
        </div>

        {/* Interactive Cubicon Sample Viewport */}
        <div
          style={{
            flex: 1,
            width: "100%",
            minHeight: "78vh",
            background: "#ffffff",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            position: "relative",
          }}
        >
          <iframe
            key={iframeKey}
            src="/cubicon?preview=true#interactive-demo"
            title="Cubicon Interactive Preview Sample"
            style={{
              width: "100%",
              height: "78vh",
              minHeight: "640px",
              border: "none",
              display: "block",
            }}
          />
        </div>
      </main>
    </div>
  );
}
