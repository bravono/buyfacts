import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Compass, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import styles from "./triad.module.css";

export const metadata: Metadata = {
  title: "TRIAD - Market Changes in Real Time | BuyFacts",
  description:
    "TRIAD measures shifts in buyer sentiment through focused research repeated over time, revealing emerging directional patterns and emotional drivers.",
};

const TRIAD_VIDEO_CDN =
  "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1792570971365-1vco29-Market_Changes_in_Real_Time_Triad.mp4";

export default function TriadPage() {
  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Back Navigation Link */}
          <div className={styles.backNav}>
            <Link href="/" className={styles.backLink}>
              <ArrowLeft size={16} />
              <span>Back to BuyFacts Home</span>
            </Link>
          </div>

          {/* Hero Section */}
          <header className={styles.header}>
            <span className={styles.eyebrow}>
              <Compass size={16} className={styles.eyebrowIcon} />
              BUYFACTS RESEARCH PLATFORM
            </span>
            <h1 className={styles.title}>TRIAD: Market Changes in Real Time</h1>
            <p className={styles.lead}>
              Markets change before those changes become obvious. TRIAD is designed to
              measure shifts in buyer sentiment through focused research repeated over
              time. By revealing emerging patterns and the practical and emotional
              drivers behind them, it can help marketers recognize change earlier and
              make better-informed decisions.
            </p>
          </header>

          {/* Video Showcase Section */}
          <section className={styles.videoSection} aria-label="TRIAD Demonstration Video">
            <div className={styles.videoCard}>
              <div className={styles.videoHeader}>
                <span className={styles.videoBadge}>Feature Demonstration</span>
                <h2 className={styles.videoTitle}>Watch TRIAD in Action</h2>
              </div>
              <div className={styles.videoContainer}>
                <video
                  src={TRIAD_VIDEO_CDN}
                  controls
                  playsInline
                  preload="metadata"
                  className={styles.videoElement}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </section>

          {/* Methodology Pillars */}
          <section className={styles.pillarsSection} aria-label="TRIAD Core Capabilities">
            <div className={styles.pillarsGrid}>
              <div className={styles.pillarCard}>
                <div className={styles.pillarIcon}>
                  <Compass size={24} />
                </div>
                <h3 className={styles.pillarHeading}>Three-Corner Questioning</h3>
                <p className={styles.pillarText}>
                  Interactive triangle question structure captures nuanced buyer sentiment
                  and trade-offs across competing priorities in real time.
                </p>
              </div>

              <div className={styles.pillarCard}>
                <div className={styles.pillarIcon}>
                  <TrendingUp size={24} />
                </div>
                <h3 className={styles.pillarHeading}>Directional Trend Velocity</h3>
                <p className={styles.pillarText}>
                  Longitudinal pulse tracking detects subtle momentum shifts and sentiment
                  trajectories well before competitors observe lagging indicators.
                </p>
              </div>

              <div className={styles.pillarCard}>
                <div className={styles.pillarIcon}>
                  <Sparkles size={24} />
                </div>
                <h3 className={styles.pillarHeading}>Emotional &amp; Practical Drivers</h3>
                <p className={styles.pillarText}>
                  Uncover what motivates buyer decisions by mapping underlying feelings,
                  unspoken frustrations, and pragmatic requirements.
                </p>
              </div>
            </div>
          </section>

          {/* Action CTA Section */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Ready to Experience Earlier Recognition?</h2>
              <p className={styles.ctaSubtitle}>
                Discover how TRIAD and the BuyFacts research suite empower strategic decisions.
              </p>
              <div className={styles.ctaActions}>
                <Link href="/contact" className={styles.primaryBtn}>
                  Contact Our Research Team
                </Link>
                <Link href="/" className={styles.secondaryBtn}>
                  Explore All Tools
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
