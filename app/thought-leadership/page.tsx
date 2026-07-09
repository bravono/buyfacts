"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpertiseResources from "@/components/ExpertiseResources";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";

export default function PortfolioPage() {
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
        <div className={styles.container}>
          <div className={styles.pageGrid}>
            {/* Left Column: ExpertiseResources component carrying original default buttons */}
            <div className={styles.columnLeft}>
              <ExpertiseResources title="BuyFacts Expertise and Resources" />
            </div>

            {/* Right Column: MockMediaPlayer component configured as Audio */}
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
                  title="Methodology Briefing"
                  subtitle="Detailed audio walkthrough explaining the Rule of Three® data triangulation protocol."
                  mediaType="audio"
                />
              </div>
            </div>
          </div>

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
