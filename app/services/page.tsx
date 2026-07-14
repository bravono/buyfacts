"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpertiseResources from "@/components/ExpertiseResources";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";

export default function ServicesPage() {
  // Custom buttons mapping to the Page 2 requirements (Define It, Host It, Bot Recognition, etc.)
  const customButtons = [
    // Column 1
    {
      label: "Define It",
      color: "var(--color-orange-5)", // Dark Brown #9b5d00
      textColor: "white",
      hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)",
    },
    {
      label: "Host It",
      color: "var(--color-accent-green-lime)", // Lime Green #b0e843
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
    },
    {
      label: "Bot Recognition",
      color: "var(--color-orange-2)", // Light Orange #ffc164
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    },
    // Column 2
    {
      label: "Refine It",
      color: "var(--color-blue-3)", // Medium Blue #006398
      textColor: "white",
      hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)",
    },
    {
      label: "Analyze It",
      color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)", // Highlighted rose gradient
      textColor: "white",
      hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)",
    },
    {
      label: "Story-Based Surveys",
      color: "var(--color-orange-1)", // Brand Orange #ff9900
      textColor: "white",
      hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
    },
    // Column 3
    {
      label: "Build It",
      color: "var(--color-accent-crimson)", // Crimson #ea425f
      textColor: "white",
      hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
    },
    {
      label: "Leverage It",
      color: "var(--color-accent-plum)", // Plum #532254
      textColor: "white",
      hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
    },
    {
      label: "Affinity Measurement",
      color: "var(--color-accent-green-mint)", // Mint Green #42ea86
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
    },
  ];

  return (
    <div className={styles.main}>
      <Navbar />

      {/* Two-Column layout block - Light Theme matching mockup */}
      <section className="section-light" style={{ padding: "9rem 0 6rem 0" }}>
        <div className={styles.pageGrid}>
          {/* Left Column: ExpertiseResources component carrying custom buttons */}
          <div className={styles.columnLeft}>
            <ExpertiseResources
              title="BuyFacts Service and Tool Areas"
              buttons={customButtons}
            />
          </div>

          {/* Right Column: MockMediaPlayer component */}
          <div className={styles.columnRight}>
            <div className={styles.stickyWrapper}>
              <span className={styles.sideLabel}>Service Walkthrough</span>
              <h3 className={styles.sideTitle}>Operational Demo</h3>
              <p className={styles.sideDesc}>
                Play the interactive walkthrough below to examine how the
                BuyFacts pipeline runs survey routing, validates respondents,
                and isolates bot telemetry.
              </p>
              <MockMediaPlayer
                title="Service Demonstration"
                subtitle="Detailed walkthrough showing how we define, host, and analyze surveys."
                mediaType="video"
              />
            </div>
          </div>
        </div>

        <div className={styles.container}>
          {/* Outline cards row matching mockup footer grids */}
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
