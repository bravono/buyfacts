"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardAnimation from "@/components/DashboardAnimation";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";
import RangeOfResponsibilities from "@/components/RangeOfResponsibilities";

interface ButtonData {
  label: string;
  tagline: string;
  description: string;
  color: string;
  textColor: string;
  hoverShadow: string;
  mediaType: "video" | "image" | "audio" | "pdf" | "docx";
  mediaUrl: string;
  readItUrl?: string;
}

const DEFAULT_TL_BUTTONS: ButtonData[] = [
  {
    label: "Research Methods",
    tagline: "Exceed Stakeholder Wants and Needs",
    description: "Rigorous multi-channel research protocols designed to consistently surpass stakeholder expectations with bulletproof empirical validation.",
    color: "var(--color-blue-3)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)",
    mediaType: "video",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx",
  },
  {
    label: "Cohort Research",
    tagline: "Smaller Groups that Know the Topic",
    description: "Targeted cohort intelligence focusing on niche practitioner panels and specialist groups who possess deep, authoritative domain expertise.",
    color: "var(--color-orange-2)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    mediaType: "pdf",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx",
  },
  {
    label: "Survey Engagement",
    tagline: "Optimize Question Value",
    description: "Structuring engaging, high-yield survey instruments that maximize participant completion rates while extracting deep, high-value data.",
    color: "var(--color-accent-green-mint)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
    mediaType: "audio",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx",
  },
  {
    label: "Hybrid Marketing",
    tagline: "Digital Reach and a Human Touch",
    description: "Harmonizing high-scale digital reach with consultative human engagement to cultivate authentic relationships and sustained audience loyalty.",
    color: "var(--color-accent-plum)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
    mediaType: "video",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx",
  },
  {
    label: "Content Creation",
    tagline: "Assets that Engage with Thought Leadership",
    description: "Transforming empirical data points into compelling thought leadership whitepapers, interactive infographics, and high-impact digital narratives.",
    color: "var(--color-orange-2)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    mediaType: "pdf",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx",
  },
  {
    label: "Marketing Leadership",
    tagline: "Best Practices by Marketing Area",
    description: "Curated best practices across enterprise marketing divisions, aligning narrative precision with measurable campaign outcomes and growth metrics.",
    color: "var(--color-accent-green-lime)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
    mediaType: "audio",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx",
  },
  {
    label: "Research Leadership",
    tagline: "Return on Primary Research",
    description: "High-fidelity primary research methodologies delivering strategic insights, benchmark telemetry, and quantitative clarity to guide executive leadership.",
    color: "var(--color-orange-1)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
    mediaType: "video",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx",
  },
  {
    label: "Early Recognition",
    tagline: "Earlier Recognition for Your Time Advantage",
    description: "Detecting nascent market signals and emerging customer sentiment early to secure a definitive first-mover advantage.",
    color: "var(--color-accent-crimson)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
    mediaType: "video",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx",
  },
  {
    label: "Wisdom Gap",
    tagline: "Research Becomes Intellectual Currency",
    description: "Bridging the gap between raw data collection and actionable organizational wisdom, converting research findings into proprietary intellectual currency.",
    color: "var(--color-orange-5)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)",
    mediaType: "pdf",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx",
  },
];

const PRESET_COLORS = [
  { color: "var(--color-blue-3)", textColor: "white", hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)" },
  { color: "var(--color-orange-2)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)" },
  { color: "var(--color-accent-green-mint)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)" },
  { color: "var(--color-accent-plum)", textColor: "white", hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)" },
  { color: "var(--color-orange-2)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)" },
  { color: "var(--color-accent-green-lime)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)" },
  { color: "var(--color-orange-1)", textColor: "white", hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)" },
  { color: "var(--color-accent-crimson)", textColor: "white", hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)" },
  { color: "var(--color-orange-5)", textColor: "white", hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)" },
];

