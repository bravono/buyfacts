"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardAnimation, {
  type DashboardButton,
} from "@/components/DashboardAnimation";
import MockMediaPlayer from "@/components/MockMediaPlayer";
import Link from "next/link";
import styles from "./page.module.css";

const PLACEHOLDER = "https://www.buyfacts.com/";

/** Per-page button labels + URLs for the services dashboard graphic */
const SERVICE_BUTTONS: DashboardButton[] = [
  { label: "Define It", href: PLACEHOLDER },
  { label: "Host", href: PLACEHOLDER },
  { label: "Bot", href: PLACEHOLDER },
  { label: "Refine It", href: PLACEHOLDER },
  { label: "Analyze It", href: PLACEHOLDER },
  { label: "Story Based", href: PLACEHOLDER },
  { label: "Build It", href: PLACEHOLDER },
  { label: "Leverage", href: PLACEHOLDER },
  { label: "Affinity", href: PLACEHOLDER },
];

export default function ServicesPage() {
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
              buttons={SERVICE_BUTTONS}
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
