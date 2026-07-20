"use client";

import React, { useState, useEffect } from "react";
import { Send, CheckCircle } from "lucide-react";
import styles from "./coming-soon.module.css";

// ── Launch date: update this to your actual target ──
const LAUNCH_DATE = new Date("2026-10-01T00:00:00Z");

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ComingSoon() {
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate a brief async submit (wire up to your API as needed)
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className={styles.wrapper}>
      {/* Animated background */}
      <div className={styles.bgCanvas}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gradientOrb3} />
        <div className={styles.gridOverlay} />
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoText}>
            Buy<span className={styles.logoTextAccent}>Facts</span>
            <sup style={{ fontSize: "0.55em", verticalAlign: "super" }}>®</sup>
          </span>
          <span className={styles.logoDivider} />
          <span className={styles.logoSubtext}>Research Group</span>
        </div>

        {/* Eyebrow */}
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          The Early Recognition Company
          <span className={styles.eyebrowDot} />
        </div>

        {/* Headline */}
        <h1 className={styles.headline}>
          Saving Time So You{" "}
          <span className={styles.headlineAccent}>Have the Time</span>
        </h1>
        <p className={styles.subHeadline}>Something exciting is on its way.</p>

        {/* Description */}
        <p className={styles.description}>
          We&apos;re putting the finishing touches on a new experience built
          around faster, easier, and better B2B research. Be the first to know
          when we go live.
        </p>

        {/* Countdown */}
        <div className={styles.countdown} aria-label="Countdown to launch">
          <div className={styles.countUnit}>
            <span className={styles.countNumber}>{pad(days)}</span>
            <span className={styles.countLabel}>Days</span>
          </div>
          <span className={styles.countSeparator}>:</span>
          <div className={styles.countUnit}>
            <span className={styles.countNumber}>{pad(hours)}</span>
            <span className={styles.countLabel}>Hours</span>
          </div>
          <span className={styles.countSeparator}>:</span>
          <div className={styles.countUnit}>
            <span className={styles.countNumber}>{pad(minutes)}</span>
            <span className={styles.countLabel}>Minutes</span>
          </div>
          <span className={styles.countSeparator}>:</span>
          <div className={styles.countUnit}>
            <span className={styles.countNumber}>{pad(seconds)}</span>
            <span className={styles.countLabel}>Seconds</span>
          </div>
        </div>

        {/* Notify form */}
        {!submitted ? (
          <form
            className={styles.notifyForm}
            onSubmit={handleNotify}
            id="coming-soon-notify-form"
          >
            <input
              type="email"
              id="coming-soon-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your business email"
              className={styles.notifyInput}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className={styles.notifyBtn}
              id="coming-soon-notify-btn"
            >
              {loading ? "Sending…" : (
                <>Notify Me <Send size={14} /></>
              )}
            </button>
          </form>
        ) : (
          <p className={styles.successMsg}>
            <CheckCircle size={16} />
            You&apos;re on the list — we&apos;ll be in touch!
          </p>
        )}

        {/* Progress bar */}
        <div className={styles.progressWrapper}>
          <div className={styles.progressLabel}>
            <span>Launch Progress</span>
            <span>72%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
          </div>
        </div>

        {/* Footer note */}
        <p className={styles.footerNote}>
          Questions? Reach us at{" "}
          <a href="mailto:inquiries@buyfacts.com">inquiries@buyfacts.com</a>
        </p>
      </div>
    </div>
  );
}
