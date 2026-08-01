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
  color: string;
  textColor: string;
  hoverShadow: string;
  mediaType: "video" | "image" | "audio" | "pdf";
  mediaUrl: string;
  subtitle: string;
}

const DEFAULT_TL_BUTTONS: ButtonData[] = [
  {
    label: "Survey Respondent Engagement",
    color: "var(--color-accent-green-lime)", // Lime Green #b0e843
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
    mediaType: "audio",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    subtitle: "Audio presentation: Maximize response rates without sacrificing fidelity.",
  },
  {
    label: "Content Creation",
    color: "var(--color-orange-2)", // Light Orange/Beige #ffc164
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    mediaType: "pdf",
    mediaUrl: "https://www.orimi.com/pdf-test.pdf",
    subtitle: "Whitepaper: Storytelling in B2B market surveys.",
  },
  {
    label: "Research Methods",
    color: "var(--color-orange-1)", // Brand Orange #ff9900
    textColor: "white",
    hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
    mediaType: "video",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    subtitle: "Video overview: Triangulation and telemetry filtering.",
  },
  {
    label: "Research Speed",
    color: "var(--color-accent-crimson)", // Crimson #ea425f
    textColor: "white",
    hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80",
    subtitle: "Infographic: Speed-to-insights data compression metrics.",
  },
  {
    label: "Hybrid Marketing",
    color: "var(--color-accent-plum)", // Plum #532254
    textColor: "white",
    hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
    mediaType: "video",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    subtitle: "Panel discussion: Bridging qualitative metrics and brand authority.",
  },
  {
    label: "Marketing Influence",
    color: "var(--color-accent-green-mint)", // Mint Green #42ea86
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
    mediaType: "pdf",
    mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
    subtitle: "Annual survey: Influencer models in corporate procurement decision-making.",
  },
];

const PRESET_COLORS = [
  { color: "var(--color-accent-green-lime)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)" },
  { color: "var(--color-orange-2)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)" },
  { color: "var(--color-orange-1)", textColor: "white", hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)" },
  { color: "var(--color-accent-crimson)", textColor: "white", hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)" },
  { color: "var(--color-accent-plum)", textColor: "white", hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)" },
  { color: "var(--color-accent-green-mint)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)" },
];

export default function PortfolioPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);
  const [thoughtLeadershipButtons, setThoughtLeadershipButtons] = useState<ButtonData[]>(DEFAULT_TL_BUTTONS);

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch("/api/buttons");
        const data = await res.json();
        if (data.success) {
          const apiTL = data.buttons
            .filter((btn: any) => btn.category === "Thought Leadership")
            .map((btn: any, idx: number) => {
              const presets = PRESET_COLORS[idx % PRESET_COLORS.length];
              return {
                label: btn.label,
                color: presets.color,
                textColor: presets.textColor,
                hoverShadow: presets.hoverShadow,
                mediaType: (btn.mediaType || "video") as "video" | "image" | "audio" | "pdf",
                mediaUrl: btn.mediaUrl,
                subtitle: btn.subtitle || "",
              };
            });

          if (apiTL.length > 0) {
            setThoughtLeadershipButtons(apiTL);
          }
        }
      } catch (err) {
        console.error("Failed to load thought leadership buttons from database:", err);
      }
    };

    fetchButtons();
  }, []);

  const currentMedia = thoughtLeadershipButtons[selectedButtonIndex] || thoughtLeadershipButtons[0];

  return (
    <div className={styles.main}>
      {/* Background blobs for premium glow */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* Two-Column layout block - Dark Theme matching mockup but customized */}
      <section
        className={styles.section}
        id="best-practices"
        style={{ padding: "5rem 0 3rem 0" }}
      >
        <div className={styles.pageGrid}>
          {/* Left Column: ExpertiseResources component carrying original default buttons */}
          <div className={styles.columnLeft}>
             <DashboardAnimation
              className={styles.dashboardAnimation}
              buttons={thoughtLeadershipButtons}
              title="Expertise and Resources"
              selectedButtonIndex={selectedButtonIndex}
              onSelectButton={setSelectedButtonIndex}
            />
          </div>

          {/* Right Column: MockMediaPlayer component configured dynamically */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <MockMediaPlayer
                title={currentMedia.label}
                subtitle={currentMedia.subtitle}
                mediaType={currentMedia.mediaType}
                mediaUrl={currentMedia.mediaUrl}
                pdfUrl={currentMedia.mediaType === "pdf" ? currentMedia.mediaUrl : "/sample-details.pdf"}
                pdfLabel="A Deeper Preview"
                onNextMedia={() =>
                  setSelectedButtonIndex((prev) => (prev + 1) % thoughtLeadershipButtons.length)
                }
                onExploreClick={(action) => {
                  if (action === "see_more") {
                    const idx = thoughtLeadershipButtons.findIndex(
                      (b) => b.mediaType === "video" || b.mediaType === "image"
                    );
                    if (idx !== -1) setSelectedButtonIndex(idx);
                  } else if (action === "hear_more") {
                    const idx = thoughtLeadershipButtons.findIndex(
                      (b) => b.mediaType === "audio"
                    );
                    if (idx !== -1) setSelectedButtonIndex(idx);
                  } else if (action === "read_more") {
                    const idx = thoughtLeadershipButtons.findIndex(
                      (b) => b.mediaType === "pdf"
                    );
                    if (idx !== -1) setSelectedButtonIndex(idx);
                  }
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
