"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpertiseResources from "@/components/ExpertiseResources";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import { ArrowRight } from "lucide-react";
import styles from "./page.module.css";

export default function ServicesPage() {
  // Custom buttons mapping to the Page 2 requirements (Define It, Host It, Bot Recognition, etc.)
  const customButtons = [
    // Column 1
    {
      label: "Define It",
      color: "var(--color-orange-5)", // Dark Brown #9b5d00
      textColor: "white",
      hoverShadow: "0 0 15px rgba(155, 93, 0, 0.4)"
    },
    {
      label: "Host It",
      color: "var(--color-accent-green-lime)", // Lime Green #b0e843
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)"
    },
    {
      label: "Bot Recognition",
      color: "var(--color-orange-2)", // Light Orange #ffc164
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)"
    },
    // Column 2
    {
      label: "Refine It",
      color: "var(--color-blue-3)", // Medium Blue #006398
      textColor: "white",
      hoverShadow: "0 0 15px rgba(0, 99, 152, 0.4)"
    },
    {
      label: "Analyze It",
      color: "linear-gradient(135deg, #ea425f 0%, #ed40ed 100%)", // Highlighted rose gradient
      textColor: "white",
      hoverShadow: "0 0 20px rgba(234, 66, 95, 0.6)"
    },
    {
      label: "Story-Based Surveys",
      color: "var(--color-orange-1)", // Brand Orange #ff9900
      textColor: "white",
      hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)"
    },
    // Column 3
    {
      label: "Build It",
      color: "var(--color-accent-crimson)", // Crimson #ea425f
      textColor: "white",
      hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)"
    },
    {
      label: "Leverage It",
      color: "var(--color-accent-plum)", // Plum #532254
      textColor: "white",
      hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)"
    },
    {
      label: "Affinity Measurement",
      color: "var(--color-accent-green-mint)", // Mint Green #42ea86
      textColor: "var(--color-blue-5)",
      hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)"
    }
  ];

  return (
    <div className={styles.main}>
      <Navbar />

      {/* Services Header Banner */}
      <section className={styles.heroBanner}>
        <div className="grid-bg"></div>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.tagline}>B2B Services</span>
            <h1 className={styles.title}>Service and Tool Areas</h1>
            <p className={styles.description}>
              Discover how our modular workflow guides survey designs, manages secure hosting, and audits intent analytics.
            </p>
          </div>
        </div>
      </section>

      {/* Two-Column layout block - Light Theme matching mockup */}
      <section className="section-light" style={{ padding: "6rem 0" }}>
        <div className={styles.container}>
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
                  Play the interactive walkthrough below to examine how the BuyFacts pipeline runs survey routing, validates respondents, and isolates bot telemetry.
                </p>
                <MockMediaPlayer 
                  title="Service Demonstration" 
                  subtitle="Detailed walkthrough showing how we define, host, and analyze surveys." 
                  mediaType="video"
                />
              </div>
            </div>
          </div>

          {/* Outline cards row matching mockup footer grids */}
          <div className={styles.specGrid}>
            <div className={styles.specCard}>Define survey intent parameters</div>
            <div className={styles.specCard}>Host secure response nodes</div>
            <div className={styles.specCard}>Audit AI bot metadata logs</div>
            <div className={styles.specCard}>Build customized buyer panels</div>
            <div className={styles.specCard}>Leverage CRM analytics nodes</div>
            <div className={styles.specCard}>Measure buyer affinity gains</div>
          </div>

          <div style={{ textAlign: "center", marginTop: "5rem" }}>
            <a href="/#contact" className="btn btn-primary">
              Connect With a Project Manager <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
