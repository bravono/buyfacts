"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./CubiconCoordinatePicker.module.css";
import {
  Point3D,
  normalizePoint,
  formatCoordinatesJson,
  parseCoordinateInput,
  projectScreenUVTo3D,
  project3DToScreenUV,
  extractWaypoints,
  normalizeQuestionType,
  questionTypeToInteractionMode,
  interactionModeToQuestionType,
  CanonicalQuestionType,
  getThumbnailUrl,
} from "@/lib/cubicon/coordinateHelper";
import {
  X,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Crosshair,
  Box,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Search,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export interface CoordinatePickerApplyResult {
  correctCoordinates: string;
  startPoint: string;
  midPoint: string;
  endPoint: string;
  points: Point3D[];
  image?: string;
  screen?: string;
  questionType: CanonicalQuestionType;
}

export interface CoordinateDataSync {
  screen?: string;
  image?: string;
  questionType?: CanonicalQuestionType;
  correctCoordinates?: string;
  startPoint?: string;
  midPoint?: string;
  endPoint?: string;
  points?: Point3D[];
}

export interface CubiconCoordinatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialScreen?: string;
  initialImage?: string;
  initialQuestionType?: string;
  initialCoordinates?: string;
  onDataChange?: (data: CoordinateDataSync) => void;
  onQuestionTypeChange?: (questionType: CanonicalQuestionType) => void;
  onScreenChange?: (screen: string) => void;
  onImageChange?: (image: string) => void;
  onCoordinatesChange?: (coords: {
    correctCoordinates: string;
    startPoint: string;
    midPoint: string;
    endPoint: string;
    points: Point3D[];
  }) => void;
  onApply: (result: CoordinatePickerApplyResult) => void;
}

export interface CdnPuzzleItem {
  id: string;
  name: string;
  fileName: string;
  objectKey: string;
  publicUrl: string;
  thumbnailUrl?: string;
  format: string;
  size?: number;
}

