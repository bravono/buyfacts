"use client";

import React from "react";
import styles from "./BorderFrame.module.css";

export default function BorderFrame() {
  return (
    <div className={styles.frameContainer}>
      {/* Top and Bottom Horizontal Borders */}
      <div className={styles.topBorder} />
      <div className={styles.bottomBorder} />

      {/* Corner SVGs */}
      {/* Top-Left: Dark Blue Polygon */}
      <svg
        className={`${styles.corner} ${styles.topLeft}`}
        viewBox="0 0 300 120"
        preserveAspectRatio="none"
      >
        <polygon points="0,0 300,0 0,90" fill="#00507b" />
      </svg>

      {/* Top-Right: Orange & Yellow Overlap */}
      <svg
        className={`${styles.corner} ${styles.topRight}`}
        viewBox="0 0 300 160"
        preserveAspectRatio="none"
      >
        {/* Orange polygon (base layer) */}
        <polygon points="0,0 300,0 300,90" fill="#e57a45" />
        {/* Yellow/Amber polygon (top layer) */}
        <polygon points="120,0 300,0 300,160" fill="#ffb039" />
      </svg>

      {/* Bottom-Left: Yellow & Orange Overlap */}
      <svg
        className={`${styles.corner} ${styles.bottomLeft}`}
        viewBox="0 0 300 160"
        preserveAspectRatio="none"
      >
        {/* Yellow/Amber polygon (base layer) */}
        <polygon points="0,160 180,160 0,0" fill="#ffb039" />
        {/* Orange polygon (top layer) */}
        <polygon points="0,160 300,160 0,70" fill="#e57a45" />
      </svg>

      {/* Bottom-Right: Dark Blue Polygon */}
      <svg
        className={`${styles.corner} ${styles.bottomRight}`}
        viewBox="0 0 300 120"
        preserveAspectRatio="none"
      >
        <polygon points="0,120 300,120 300,30" fill="#00507b" />
      </svg>
    </div>
  );
}