export default function PortfolioPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [thoughtLeadershipButtons, setThoughtLeadershipButtons] = useState<ButtonData[]>(DEFAULT_TL_BUTTONS);

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch("/api/buttons");
        const data = await res.json();
        if (data.success && Array.isArray(data.buttons)) {
          const apiTL = data.buttons
            .filter(
              (btn: any) =>
                btn.category === "Research Imperatives" ||
                btn.category === "Thought Leadership" ||
                btn.id?.startsWith("btn-tl") ||
                (typeof btn.category === "string" &&
                  (btn.category.toLowerCase().includes("imperative") ||
                    btn.category.toLowerCase().includes("thought") ||
                    btn.category.toLowerCase().includes("leadership")))
            )
            .map((btn: any, idx: number) => {
              const defaultFallback = DEFAULT_TL_BUTTONS[idx] || DEFAULT_TL_BUTTONS[0];
              const presets = PRESET_COLORS[idx % PRESET_COLORS.length];
              const resolvedMediaUrl = (btn.mediaUrl || "").trim();
              const resolvedReadItUrl = (btn.readItUrl || defaultFallback.readItUrl || "").trim();
              return {
                label: btn.label || defaultFallback.label,
                tagline: btn.tagline || btn.subtitle || defaultFallback.tagline,
                description: btn.description || defaultFallback.description,
                color: presets.color,
                textColor: presets.textColor,
                hoverShadow: presets.hoverShadow,
                mediaType: (btn.mediaType || defaultFallback.mediaType) as "video" | "image" | "audio" | "pdf" | "docx",
                mediaUrl: resolvedMediaUrl,
                readItUrl: resolvedReadItUrl,
              };
            });

          if (apiTL.length > 0) {
            setThoughtLeadershipButtons(apiTL);
          } else {
            console.warn("No Research Imperatives buttons matched from /api/buttons response:", data.buttons);
          }
        }
      } catch (err) {
        console.error("Failed to load thought leadership buttons from database:", err);
      }
    };

    fetchButtons();
  }, []);

  const currentMedia =
    selectedButtonIndex !== null
      ? (thoughtLeadershipButtons[selectedButtonIndex] || thoughtLeadershipButtons[0])
      : thoughtLeadershipButtons[0];

  return (
    <div className={styles.main}>
      {/* Background blobs for premium glow */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* Two-Column layout block - Dark Theme matching mockup */}
      <section
        className={styles.dashboardSection}
        id="best-practices"
      >
        <div className={styles.pageGrid}>
          {/* Left Column: DashboardAnimation component carrying Research Imperatives buttons */}
          <div className={styles.columnLeft}>
            <DashboardAnimation
              className={styles.dashboardAnimation}
              buttons={thoughtLeadershipButtons}
              title="RESEARCH IMPERATIVES"
              selectedButtonIndex={selectedButtonIndex ?? undefined}
              onSelectButton={(index) => {
                setSelectedButtonIndex(index);
                setShowWelcome(false);
              }}
            />
          </div>

          {/* Right Column: MockMediaPlayer component configured dynamically */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <MockMediaPlayer
                title={showWelcome ? "Getting Started" : currentMedia.label}
                tagline={showWelcome ? "Welcome to your Marketers tool workspace!" : currentMedia.tagline}
                description={showWelcome ? undefined : currentMedia.description}
                mediaType={currentMedia.mediaType}
                mediaUrl={currentMedia.mediaUrl}
                moreDetailUrl={currentMedia.readItUrl}
                readItUrl={currentMedia.readItUrl}
                pdfUrl={currentMedia.mediaType === "pdf" ? currentMedia.mediaUrl : "/sample-details.pdf"}
                pdfLabel="A Deeper Preview"
                showWelcome={showWelcome}
                onShowWelcome={() => setShowWelcome(true)}
                onDismissWelcome={() => setShowWelcome(false)}
                onNextMedia={() => {
                  setShowWelcome(false);
                  setSelectedButtonIndex((prev) => ((prev ?? -1) + 1) % thoughtLeadershipButtons.length);
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
