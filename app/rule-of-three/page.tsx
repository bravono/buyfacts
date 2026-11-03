"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function RuleOfThreePage() {
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        fontFamily: "'Segoe UI', Roboto, system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          padding: "10px 28px",
          background: "#01459a",
          color: "#ffffff",
          borderBottom: "2px solid #0a2945",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link
            href="/"
            style={{
              color: "#93c5fd",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← BuyFacts Home
          </Link>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.03em" }}>
            RULE OF THREE® (R3)
          </span>
          <span
            style={{
              fontSize: "12px",
              background: "rgba(255,255,255,0.16)",
              padding: "3px 10px",
              borderRadius: "999px",
              fontWeight: 700,
            }}
          >
            Interactive Research &amp; Content Framework
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setShowWelcome((v) => !v)}
            style={{
              background: showWelcome ? "#fbbf24" : "#ffffff",
              color: "#0a2945",
              border: "none",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {showWelcome ? "✕ Close Welcome & Guidance" : "ℹ Welcome & Guidance"}
          </button>

          <a
            href="/rule-of-three-app/index.html"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#ffffff",
              border: "1.5px solid rgba(255,255,255,0.5)",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Full Screen View ↗
          </a>
        </div>
      </header>

      {showWelcome && (
        <div
          style={{
            background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
            borderBottom: "2px solid #bfdbfe",
            padding: "24px 32px",
          }}
        >
          <div style={{ maxWidth: "1060px", margin: "0 auto" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 900,
                color: "#01459a",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              WELCOME &amp; USER GUIDANCE
            </div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#0f172a",
                margin: "6px 0 10px 0",
              }}
            >
              How to Explore the Rule of Three (R3) Experience
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "#334155",
                lineHeight: 1.6,
                marginBottom: "18px",
              }}
            >
              The <strong>Rule of Three</strong> turns research findings into concise, reusable, co-branded content designed to make insight easier to understand, remember, share, and use.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid #01459a",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontWeight: 900, color: "#01459a", marginBottom: "4px" }}>
                  1. Explore the Three Pillars
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  Click through the interactive visual elements below to see how complex findings are distilled into three memorable points.
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid #0284c7",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontWeight: 900, color: "#0284c7", marginBottom: "4px" }}>
                  2. Engage with Interactive Scenarios
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  Follow the prompts inside the workspace to experience how participants and clients interact with Rule of Three content.
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid #0d9488",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontWeight: 900, color: "#0d9488", marginBottom: "4px" }}>
                  3. Reusable Co-Branded Output
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  See how the final output creates longer-lasting research value for ongoing client campaigns.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              style={{
                background: "#01459a",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Continue to Rule of Three Workspace →
            </button>
          </div>
        </div>
      )}

      <iframe
        src="/rule-of-three-app/index.html"
        title="Rule of Three (R3) Interactive System"
        style={{
          width: "100%",
          flex: 1,
          border: "none",
          minHeight: "calc(100vh - 54px)",
          background: "#ffffff",
        }}
      />
    </div>
  );
}
