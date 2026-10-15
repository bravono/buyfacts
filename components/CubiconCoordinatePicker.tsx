"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./CubiconCoordinatePicker.module.css";
import {
  Point3D,
  normalizePoint,
  formatCoordinatesJson,
  parseCoordinateInput,
  projectScreenUVTo3D,
  project3DToScreenUV,
  extractWaypoints,
} from "@/lib/cubicon/coordinateHelper";
import { X, Copy, Check, RotateCcw, Trash2, Crosshair, Box, Layers, ArrowRight } from "lucide-react";

export interface CoordinatePickerApplyResult {
  correctCoordinates: string;
  startPoint: string;
  midPoint: string;
  endPoint: string;
  points: Point3D[];
}

export interface CubiconCoordinatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialScreen?: string;
  initialImage?: string;
  initialQuestionType?: string;
  initialCoordinates?: string;
  onApply: (result: CoordinatePickerApplyResult) => void;
}

const PRESET_SCREENS = [
  { value: "Active_front", label: "Front Screen (Active_front)" },
  { value: "Active_side_r", label: "Right Screen (Active_side_r)" },
  { value: "Active_back", label: "Back Screen (Active_back)" },
  { value: "Active_side_l", label: "Left Screen (Active_side_l)" },
  { value: "Active_top", label: "Top Screen (Active_top)" },
  { value: "Active_bottom", label: "Bottom Screen (Active_bottom)" },
];

const PRESET_ARTS = [
  { value: "/cubicon-app/arts/Puzzle1.webp", label: "Puzzle 1 (Wolf / Howling)" },
  { value: "/cubicon-app/arts/Puzzle2.webp", label: "Puzzle 2 (Characters / Shirt)" },
  { value: "/cubicon-app/arts/Puzzle3.webp", label: "Puzzle 3 (Anticipation / Path)" },
  { value: "/cubicon-app/arts/ballon.webp", label: "Balloon (Welcome)" },
];

