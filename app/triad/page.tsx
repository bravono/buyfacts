"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Layers, PlayCircle, Maximize2 } from "lucide-react";

const TRIAD_VIDEO_CDN =
  "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1792570971365-1vco29-Market_Changes_in_Real_Time_Triad.mp4";

export default function TriadFullscreenPage() {
  const [activeMode, setActiveMode] = useState<"triad" | "kym" | "video">("triad");

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#0f172a",
      }}
    >
      <header
        style={{
          height: "54px",
          minHeight: "54px",
          width: "100%",
          background: "#0b192c",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.25rem",
          boxSizing: "border-box",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              color: "#ffffff",
              background: "rgba(255, 255, 255, 0.1)",
              padding: "0.4rem 0.9rem",
              borderRadius: "999px",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <ArrowLeft size={15} />
            Back to BuyFacts Home
          </Link>

          <span
            style={{
              color: "#94a3b8",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            TRIAD FULLSCREEN WORKSPACE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveMode("triad")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: activeMode === "triad" ? "#7c3aed" : "rgba(255,255,255,0.08)",
              color: "#ffffff",
            }}
          >
            <Compass size={14} />
            B2B TRIAD Studio
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("kym")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: activeMode === "kym" ? "#0284c7" : "rgba(255,255,255,0.08)",
              color: "#ffffff",
            }}
          >
            <Layers size={14} />
            Know Your Major (KYM)
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("video")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: activeMode === "video" ? "#ff9900" : "rgba(255,255,255,0.08)",
              color: "#ffffff",
            }}
          >
            <PlayCircle size={14} />
            Overview Video
          </button>

          <Link
            href="/rule-of-three"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: "#0d9488",
              color: "#ffffff",
              textDecoration: "none",
              marginLeft: "0.35rem",
            }}
          >
            <Maximize2 size={13} />
            Rule of Three
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, width: "100%", height: "calc(100vh - 54px)", position: "relative" }}>
        {activeMode === "triad" && (
          <iframe
            src="/affinity-effect"
            title="B2B TRIAD Fullscreen Studio"
            style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#ffffff" }}
          />
        )}

        {activeMode === "kym" && (
          <iframe
            src="/know-your-major"
            title="Know Your Major Fullscreen TRIAD"
            style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#ffffff" }}
          />
        )}

        {activeMode === "video" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#090d16",
              padding: "2rem",
              boxSizing: "border-box",
            }}
          >
            <video
              src={TRIAD_VIDEO_CDN}
              controls
              autoPlay
              playsInline
              style={{
                maxWidth: "1100px",
                width: "100%",
                maxHeight: "82vh",
                borderRadius: "16px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
