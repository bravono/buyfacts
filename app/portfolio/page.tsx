"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpertiseResources from "@/components/ExpertiseResources";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import { ArrowRight } from "lucide-react";
import styles from "./page.module.css";

export default function PortfolioPage() {
  return (
    <div className={styles.main}>
      {/* Background blobs for premium glow */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* Hero Header Section */}
      <section className={styles.heroBanner} id="thought-leadership">
        <div className="grid-bg"></div>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.tagline}>B2B Portfolio</span>
            <h1 className={styles.title}>Expertise & Resources</h1>
            <p className={styles.description}>
              Explore our core research disciplines, data collections, and quantitative methodologies used to evaluate B2B market trends.
            </p>
          </div>
        </div>
      </section>

      {/* Two-Column layout block - Dark Theme matching mockup but customized */}
      <section className={styles.section} id="best-practices" style={{ padding: "6rem 0" }}>
        <div className={styles.container}>
          <div className={styles.pageGrid}>
            {/* Left Column: ExpertiseResources component carrying original default buttons */}
            <div className={styles.columnLeft}>
              <ExpertiseResources 
                title="BuyFacts Expertise and Resources" 
              />
            </div>

            {/* Right Column: MockMediaPlayer component configured as Audio */}
            <div className={styles.columnRight}>
              <div className={styles.stickyWrapper}>
                <span className={styles.sideLabel}>Methodology Overview</span>
                <h3 className={styles.sideTitle}>Audio Walkthrough</h3>
                <p className={styles.sideDesc}>
                  Play the audio presentation below to hear a detailed breakdown of the BuyFacts B2B verification logic, executive panel audits, and return on effort analytics.
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
            <div className={styles.specCard}>Continuous B2B buyer panel sourcing</div>
            <div className={styles.specCard}>Manual credential validation audits</div>
            <div className={styles.specCard}>Cross-verifying qualitative signals</div>
            <div className={styles.specCard}>Velocity index tracking algorithms</div>
            <div className={styles.specCard}>Founding client program customization</div>
            <div className={styles.specCard}>GDPR compliant storage protocols</div>
          </div>

          <div style={{ textAlign: "center", marginTop: "5rem" }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", fontFamily: "var(--font-display)" }}>
              Ready to implement validated B2B analytics?
            </h3>
            <a href="/#contact" className="btn btn-primary">
              Consult a BuyFacts Expert <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