export default function CubiconCoordinatePicker({
  isOpen,
  onClose,
  initialScreen = "Active_front",
  initialImage = "/cubicon-app/arts/Puzzle1.webp",
  initialQuestionType = "Selection",
  initialCoordinates = "",
  onApply,
}: CubiconCoordinatePickerProps) {
  const [screen, setScreen] = useState(initialScreen);
  const [image, setImage] = useState(initialImage);
  const [questionType, setQuestionType] = useState(initialQuestionType);
  const [viewMode, setViewMode] = useState<"surface" | "3d">("surface");
  const [points, setPoints] = useState<Point3D[]>([]);
  const [consoleInput, setConsoleInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const dragWaypointsRef = useRef<Point3D[]>([]);

  const surfaceRef = useRef<HTMLDivElement>(null);

  // Initialize or re-sync when opened
  useEffect(() => {
    if (isOpen) {
      setScreen(initialScreen || "Active_front");
      setImage(initialImage || "/cubicon-app/arts/Puzzle1.webp");
      setQuestionType(initialQuestionType || "Selection");
      if (initialCoordinates) {
        const parsed = parseCoordinateInput(initialCoordinates);
        setPoints(parsed);
      } else {
        setPoints([]);
      }
    }
  }, [isOpen, initialScreen, initialImage, initialQuestionType, initialCoordinates]);

  const isDragTask = questionType === "Anticipation" || questionType === "drag" || questionType === "Drawing";

  // Listen for postMessage from embedded 3D Cubicon iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isOpen) return;

      if (event.data?.type === "CUBICON_COORDINATE_PICKED" && event.data.point) {
        const pt = normalizePoint(event.data.point);
        setPoints((prev) => {
          if (!isDragTask) {
            // Single-click mode: replaces target point
            return [pt];
          }
          // Multi-point drag mode: capped at 3 waypoints
          if (prev.length >= 3) {
            return [prev[0], prev[1], pt];
          }
          return [...prev, pt];
        });
      }

      if (event.data?.type === "CUBICON_APPLY_COORDINATES" && Array.isArray(event.data.coordinates)) {
        const parsed = parseCoordinateInput(event.data.coordinates);
        if (parsed.length > 0) {
          setPoints(parsed);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, isDragTask]);

  // Click handler on the 2D surface
  const handleSurfacePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const point = projectScreenUVTo3D(u, v);

    if (!isDragTask) {
      // Single-click task: set exactly one coordinate
      setPoints([point]);
      return;
    }

    // Drag task: begin drag tracking
    setIsPointerDragging(true);
    dragWaypointsRef.current = [point];
    setPoints([point]);
  };

  const handleSurfacePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDragging || !surfaceRef.current || !isDragTask) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const currentPoint = projectScreenUVTo3D(u, v);

    const waypoints = dragWaypointsRef.current;
    if (waypoints.length === 1) {
      dragWaypointsRef.current = [waypoints[0], currentPoint];
      setPoints([waypoints[0], currentPoint]);
    } else if (waypoints.length === 2) {
      dragWaypointsRef.current = [waypoints[0], waypoints[1], currentPoint];
      setPoints([waypoints[0], waypoints[1], currentPoint]);
    } else {
      // Keep start and mid, update moving end
      dragWaypointsRef.current = [waypoints[0], waypoints[1], currentPoint];
      setPoints([waypoints[0], waypoints[1], currentPoint]);
    }
  };

  const handleSurfacePointerUp = () => {
    if (isPointerDragging) {
      setIsPointerDragging(false);
    }
  };

  // Click to sequentially append waypoint if not dragging
  const handleSequentialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPointerDragging || !surfaceRef.current || !isDragTask) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const point = projectScreenUVTo3D(u, v);

    setPoints((prev) => {
      if (prev.length >= 3) {
        return [point]; // Restart from point 1
      }
      return [...prev, point];
    });
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
    dragWaypointsRef.current = [];
  };

  const handleCopyJson = () => {
    const jsonStr = formatCoordinatesJson(points);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportConsole = () => {
    if (!consoleInput.trim()) return;
    const parsed = parseCoordinateInput(consoleInput);
    if (parsed.length > 0) {
      setPoints(parsed);
      setConsoleInput("");
    }
  };

  const handleApply = () => {
    const correctCoordinates = formatCoordinatesJson(points);
    const waypoints = extractWaypoints(points);
    onApply({
      correctCoordinates,
      startPoint: waypoints.startPoint,
      midPoint: waypoints.midPoint,
      endPoint: waypoints.endPoint,
      points,
    });
    onClose();
  };

  if (!isOpen) return null;

  const pointColors = ["#10b981", "#06b6d4", "#a855f7"];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h3 className={styles.title}>Visual Coordinate Picker</h3>
            <div className={styles.subtitle}>
              Configure screen texture and capture exact 3D target coordinates for tasks.
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* Configuration Toolbar */}
          <div className={styles.configBar}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Screen Face</label>
              <select
                className={styles.select}
                value={screen}
                onChange={(e) => setScreen(e.target.value)}
              >
                {PRESET_SCREENS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Task Image</label>
              <select
                className={styles.select}
                value={image}
                onChange={(e) => setImage(e.target.value)}
              >
                {PRESET_ARTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
                {!PRESET_ARTS.some((a) => a.value === image) && (
                  <option value={image}>Custom: {image}</option>
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Question Type</label>
              <select
                className={styles.select}
                value={questionType}
                onChange={(e) => {
                  setQuestionType(e.target.value);
                  setPoints([]);
                }}
              >
                <option value="Selection">Single Click (Selection)</option>
                <option value="Anticipation">Multi-Point Drag (Anticipation / Drawing)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>View Mode</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className={viewMode === "surface" ? styles.btnPrimary : styles.btnSecondary}
                  style={{ flex: 1, padding: "7px 10px", fontSize: "0.8rem", justifyContent: "center" }}
                  onClick={() => setViewMode("surface")}
                >
                  <Layers size={14} /> Surface View
                </button>
                <button
                  type="button"
                  className={viewMode === "3d" ? styles.btnPrimary : styles.btnSecondary}
                  style={{ flex: 1, padding: "7px 10px", fontSize: "0.8rem", justifyContent: "center" }}
                  onClick={() => setViewMode("3d")}
                >
                  <Box size={14} /> Live 3D Cube
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Workspace Row */}
          <div className={styles.stageRow}>
            {/* Left Column: Canvas View */}
            <div className={styles.canvasWrapper}>
              {viewMode === "surface" ? (
                <div
                  ref={surfaceRef}
                  className={styles.interactiveSurface}
                  onPointerDown={handleSurfacePointerDown}
                  onPointerMove={handleSurfacePointerMove}
                  onPointerUp={handleSurfacePointerUp}
                  onClick={handleSequentialClick}
                >
                  {/* Surface Image Preview */}
                  {image ? (
                    <img
                      src={image}
                      alt="Task face texture"
                      className={styles.surfaceImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/cubicon-app/cubicon_logo.png";
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
                      No texture loaded
                    </div>
                  )}

                  {/* Measurement Grid & Coordinate Axes */}
                  <div className={styles.faceGridOverlay} />
                  <div className={styles.axisCross}>
                    <div className={styles.axisH} />
                    <div className={styles.axisV} />
                  </div>

                  {/* SVG Connector Path for Drag Tasks */}
                  {isDragTask && points.length > 1 && (
                    <svg className={styles.pathSvg}>
                      <polyline
                        points={points
                          .map((p) => {
                            const uv = project3DToScreenUV(p);
                            return `${uv.u * 100}%,${uv.v * 100}%`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeDasharray="6,4"
                      />
                    </svg>
                  )}

                  {/* Rendered Coordinate Pins */}
                  {points.map((p, idx) => {
                    const uv = project3DToScreenUV(p);
                    const color = pointColors[idx % pointColors.length];
                    const label = isDragTask
                      ? idx === 0
                        ? "1 (Start)"
                        : idx === 1 && points.length === 3
                        ? "2 (Mid)"
                        : `${idx + 1} (End)`
                      : "Target";

                    return (
                      <div
                        key={idx}
                        className={styles.pinMarker}
                        style={{
                          left: `${uv.u * 100}%`,
                          top: `${uv.v * 100}%`,
                        }}
                      >
                        <div className={styles.pinDot} style={{ background: color }}>
                          {idx + 1}
                        </div>
                        <div className={styles.pinTag}>
                          {label}: x:{p.x}, y:{p.y}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Live 3D Cube Canvas iframe - strictly admin authorized */
                <iframe
                  src={`/cubicon-app/index.html?picker=true&admin=true&screen=${encodeURIComponent(screen)}&image=${encodeURIComponent(image)}`}
                  className={styles.iframeWrapper}
                  title="Cubicon 3D Interactive Canvas"
                />
              )}
            </div>

            {/* Right Column: Inspector & Coordinates Table */}
            <div className={styles.inspectorColumn}>
              {/* Captured Waypoints Card */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <span>Captured Coordinates ({points.length} Point{points.length === 1 ? "" : "s"})</span>
                  <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 500 }}>
                    {isDragTask ? "Drag Mode (Up to 3 Points)" : "Single-Click Mode"}
                  </span>
                </div>

                {points.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "12px 0", textAlign: "center" }}>
                    Click or drag on the screen image above to pick target coordinates.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {points.map((p, idx) => {
                      const color = pointColors[idx % pointColors.length];
                      const role = isDragTask
                        ? idx === 0
                          ? "Start Point"
                          : idx === 1 && points.length === 3
                          ? "Mid Point"
                          : "End Point"
                        : "Target Coordinate";

                      return (
                        <div key={idx} className={styles.pointRow}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className={styles.pointBadge} style={{ background: color }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 600, color: "#f8fafc" }}>{role}</span>
                          </div>
                          <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>
                            x: {p.x.toFixed(3)}, y: {p.y.toFixed(3)}, z: {p.z.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className={styles.buttonRow}>
                  {points.length > 0 && (
                    <button type="button" className={styles.btnSecondary} onClick={handleUndo}>
                      <RotateCcw size={14} /> Undo Point
                    </button>
                  )}
                  {points.length > 0 && (
                    <button type="button" className={styles.btnSecondary} onClick={handleClear}>
                      <Trash2 size={14} /> Clear All
                    </button>
                  )}
                  {points.length > 0 && (
                    <button type="button" className={styles.btnSecondary} onClick={handleCopyJson}>
                      {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy JSON"}
                    </button>
                  )}
                </div>
              </div>

              {/* Raw JSON String Preview */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <span>Target Coordinates JSON</span>
                </div>
                <div className={styles.codeBox}>{formatCoordinatesJson(points)}</div>
              </div>

              {/* Direct Console Paste / Import Helper */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <span>Quick Import from Console</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Paste raw console logs or coordinates (e.g. x: -0.25, y: 0.30, z: 1.0) to auto-populate.
                </div>
                <div className={styles.pasteArea}>
                  <input
                    type="text"
                    className={styles.pasteInput}
                    placeholder="Paste coordinate or JSON here..."
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImportConsole()}
                  />
                  <button type="button" className={styles.btnSecondary} onClick={handleImportConsole}>
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.footer}>
          <div className={styles.helperText}>
            Coordinates map to standard normalized 3D cube face coordinates at z = 1.0.
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnApply}
              onClick={handleApply}
              disabled={points.length === 0}
            >
              Apply to Task <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
