"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardAnimation from "@/components/DashboardAnimation";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";

export default function PortfolioPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);

  const thoughtLeadershipButtons = [
    {
      label: "Survey Respondent Engagement",
      color: "var(--color-accent-green-lime)", // Lime Green #b0e843
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
      mediaType: "audio" as const,
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      subtitle: "Audio presentation: Maximize response rates without sacrificing fidelity.",
    },
    {
      label: "Content Creation",
      color: "var(--color-orange-2)", // Light Orange/Beige #ffc164
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
      mediaType: "pdf" as const,
      mediaUrl: "https://www.orimi.com/pdf-test.pdf",
      subtitle: "Whitepaper: Storytelling in B2B market surveys.",
    },
    {
      label: "Research Methods",
      color: "var(--color-orange-1)", // Brand Orange #ff9900
      textColor: "white",
      hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
      mediaType: "video" as const,
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      subtitle: "Video overview: Triangulation and telemetry filtering.",
    },
    {
      label: "Research Speed",
      color: "var(--color-accent-crimson)", // Crimson #ea425f
      textColor: "white",
      hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
      mediaType: "image" as const,
      mediaUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80",
      subtitle: "Infographic: Speed-to-insights data compression metrics.",
    },
    {
      label: "Hybrid Marketing",
      color: "var(--color-accent-plum)", // Plum #532254
      textColor: "white",
      hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
      mediaType: "video" as const,
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      subtitle: "Panel discussion: Bridging qualitative metrics and brand authority.",
    },
    {
      label: "Marketing Influence",
      color: "var(--color-accent-green-mint)", // Mint Green #42ea86
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
      mediaType: "pdf" as const,
      mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
      subtitle: "Annual survey: Influencer models in corporate procurement decision-making.",
    },
  ];

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
        style={{ padding: "9rem 0 6rem 0" }}
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
              <span className={styles.sideLabel}>Methodology Overview</span>
              <h3 className={styles.sideTitle}>Audio Walkthrough</h3>
              <p className={styles.sideDesc}>
                Play the audio presentation below to hear a detailed breakdown
                of the BuyFacts B2B verification logic, executive panel
                audits, and return on effort analytics.
              </p>
              <MockMediaPlayer
                title={currentMedia.label}
                subtitle={currentMedia.subtitle}
                mediaType={currentMedia.mediaType}
                mediaUrl={currentMedia.mediaUrl}
              />
            </div>
          </div>
        </div>

        <div className={styles.container}>
          {/* Outline cards row matching mockup footer grids (adapted for dark theme) */}
          <div className={styles.specGrid}>
            <div className={styles.specCard}>Read More </div>
            <div className={styles.specCard}>Hear More</div>
            <div className={styles.specCard}>See More</div>
            <Link href="/#contact" className={styles.specCard}>
              Contact Us
            </Link>
            <Link href="/thought-leadership" className={styles.specCard}>
              Best Practices
            </Link>
            <Link href="/thought-leadership" className={styles.specCard}>
              Thought Leadership
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
