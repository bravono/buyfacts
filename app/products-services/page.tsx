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
  mediaType: "video" | "image" | "audio" | "pdf" | "docx";
  mediaUrl: string;
  seeItUrl?: string;
  hearItUrl?: string;
  readItUrl?: string;
}

/**
 * Returns true when the URL points at a video file, so a video can be routed to SEE IT
 * even when the database row still carries a generic mediaType ("pdf", "image", ...).
 */
function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return (
    /\.(mp4|m4v|webm|ogv|ogg|mov|avi|mkv)($|\?|#)/i.test(url) ||
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(url)
  );
}

function isAudioUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)($|\?|#)/i.test(url);
}

const DEFAULT_SERVICES_BUTTONS: ButtonData[] = [
  {
    label: "Research Planning",
    tagline: "Inclusive Research Definition",
    description: "Collaborative scoping and question architecture ensuring comprehensive coverage of core business objectives and target demographics.",
    color: "var(--color-orange-5)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)",
    mediaType: "video",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
  },
  {
    label: "Survey Design",
    tagline: "Make Each Question Actionable",
    description: "Constructing streamlined survey workflows with zero ambiguity, ensuring every collected response informs direct business decisions.",
    color: "var(--color-accent-crimson)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
    mediaType: "audio",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx",
  },
  {
    label: "Story-Based Surveys",
    tagline: "Execute a Dual-Based Survey Model",
    description: "Narrative-driven interactive inquiry combining quantitative polling with qualitative scenario-based storytelling.",
    color: "var(--color-orange-1)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
    mediaType: "image",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx",
  },
  {
    label: "Improve Surveys",
    tagline: "Increase the Return on Research",
    description: "Iterative prompt refinement and telemetry tuning to amplify insight yield and maximize return on research investment.",
    color: "var(--color-blue-3)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)",
    mediaType: "pdf",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx",
  },
  {
    label: "Participant Validation",
    tagline: "Play Cubicon Puzzle Games",
    description: "Interactive verification mechanics using engaging 3D Cubicon spatial puzzles to verify genuine human participant engagement.",
    color: "var(--color-orange-2)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    mediaType: "audio",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842535-s0z06x-05_Participant_Validation_Description.docx",
  },
  {
    label: "Survey Fieldwork",
    tagline: "Quality-Centric Survey Execution",
    description: "High-fidelity deployment across verified B2B panels with real-time fraud mitigation and strict data integrity enforcement.",
    color: "var(--color-accent-green-lime)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
    mediaType: "image",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx",
  },
  {
    label: "Content Value",
    tagline: "Maximize the Return on Content",
    description: "Diagnostic evaluation of collateral effectiveness, optimizing messaging resonance and content syndication impact.",
    color: "var(--color-accent-green-mint)",
    textColor: "var(--color-blue-5)",
    hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
    mediaType: "video",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844032-fg4d90-07_Content_Value_Description.docx",
  },
  {
    label: "Pattern Insights",
    tagline: "Active Pattern Analytics",
    description: "Automated pattern detection and anomaly recognition uncovering non-obvious correlations in real-time response streams.",
    color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)",
    textColor: "white",
    hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)",
    mediaType: "video",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx",
  },
  {
    label: "Audience Validation",
    tagline: "Opportunity Validation",
    description: "Empirical validation frameworks to confirm market demand, assess willingness-to-pay, and de-risk new product initiatives.",
    color: "var(--color-accent-plum)",
    textColor: "white",
    hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
    mediaType: "pdf",
    mediaUrl: "",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx",
  },
];

const PRESET_COLORS = [
  { color: "var(--color-orange-5)", textColor: "white", hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)" },
  { color: "var(--color-accent-crimson)", textColor: "white", hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)" },
  { color: "var(--color-orange-1)", textColor: "white", hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)" },
  { color: "var(--color-blue-3)", textColor: "white", hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)" },
  { color: "var(--color-orange-2)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)" },
  { color: "var(--color-accent-green-lime)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)" },
  { color: "var(--color-accent-green-mint)", textColor: "var(--color-blue-5)", hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)" },
  { color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)", textColor: "white", hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)" },
  { color: "var(--color-accent-plum)", textColor: "white", hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)" },
];

