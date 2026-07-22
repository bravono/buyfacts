"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardAnimation from "@/components/DashboardAnimation";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";

export default function ServicesPage() {
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);

  // Custom buttons mapping to the Page 2 requirements with random media mockup URLs
  const customButtons = [
    // Column 1
    {
      label: "Define It",
      color: "var(--color-orange-5)", // Dark Brown #9b5d00
      textColor: "white",
      hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)",
      mediaType: "video" as const,
      mediaUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      subtitle: "Interactive pipeline routing validation demonstration.",
    },
    {
      label: "Host It",
      color: "var(--color-accent-green-lime)", // Lime Green #b0e843
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
      mediaType: "image" as const,
      mediaUrl:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
      subtitle: "High-performance hosting platform architecture layout.",
    },
    {
      label: "Respondent Validation",
      color: "var(--color-orange-2)", // Light Orange #ffc164
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
      mediaType: "audio" as const,
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      subtitle: "Executive briefing explaining respondent validation procedures.",
    },
    // Column 2
    {
      label: "Refine It",
      color: "var(--color-blue-3)", // Medium Blue #006398
      textColor: "white",
      hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)",
      mediaType: "pdf" as const,
      mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
      subtitle: "Technical documentation covering the data refinement process.",
    },
    {
      label: "Analyze It",
      color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)", // Highlighted rose gradient
      textColor: "white",
      hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)",
      mediaType: "video" as const,
      mediaUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      subtitle: "Detailed overview demonstrating deep data analytics capabilities.",
    },
    {
      label: "Story-Based Surveys",
      color: "var(--color-orange-1)", // Brand Orange #ff9900
      textColor: "white",
      hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
      mediaType: "image" as const,
      mediaUrl:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
      subtitle:
        "Mock design demonstrating user flow logic in story-based surveys.",
    },
    // Column 3
    {
      label: "Build It",
      color: "var(--color-accent-crimson)", // Crimson #ea425f
      textColor: "white",
      hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
      mediaType: "audio" as const,
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      subtitle: "Briefing call explaining custom project builder patterns.",
    },
    {
      label: "Apply It",
      color: "var(--color-accent-plum)", // Plum #532254
      textColor: "white",
      hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
      mediaType: "pdf" as const,
      mediaUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      subtitle:
        "A practical guide and reference PDF document on data application.",
    },
    {
      label: "Buyer Drivers",
      color: "var(--color-accent-green-mint)", // Mint Green #42ea86
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
      mediaType: "video" as const,
      mediaUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      subtitle: "Study showing how primary buying indicators are identified.",
    },
  ];

  const currentMedia = customButtons[selectedButtonIndex] || customButtons[0];

  return (
    <div className={styles.main}>
      <Navbar />

      {/* Two-Column layout block - Light Theme matching mockup */}
      <section className="section-light" style={{ padding: "9rem 0 6rem 0" }}>
        <div className={styles.pageGrid}>
          {/* Left Column: interactive service / tool areas graphic */}
          <div className={styles.columnLeft}>
            <DashboardAnimation
              className={styles.dashboardAnimation}
              buttons={customButtons}
              title="Services and Tools"
              selectedButtonIndex={selectedButtonIndex}
              onSelectButton={setSelectedButtonIndex}
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
                title={currentMedia.label}
                subtitle={currentMedia.subtitle}
                mediaType={currentMedia.mediaType}
                mediaUrl={currentMedia.mediaUrl}
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
