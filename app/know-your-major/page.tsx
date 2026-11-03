"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import kymQuestionsData from "@/public/KYM_TRIAD_DATA.json";
import {
  CornerKey,
  KymDomain,
  KymQuestion,
  PlesFocusArea,
  RecordedReflection,
  SatchelLifecycleState,
  DomainAggregate,
} from "@/types/triad";

const ALL_QUESTIONS: KymQuestion[] = (kymQuestionsData as any[]).map((q, idx) => ({
  ...q,
  questionNumber: q.questionNumber || idx + 1,
  id: q.id || q.qNo || `kym-${q.questionNumber || idx + 1}`,
  choices: {
    Top: q.Top || q.choices?.Top || "Strong Positive",
    LL: q.LL || q.choices?.LL || "Least Favorable",
    LR: q.LR || q.choices?.LR || "Moderate / Neutral",
  },
}));

const DEMO_QUESTIONS: KymQuestion[] = [
  ALL_QUESTIONS[0],  // Q1
  ALL_QUESTIONS[2],  // Q3
  ALL_QUESTIONS[14], // Q15
  ALL_QUESTIONS[17], // Q18
].filter(Boolean);

// Universal Relatable Topic: Ice Cream Consumer Sentiment (4-Question Demo Set)
const ICE_CREAM_QUESTIONS: KymQuestion[] = ([
  {
    id: "ice-1",
    questionNumber: 1,
    queryName: "Flavor Adventure",
    focusArea: "Priority",
    question: "When choosing ice cream, how do you feel about trying bold, unusual new flavors?",
    choices: {
      Top: "Love Exploring New Flavors",
      LL: "Stick to Classic Favorites",
      LR: "Sample First, Then Decide",
    },
  },
  {
    id: "ice-2",
    questionNumber: 2,
    queryName: "Health & Ingredients",
    focusArea: "Effort",
    question: "How much do low-sugar, dairy-free, or all-natural ingredients influence your purchase?",
    choices: {
      Top: "Major Factor in My Choice",
      LL: "Taste Matters Most to Me",
      LR: "Nice Bonus if Tastes Good",
    },
  },
  {
    id: "ice-3",
    questionNumber: 3,
    queryName: "Treat Occasion",
    focusArea: "Share",
    question: "What makes buying ice cream feel like a worthwhile experience for you?",
    choices: {
      Top: "Sharing Outings with Family/Friends",
      LL: "Quick Solo Everyday Treat",
      LR: "Special Weekend Reward",
    },
  },
  {
    id: "ice-4",
    questionNumber: 4,
    queryName: "Price vs. Quality",
    focusArea: "Legacy",
    question: "How do you react when a craft ice cream brand raises prices for small-batch quality?",
    choices: {
      Top: "Gladly Pay More for Craft Quality",
      LL: "Switch to a Lower-Priced Brand",
      LR: "Buy Less Often as a Treat",
    },
  },
] as any[]).map((q) => ({ ...q, learningMode: "Experiential", category: "Consumer", puckColor: "#0f172a", fillColor: "#dbeafe" }));

export const CORNER_SCORES: Record<CornerKey, 33 | 66 | 99> = {
  Top: 99,
  LR: 66,
  LL: 33,
};

export const FOCUS_TO_DOMAIN: Record<PlesFocusArea, KymDomain> = {
  Priority: "Cognitive",
  Effort: "Physical",
  Legacy: "Creative",
  Share: "Social",
};

export function scoreToWholeElevation(score: number): number {
  const clamped = Math.max(33, Math.min(99, score));
  if (clamped <= 66) {
    return Math.round(((clamped - 66) / 33) * 3.3);
  }
  return Math.round(((clamped - 66) / 33) * 4.9);
}

// Strict Geometric Clamping so the Puck (radius=34) NEVER goes beyond the inside wall of the triangle
function clampPuckInsideTriangle(x: number, y: number): { x: number; y: number } {
  const cy = Math.max(-52, Math.min(59, y));
  const maxHalfWidth = Math.max(0, (cy - -52) * 0.67757);
  const cx = Math.max(-maxHalfWidth, Math.min(maxHalfWidth, x));
  return { x: Math.round(cx), y: Math.round(cy) };
}

export interface SubAspectPoint {
  id: string;
  label: string;
  quadrantName: "Cognitive" | "Creative" | "Social" | "Practical";
  personalizedTitle: string;
  nx: number;
  ny: number;
  student: number;
  parent: number;
  school: number;
}

export const QUADRANT_SUB_ASPECTS: Record<KymDomain, SubAspectPoint[]> = {
  Cognitive: [
    { id: "cog-1", label: "Analytical Problem Solving", quadrantName: "Cognitive", personalizedTitle: "Cognitive Ability", nx: 0.25, ny: -0.24, student: 3, parent: 3, school: 3 },
    { id: "cog-2", label: "Conceptual Curiosity", quadrantName: "Creative", personalizedTitle: "Social Consensus", nx: -0.26, ny: -0.24, student: 4, parent: 3, school: 0 },
    { id: "cog-3", label: "Research Methodology", quadrantName: "Social", personalizedTitle: "Cognitive Ability", nx: 0.36, ny: 0.16, student: 5, parent: 0, school: 4 },
    { id: "cog-4", label: "Rote Memorization", quadrantName: "Practical", personalizedTitle: "Creative Discord", nx: -0.28, ny: 0.26, student: -2, parent: -2, school: -2 },
    { id: "cog-5", label: "Repetitive Drills", quadrantName: "Practical", personalizedTitle: "Non-Physical", nx: 0.18, ny: 0.32, student: -2, parent: -1, school: 0 },
  ],
  Creative: [
    { id: "cre-1", label: "Original Design & Ideation", quadrantName: "Creative", personalizedTitle: "Creative Synergy", nx: 0.25, ny: -0.24, student: 3, parent: 3, school: 3 },
    { id: "cre-2", label: "Visual Storytelling", quadrantName: "Cognitive", personalizedTitle: "Social Consensus", nx: -0.30, ny: -0.18, student: 4, parent: 3, school: -1 },
    { id: "cre-3", label: "Rigid Templates", quadrantName: "Practical", personalizedTitle: "Creative Discord", nx: -0.25, ny: 0.28, student: -2, parent: -2, school: -2 },
    { id: "cre-4", label: "Studio Collaboration", quadrantName: "Social", personalizedTitle: "Cognitive Ability", nx: 0.35, ny: 0.22, student: 4, parent: 0, school: 5 },
  ],
  Social: [
    { id: "soc-1", label: "Team Leadership & Empathy", quadrantName: "Social", personalizedTitle: "Social Consensus", nx: 0.22, ny: -0.24, student: 3, parent: 3, school: 3 },
    { id: "soc-2", label: "Community Engagement", quadrantName: "Creative", personalizedTitle: "Cognitive Ability", nx: -0.32, ny: -0.20, student: 4, parent: 3, school: 0 },
    { id: "soc-3", label: "Isolated Desk Work", quadrantName: "Practical", personalizedTitle: "Creative Discord", nx: -0.28, ny: 0.25, student: -3, parent: 1, school: -3 },
    { id: "soc-4", label: "Peer Mentoring", quadrantName: "Cognitive", personalizedTitle: "Non-Physical", nx: 0.36, ny: 0.20, student: 4, parent: 0, school: 5 },
  ],
  Physical: [
    { id: "phy-1", label: "Hands-On Lab Building", quadrantName: "Practical", personalizedTitle: "Practical Mastery", nx: 0.26, ny: -0.22, student: 3, parent: 3, school: 3 },
    { id: "phy-2", label: "Fieldwork Stamina", quadrantName: "Social", personalizedTitle: "Creative Discord", nx: -0.30, ny: 0.24, student: -3, parent: -3, school: 1 },
    { id: "phy-3", label: "Equipment Prototyping", quadrantName: "Cognitive", personalizedTitle: "Cognitive Ability", nx: 0.34, ny: 0.22, student: 4, parent: -1, school: 5 },
    { id: "phy-4", label: "Repetitive Manual Drills", quadrantName: "Creative", personalizedTitle: "Non-Physical", nx: -0.24, ny: -0.22, student: -2, parent: -2, school: -2 },
  ],
};

export const FOUR_YEAR_JOURNEY: Record<
  string,
  {
    label: string;
    from: string;
    to: string;
    student: Record<KymDomain, number>;
    parent: Record<KymDomain, number>;
    school: Record<KymDomain, number>;
  }