export default function ServicesPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [customButtons, setCustomButtons] = useState<ButtonData[]>(DEFAULT_SERVICES_BUTTONS);

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch("/api/buttons");
        const data = await res.json();
        if (data.success && Array.isArray(data.buttons)) {
          const apiServices = data.buttons
            .filter(
              (btn: any) =>
                btn.category === "Products & Services" ||
                btn.category === "Services" ||
                btn.id?.startsWith("btn-srv") ||
                (typeof btn.category === "string" &&
                  (btn.category.toLowerCase().includes("service") ||
                    btn.category.toLowerCase().includes("product")))
            )
            .map((btn: any, idx: number) => {
              const defaultFallback = DEFAULT_SERVICES_BUTTONS[idx] || DEFAULT_SERVICES_BUTTONS[0];
              const presets = PRESET_COLORS[idx % PRESET_COLORS.length];
              const resolvedMediaUrl = (btn.mediaUrl || "").trim();
              const resolvedSeeItUrl = (btn.seeItUrl || "").trim();
              const resolvedHearItUrl = (btn.hearItUrl || "").trim();
              const resolvedReadItUrl = (btn.readItUrl || defaultFallback.readItUrl || "").trim();

              // THE PRIMARY BUTTON DECIDES WHAT THE PLAYER SHOWS FIRST.
              // SEE IT / HEAR IT / READ IT are optional extras and never influence the
              // primary content — a post may have all three, some, or none of them.
              // The primary type comes from the row's mediaType, corrected by the
              // extension of the primary link itself (and by mediaUrl when mediaType is absent).
              const primaryKind: "video" | "audio" | "pdf" | "docx" | "image" | null =
                isVideoUrl(resolvedMediaUrl)
                  ? "video"
                  : isAudioUrl(resolvedMediaUrl)
                    ? "audio"
                    : /(\.docx|\.doc)($|\?|#)/i.test(resolvedMediaUrl)
                      ? "docx"
                      : /(\.pdf)($|\?|#)/i.test(resolvedMediaUrl)
                        ? "pdf"
                        : /(\.(png|jpe?g|gif|webp|svg|avif))($|\?|#)/i.test(resolvedMediaUrl)
                          ? "image"
                          : null;

              const storedType = (btn.mediaType || defaultFallback.mediaType) as
                | "video"
                | "image"
                | "audio"
                | "pdf"
                | "docx";

              let resolvedMediaType = primaryKind ?? storedType;

              return {
                label: btn.label || defaultFallback.label,
                tagline: btn.tagline || btn.subtitle || defaultFallback.tagline,
                description: btn.description || defaultFallback.description,
                color: presets.color,
                textColor: presets.textColor,
                hoverShadow: presets.hoverShadow,
                mediaType: resolvedMediaType,
                mediaUrl: resolvedMediaUrl,
                seeItUrl: resolvedSeeItUrl,
                hearItUrl: resolvedHearItUrl,
                readItUrl: resolvedReadItUrl,
              };
            });

          if (apiServices.length > 0) {
            setCustomButtons(apiServices);
          } else {
            console.warn("No Products & Services buttons matched from /api/buttons response:", data.buttons);
          }
        }
      } catch (err) {
        console.error("Failed to load services buttons from database:", err);
      }
    };

    fetchButtons();
  }, []);

  const currentMedia =
    selectedButtonIndex !== null
      ? (customButtons[selectedButtonIndex] || customButtons[0])
      : customButtons[0];

  return (
    <div className={styles.main}>
      {/* Background blobs for premium glow */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* Two-Column layout block - Dark Theme matching research-imperatives */}
      <section className={styles.dashboardSection} id="innovations">
        <div className={styles.pageGrid}>
          {/* Left Column: interactive service / tool areas graphic */}
          <div className={styles.columnLeft}>
            <DashboardAnimation
              className={styles.dashboardAnimation}
              buttons={customButtons}
              title="INNOVATIONS THAT SAVE TIME"
              selectedButtonIndex={selectedButtonIndex ?? undefined}
              onSelectButton={(index) => {
                setSelectedButtonIndex(index);
                setShowWelcome(false);
              }}
            />
          </div>

          {/* Right Column: MockMediaPlayer component */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <MockMediaPlayer
                title={showWelcome ? "Getting Started" : currentMedia.label}
                tagline={showWelcome ? "Welcome to your Marketers tool workspace!" : currentMedia.tagline}
                description={showWelcome ? undefined : currentMedia.description}
                mediaType={currentMedia.mediaType}
                mediaUrl={currentMedia.mediaUrl}
                seeItUrl={currentMedia.seeItUrl}
                hearItUrl={currentMedia.hearItUrl}
                moreDetailUrl={currentMedia.readItUrl}
                readItUrl={currentMedia.readItUrl}
                pdfUrl={currentMedia.mediaType === "pdf" ? currentMedia.mediaUrl : "/sample-details.pdf"}
                pdfLabel="A Deeper Preview"
                showWelcome={showWelcome}
                onShowWelcome={() => setShowWelcome(true)}
                onDismissWelcome={() => setShowWelcome(false)}
                onNextMedia={() => {
                  setShowWelcome(false);
                  setSelectedButtonIndex((prev) => ((prev ?? -1) + 1) % customButtons.length);
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
