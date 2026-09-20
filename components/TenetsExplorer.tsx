"use client";

import React, { useState } from "react";
import { ROBERTS_TEN_TENETS, RobertTenet } from "@/lib/roberts-framework";

export default function TenetsExplorer() {
  const [selectedTenet, setSelectedTenet] = useState<RobertTenet>(ROBERTS_TEN_TENETS[0]);

  return (
    <section style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "var(--font-sans, inherit)" }}>
      {/* Header Section */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ 
          display: "inline-block", 
          padding: "6px 14px", 
          borderRadius: "20px", 
          fontSize: "12px", 
          fontWeight: 700, 
          letterSpacing: "1.5px", 
          textTransform: "uppercase", 
          backgroundColor: "#F1F5F9", 
          color: "#475569", 
          marginBottom: "12px" 
        }}>
          SRA Color Spectrum • Robert&apos;s Way™
        </div>
        <h2 style={{ fontSize: "32px", fontWeight: 800, color: "var(--text-color, #1A1A1A)", margin: "0 0 10px 0" }}>
          Ten Tenets for Personal Stewardship
        </h2>
        <p style={{ color: "var(--text-muted, #6E6E73)", fontSize: "16px", maxWidth: "680px", margin: "0 auto" }}>
          Explore the tenets non-sequentially. Each SRA color anchor preserves visual identity while helping you turn Earlier Recognition into disciplined action.
        </p>
      </div>

      {/* SRA Color Selector Tabs (Clean Adobe Style) */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: "8px", 
        justifyContent: "center", 
        marginBottom: "35px" 
      }}>
        {ROBERTS_TEN_TENETS.map((tenet) => {
          const isSelected = selectedTenet.id === tenet.id;
          return (
            <button
              key={tenet.id}
              onClick={() => setSelectedTenet(tenet)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "24px",
                border: isSelected ? `2px solid ${tenet.color.hex}` : "1px solid #E2E8F0",
                backgroundColor: isSelected ? tenet.color.bgVar : "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none"
              }}
            >
              <span style={{ 
                width: "10px", 
                height: "10px", 
                borderRadius: "50%", 
                backgroundColor: tenet.color.hex,
                display: "inline-block" 
              }} />
              <span style={{ 
                fontSize: "13px", 
                fontWeight: isSelected ? 700 : 500, 
                color: isSelected ? "#0F172A" : "#64748B" 
              }}>
                {tenet.numberStr}. {tenet.color.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tenet Card (Tactile Adobe Specimen Card) */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        borderLeft: `8px solid ${selectedTenet.color.hex}`,
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
        padding: "36px 40px",
        maxWidth: "900px",
        margin: "0 auto",
        transition: "all 0.3s ease"
      }}>
        {/* Badge & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "1px",
            padding: "4px 10px",
            borderRadius: "6px",
            backgroundColor: selectedTenet.color.bgVar,
            color: selectedTenet.color.hex,
            border: `1px solid ${selectedTenet.color.borderVar}`
          }}>
            TENET {selectedTenet.numberStr} • {selectedTenet.color.name.toUpperCase()}
          </span>
        </div>

        <h3 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", margin: "0 0 14px 0" }}>
          {selectedTenet.title}
        </h3>

        <p style={{ 
          fontSize: "17px", 
          lineHeight: "1.6", 
          color: "#334155", 
          backgroundColor: "#F8FAFC", 
          padding: "16px 20px", 
          borderRadius: "10px",
          borderLeft: "3px solid #CBD5E1",
          margin: "0 0 28px 0" 
        }}>
          &ldquo;{selectedTenet.command}&rdquo;
        </p>

        {/* 3 Prompts Section */}
        <div>
          <h4 style={{ 
            fontSize: "13px", 
            fontWeight: 700, 
            letterSpacing: "1.2px", 
            textTransform: "uppercase", 
            color: "#64748B", 
            marginBottom: "16px" 
          }}>
            Three Action Prompts
          </h4>
          <div style={{ display: "grid", gap: "12px" }}>
            {selectedTenet.prompts.map((prompt, idx) => (
              <div 
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #EDF2F7"
                }}
              >
                <div style={{
                  minWidth: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: selectedTenet.color.bgVar,
                  color: selectedTenet.color.hex,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#1E293B", paddingTop: "2px" }}>
                  {prompt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
