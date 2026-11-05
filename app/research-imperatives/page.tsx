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
  const [welcome, setWelcome] = useState<{ title: string; paragraphs: string[] } | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [thoughtLeadershipButtons, setThoughtLeadershipButtons] = useState<ButtonData[]>([]);

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch("/api/buttons");
        const data = await res.json();
        if (data.success && Array.isArray(data.buttons)) {
          const welcomeRow = data.buttons.find((btn: any) => btn.id === "btn-tl-000");
          const welcomeText = (welcomeRow?.descriptionText || welcomeRow?.description || "").trim();
          setWelcome(
            welcomeRow && welcomeText
              ? {
                  title: welcomeRow.label || "",
                  paragraphs: welcomeText.split(/\r?\n+/).map((p: string) => p.trim()).filter(Boolean),
                }
              : null
          );
          const apiTL = data.buttons
            .filter((btn: any) => btn.id !== "btn-tl-000")
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
              const presets = PRESET_COLORS[idx % PRESET_COLORS.length];
              const resolvedMediaUrl: string = "";
              const resolvedSeeItUrl = (btn.seeItUrl || "").trim();
              const resolvedHearItUrl = (btn.hearItUrl || "").trim();
              const resolvedReadItUrl = (btn.readItUrl || "").trim();

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

              const storedType = (btn.mediaType || "video") as
                | "video"
                | "image"
                | "audio"
                | "pdf"
                | "docx";

              let resolvedMediaType = primaryKind ?? storedType;

              return {
                label: btn.label || "",
                tagline: btn.tagline || btn.subtitle || "",
                description: btn.descriptionText || btn.description || "",
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

  const currentMedia: ButtonData | undefined =
    selectedButtonIndex !== null ? thoughtLeadershipButtons[selectedButtonIndex] : thoughtLeadershipButtons[0];

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
              <strong>RESEARCH INNOVATION</strong>

          </div>

          {/* Right Column: MockMediaPlayer component configured dynamically */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <MockMediaPlayer
                title={showWelcome ? welcome?.title : currentMedia?.label}
                tagline={showWelcome ? "" : currentMedia?.tagline}
                description={showWelcome ? undefined : currentMedia?.description}
                welcomeTitle={welcome?.title}
                welcomeParagraphs={welcome?.paragraphs}
                mediaType={currentMedia?.mediaType}
                mediaUrl={currentMedia?.mediaUrl}
                seeItUrl={currentMedia?.seeItUrl}
                hearItUrl={currentMedia?.hearItUrl}
                moreDetailUrl={currentMedia?.readItUrl}
                readItUrl={currentMedia?.readItUrl}
                pdfUrl={currentMedia?.mediaType === "pdf" ? currentMedia?.mediaUrl : "/sample-details.pdf"}
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