> = {
  YEAR_1: {
    label: "Year 1 (Freshman)",
    from: "2023-09-01",
    to: "2024-05-30",
    student: { Cognitive: 2, Creative: 1, Social: 3, Physical: -2 },
    parent: { Cognitive: 2, Creative: 1, Social: 2, Physical: 1 },
    school: { Cognitive: 2, Creative: 1, Social: 2, Physical: 0 },
  },
  YEAR_2: {
    label: "Year 2 (Sophomore)",
    from: "2024-09-01",
    to: "2025-05-30",
    student: { Cognitive: 3, Creative: 2, Social: 3, Physical: -1 },
    parent: { Cognitive: 3, Creative: 2, Social: 2, Physical: 2 },
    school: { Cognitive: 3, Creative: 2, Social: 2, Physical: 1 },
  },
  YEAR_3: {
    label: "Year 3 (Junior)",
    from: "2025-09-01",
    to: "2026-05-30",
    student: { Cognitive: 4, Creative: 3, Social: 4, Physical: 1 },
    parent: { Cognitive: 4, Creative: 3, Social: 3, Physical: 2 },
    school: { Cognitive: 4, Creative: 3, Social: 3, Physical: 2 },
  },
  YEAR_4: {
    label: "Year 4 (Senior)",
    from: "2026-09-01",
    to: "2027-05-30",
    student: { Cognitive: 5, Creative: 5, Social: 4, Physical: 3 },
    parent: { Cognitive: 5, Creative: 4, Social: 4, Physical: 3 },
    school: { Cognitive: 5, Creative: 5, Social: 3, Physical: 3 },
  },
};

interface DiscFeature {
  nx: number;
  ny: number;
  magnitude: number;
  colorType:
    | "SOURCE_PEAK"
    | "SOURCE_VALLEY"
    | "CONSENSUS_RED"
    | "CONSENSUS_GREEN"
    | "CONSENSUS_BLUE"
    | "UNDERSIDE_DIP";
  label?: string;
  personalizedTitle?: string;
}

