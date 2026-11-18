"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardAnimation from "@/components/DashboardAnimation";
import MediaPlayer from "@/components/MediaPlayer";
import styles from "./page.module.css";
import {
  ROLES_AND_TOPICS_DASHBOARD as DASHBOARD,
  resolveDashboard,
  type DashboardButtonRow,
  type ResolvedDashboard,
} from "@/lib/dashboardTopicsManifest";

export default function PortfolioPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  // Labels, order and assets come from the manifest immediately; each topic's text is
  // merged in from its own database row (matched by buttonId) once loaded.
  const [dashboard, setDashboard] = useState<ResolvedDashboard>(() => resolveDashboard(DASHBOARD));

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch("/api/buttons");
        const data = await res.json();
        if (data.success && Array.isArray(data.buttons)) {
          setDashboard(resolveDashboard(DASHBOARD, data.buttons as DashboardButtonRow[]));
        }
      } catch (err) {
        console.error("Failed to load Roles and Topics button text from database:", err);
      }
    };

    fetchButtons();
  }, []);

  const { overview: welcome, buttons } = dashboard;

  // Nothing selected: the player shows the overview topic's own assets (never button 1).
  const currentMedia = selectedButtonIndex !== null ? buttons[selectedButtonIndex] : undefined;
  const activeSeeItUrl = selectedButtonIndex !== null ? currentMedia?.seeItUrl : welcome.seeItUrl;
  const activeHearItUrl = selectedButtonIndex !== null ? currentMedia?.hearItUrl : welcome.hearItUrl;
  const activeReadItUrl = selectedButtonIndex !== null ? currentMedia?.readItUrl : welcome.readItUrl;

  return (
    <div className={styles.main}>
      {/* Background blobs for premium glow */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* Two-Column layout block - Dark Theme matching mockup */}
      <section className={styles.dashboardSection} id="best-practices">
        <div className={styles.pageGrid}>
          {/* Left Column: DashboardAnimation carrying the nine Roles and Topics buttons */}
          <div className={styles.columnLeft}>
            <DashboardAnimation
              className={styles.dashboardAnimation}
              buttons={buttons}
              title={DASHBOARD.arcTitle}
              selectedButtonIndex={selectedButtonIndex ?? undefined}
              onSelectButton={(index) => {
                setSelectedButtonIndex(index);
                setShowWelcome(false);
              }}
            />
            <strong>RESEARCH INNOVATION</strong>
          </div>

          {/* Right Column: media player for the selected topic */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <MediaPlayer
                title={showWelcome ? welcome.label : currentMedia?.label}
                tagline={showWelcome ? "" : currentMedia?.tagline}
                description={showWelcome ? undefined : currentMedia?.description}
                welcomeTitle={welcome.label}
                welcomeParagraphs={welcome.paragraphs}
                seeItUrl={activeSeeItUrl}
                hearItUrl={activeHearItUrl}
                moreDetailUrl={activeReadItUrl}
                readItUrl={activeReadItUrl}
                pdfLabel="A Deeper Preview"
                showWelcome={showWelcome}
                onShowWelcome={() => setShowWelcome(true)}
                onDismissWelcome={() => setShowWelcome(false)}
                onNextMedia={() => {
                  setShowWelcome(false);
                  setSelectedButtonIndex((prev) => ((prev ?? -1) + 1) % buttons.length);
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