export { getThumbnailUrl };

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
  onDataChange,
  onQuestionTypeChange,
  onScreenChange,
  onImageChange,
  onCoordinatesChange,
  onApply,
}: CubiconCoordinatePickerProps) {
  const [screen, setScreen] = useState(initialScreen);
  const [image, setImage] = useState(initialImage);
  const [questionType, setQuestionType] = useState<CanonicalQuestionType>(() =>
    normalizeQuestionType(initialQuestionType)
  );
  const [viewMode, setViewMode] = useState<"surface" | "3d">("surface");
  const [points, setPoints] = useState<Point3D[]>([]);
  const [consoleInput, setConsoleInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const dragWaypointsRef = useRef<Point3D[]>([]);

  // CDN Puzzle Images state
  const [cdnImages, setCdnImages] = useState<CdnPuzzleItem[]>([]);
  const [isLoadingCdn, setIsLoadingCdn] = useState<boolean>(false);
  const [cdnSearch, setCdnSearch] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [assignedNotice, setAssignedNotice] = useState<string>("");
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState<boolean>(false);
  const [iframeSrc, setIframeSrc] = useState<string>(
    "/cubicon-app/index.html?picker=true&admin=true"
  );
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const surfaceRef = useRef<HTMLDivElement>(null);

  const wasOpenRef = useRef(false);
  const prevInitialScreenRef = useRef(initialScreen);
  const prevInitialImageRef = useRef(initialImage);
  const prevInitialQtRef = useRef(initialQuestionType);
  const prevInitialCoordsRef = useRef(initialCoordinates);

  const isDragTask = questionTypeToInteractionMode(questionType) === "drag";

  const syncIframeConfig = useCallback(
    (targetScreen = screen, targetImage = image, targetMode = isDragTask ? "drag" : "click") => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "CUBICON_SET_PICKER_CONFIG",
            screen: targetScreen,
            image: targetImage,
            interactionMode: targetMode,
          },
          "*"
        );
      }
    },
    [screen, image, isDragTask]
  );

  // Centralized live data synchronization dispatcher
  const notifySync = useCallback(
    (overrides: Partial<CoordinateDataSync> = {}) => {
      const targetPts = overrides.points !== undefined ? overrides.points : points;
      const waypoints = extractWaypoints(targetPts);
      const coordsJson = formatCoordinatesJson(targetPts);
      const targetScreen = overrides.screen !== undefined ? overrides.screen : screen;
      const targetImage = overrides.image !== undefined ? overrides.image : image;
      const targetQt = overrides.questionType !== undefined ? overrides.questionType : questionType;

      const syncData: CoordinateDataSync = {
        screen: targetScreen,
        image: targetImage,
        questionType: targetQt,
        correctCoordinates: overrides.correctCoordinates !== undefined ? overrides.correctCoordinates : coordsJson,
        startPoint: overrides.startPoint !== undefined ? overrides.startPoint : waypoints.startPoint,
        midPoint: overrides.midPoint !== undefined ? overrides.midPoint : waypoints.midPoint,
        endPoint: overrides.endPoint !== undefined ? overrides.endPoint : waypoints.endPoint,
        points: targetPts,
      };

      // Record latest values to prevent echo loops when parent echoes them back as props
      prevInitialScreenRef.current = targetScreen;
      prevInitialImageRef.current = targetImage;
      prevInitialQtRef.current = targetQt;
      prevInitialCoordsRef.current = syncData.correctCoordinates;

      if (overrides.screen !== undefined) {
        onScreenChange?.(overrides.screen);
      }
      if (overrides.image !== undefined) {
        onImageChange?.(overrides.image);
      }
      if (overrides.questionType !== undefined) {
        onQuestionTypeChange?.(overrides.questionType);
      }
      if (overrides.points !== undefined || overrides.correctCoordinates !== undefined) {
        onCoordinatesChange?.({
          correctCoordinates: syncData.correctCoordinates || "",
          startPoint: syncData.startPoint || "",
          midPoint: syncData.midPoint || "",
          endPoint: syncData.endPoint || "",
          points: targetPts,
        });
      }

      onDataChange?.(syncData);
    },
    [
      points,
      screen,
      image,
      questionType,
      onScreenChange,
      onImageChange,
      onQuestionTypeChange,
      onCoordinatesChange,
      onDataChange,
    ]
  );

  // Initialize on open and synchronize external parent changes while open
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      // First open event: initialize picker state from props
      wasOpenRef.current = true;
      const initScreen = initialScreen || "Active_front";
      const initImg = initialImage || "/cubicon-app/arts/Puzzle1.webp";
      const initQt = normalizeQuestionType(initialQuestionType);
      const initMode = questionTypeToInteractionMode(initQt);
      setScreen(initScreen);
      setImage(initImg);
      setQuestionType(initQt);
      setIframeSrc(
        `/cubicon-app/index.html?picker=true&admin=true&screen=${encodeURIComponent(initScreen)}&image=${encodeURIComponent(initImg)}&interactionMode=${initMode}`
      );
      if (initialCoordinates) {
        const parsed = parseCoordinateInput(initialCoordinates);
        setPoints(parsed);
      } else {
        setPoints([]);
      }
      prevInitialScreenRef.current = initialScreen;
      prevInitialImageRef.current = initialImage;
      prevInitialQtRef.current = initialQuestionType;
      prevInitialCoordsRef.current = initialCoordinates;
    } else {
      // Already open: synchronize changes if parent form updated externally
      if (initialScreen && initialScreen !== prevInitialScreenRef.current && initialScreen !== screen) {
        prevInitialScreenRef.current = initialScreen;
        setScreen(initialScreen);
        syncIframeConfig(initialScreen, image, isDragTask ? "drag" : "click");
      }
      if (initialImage && initialImage !== prevInitialImageRef.current && initialImage !== image) {
        prevInitialImageRef.current = initialImage;
        setImage(initialImage);
        syncIframeConfig(screen, initialImage, isDragTask ? "drag" : "click");
      }
      if (initialQuestionType && initialQuestionType !== prevInitialQtRef.current) {
        const normQt = normalizeQuestionType(initialQuestionType);
        if (normQt !== questionType) {
          prevInitialQtRef.current = initialQuestionType;
          const nextMode = questionTypeToInteractionMode(normQt);
          setQuestionType(normQt);
          setPoints([]);
          syncIframeConfig(screen, image, nextMode);
        }
      }
    }
  }, [
    isOpen,
    initialScreen,
    initialImage,
    initialQuestionType,
    initialCoordinates,
    screen,
    image,
    questionType,
    isDragTask,
    syncIframeConfig,
  ]);

  // Sync screen, image, and interactionMode to the embedded 3D iframe when view switches to 3D
  useEffect(() => {
    if (viewMode === "3d") {
      syncIframeConfig();
    }
  }, [viewMode, syncIframeConfig]);

  // Listen for postMessage from embedded 3D Cubicon iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isOpen) return;

      if (event.data?.type === "CUBICON_SCREEN_CHANGED" && typeof event.data.screen === "string") {
        const nextScreen = event.data.screen;
        setScreen(nextScreen);
        notifySync({ screen: nextScreen });
      }

      if (event.data?.type === "CUBICON_IMAGE_CHANGED" && typeof event.data.image === "string") {
        const nextImage = event.data.image;
        setImage(nextImage);
        notifySync({ image: nextImage });
      }

      if (event.data?.type === "CUBICON_PICKER_MODE_CHANGED" && event.data.interactionMode) {
        const syncedType = interactionModeToQuestionType(event.data.interactionMode);
        setQuestionType(syncedType);
        setPoints([]);
        notifySync({ questionType: syncedType, points: [] });
      }

      if (event.data?.type === "CUBICON_COORDINATE_PICKED" && event.data.point) {
        const pt = normalizePoint(event.data.point);
        setPoints((prev) => {
          let nextPts: Point3D[];
          if (!isDragTask) {
            // Single-click mode: replaces target point
            nextPts = [pt];
          } else if (prev.length >= 3) {
            // Multi-point drag mode: capped at 3 waypoints
            nextPts = [prev[0], prev[1], pt];
          } else {
            nextPts = [...prev, pt];
          }
          notifySync({ points: nextPts });
          return nextPts;
        });
      }

      if (event.data?.type === "CUBICON_APPLY_COORDINATES" && Array.isArray(event.data.coordinates)) {
        let syncedType = questionType;
        if (event.data.interactionMode) {
          syncedType = interactionModeToQuestionType(event.data.interactionMode);
          setQuestionType(syncedType);
        }
        const parsed = parseCoordinateInput(event.data.coordinates);
        if (parsed.length > 0) {
          setPoints(parsed);
          notifySync({ questionType: syncedType, points: parsed });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, isDragTask, questionType, notifySync]);

  // Click handler on the 2D surface
  const handleSurfacePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const point = projectScreenUVTo3D(u, v);

    if (!isDragTask) {
      // Single-click task: set exactly one coordinate
      const nextPts = [point];
      setPoints(nextPts);
      notifySync({ points: nextPts });
      return;
    }

    // Drag task: begin drag tracking
    setIsPointerDragging(true);
    dragWaypointsRef.current = [point];
    const nextPts = [point];
    setPoints(nextPts);
    notifySync({ points: nextPts });
  };

  const handleSurfacePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDragging || !surfaceRef.current || !isDragTask) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const currentPoint = projectScreenUVTo3D(u, v);

    const waypoints = dragWaypointsRef.current;
    let nextPts: Point3D[];
    if (waypoints.length === 1) {
      nextPts = [waypoints[0], currentPoint];
    } else {
      // Keep start and mid, update moving end
      nextPts = [waypoints[0], waypoints[1], currentPoint];
    }
    dragWaypointsRef.current = nextPts;
    setPoints(nextPts);
    notifySync({ points: nextPts });
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

    let nextPts: Point3D[];
    if (points.length >= 3) {
      nextPts = [point]; // Restart from point 1
    } else {
      nextPts = [...points, point];
    }
    setPoints(nextPts);
    notifySync({ points: nextPts });
  };

  const handleUndo = () => {
    const nextPts = points.slice(0, -1);
    setPoints(nextPts);
    notifySync({ points: nextPts });
  };

  const handleClear = () => {
    setPoints([]);
    dragWaypointsRef.current = [];
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "CUBICON_CLEAR_COORDINATES" }, "*");
    }
    notifySync({ points: [] });
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
      notifySync({ points: parsed });
    }
  };

  const fetchCdnImages = useCallback(async () => {
    try {
      setIsLoadingCdn(true);
      const res = await fetch("/api/cubicon/puzzle-images");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.images)) {
          setCdnImages(data.images);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch CDN puzzle images:", err);
    } finally {
      setIsLoadingCdn(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCdnImages();
    }
  }, [isOpen, fetchCdnImages]);

  const handleScreenChange = (nextScreen: string) => {
    setScreen(nextScreen);
    syncIframeConfig(nextScreen, image, isDragTask ? "drag" : "click");
    notifySync({ screen: nextScreen });
  };

  const handleImageChange = (nextImage: string) => {
    setImage(nextImage);
    syncIframeConfig(screen, nextImage, isDragTask ? "drag" : "click");
    notifySync({ image: nextImage });
  };

  const handleAssignImage = (item: CdnPuzzleItem) => {
    setImage(item.publicUrl);
    setAssignedNotice(`Assigned "${item.name}" to ${screen}`);
    setTimeout(() => setAssignedNotice(""), 3500);
    syncIframeConfig(screen, item.publicUrl, isDragTask ? "drag" : "click");
    notifySync({ image: item.publicUrl });
  };

  const handleQuestionTypeChange = (nextTypeVal: string) => {
    const nextType = normalizeQuestionType(nextTypeVal);
    const nextMode = questionTypeToInteractionMode(nextType);
    setQuestionType(nextType);
    setPoints([]);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "CUBICON_SET_PICKER_CONFIG",
          screen,
          image,
          interactionMode: nextMode,
        },
        "*"
      );
      iframeRef.current.contentWindow.postMessage({ type: "CUBICON_CLEAR_COORDINATES" }, "*");
    }
    notifySync({ questionType: nextType, points: [] });
  };

  const handleScrollLeft = () => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const filteredCdnImages = useMemo(() => {
    let list = cdnImages;
    if (cdnSearch.trim()) {
      const q = cdnSearch.toLowerCase().trim();
      list = list.filter(
        (img) =>
          img.name.toLowerCase().includes(q) ||
          img.fileName.toLowerCase().includes(q)
      );
    }
    if (formatFilter !== "all") {
      list = list.filter((img) => img.format.toLowerCase() === formatFilter);
    }
    return list;
  }, [cdnImages, cdnSearch, formatFilter]);

  const handleApply = () => {
    const correctCoordinates = formatCoordinatesJson(points);
    const waypoints = extractWaypoints(points);
    const normalizedType = normalizeQuestionType(questionType);
    onApply({
      correctCoordinates,
      startPoint: waypoints.startPoint,
      midPoint: waypoints.midPoint,
      endPoint: waypoints.endPoint,
      points,
      image,
      screen,
      questionType: normalizedType,
    });
    onClose();
  };

  if (!isOpen) return null;

  const pointColors = ["#10b981", "#06b6d4", "#a855f7"];
  const activeScreenLabel = PRESET_SCREENS.find((s) => s.value === screen)?.label || screen;

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
                onChange={(e) => handleScreenChange(e.target.value)}
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
                onChange={(e) => handleImageChange(e.target.value)}
              >
                {cdnImages.map((c) => (
                  <option key={c.publicUrl} value={c.publicUrl}>
                    {c.name} ({c.format.toUpperCase()})
                  </option>
                ))}
                {PRESET_ARTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
                {!cdnImages.some((c) => c.publicUrl === image) &&
                  !PRESET_ARTS.some((a) => a.value === image) && (
                    <option value={image}>Custom: {image}</option>
                  )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Question Type</label>
              <select
                className={styles.select}
                value={questionType}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
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

          {/* CDN Puzzle Images Side-Scrolling Thumbnail Gallery */}
          <div className={styles.cdnGalleryCard}>
            <div className={styles.cdnGalleryHeader}>
              <div className={styles.cdnGalleryTitle}>
                <ImageIcon size={16} />
                <span>CDN Puzzle Images (cubicon/puzzle)</span>
                <span className={styles.cdnBadgeCount}>
                  {filteredCdnImages.length} Image{filteredCdnImages.length === 1 ? "" : "s"}
                </span>
                {assignedNotice && (
                  <span className={styles.assignedPill}>
                    <CheckCircle2 size={12} style={{ display: "inline", marginRight: 4 }} />
                    {assignedNotice}
                  </span>
                )}
              </div>

              <div className={styles.cdnFaceIndicator}>
                <span>Target Face:</span>
                <span className={styles.cdnFaceHighlight}>{activeScreenLabel}</span>
              </div>

              <div className={styles.cdnGalleryControls}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Search size={12} style={{ position: "absolute", left: 8, color: "#64748b" }} />
                  <input
                    type="text"
                    placeholder="Filter CDN arts..."
                    value={cdnSearch}
                    onChange={(e) => setCdnSearch(e.target.value)}
                    className={styles.cdnSearchInput}
                    style={{ paddingLeft: 24 }}
                  />
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  {["all", "webp", "png"].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormatFilter(fmt)}
                      className={formatFilter === fmt ? styles.btnPrimary : styles.btnSecondary}
                      style={{ padding: "4px 8px", fontSize: "0.7rem", height: "26px" }}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={fetchCdnImages}
                  className={styles.btnSecondary}
                  style={{ padding: "4px 8px", height: "26px" }}
                  title="Reload CDN images from S3"
                >
                  <RefreshCw size={12} className={isLoadingCdn ? "spin" : ""} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsGalleryCollapsed((prev) => !prev)}
                  className={styles.btnSecondary}
                  style={{ padding: "4px 8px", height: "26px", fontSize: "0.7rem" }}
                  title={isGalleryCollapsed ? "Expand CDN gallery" : "Collapse CDN gallery"}
                >
                  {isGalleryCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>

            {/* Scrollable Track with Left/Right Nav Buttons */}
            {!isGalleryCollapsed && (
            <div className={styles.scrollTrackWrapper}>
              <button
                type="button"
                className={`${styles.scrollArrowBtn} ${styles.scrollArrowLeft}`}
                onClick={handleScrollLeft}
                aria-label="Scroll puzzle images left"
              >
                <ChevronLeft size={16} />
              </button>

              <div ref={scrollTrackRef} className={styles.scrollTrack}>
                {isLoadingCdn && cdnImages.length === 0 ? (
                  <div style={{ padding: "16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                    Loading CDN puzzle images...
                  </div>
                ) : filteredCdnImages.length === 0 ? (
                  <div style={{ padding: "16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                    No puzzle images matched your filter.
                  </div>
                ) : (
                  filteredCdnImages.map((item) => {
                    const isSelected = item.publicUrl === image;
                    return (
                      <div
                        key={item.id}
                        className={`${styles.thumbnailCard} ${isSelected ? styles.thumbnailCardSelected : ""}`}
                        onClick={() => handleAssignImage(item)}
                        title={`Click to assign "${item.name}" to ${activeScreenLabel}`}
                      >
                        <div className={styles.thumbnailImgWrapper}>
                          <img
                            src={item.thumbnailUrl || getThumbnailUrl(item.publicUrl, 160)}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            width={72}
                            height={72}
                            className={styles.thumbnailImg}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.triedOriginal && item.publicUrl) {
                                target.dataset.triedOriginal = "true";
                                target.src = item.publicUrl;
                              } else {
                                target.src = "/cubicon-app/cubicon_logo.png";
                              }
                            }}
                          />
                          {isSelected && (
                            <div className={styles.selectedBadge} title="Currently assigned to selected face">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className={styles.thumbnailName} title={item.name}>
                          {item.name}
                        </div>
                        <div className={styles.thumbnailSubtext}>
                          <span className={styles.formatTag}>{item.format}</span>
                          {isSelected && <span style={{ color: "#38bdf8", fontWeight: 600 }}>Active</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                className={`${styles.scrollArrowBtn} ${styles.scrollArrowRight}`}
                onClick={handleScrollRight}
                aria-label="Scroll puzzle images right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            )}
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
                  ref={iframeRef}
                  src={iframeSrc}
                  onLoad={syncIframeConfig}
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
