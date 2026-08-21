"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardAnimation from "@/components/DashboardAnimation";
import RangeOfResponsibilities from "@/components/RangeOfResponsibilities";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";

interface ButtonData {
  label: string;
  tagline: string;
  description: string;
  color: string;
  textColor: string;
  hoverShadow: string;
  mediaType: "video" | "image" | "audio" | "pdf";
  mediaUrl: string;
}

const DEFAULT_SERVICES_BUTTONS: ButtonData[] = [
  {
    label: "Survey Define IT",
    tagline: "Inclusive Research Definition",
    description: "Collaborative scoping and question architecture ensuring comprehensive coverage of core business objectives and target demographics.",
    color: "var(--color-orange-5)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)",
    mediaType: "video",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    label: "Survey Refine IT",
    tagline: "Increase the Return on Research",
    description: "Iterative prompt refinement and telemetry tuning to amplify insight yield and maximize return on research investment.",
    color: "var(--color-blue-3)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)",
    mediaType: "pdf",
    mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
  },
  {
    label: "Survey Build IT",
    tagline: "Make Each Question Actionable",
    description: "Constructing streamlined survey workflows with zero ambiguity, ensuring every collected response informs direct business decisions.",
    color: "var(--color-accent-crimson)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
    mediaType: "audio",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    label: "Survey Field IT",
    tagline: "Quality-Centric Survey Execution",
    description: "High-fidelity deployment across verified B2B panels with real-time fraud mitigation and strict data integrity enforcement.",
    color: "var(--color-accent-green-lime)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Recognize IT",
    tagline: "Active Pattern Analytics",
    description: "Automated pattern detection and anomaly recognition uncovering non-obvious correlations in real-time response streams.",
    color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)",
    textColor: "white",
    hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)",
    mediaType: "video",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  {
    label: "Validate IT",
    tagline: "Opportunity Validation",
    description: "Empirical validation frameworks to confirm market demand, assess willingness-to-pay, and de-risk new product initiatives.",
    color: "var(--color-accent-plum)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
    mediaType: "pdf",
    mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    label: "Respondent Validation",
    tagline: "Play Cubicon Puzzle Games",
    description: "Interactive verification mechanics using engaging 3D Cubicon spatial puzzles to guarantee 100% human-verified respondent participation.",
    color: "var(--color-orange-2)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    mediaType: "audio",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    label: "Story-Based Surveys",
    tagline: "Execute a Dual-Based Survey Model",
    description: "Narrative-driven interactive inquiry combining quantitative polling with qualitative scenario-based storytelling.",
    color: "var(--color-orange-1)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Content Assessment",
    tagline: "Maximize the Return on Content",
    description: "Diagnostic evaluation of collateral effectiveness, optimizing messaging resonance and content syndication impact.",
    color: "var(--color-accent-green-mint)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
    mediaType: "video",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  },
];

const PRESET_COLORS = [
  { color: "var(--color-orange-5)", textColor: "white", hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)" },
  { color: "var(--color-blue-3)", textColor: "white", hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)" },
  { color: "var(--color-accent-crimson)", textColor: "white", hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)" },
  { color: "var(--color-accent-green-lime)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)" },
  { color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)", textColor: "white", hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)" },
  { color: "var(--color-accent-plum)", textColor: "white", hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)" },
  { color: "var(--color-orange-2)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)" },
  { color: "var(--color-orange-1)", textColor: "white", hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)" },
  { color: "var(--color-accent-green-mint)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)" },
];

export default function ServicesPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);
  const [customButtons, setCustomButtons] = useState<ButtonData[]>(DEFAULT_SERVICES_BUTTONS);

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch("/api/buttons");
        const data = await res.json();
        if (data.success && Array.isArray(data.buttons)) {
          const apiServices = data.buttons
            .filter((btn: any) => btn.category === "Services")
            .map((btn: any, idx: number) => {
              const defaultFallback = DEFAULT_SERVICES_BUTTONS[idx] || DEFAULT_SERVICES_BUTTONS[0];
              const presets = PRESET_COLORS[idx % PRESET_COLORS.length];
              return {
                label: btn.label || defaultFallback.label,
                tagline: btn.tagline || btn.subtitle || defaultFallback.tagline,
                description: btn.description || defaultFallback.description,
                color: presets.color,
                textColor: presets.textColor,
                hoverShadow: presets.hoverShadow,
                mediaType: (btn.mediaType || defaultFallback.mediaType) as "video" | "image" | "audio" | "pdf",
                mediaUrl: btn.mediaUrl || defaultFallback.mediaUrl,
              };
            });

          if (apiServices.length > 0) {
            setCustomButtons(apiServices);
          }
        }
      } catch (err) {
        console.error("Failed to load services buttons from database:", err);
      }
    };

    fetchButtons();
  }, []);

  const currentMedia = customButtons[selectedButtonIndex] || customButtons[0];

  return (
    <div className={styles.main}>
      <Navbar />

      {/* Two-Column layout block - Light Theme matching mockup */}
      <section className="section-light" style={{ padding: "5rem 0 3rem 0" }}>
        <div className={styles.pageGrid}>
          {/* Left Column: interactive service / tool areas graphic */}
          <div className={styles.columnLeft}>
            <DashboardAnimation
              className={styles.dashboardAnimation}
              buttons={customButtons}
              title="Products and Services"
              selectedButtonIndex={selectedButtonIndex}
              onSelectButton={setSelectedButtonIndex}
            />
          </div>

          {/* Right Column: MockMediaPlayer component */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <MockMediaPlayer
                title={currentMedia.label}
                tagline={currentMedia.tagline}
                description={currentMedia.description}
                mediaType={currentMedia.mediaType}
                mediaUrl={currentMedia.mediaUrl}
                pdfUrl={currentMedia.mediaType === "pdf" ? currentMedia.mediaUrl : "/sample-details.pdf"}
                pdfLabel="A Deeper Preview"
                onNextMedia={() =>
                  setSelectedButtonIndex((prev) => (prev + 1) % customButtons.length)
                }
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
