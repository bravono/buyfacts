"use client";

import React from "react";
import styles from "./ExpertiseResources.module.css";

interface ButtonData {
  label: string;
  color: string;
  textColor: string;
  hoverShadow: string;
}

interface ExpertiseResourcesProps {
  title?: string;
  buttons?: ButtonData[];
}

export default function ExpertiseResources({
  title,
  buttons,
}: ExpertiseResourcesProps) {
  // Default title
  const displayTitle = title || "BuyFacts Expertise and Resources";

  // Default 6 buttons matching the mockup text, colors, and layout
  const defaultButtons: ButtonData[] = [
    // Column 1
    {
      label: "Survey Respondent Engagement",
      color: "var(--color-accent-green-lime)", // Lime Green #b0e843
      textColor: "var(--color-blue-5)", // Dark text for contrast
      hoverShadow: "0 0 15px rgba(176, 232, 67, 0.4)",
    },
    {
      label: "Content Creation",
      color: "var(--color-orange-2)", // Light Orange/Beige #ffc164
      textColor: "var(--color-blue-5)", // Dark text for contrast
      hoverShadow: "0 0 15px rgba(255, 193, 100, 0.4)",
    },
    // Column 2
    {
      label: "Research Methods",
      color: "var(--color-orange-1)", // Brand Orange #ff9900
      textColor: "white",
      hoverShadow: "0 0 15px rgba(255, 153, 0, 0.4)",
    },
    // Column 3
    {
      label: "Research Speed",
      color: "var(--color-accent-crimson)", // Crimson #ea425f
      textColor: "white",
      hoverShadow: "0 0 15px rgba(234, 66, 95, 0.4)",
    },
    {
      label: "Hybrid Marketing",
      color: "var(--color-accent-plum)", // Plum #532254
      textColor: "white",
      hoverShadow: "0 0 15px rgba(83, 34, 84, 0.4)",
    },
    {
      label: "Marketing Influence",
      color: "var(--color-accent-green-mint)", // Mint Green #42ea86
      textColor: "var(--color-blue-5)", // Dark text for contrast
      hoverShadow: "0 0 15px rgba(66, 234, 134, 0.4)",
    },
  ];

  const displayButtons = buttons || defaultButtons;

  return (
    <div className={styles.wrapper}>
      {/* 3D Cylinder Container */}
      <div className={styles.cylinder}>
        {/* Top 3D Landscape Canvas */}
        <div className={styles.landscapeCanvas}>
          <svg
            className={styles.svgLandscape}
            viewBox="0 0 800 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Sky Grid */}
            <rect width="800" height="500" rx="30" fill="url(#sky-gradient)" />

            {/* Cloud Grids */}
            <circle cx="150" cy="120" r="50" fill="rgba(255,255,255,0.06)" />
            <circle cx="210" cy="130" r="40" fill="rgba(255,255,255,0.04)" />
            <circle cx="680" cy="90" r="70" fill="rgba(255,255,255,0.05)" />

            {/* Left: Blue Ridge Mountains */}
            <path
              d="M50 400 L180 200 L280 320 L380 180 L480 350 L580 250 L680 400 Z"
              fill="url(#mountain-blue)"
              opacity="0.85"
            />
            <path
              d="M80 400 L210 230 L310 350 L410 200 L510 380 Z"
              fill="url(#mountain-indigo)"
              opacity="0.6"
            />

            {/* Right: Volcanic Mountains with smoke column */}
            <path
              d="M480 400 L580 230 L660 300 L730 190 L800 350 Z"
              fill="url(#mountain-volcano)"
              opacity="0.75"
            />
            {/* Volcanic Smoke Paths */}
            <path
              d="M580 230 C580 160, 520 120, 550 80 C570 50, 630 60, 620 110 C620 140, 590 180, 580 230 Z"
              fill="rgba(255, 255, 255, 0.15)"
            />
            <path
              d="M730 190 C730 130, 680 100, 700 70 C720 40, 770 50, 760 90 C760 120, 740 150, 730 190 Z"
              fill="rgba(255, 255, 255, 0.12)"
            />

            {/* Center/Top: Green Research Innovation Plateau */}
            <ellipse
              cx="380"
              cy="270"
              rx="90"
              ry="25"
              fill="var(--color-accent-green-mint)"
              opacity="0.85"
            />
            <ellipse
              cx="380"
              cy="270"
              rx="80"
              ry="20"
              fill="#00507b"
              opacity="0.2"
            />
            <text
              x="380"
              y="270"
              className={styles.plateauText}
              fill="white"
              textAnchor="middle"
            >
              Research Innovation
            </text>

            {/* Left/Top: Hot Air Balloon "RESEARCH" */}
            {/* Balloon Body */}
            <path
              d="M260 120 C260 80, 310 80, 310 120 C310 145, 295 160, 285 170 C285 174, 285 174, 285 176 H285 H280 H280 V170 C272 158, 260 145, 260 120 Z"
              fill="var(--color-orange-1)"
            />
            <ellipse
              cx="285"
              cy="120"
              rx="10"
              ry="40"
              fill="var(--color-orange-2)"
            />
            <rect
              x="281"
              y="180"
              width="8"
              height="6"
              rx="1"
              fill="var(--color-orange-5)"
            />
            <line
              x1="282"
              y1="174"
              x2="282"
              y2="180"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
            />
            <line
              x1="288"
              y1="174"
              x2="288"
              y2="180"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
            />
            <text
              x="285"
              y="125"
              className={styles.balloonText}
              fill="white"
              textAnchor="middle"
            >
              RESEARCH
            </text>

            {/* Front: Orange and Green Valley Rows */}
            <path
              d="M150 400 C250 340, 350 360, 500 400 L450 450 C330 410, 220 410, 100 450 Z"
              fill="url(#valley-orange)"
              opacity="0.9"
            />
            <path
              d="M300 400 C360 360, 420 370, 550 400 L520 450 C420 410, 350 410, 220 450 Z"
              fill="url(#valley-green)"
              opacity="0.85"
            />

            {/* Defining Gradients */}
            <defs>
              <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00293f" />
                <stop offset="100%" stopColor="#003e60" />
              </linearGradient>
              <linearGradient
                id="mountain-blue"
                x1="180"
                y1="200"
                x2="180"
                y2="400"
              >
                <stop offset="0%" stopColor="var(--color-blue-2)" />
                <stop offset="100%" stopColor="var(--color-blue-5)" />
              </linearGradient>
              <linearGradient
                id="mountain-indigo"
                x1="210"
                y1="230"
                x2="210"
                y2="400"
              >
                <stop offset="0%" stopColor="var(--color-accent-blue-neon)" />
                <stop offset="100%" stopColor="var(--color-blue-5)" />
              </linearGradient>
              <linearGradient
                id="mountain-volcano"
                x1="580"
                y1="230"
                x2="580"
                y2="400"
              >
                <stop offset="0%" stopColor="var(--color-accent-crimson)" />
                <stop offset="100%" stopColor="var(--color-grey-5)" />
              </linearGradient>
              <linearGradient
                id="valley-orange"
                x1="300"
                y1="340"
                x2="300"
                y2="450"
              >
                <stop offset="0%" stopColor="var(--color-orange-3)" />
                <stop offset="100%" stopColor="var(--color-orange-5)" />
              </linearGradient>
              <linearGradient
                id="valley-green"
                x1="420"
                y1="360"
                x2="420"
                y2="450"
              >
                <stop offset="0%" stopColor="var(--color-accent-green-lime)" />
                <stop offset="100%" stopColor="var(--color-blue-5)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Cylinder Body Section - Dark container carrying the header and buttons */}
        <div className={styles.cylinderBody}>
          <h2 className={styles.cylinderTitle} id="expertise-title">
            {displayTitle}
          </h2>

          {/* Grid Layout conforming to the 2 buttons per row */}
          <div className={styles.gridContainer}>
            {displayButtons.map((btn, index) => (
              <button
                key={`btn-${index}`}
                className={styles.expertBtn}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
