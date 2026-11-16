import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Layers, ShieldCheck, Target, BarChart2 } from "lucide-react";
import styles from "./rule-of-three.module.css";
import RuleOfThreeViewer from "@/components/r3/RuleOfThreeViewer";

export const metadata: Metadata = {
  title: "Rule of Three - Strategy, Messaging & Survey Platform | BuyFacts",
  description:
    "Explore the Rule of Three framework for high-impact market research, active surveying, push marketing strategy, and executive decision summaries.",
};

export default function RuleOfThreePage() {
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
              <Layers size={16} className={styles.eyebrowIcon} />
              BUYFACTS RESEARCH PLATFORM
            </span>
            <h1 className={styles.title}>Rule of Three: Interactive Research Engine</h1>
            <p className={styles.lead}>
              Structure buyer insights around high-leverage decision rules. Rule of Three
              empowers marketers, strategists, and researchers to capture active survey
              responses, stress-test push marketing messages, and synthesize multi-channel
              sentiment into clear top-level recommendations.
            </p>
          </header>

          {/* Interactive Rule of Three Application Embed */}
          <section className={styles.interactiveSection}>
            <RuleOfThreeViewer />
          </section>

          {/* Value Pillars Section */}
          <section className={styles.pillarsSection}>
            <div className={styles.pillarsGrid}>
              <div className={styles.pillarCard}>
                <div className={styles.pillarIcon}>
                  <Target size={24} />
                </div>
                <h3 className={styles.pillarHeading}>Active Survey Execution</h3>
                <p className={styles.pillarText}>
                  Engage respondents with interactive questioning modes designed to uncover
                  genuine buyer priorities, hesitation triggers, and core requirements.
                </p>
              </div>

              <div className={styles.pillarCard}>
                <div className={styles.pillarIcon}>
                  <ShieldCheck size={24} />
                </div>
                <h3 className={styles.pillarHeading}>Push Marketing &amp; Social Feeds</h3>
                <p className={styles.pillarText}>
                  Evaluate messaging resonance across outbound campaigns and social
                  channels, verifying value propositions before scaling spend.
                </p>
              </div>

              <div className={styles.pillarCard}>
                <div className={styles.pillarIcon}>
                  <BarChart2 size={24} />
                </div>
                <h3 className={styles.pillarHeading}>Top-Level Strategic Synthesis</h3>
                <p className={styles.pillarText}>
                  Condense complex response streams into three core decision vectors,
                  giving stakeholders unambiguous clarity for strategic execution.
                </p>
              </div>
            </div>
          </section>

          {/* Action CTA Section */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Ready to Maximize Campaign Impact?</h2>
              <p className={styles.ctaSubtitle}>
                Discover how Rule of Three and the BuyFacts intelligence platform transform market signals into decisive actions.
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