function SurfaceDiscCanvas({
  title,
  subtitle,
  width,
  height,
  features,
  isConsensus,
  highlighted,
  showPersonalizedLabels,
}: {
  title: string;
  subtitle?: string;
  width: number;
  height: number;
  features: DiscFeature[];
  isConsensus?: boolean;
  highlighted?: boolean;
  showPersonalizedLabels?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height * 0.52;
    const rx = width * 0.41;
    const ry = height * 0.28;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.16)";
    ctx.filter = "blur(10px)";
    ctx.fill();
    ctx.restore();

    const gridSteps = 28;
    const sigma = 0.21;
    const maxScaleZ = isConsensus ? height * 0.036 : height * 0.048;

    const getElevationAndColor = (u: number, v: number) => {
      let totalZ = 0;
      let dominantColor: DiscFeature["colorType"] | null = null;
      let maxContribution = 0;

      for (const f of features) {
        const dist2 = (u - f.nx) ** 2 + (v - f.ny) ** 2;
        const weight = Math.exp(-dist2 / (2 * sigma * sigma));
        const contrib = f.magnitude * weight;
        totalZ += contrib;
        if (Math.abs(contrib) > maxContribution && weight > 0.16) {
          maxContribution = Math.abs(contrib);
          dominantColor = f.colorType;
        }
      }
      return { totalZ, dominantColor, maxContribution };
    };

    for (let j = -gridSteps; j < gridSteps; j++) {
      const v0 = j / gridSteps;
      const v1 = (j + 1) / gridSteps;
      for (let i = -gridSteps; i < gridSteps; i++) {
        const u0 = i / gridSteps;
        const u1 = (i + 1) / gridSteps;
        if (u0 * u0 + v0 * v0 > 0.96) continue;

        const p00 = getElevationAndColor(u0, v0);
        const p10 = getElevationAndColor(u1, v0);
        const p11 = getElevationAndColor(u1, v1);
        const p01 = getElevationAndColor(u0, v1);

        const avgZ = (p00.totalZ + p10.totalZ + p11.totalZ + p01.totalZ) / 4;
        if (avgZ >= -0.1) continue;

        const x00 = cx + u0 * rx;
        const y00 = cy + v0 * ry - p00.totalZ * maxScaleZ;
        const x10 = cx + u1 * rx;
        const y10 = cy + v0 * ry - p10.totalZ * maxScaleZ;
        const x11 = cx + u1 * rx;
        const y11 = cy + v1 * ry - p11.totalZ * maxScaleZ;
        const x01 = cx + u0 * rx;
        const y01 = cy + v1 * ry - p01.totalZ * maxScaleZ;

        const intensity = Math.min(1, Math.abs(avgZ) / (isConsensus ? 7 : 4));
        const fill = isConsensus
          ? `rgba(147, 51, 234, ${0.55 + intensity * 0.42})`
          : `rgba(109, 40, 217, ${0.55 + intensity * 0.42})`;

        ctx.beginPath();
        ctx.moveTo(x00, y00);
        ctx.lineTo(x10, y10);
        ctx.lineTo(x11, y11);
        ctx.lineTo(x01, y01);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = "rgba(233, 213, 255, 0.4)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    const baseGrad = ctx.createRadialGradient(cx, cy - ry * 0.2, rx * 0.1, cx, cy, rx);
    baseGrad.addColorStop(0, "rgba(94, 234, 212, 0.86)");
    baseGrad.addColorStop(0.65, "rgba(20, 184, 166, 0.88)");
    baseGrad.addColorStop(1, "rgba(15, 118, 110, 0.92)");

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    for (let j = -gridSteps; j < gridSteps; j++) {
      const v0 = j / gridSteps;
      const v1 = (j + 1) / gridSteps;
      for (let i = -gridSteps; i < gridSteps; i++) {
        const u0 = i / gridSteps;
        const u1 = (i + 1) / gridSteps;
        if (u0 * u0 + v0 * v0 > 0.96) continue;

        const p00 = getElevationAndColor(u0, v0);
        const p10 = getElevationAndColor(u1, v0);
        const p11 = getElevationAndColor(u1, v1);
        const p01 = getElevationAndColor(u0, v1);

        const avgZ = (p00.totalZ + p10.totalZ + p11.totalZ + p01.totalZ) / 4;
        if (avgZ <= 0.1) continue;

        const x00 = cx + u0 * rx;
        const y00 = cy + v0 * ry - p00.totalZ * maxScaleZ;
        const x10 = cx + u1 * rx;
        const y10 = cy + v0 * ry - p10.totalZ * maxScaleZ;
        const x11 = cx + u1 * rx;
        const y11 = cy + v1 * ry - p11.totalZ * maxScaleZ;
        const x01 = cx + u0 * rx;
        const y01 = cy + v1 * ry - p01.totalZ * maxScaleZ;

        const dom = p00.dominantColor;
        const intensity = Math.min(1, Math.abs(avgZ) / (isConsensus ? 8 : 4.2));

        let fill = "rgba(217, 119, 6, 0.75)";
        let stroke = "rgba(255, 255, 255, 0.25)";

        if (dom === "SOURCE_PEAK") {
          fill = `rgba(217, 119, 6, ${0.5 + intensity * 0.48})`;
          stroke = "rgba(254, 243, 199, 0.4)";
        } else if (dom === "CONSENSUS_RED") {
          fill = `rgba(220, 38, 38, ${0.55 + intensity * 0.44})`;
          stroke = "rgba(254, 202, 202, 0.45)";
        } else if (dom === "CONSENSUS_GREEN") {
          fill = `rgba(22, 163, 74, ${0.55 + intensity * 0.44})`;
          stroke = "rgba(187, 247, 208, 0.45)";
        } else if (dom === "CONSENSUS_BLUE") {
          fill = `rgba(37, 99, 235, ${0.55 + intensity * 0.44})`;
          stroke = "rgba(191, 219, 254, 0.45)";
        }

        ctx.beginPath();
        ctx.moveTo(x00, y00);
        ctx.lineTo(x10, y10);
        ctx.lineTo(x11, y11);
        ctx.lineTo(x01, y01);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.lineTo(cx + rx, cy);
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx, cy + ry);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = highlighted ? "#2563eb" : "#1e3a8a";
    ctx.lineWidth = highlighted ? 4 : 3;
    ctx.stroke();

    features.forEach((f) => {
      if (Math.abs(f.magnitude) < 0.5) return;
      const fx = cx + f.nx * rx;
      const fy = cy + f.ny * ry - f.magnitude * maxScaleZ;

      ctx.beginPath();
      ctx.arc(fx, fy, isConsensus ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = f.magnitude > 0 ? "#ffffff" : "#f3e8ff";
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      const tag = f.magnitude > 0 ? `+${Math.round(f.magnitude)}` : `${Math.round(f.magnitude)}`;
      ctx.font = "900 13px Segoe UI, sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.fillText(tag, fx, f.magnitude > 0 ? fy - 10 : fy + 18);

      if (isConsensus && showPersonalizedLabels && f.personalizedTitle) {
        const lx = f.nx >= 0 ? fx + 58 : fx - 58;
        const ly = f.magnitude > 0 ? fy - 14 : fy + 16;

        ctx.save();
        ctx.font = "800 12px Segoe UI, sans-serif";
        const textWidth = ctx.measureText(f.personalizedTitle).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(lx - textWidth / 2 - 8, ly - 11, textWidth + 16, 20, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "center";
        ctx.fillText(f.personalizedTitle, lx, ly + 3);
        ctx.restore();
      }
    });
  }, [width, height, features, isConsensus, highlighted, showPersonalizedLabels]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height * 0.52;
    if (Math.abs(x) > width * 0.43 || Math.abs(y) > height * 0.34) {
      setHoveredQuadrant(null);
      return;
    }
    if (x < 0 && y < 0) setHoveredQuadrant("Creative");
    else if (x >= 0 && y < 0) setHoveredQuadrant("Cognitive");
    else if (x < 0 && y >= 0) setHoveredQuadrant("Practical");
    else setHoveredQuadrant("Social");
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: highlighted ? "#eff6ff" : "transparent",
        borderRadius: "16px",
        padding: "6px",
        border: highlighted ? "2px solid #3b82f6" : "2px solid transparent",
        transition: "all 0.2s ease",
      }}
    >
      {isConsensus && (
        <div style={{ textAlign: "center", marginBottom: "2px" }}>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a" }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>{subtitle}</div>
          )}
        </div>
      )}

      {hoveredQuadrant && (
        <div
          style={{
            position: "absolute",
            top: isConsensus ? "48px" : "10px",
            right: "14px",
            background: "#0f172a",
            color: "#ffffff",
            padding: "5px 14px",
            borderRadius: "999px",
            fontSize: "14px",
            fontWeight: 900,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          Quadrant: {hoveredQuadrant}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredQuadrant(null)}
        style={{ width: `${width}px`, height: `${height}px`, display: "block", cursor: "crosshair" }}
      />
      {!isConsensus && (
        <div style={{ textAlign: "center", marginTop: "2px" }}>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KnowYourMajorTriadPage() {
  const [studentName, setStudentName] = useState<string>("Alex Morgan");

  // Multi-Skin Architecture: "KYM" (Know Your Major) vs "ICE_CREAM" (Universal Consumer Sentiment Demo)
  const [activeSkin, setActiveSkin] = useState<"KYM" | "ICE_CREAM">("KYM");

  // Views:
  // "EDUCATOR_PILOT" | "SELF_RUNNING_VIDEO" | "TRIAD" | "SUMMARY" | "CONTOUR_CHART" | "ICE_CREAM_BAR_CHART"
  const [viewMode, setViewMode] = useState<
    "EDUCATOR_PILOT" | "SELF_RUNNING_VIDEO" | "TRIAD" | "SUMMARY" | "CONTOUR_CHART" | "ICE_CREAM_BAR_CHART"
  >("TRIAD");

  // 4-Question Sample vs Registered 20-Question Full Reflection Model
  const [kymQuestionMode, setKymQuestionMode] = useState<"SAMPLE_4" | "FULL_20">("SAMPLE_4");
  const [is20QUnlocked, setIs20QUnlocked] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [regForm, setRegForm] = useState({ name: "", school: "", role: "School Administrator", email: "" });

  const activeQuestionPool = useMemo(() => {
    if (activeSkin === "ICE_CREAM") return ICE_CREAM_QUESTIONS;
    return kymQuestionMode === "FULL_20" ? ALL_QUESTIONS : DEMO_QUESTIONS;
  }, [activeSkin, kymQuestionMode]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [historyStack, setHistoryStack] = useState<number[]>([]);
  const [persistentCorner, setPersistentCorner] = useState<CornerKey | null>(null);
  const [satchelState, setSatchelState] = useState<SatchelLifecycleState>("IDLE_CLOSED");
  const [weights, setWeights] = useState<{ w1: number; w2: number; w3: number }>({
    w1: 0.33,
    w2: 0.33,
    w3: 0.34,
  });
  const [puckOffset, setPuckOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [reflections, setReflections] = useState<Record<string, RecordedReflection>>({});

  const [comparisonFilter, setComparisonFilter] = useState<
    "SUMMARY" | "INDIVIDUAL" | "INDIVIDUAL_PARENT" | "INDIVIDUAL_SCHOOL" | "SHARED_VIEW"
  >("SUMMARY");

  const [selectedQuadrant, setSelectedQuadrant] = useState<KymDomain>("Cognitive");
  const [contourViewFilter, setContourViewFilter] = useState<
    "COMBINED" | "INDIVIDUAL" | "PARENT" | "SCHOOL"
  >("COMBINED");

  const [showPersonalizedLabels, setShowPersonalizedLabels] = useState<boolean>(true);
  const [contourDisplayMode, setContourDisplayMode] = useState<"HIGHLIGHTS" | "COMPOSITE">("HIGHLIGHTS");

  const [journeyEnabled, setJourneyEnabled] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>("YEAR_4");
  const [periodFrom, setPeriodFrom] = useState<string>("2026-09-01");
  const [periodTo, setPeriodTo] = useState<string>("2027-05-30");

  const activeQuestion = activeQuestionPool[currentIndex] || activeQuestionPool[0];

  useEffect(() => {
    setSatchelState("ROTATING_DOWN");
    const timer = setTimeout(() => {
      setSatchelState("ACTIVATED_OPEN");
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const domainSummary = useMemo<Record<KymDomain, DomainAggregate>>(() => {
    const groups: Record<
      KymDomain,
      { focusArea: PlesFocusArea; scores: number[]; questions: DomainAggregate["questions"] }
    > = {
      Cognitive: { focusArea: "Priority", scores: [], questions: [] },
      Physical: { focusArea: "Effort", scores: [], questions: [] },
      Creative: { focusArea: "Legacy", scores: [], questions: [] },
      Social: { focusArea: "Share", scores: [], questions: [] },
    };

    DEMO_QUESTIONS.forEach((q) => {
      const domain = FOCUS_TO_DOMAIN[q.focusArea] || "Cognitive";
      const saved = reflections[q.id];
      const score = saved ? saved.score : CORNER_SCORES.LR;
      groups[domain].scores.push(score);
      groups[domain].questions.push({
        id: q.id,
        questionNumber: q.questionNumber,
        queryName: q.queryName,
        focusArea: q.focusArea,
        corner: saved?.corner ?? "LR",
        score,
      });
    });

    const result = {} as Record<KymDomain, DomainAggregate>;
    (Object.keys(groups) as KymDomain[]).forEach((domain) => {
      const g = groups[domain];
      const mean = g.scores.reduce((a, b) => a + b, 0) / (g.scores.length || 1);
      result[domain] = {
        domain,
        focusArea: g.focusArea,
        questionCount: g.scores.length,
        meanScore: Math.round(mean),
        elevation: scoreToWholeElevation(mean),
        questions: g.questions,
      };
    });

    return result;
  }, [reflections]);

  const handleSelectCorner = useCallback((corner: CornerKey) => {
    setPersistentCorner(corner);
    setSatchelState("AWAITING_SWIPE");
    if (corner === "Top") {
      setWeights({ w1: 0.98, w2: 0.01, w3: 0.01 });
      setPuckOffset({ x: 0, y: -52 });
    } else if (corner === "LL") {
      setWeights({ w1: 0.01, w2: 0.98, w3: 0.01 });
      setPuckOffset({ x: -75, y: 58 });
    } else {
      setWeights({ w1: 0.01, w2: 0.01, w3: 0.98 });
      setPuckOffset({ x: 75, y: 58 });
    }
  }, []);

  const handleCommitToSatchel = useCallback(
    (explicitCorner?: CornerKey) => {
      if (!activeQuestion) return;
      const chosenCorner: CornerKey =
        explicitCorner ??
        persistentCorner ??
        (weights.w1 >= weights.w2 && weights.w1 >= weights.w3
          ? "Top"
          : weights.w3 >= weights.w1 && weights.w3 >= weights.w2
            ? "LR"
            : "LL");

      const discreteScore = CORNER_SCORES[chosenCorner];
      const domain = FOCUS_TO_DOMAIN[activeQuestion.focusArea] || "Cognitive";

      setReflections((prev) => ({
        ...prev,
        [activeQuestion.id]: {
          questionNumber: activeQuestion.questionNumber,
          id: activeQuestion.id,
          queryName: activeQuestion.queryName,
          focusArea: activeQuestion.focusArea,
          domain,
          corner: chosenCorner,
          score: discreteScore,
          w1: weights.w1,
          w2: weights.w2,
          w3: weights.w3,
          timestamp: new Date().toISOString(),
        },
      }));

      setSatchelState("STORED_SECURE");
      setPersistentCorner(null);
      setPuckOffset({ x: 0, y: -235 });

      setTimeout(() => {
        setPuckOffset({ x: 0, y: 0 });
        setWeights({ w1: 0.33, w2: 0.33, w3: 0.34 });
        if (currentIndex + 1 < activeQuestionPool.length) {
          setHistoryStack((h) => [...h, currentIndex]);
          setCurrentIndex((idx) => idx + 1);
          setSatchelState("ACTIVATED_OPEN");
        } else {
          setSatchelState("IDLE_CLOSED");
          setViewMode(activeSkin === "ICE_CREAM" ? "ICE_CREAM_BAR_CHART" : "CONTOUR_CHART");
        }
      }, 460);
    },
    [activeQuestion, currentIndex, activeQuestionPool.length, activeSkin, persistentCorner, weights]
  );

  const discSurfaceData = useMemo(() => {
    const rawPoints = QUADRANT_SUB_ASPECTS[selectedQuadrant] || QUADRANT_SUB_ASPECTS.Cognitive;
    const liveDomainElev = domainSummary[selectedQuadrant]?.elevation;
    const hasLiveDomainAnswer = DEMO_QUESTIONS.some(
      (q) => FOCUS_TO_DOMAIN[q.focusArea] === selectedQuadrant && reflections[q.id]
    );

    const points = rawPoints.map((pt, idx) => {
      if (idx === 0 && hasLiveDomainAnswer && liveDomainElev !== undefined && liveDomainElev !== 0) {
        return { ...pt, student: liveDomainElev };
      }
      return pt;
    });

    const schoolFeatures: DiscFeature[] = [];
    const studentFeatures: DiscFeature[] = [];
    const parentFeatures: DiscFeature[] = [];
    const consensusFeatures: DiscFeature[] = [];

    points.forEach((pt) => {
      if (pt.school !== 0) {
        schoolFeatures.push({
          nx: pt.nx,
          ny: pt.ny,
          magnitude: pt.school,
          colorType: pt.school > 0 ? "SOURCE_PEAK" : "SOURCE_VALLEY",
          label: pt.label,
          personalizedTitle: pt.personalizedTitle,
        });
      }
      if (pt.student !== 0) {
        studentFeatures.push({
          nx: pt.nx,
          ny: pt.ny,
          magnitude: pt.student,
          colorType: pt.student > 0 ? "SOURCE_PEAK" : "SOURCE_VALLEY",
          label: pt.label,
          personalizedTitle: pt.personalizedTitle,
        });
      }
      if (pt.parent !== 0) {
        parentFeatures.push({
          nx: pt.nx,
          ny: pt.ny,
          magnitude: pt.parent,
          colorType: pt.parent > 0 ? "SOURCE_PEAK" : "SOURCE_VALLEY",
          label: pt.label,
          personalizedTitle: pt.personalizedTitle,
        });
      }

      if (pt.student !== 0) {
        const sSign = Math.sign(pt.student);
        const pAgrees = pt.parent !== 0 && Math.sign(pt.parent) === sSign;
        const schAgrees = pt.school !== 0 && Math.sign(pt.school) === sSign;

        if (pAgrees && schAgrees) {
          const sum = pt.student + pt.parent + pt.school;
          consensusFeatures.push({
            nx: pt.nx,
            ny: pt.ny,
            magnitude: sum,
            colorType: sum < 0 ? "UNDERSIDE_DIP" : "CONSENSUS_RED",
            label: `${pt.label} (Student + Parent + School)`,
            personalizedTitle: pt.personalizedTitle,
          });
        } else if (pAgrees && !schAgrees) {
          const sum = pt.student + pt.parent;
          consensusFeatures.push({
            nx: pt.nx,
            ny: pt.ny,
            magnitude: sum,
            colorType: sum < 0 ? "UNDERSIDE_DIP" : "CONSENSUS_GREEN",
            label: `${pt.label} (Student + Parent)`,
            personalizedTitle: pt.personalizedTitle,
          });
        } else if (!pAgrees && schAgrees) {
          const sum = pt.student + pt.school;
          consensusFeatures.push({
            nx: pt.nx,
            ny: pt.ny,
            magnitude: sum,
            colorType: sum < 0 ? "UNDERSIDE_DIP" : "CONSENSUS_BLUE",
            label: `${pt.label} (Student + School)`,
            personalizedTitle: pt.personalizedTitle,
          });
        }
      }
    });

    return { schoolFeatures, studentFeatures, parentFeatures, consensusFeatures, points };
  }, [selectedQuadrant, domainSummary, reflections]);

  const renderValueBadge = (val: number) => {
    const isHigh = val >= 4;
    const isNegative = val < 0;
    const formatted = val > 0 ? `+${Math.round(val)}` : `${Math.round(val)}`;
    return (
      <span
        style={{
          display: "inline-block",
          minWidth: "52px",
          textAlign: "center",
          padding: "6px 14px",
          borderRadius: "10px",
          fontWeight: 900,
          fontSize: "20px",
          background: isHigh ? "#059669" : isNegative ? "#fee2e2" : "#e2e8f0",
          color: isHigh ? "#ffffff" : isNegative ? "#b91c1c" : "#0f172a",
          boxShadow: isHigh ? "0 4px 12px rgba(5, 150, 105, 0.3)" : "none",
          border: isHigh ? "2px solid #047857" : "1px solid #cbd5e1",
        }}
      >
        {formatted}
      </span>
    );
  };

  return (
    <div className="kym-friendly-root">
      <style>{`
        .kym-friendly-root {
          min-height: 100vh;
          background: #ffffff;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: "Segoe UI", Roboto, system-ui, -apple-system, sans-serif;
          user-select: none;
          overflow-x: hidden;
        }
        .kym-top-student-header {
          width: 100%;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 36px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-sizing: border-box;
          z-index: 40;
        }
        .kym-big-btn {
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .kym-big-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }
        .kym-teal-btn {
          background: #145973;
          color: #ffffff;
          border: 2px solid #0e3f52;
          border-radius: 10px;
          font-size: 19px;
          font-weight: 800;
          padding: 10px 26px;
          min-width: 124px;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
          text-align: center;
        }
        .kym-teal-btn:hover:not(:disabled) {
          background: #0f465c;
          transform: translateY(-1px);
        }
        .kym-corner-choice-btn {
          position: absolute;
          z-index: 15;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          background: #ffffff;
          border: 2.5px solid #334155;
          color: #0f172a;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }
        .kym-corner-choice-btn:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .kym-corner-choice-btn.selected {
          background: #fef08a;
          border: 3px solid #ca8a04;
          color: #0f172a;
          box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
        }
        .kym-comparison-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #ffffff;
          border: 2px solid #cbd5e1;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }
        .kym-comparison-table th,
        .kym-comparison-table td {
          padding: 16px 18px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          font-size: 18px;
        }
        .kym-comparison-table th {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 900;
          font-size: 19px;
          border-bottom: 2px solid #cbd5e1;
        }
        .kym-comparison-table td:first-child,
        .kym-comparison-table th:first-child {
          text-align: left;
          font-weight: 800;
        }
        .kym-avg-row td {
          background: #eff6ff;
          font-weight: 900;
          border-top: 2px solid #93c5fd;
          border-bottom: none;
        }
        .kym-row-highlight td {
          background: #fef9c3 !important;
        }
        .kym-strong-agreement-col {
          background: rgba(16, 185, 129, 0.08) !important;
          border-left: 2px solid #10b981 !important;
          border-right: 2px solid #10b981 !important;
        }
        .kym-side-pill-btn {
          width: 165px;
          padding: 12px 16px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          border: 2px solid #475569;
          background: #64748b;
          color: #ffffff;
          text-align: center;
          transition: all 0.2s ease;
        }
        .kym-side-pill-btn.active {
          background: #2563eb;
          border-color: #1d4ed8;
        }
        .kym-slide1-bottom-bar {
          width: 100%;
          background: #f8fafc;
          border-top: 2px solid #cbd5e1;
          padding: 10px 36px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 16px;
          box-sizing: border-box;
          z-index: 40;
        }
        .kym-nav-card-btn {
          padding: 10px 22px;
          border-radius: 10px;
          border: 2px solid #1e3a8a;
          background: #ffffff;
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.25;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: center;
          min-width: 168px;
        }
        .kym-nav-card-btn:hover {
          background: #eff6ff;
          border-color: #2563eb;
        }
        .kym-nav-card-btn.active {
          background: #1e3a8a;
          color: #ffffff;
        }
        @media print {
          .kym-no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* =====================================================================
          TOP HEADER BAR (With Multi-Skin Switcher: KYM vs Ice Cream Demo)
         ===================================================================== */}
      <header className="kym-top-student-header kym-no-print">
        <div
          onClick={() => setViewMode("EDUCATOR_PILOT")}
          style={{ display: "flex", alignItems: "center", cursor: "pointer", marginLeft: "18px" }}
          title="Click to view School Pilot Greeting Page"
        >
          <img
            src="/assets/brand/KYM_graphics.png"
            alt="Know Your Major"
            style={{
              height: "44px",
              width: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Center: Student/Participant Name + Topic Skin Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "transparent",
              border: "none",
              padding: "4px 8px",
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: 900, color: "#1d4ed8", letterSpacing: "0.04em" }}>
              {activeSkin === "ICE_CREAM" ? "PARTICIPANT:" : "STUDENT:"}
            </span>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              aria-label="Participant Name"
              style={{
                fontSize: "30px",
                fontWeight: 900,
                color: "#0f172a",
                background: "transparent",
                border: "none",
                outline: "none",
                width: "215px",
                textAlign: "left",
              }}
            />
          </div>

          {/* Multi-Skin Switcher (Know Your Major vs Ice Cream Consumer Demo) */}
          <div
            style={{
              display: "inline-flex",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveSkin("KYM");
                setCurrentIndex(0);
                setPersistentCorner(null);
                setPuckOffset({ x: 0, y: 0 });
                setViewMode("TRIAD");
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                background: activeSkin === "KYM" ? "#1e3a8a" : "transparent",
                color: activeSkin === "KYM" ? "#ffffff" : "#475569",
              }}
            >
              🎓 Know Your Major
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSkin("ICE_CREAM");
                setCurrentIndex(0);
                setPersistentCorner(null);
                setPuckOffset({ x: 0, y: 0 });
                setViewMode("TRIAD");
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                background: activeSkin === "ICE_CREAM" ? "#0d9488" : "transparent",
                color: activeSkin === "ICE_CREAM" ? "#ffffff" : "#475569",
              }}
            >
              🍦 Ice Cream Demo
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginRight: "18px" }}>
          <img
            src="/assets/brand/TRIAD_LOGO.png"
            alt="TRIAD — Direction. Then Speed."
            style={{ height: "66px", width: "auto", objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.src = "/assets/brand/TRIAD_Logo_Web.svg";
            }}
          />
        </div>
      </header>

      {/* =====================================================================
          VIEW MODE 0: EDUCATOR SCHOOL PILOT
         ===================================================================== */}
      {viewMode === "EDUCATOR_PILOT" && (
        <main
          style={{
            flex: 1,
            background: "#fcfbf7",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 24px",
          }}
        >
          <div style={{ maxWidth: "1020px", width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: "36px",
                alignItems: "center",
                marginBottom: "28px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#1d4ed8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  AN INVITATION TO EDUCATORS • SCHOOL PILOT
                </div>
                <h1
                  style={{
                    fontSize: "48px",
                    fontWeight: 900,
                    color: "#0f1f38",
                    fontFamily: "Georgia, serif",
                    lineHeight: 1.12,
                    margin: "10px 0 16px 0",
                  }}
                >
                  Help a student see
                  <br />
                  a future worth
                  <br />
                  pursuit.
                </h1>
                <p style={{ fontSize: "18px", color: "#475569", lineHeight: 1.6, marginBottom: "22px" }}>
                  Years of learning leave clues. Help students bring them into focus—and discover where to put their effort and energy next.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSkin("KYM");
                      setKymQuestionMode("SAMPLE_4");
                      setCurrentIndex(0);
                      setViewMode("TRIAD");
                    }}
                    style={{
                      background: "#134e9b",
                      color: "#ffffff",
                      fontSize: "17px",
                      fontWeight: 800,
                      padding: "15px 28px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 8px 20px rgba(19, 78, 155, 0.28)",
                    }}
                  >
                    Try 4-Question Sample ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (is20QUnlocked) {
                        setActiveSkin("KYM");
                        setKymQuestionMode("FULL_20");
                        setCurrentIndex(0);
                        setViewMode("TRIAD");
                      } else {
                        setShowRegisterModal(true);
                      }
                    }}
                    style={{
                      background: "#ffffff",
                      color: "#134e9b",
                      fontSize: "16px",
                      fontWeight: 800,
                      padding: "15px 24px",
                      borderRadius: "10px",
                      border: "2px solid #134e9b",
                      cursor: "pointer",
                    }}
                  >
                    {is20QUnlocked ? "Open Full 20-Question Model ↗" : "🔒 Unlock Full 20-Question Model (Educators)"}
                  </button>
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "10px", fontWeight: 600 }}>
                  Move the puck. Express a sentiment. See the possibilities.
                </div>
              </div>

              <div
                onClick={() => setViewMode("TRIAD")}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  padding: "28px",
                  textAlign: "center",
                  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
                  cursor: "pointer",
                }}
              >
                <svg viewBox="-120 -95 240 175" style={{ width: "220px", height: "160px", margin: "0 auto" }}>
                  <polygon points="0,-80 -95,65 95,65" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="5" strokeLinejoin="round" />
                  <circle cx="0" cy="12" r="26" fill="#0f172a" stroke="#2563eb" strokeWidth="3.5" />
                  <image href="/LogoGold.svg" x="-17" y="-5" width="34" height="34" />
                </svg>
                <h3 style={{ fontSize: "22px", fontFamily: "Georgia, serif", fontWeight: 700, color: "#0f1f38", margin: "12px 0 8px 0" }}>
                  A triangle. A puck.
                  <br />A moment of reflection.
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                  At a corner or somewhere between, one simple movement expresses a mixture of feelings.
                </p>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "26px", fontFamily: "Georgia, serif", color: "#0f1f38", margin: "0 0 8px 0" }}>
                  A developing picture.
                  <br />A more informed direction.
                </h2>
                <p style={{ fontSize: "15px", color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  Student reflections, brief teacher observations, and parent projections come together over 3.5 years to help reveal patterns across classes and activities.
                </p>
              </div>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "#ffffff", padding: "12px 16px", borderLeft: "4px solid #2563eb", fontWeight: 800 }}>Cognitive</div>
                  <div style={{ background: "#ffffff", padding: "12px 16px", borderLeft: "4px solid #eab308", fontWeight: 800 }}>Physical</div>
                  <div style={{ background: "#ffffff", padding: "12px 16px", borderLeft: "4px solid #16a34a", fontWeight: 800 }}>Social</div>
                  <div style={{ background: "#ffffff", padding: "12px 16px", borderLeft: "4px solid #9333ea", fontWeight: 800 }}>Creative</div>
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "10px", marginBottom: 0 }}>
                  The purpose is direction: what to explore, where to focus, and which possibilities deserve a closer look.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          VIEW MODE 0B: ONE MINUTE OVERVIEW
         ===================================================================== */}
      {viewMode === "SELF_RUNNING_VIDEO" && (
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            maxWidth: "960px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "100%",
              background: "#ffffff",
              border: "2px solid #cbd5e1",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#d97706", textTransform: "uppercase" }}>
                  ONE MINUTE OVERVIEW — REFLECTION DIRECTIONS
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", margin: "2px 0 0 0" }}>
                  Know Your Major — Interactive Reflection Overview
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("TRIAD")}
                className="kym-big-btn"
                style={{ background: "#16a34a", color: "#ffffff" }}
              >
                Go to Limited TRIAD Demonstration →
              </button>
            </div>

            <video
              src="/assets/KYM_Preview.mp4"
              controls
              autoPlay
              playsInline
              onEnded={() => setViewMode("TRIAD")}
              style={{ width: "100%", borderRadius: "14px", background: "#000000", maxHeight: "460px" }}
            />
          </div>
        </main>
      )}

      {/* =====================================================================
          VIEW MODE 1: INTERACTIVE TRIAD SURVEY SCREEN (Supports Both KYM & Ice Cream Skins!)
         ===================================================================== */}
      {viewMode === "TRIAD" && (
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 16px 12px 16px",
            maxWidth: "980px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {/* Top Satchel Zone */}
          <div
            style={{
              position: "relative",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "2px",
              filter: persistentCorner
                ? "drop-shadow(0 0 14px rgba(234, 179, 8, 0.75))"
                : "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.22))",
            }}
          >
            <div
              onClick={() => {
                if (persistentCorner) handleCommitToSatchel();
              }}
              style={{
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform:
                  satchelState === "STORED_SECURE"
                    ? "scale(1.06)"
                    : persistentCorner
                      ? "scale(1.03)"
                      : "scale(1)",
                transition: "transform 0.25s ease",
              }}
              title="Swipe puck upward under the satchel or click NEXT"
            >
              <img
                src="/assets/satchel/satchel_leather.png"
                alt="Reflection Satchel"
                style={{
                  height: "132px",
                  width: "auto",
                  objectFit: "contain",
                  transform: "rotate(180deg)",
                  clipPath: "polygon(9% 14%, 50% 2%, 91% 14%, 91% 100%, 9% 100%)",
                  transition: "all 0.25s ease",
                }}
              />
            </div>
          </div>

          {/* CENTERED TRIANGLE STAGE */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              maxWidth: "780px",
              height: "365px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "24px",
                bottom: "68px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                zIndex: 25,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (persistentCorner) {
                    handleCommitToSatchel();
                  } else if (currentIndex + 1 < activeQuestionPool.length) {
                    setHistoryStack((h) => [...h, currentIndex]);
                    setCurrentIndex((i) => i + 1);
                  } else {
                    setViewMode(activeSkin === "ICE_CREAM" ? "ICE_CREAM_BAR_CHART" : "CONTOUR_CHART");
                  }
                }}
                className="kym-teal-btn"
                style={{
                  background: persistentCorner ? "#0d9488" : "#145973",
                  borderColor: persistentCorner ? "#0f766e" : "#0e3f52",
                  boxShadow: persistentCorner ? "0 0 18px rgba(13, 148, 136, 0.45)" : undefined,
                }}
              >
                NEXT
              </button>
              <span style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                Or Swipe Upward
              </span>
            </div>

            <div
              style={{
                position: "relative",
                width: "460px",
                height: "355px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectCorner("Top")}
                className={`kym-corner-choice-btn ${persistentCorner === "Top" ? "selected" : ""}`}
                style={{ top: "2px", left: "50%", transform: "translateX(-50%)" }}
              >
                ▲ {activeQuestion.choices.Top}
              </button>

              <svg
                viewBox="-200 -170 400 320"
                style={{ width: "100%", height: "100%", overflow: "visible", touchAction: "none" }}
                onPointerMove={(e) => {
                  if (e.buttons !== 1) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = ((e.clientX - rect.left) / rect.width) * 400 - 200;
                  const relY = ((e.clientY - rect.top) / rect.height) * 320 - 170;

                  if (persistentCorner && relY < -115) {
                    handleCommitToSatchel();
                    return;
                  }

                  if (relY < -44 && Math.abs(relX) < 42) {
                    handleSelectCorner("Top");
                  } else if (relY > 36 && relX < -48) {
                    handleSelectCorner("LL");
                  } else if (relY > 36 && relX > 48) {
                    handleSelectCorner("LR");
                  } else {
                    setPuckOffset(clampPuckInsideTriangle(relX, relY));
                  }
                }}
              >
                <polygon
                  points="0,-118 -145,96 145,96"
                  fill="#dbeafe"
                  stroke="#1e3a8a"
                  strokeWidth="6"
                  strokeLinejoin="round"
                />

                {persistentCorner === "Top" && (
                  <>
                    <line x1="0" y1="-118" x2="-145" y2="96" stroke="#eab308" strokeWidth="9" />
                    <line x1="0" y1="-118" x2="145" y2="96" stroke="#eab308" strokeWidth="9" />
                  </>
                )}
                {persistentCorner === "LL" && (
                  <>
                    <line x1="-145" y1="96" x2="0" y2="-118" stroke="#eab308" strokeWidth="9" />
                    <line x1="-145" y1="96" x2="145" y2="96" stroke="#eab308" strokeWidth="9" />
                  </>
                )}
                {persistentCorner === "LR" && (
                  <>
                    <line x1="145" y1="96" x2="-145" y2="96" stroke="#eab308" strokeWidth="9" />
                    <line x1="145" y1="96" x2="0" y2="-118" stroke="#eab308" strokeWidth="9" />
                  </>
                )}

                {persistentCorner && (
                  <path
                    d="M 0,-125 L 0,-220"
                    stroke="#eab308"
                    strokeWidth="4"
                    strokeDasharray="6,6"
                  />
                )}

                <g
                  transform={`translate(${puckOffset.x}, ${puckOffset.y})`}
                  style={{ transition: "transform 0.14s ease-out", cursor: "grab" }}
                >
                  <circle
                    r="34"
                    fill="#0f172a"
                    stroke={persistentCorner ? "#eab308" : "#2563eb"}
                    strokeWidth="4.5"
                  />
                  <image
                    href="/LogoGold.svg"
                    x="-22"
                    y="-22"
                    width="44"
                    height="44"
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>
              </svg>

              <button
                type="button"
                onClick={() => handleSelectCorner("LL")}
                className={`kym-corner-choice-btn ${persistentCorner === "LL" ? "selected" : ""}`}
                style={{ bottom: "4px", left: "-10px", maxWidth: "48%", textAlign: "left" }}
              >
                ◣ {activeQuestion.choices.LL}
              </button>

              <button
                type="button"
                onClick={() => handleSelectCorner("LR")}
                className={`kym-corner-choice-btn ${persistentCorner === "LR" ? "selected" : ""}`}
                style={{ bottom: "4px", right: "-10px", maxWidth: "48%", textAlign: "right" }}
              >
                {activeQuestion.choices.LR} ◢
              </button>
            </div>
          </div>

          {/* BOTTOM QUESTION & GUIDANCE */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "820px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "4px",
              paddingBottom: "4px",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 900, color: "#475569" }}>
              {activeSkin === "ICE_CREAM" ? "Ice Cream Sentiment Demo • " : ""}
              Question {currentIndex + 1} of {activeQuestionPool.length}
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#0f172a",
                margin: "2px 0",
                lineHeight: 1.2,
              }}
            >
              {activeQuestion.question}
            </h1>

            <div style={{ fontSize: "18px", fontWeight: 600, color: "#334155" }}>
              Move Puck to a Corner or Click Choice Button
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          VIEW MODE 1B: ICE CREAM SENTIMENT & EARLY TREND RECOGNITION BAR CHARTS
         ===================================================================== */}
      {viewMode === "ICE_CREAM_BAR_CHART" && (
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 24px",
            maxWidth: "1120px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: "20px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  GENERAL TRIAD RESEARCH OUTCOME • EARLY TREND RECOGNITION
                </div>
                <h1 style={{ fontSize: "30px", fontWeight: 900, color: "#0f172a", margin: "4px 0" }}>
                  Consumer Ice Cream Sentiment &amp; 6-Month Shift Recognition
                </h1>
                <p style={{ fontSize: "15px", color: "#475569", margin: 0, fontWeight: 600 }}>
                  Repeated every 3 to 6 months, TRIAD bar charts reveal emerging consumer shifts before they become obvious in sales data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setViewMode("TRIAD");
                }}
                className="kym-teal-btn"
                style={{ fontSize: "15px", padding: "10px 18px" }}
              >
                ↺ Retake 4-Question Ice Cream Demo
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "20px" }}>
              {[
                {
                  title: "1. Flavor Adventure (Bold New Flavors vs. Classics)",
                  qId: "ice-1",
                  m0: 48,
                  m3: 64,
                  m6: reflections["ice-1"]?.score ?? 82,
                  insight: "Early Shift Recognized: Strong +34% surge toward experimental/seasonal flavor exploration over 6 months.",
                },
                {
                  title: "2. Health & Clean Ingredients (Low-Sugar / Natural)",
                  qId: "ice-2",
                  m0: 42,
                  m3: 58,
                  m6: reflections["ice-2"]?.score ?? 76,
                  insight: "Early Shift Recognized: Clean-label & low-sugar priority moving from niche to primary purchase driver.",
                },
                {
                  title: "3. Social Outing vs. Solo Everyday Treat",
                  qId: "ice-3",
                  m0: 70,
                  m3: 68,
                  m6: reflections["ice-3"]?.score ?? 74,
                  insight: "Stable Pattern: Shared family/friend outings remain the #1 emotional driver of store visits.",
                },
                {
                  title: "4. Craft Quality Price Elasticity",
                  qId: "ice-4",
                  m0: 78,
                  m3: 62,
                  m6: reflections["ice-4"]?.score ?? 54,
                  insight: "Early Warning Signal: Price sensitivity rising—consumers shifting from routine purchases to occasional weekend rewards.",
                },
              ].map((item) => (
                <div
                  key={item.qId}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "16px",
                    padding: "18px",
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a", marginBottom: "12px" }}>
                    {item.title}
                  </div>

                  {/* 3-Period Bar Chart */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
                    {[
                      { label: "Baseline (6 Mos Ago)", val: item.m0, color: "#94a3b8" },
                      { label: "3 Months Ago", val: item.m3, color: "#3b82f6" },
                      { label: "Current Wave (Live)", val: item.m6, color: "#0d9488" },
                    ].map((bar) => (
                      <div key={bar.label} style={{ display: "grid", gridTemplateColumns: "145px 1fr 48px", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>{bar.label}</span>
                        <div style={{ height: "18px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${bar.val}%`,
                              height: "100%",
                              background: bar.color,
                              borderRadius: "999px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", textAlign: "right" }}>
                          {bar.val}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0f766e",
                      background: "#f0fdfa",
                      borderLeft: "4px solid #0d9488",
                      padding: "8px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {item.insight}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          VIEW MODE 2: REFLECTION SUMMARY TABLE
         ===================================================================== */}
      {viewMode === "SUMMARY" && (
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            maxWidth: "1180px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: "18px",
              padding: "22px",
              marginBottom: "22px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  STUDENT DIRECTION &amp; ALIGNMENT REPORT
                </div>
                <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#0f172a", margin: "4px 0" }}>
                  Reflection Summary — {studentName}
                </h1>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "2px solid #cbd5e1",
                  borderRadius: "14px",
                  padding: "10px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#475569" }}>REFLECTION PERIOD</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "15px", fontWeight: 800 }}>
                  <label>
                    From:{" "}
                    <input
                      type="date"
                      value={journeyEnabled ? FOUR_YEAR_JOURNEY[selectedYear].from : periodFrom}
                      onChange={(e) => {
                        setJourneyEnabled(false);
                        setPeriodFrom(e.target.value);
                      }}
                      style={{ padding: "5px 8px", borderRadius: "8px", border: "1px solid #94a3b8", fontWeight: 700 }}
                    />
                  </label>
                  <label>
                    To:{" "}
                    <input
                      type="date"
                      value={journeyEnabled ? FOUR_YEAR_JOURNEY[selectedYear].to : periodTo}
                      onChange={(e) => {
                        setJourneyEnabled(false);
                        setPeriodTo(e.target.value);
                      }}
                      style={{ padding: "5px 8px", borderRadius: "8px", border: "1px solid #94a3b8", fontWeight: 700 }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "2px solid #e2e8f0" }}>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", marginBottom: "10px" }}>
                Reflection Period Visualization in Chart Form (click desired view):
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setComparisonFilter("SUMMARY")}
                    className="kym-big-btn"
                    style={{
                      background: comparisonFilter === "SUMMARY" ? "#2563eb" : "#e2e8f0",
                      color: comparisonFilter === "SUMMARY" ? "#ffffff" : "#0f172a",
                    }}
                  >
                    Summary
                  </button>

                  <span style={{ fontSize: "15px", fontWeight: 900, color: "#475569", marginLeft: "6px" }}>
                    Comparison of:
                  </span>

                  <button
                    type="button"
                    onClick={() => setComparisonFilter("INDIVIDUAL")}
                    className="kym-big-btn"
                    style={{
                      background: comparisonFilter === "INDIVIDUAL" ? "#2563eb" : "#e2e8f0",
                      color: comparisonFilter === "INDIVIDUAL" ? "#ffffff" : "#0f172a",
                    }}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonFilter("INDIVIDUAL_PARENT")}
                    className="kym-big-btn"
                    style={{
                      background: comparisonFilter === "INDIVIDUAL_PARENT" ? "#16a34a" : "#e2e8f0",
                      color: comparisonFilter === "INDIVIDUAL_PARENT" ? "#ffffff" : "#0f172a",
                    }}
                  >
                    Individual &amp; Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonFilter("INDIVIDUAL_SCHOOL")}
                    className="kym-big-btn"
                    style={{
                      background: comparisonFilter === "INDIVIDUAL_SCHOOL" ? "#2563eb" : "#e2e8f0",
                      color: comparisonFilter === "INDIVIDUAL_SCHOOL" ? "#ffffff" : "#0f172a",
                    }}
                  >
                    Individual &amp; School
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setComparisonFilter("SHARED_VIEW");
                      setViewMode("CONTOUR_CHART");
                    }}
                    className="kym-big-btn"
                    style={{ background: "#dc2626", color: "#ffffff" }}
                  >
                    ◉ Shared View (Graph Showing Peaks and Valleys)
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: journeyEnabled ? "#dcfce7" : "#f1f5f9",
                    border: journeyEnabled ? "2px solid #16a34a" : "2px solid #cbd5e1",
                    padding: "6px 14px",
                    borderRadius: "12px",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 900, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={journeyEnabled}
                      onChange={(e) => setJourneyEnabled(e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    4-Year Journey Data:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setJourneyEnabled(true);
                      setSelectedYear(e.target.value);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontWeight: 800,
                      border: "2px solid #64748b",
                      background: "#ffffff",
                    }}
                  >
                    {Object.entries(FOUR_YEAR_JOURNEY).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
                Comparison Table ({journeyEnabled ? FOUR_YEAR_JOURNEY[selectedYear].label : "Live Student Data"})
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "15px", fontWeight: 800 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#059669", display: "inline-block" }} />
                  Strong Peak (4 to 5)
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#e2e8f0", border: "1px solid #94a3b8", display: "inline-block" }} />
                  Moderate (0 to 3)
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#fee2e2", border: "1px solid #f87171", display: "inline-block" }} />
                  Valley (-1 to -3)
                </span>
              </div>
            </div>

            {(() => {
              const domains: KymDomain[] = ["Cognitive", "Creative", "Social", "Physical"];
              const activeSource = FOUR_YEAR_JOURNEY[selectedYear];
              const hasLiveAnswers = Object.keys(reflections).length > 0;

              const getStudentScore = (d: KymDomain) =>
                !journeyEnabled && hasLiveAnswers ? domainSummary[d].elevation : activeSource.student[d];
              const getParentScore = (d: KymDomain) => activeSource.parent[d];
              const getSchoolScore = (d: KymDomain) => activeSource.school[d];

              const isStrongAgreement = (d: KymDomain) => {
                const s = getStudentScore(d);
                const p = getParentScore(d);
                const sch = getSchoolScore(d);
                return s >= 4 && p >= 4 && sch >= 4;
              };

              const highlightStudent =
                comparisonFilter === "INDIVIDUAL" ||
                comparisonFilter === "INDIVIDUAL_PARENT" ||
                comparisonFilter === "INDIVIDUAL_SCHOOL" ||
                comparisonFilter === "SHARED_VIEW";
              const highlightParent =
                comparisonFilter === "INDIVIDUAL_PARENT" || comparisonFilter === "SHARED_VIEW";
              const highlightSchool =
                comparisonFilter === "INDIVIDUAL_SCHOOL" || comparisonFilter === "SHARED_VIEW";

              return (
                <table className="kym-comparison-table">
                  <thead>
                    <tr>
                      <th>Perspective / Source</th>
                      {domains.map((d) => {
                        const strong = isStrongAgreement(d);
                        return (
                          <th
                            key={d}
                            onClick={() => {
                              setSelectedQuadrant(d);
                              setViewMode("CONTOUR_CHART");
                            }}
                            className={strong ? "kym-strong-agreement-col" : ""}
                            style={{
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            <div>{d} ↗</div>
                            {strong && (
                              <div
                                style={{
                                  display: "inline-block",
                                  marginTop: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  background: "#059669",
                                  color: "#ffffff",
                                  textDecoration: "none",
                                }}
                              >
                                ★ Strong Agreement
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={highlightStudent ? "kym-row-highlight" : ""}>
                      <td>Student Reflection ({studentName})</td>
                      {domains.map((d) => (
                        <td key={d} className={isStrongAgreement(d) ? "kym-strong-agreement-col" : ""}>
                          {renderValueBadge(getStudentScore(d))}
                        </td>
                      ))}
                    </tr>
                    <tr className={highlightParent ? "kym-row-highlight" : ""}>
                      <td>Parent Appreciation</td>
                      {domains.map((d) => (
                        <td key={d} className={isStrongAgreement(d) ? "kym-strong-agreement-col" : ""}>
                          {renderValueBadge(getParentScore(d))}
                        </td>
                      ))}
                    </tr>
                    <tr className={highlightSchool ? "kym-row-highlight" : ""}>
                      <td>School Observation</td>
                      {domains.map((d) => (
                        <td key={d} className={isStrongAgreement(d) ? "kym-strong-agreement-col" : ""}>
                          {renderValueBadge(getSchoolScore(d))}
                        </td>
                      ))}
                    </tr>
                    <tr className="kym-avg-row">
                      <td>Category Average Value</td>
                      {domains.map((d) => {
                        const avg = Math.round(
                          (getStudentScore(d) + getParentScore(d) + getSchoolScore(d)) / 3
                        );
                        return (
                          <td key={d} className={isStrongAgreement(d) ? "kym-strong-agreement-col" : ""}>
                            {renderValueBadge(avg)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>
        </section>
      )}

      {/* =====================================================================
          VIEW MODE 3: GROUP REFLECTION / GRAPHICAL VIEW
         ===================================================================== */}
      {viewMode === "CONTOUR_CHART" && (
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "1280px",
            padding: "12px 24px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            className="kym-no-print"
            style={{
              width: "100%",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              background: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: "14px",
              padding: "10px 18px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#1e3a8a" }}>FOCUS AREA:</span>
              {(
                [
                  { key: "Cognitive", label: "Cognitive" },
                  { key: "Creative", label: "Creative" },
                  { key: "Social", label: "Social" },
                  { key: "Physical", label: "Practical" },
                ] as { key: KymDomain; label: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedQuadrant(item.key)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 900,
                    cursor: "pointer",
                    border: selectedQuadrant === item.key ? "2px solid #1d4ed8" : "1px solid #cbd5e1",
                    background: selectedQuadrant === item.key ? "#2563eb" : "#ffffff",
                    color: selectedQuadrant === item.key ? "#ffffff" : "#0f172a",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setContourDisplayMode("HIGHLIGHTS")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  border: "1px solid #cbd5e1",
                  background: contourDisplayMode === "HIGHLIGHTS" ? "#0f172a" : "#ffffff",
                  color: contourDisplayMode === "HIGHLIGHTS" ? "#ffffff" : "#0f172a",
                }}
              >
                Highlights
              </button>
              <button
                type="button"
                onClick={() => setContourDisplayMode("COMPOSITE")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  border: "1px solid #cbd5e1",
                  background: contourDisplayMode === "COMPOSITE" ? "#0f172a" : "#ffffff",
                  color: contourDisplayMode === "COMPOSITE" ? "#ffffff" : "#0f172a",
                }}
              >
                Composite
              </button>

              <button
                type="button"
                onClick={() => setShowPersonalizedLabels((v) => !v)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  border: "2px solid #059669",
                  background: showPersonalizedLabels ? "#059669" : "#ffffff",
                  color: showPersonalizedLabels ? "#ffffff" : "#065f46",
                }}
              >
                {showPersonalizedLabels ? "✓ With Quadrant Labels" : "Without Quadrant Labels"}
              </button>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "185px 1fr 225px",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div
              className="kym-no-print"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                background: "#f8fafc",
                border: "2px solid #e2e8f0",
                borderRadius: "16px",
                padding: "18px 12px",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: 900, color: "#0f172a", textAlign: "center", marginBottom: "4px" }}>
                REFLECTION VIEWS
              </div>
              <button
                type="button"
                onClick={() => setContourViewFilter("COMBINED")}
                className={`kym-side-pill-btn ${contourViewFilter === "COMBINED" ? "active" : ""}`}
              >
                Combined
              </button>
              <button
                type="button"
                onClick={() => setContourViewFilter("INDIVIDUAL")}
                className={`kym-side-pill-btn ${contourViewFilter === "INDIVIDUAL" ? "active" : ""}`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setContourViewFilter("PARENT")}
                className={`kym-side-pill-btn ${contourViewFilter === "PARENT" ? "active" : ""}`}
              >
                Parent
              </button>
              <button
                type="button"
                onClick={() => setContourViewFilter("SCHOOL")}
                className={`kym-side-pill-btn ${contourViewFilter === "SCHOOL" ? "active" : ""}`}
              >
                School
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <SurfaceDiscCanvas
                title="Shared View"
                subtitle="Roll over any quadrant to see its name (Cognitive, Creative, Social, Practical)"
                width={560}
                height={270}
                features={discSurfaceData.consensusFeatures}
                isConsensus={true}
                highlighted={contourViewFilter === "COMBINED"}
                showPersonalizedLabels={showPersonalizedLabels}
              />

              <svg viewBox="0 0 800 54" style={{ width: "100%", maxWidth: "740px", height: "48px", overflow: "visible" }}>
                <defs>
                  <marker id="arrowHeadMain" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                  </marker>
                </defs>
                <path d="M 140 50 C 160 18, 260 26, 300 6" fill="none" stroke="#64748b" strokeWidth="4" markerEnd="url(#arrowHeadMain)" />
                <path d="M 400 50 L 400 6" fill="none" stroke="#64748b" strokeWidth="4" markerEnd="url(#arrowHeadMain)" />
                <path d="M 660 50 C 640 18, 540 26, 500 6" fill="none" stroke="#64748b" strokeWidth="4" markerEnd="url(#arrowHeadMain)" />
              </svg>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", width: "100%" }}>
                <SurfaceDiscCanvas
                  title="School Observation"
                  width={265}
                  height={160}
                  features={discSurfaceData.schoolFeatures}
                  highlighted={contourViewFilter === "SCHOOL"}
                />
                <SurfaceDiscCanvas
                  title="Student Reflection"
                  width={265}
                  height={160}
                  features={discSurfaceData.studentFeatures}
                  highlighted={contourViewFilter === "INDIVIDUAL"}
                />
                <SurfaceDiscCanvas
                  title="Parent Appreciation"
                  width={265}
                  height={160}
                  features={discSurfaceData.parentFeatures}
                  highlighted={contourViewFilter === "PARENT"}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                height: "100%",
              }}
            >
              <div
                style={{
                  background: "#f8fafc",
                  border: "2px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", textTransform: "uppercase" }}>
                  Shared View Colors
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 800 }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "999px", background: "#dc2626", display: "inline-block", flexShrink: 0 }} />
                  <span>Student + Parent + School (Red)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 800 }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "999px", background: "#16a34a", display: "inline-block", flexShrink: 0 }} />
                  <span>Student + Parent (Green)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 800 }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "999px", background: "#2563eb", display: "inline-block", flexShrink: 0 }} />
                  <span>Student + School (Blue)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 800 }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "999px", background: "#9333ea", display: "inline-block", flexShrink: 0 }} />
                  <span>Underside Below Mid-Point (Violet)</span>
                </div>
              </div>

              <div
                className="kym-no-print"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  background: "#f8fafc",
                  border: "2px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px 12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("SUMMARY")}
                  className="kym-side-pill-btn"
                >
                  SUMMARY
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="kym-side-pill-btn"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="kym-side-pill-btn"
                >
                  PRINT
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          EDUCATOR / ADMINISTRATOR REGISTRATION MODAL FOR FULL 20-QUESTION MODEL
         ===================================================================== */}
      {showRegisterModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.72)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "520px",
              width: "100%",
              padding: "28px",
              border: "2px solid #cbd5e1",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 900, color: "#1d4ed8", textTransform: "uppercase" }}>
              SCHOOL PILOT &amp; LICENSE INQUIRY
            </div>
            <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "6px 0 10px 0" }}>
              Unlock the Full 20-Question KYM Reflection Model
            </h2>
            <p style={{ fontSize: "15px", color: "#475569", lineHeight: 1.5, marginBottom: "18px" }}>
              Register below to explore the complete 20-question student reflection model and receive information on school pilot access.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIs20QUnlocked(true);
                setKymQuestionMode("FULL_20");
                setActiveSkin("KYM");
                setCurrentIndex(0);
                setShowRegisterModal(false);
                setViewMode("TRIAD");
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <input
                type="text"
                required
                placeholder="Your Full Name"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "15px" }}
              />
              <input
                type="text"
                required
                placeholder="School / Institution Name"
                value={regForm.school}
                onChange={(e) => setRegForm({ ...regForm, school: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "15px" }}
              />
              <input
                type="email"
                required
                placeholder="Work Email Address"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "15px" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{
                    padding: "11px 18px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "11px 22px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#1e3a8a",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Register &amp; Unlock 20 Questions →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          BOTTOM NAVIGATION BAR (Clean Tabs + Optional 20-Question Unlock for Educators)
         ===================================================================== */}
      <footer className="kym-slide1-bottom-bar kym-no-print">
        <button
          type="button"
          onClick={() => setViewMode("SELF_RUNNING_VIDEO")}
          className={`kym-nav-card-btn ${viewMode === "SELF_RUNNING_VIDEO" ? "active" : ""}`}
        >
          One Minute Overview
          <br />
          <span style={{ fontWeight: 600, fontSize: "13px" }}>Reflection Directions</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setKymQuestionMode("SAMPLE_4");
            setCurrentIndex(0);
            setViewMode("TRIAD");
          }}
          className={`kym-nav-card-btn ${viewMode === "TRIAD" && kymQuestionMode === "SAMPLE_4" ? "active" : ""}`}
        >
          Limited TRIAD
          <br />
          <span style={{ fontWeight: 600, fontSize: "13px" }}>
            {activeSkin === "ICE_CREAM" ? "4-Q Ice Cream Demo" : "4-Q Sample Demonstration"}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setViewMode(activeSkin === "ICE_CREAM" ? "ICE_CREAM_BAR_CHART" : "CONTOUR_CHART")
          }
          className={`kym-nav-card-btn ${
            viewMode === "CONTOUR_CHART" || viewMode === "ICE_CREAM_BAR_CHART" ? "active" : ""
          }`}
        >
          Group Reflection
          <br />
          <span style={{ fontWeight: 600, fontSize: "13px" }}>
            {activeSkin === "ICE_CREAM" ? "Trend Bar Charts" : "Graphical View"}
          </span>
        </button>

        {activeSkin === "KYM" && (
          <button
            type="button"
            onClick={() => {
              if (is20QUnlocked) {
                setKymQuestionMode("FULL_20");
                setCurrentIndex(0);
                setViewMode("TRIAD");
              } else {
                setShowRegisterModal(true);
              }
            }}
            className={`kym-nav-card-btn ${
              viewMode === "TRIAD" && kymQuestionMode === "FULL_20" ? "active" : ""
            }`}
          >
            {is20QUnlocked ? "Full 20-Q Model" : "🔒 Full 20-Q Model"}
            <br />
            <span style={{ fontWeight: 600, fontSize: "13px" }}>
              {is20QUnlocked ? "Unlocked (Educator Pilot)" : "Register for School Access"}
            </span>
          </button>
        )}
      </footer>
    </div>
  );
}
