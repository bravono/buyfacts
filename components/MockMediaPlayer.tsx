"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  ChevronRight,
  FileText,
  Download,
  Mail,
  Video,
  Headphones,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import styles from "./MockMediaPlayer.module.css";

export interface MockMediaPlayerProps {
  title?: string;
  tagline?: string;
  subtitle?: string;
  description?: string;
  rightTitle?: string;
  rightSubtitle?: string;
  mediaType?: "video" | "audio" | "image" | "pdf";
  mediaUrl?: string;
  pdfUrl?: string;
  pdfLabel?: string;
  moreDetailUrl?: string;
  moreDetailIconUrl?: string;
  videoIconUrl?: string;
  contactIconUrl?: string;
  onMoreDetailClick?: () => void;
  onVideoClick?: () => void;
  onContactClick?: () => void;
  onExploreClick?: (action: string) => void;
  onNextMedia?: () => void;
  showWelcome?: boolean;
  onShowWelcome?: () => void;
  onDismissWelcome?: () => void;
}

function isYouTubeUrl(url?: string): boolean {
  if (!url) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}

function getYouTubeEmbedUrl(url: string): string {
  try {
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[?#]/)[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v");
    if (id) {
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("/embed/")) {
      return url;
    }
  } catch {}
  return url;
}

export default function MockMediaPlayer({
  title,
  tagline,
  subtitle,
  description,
  rightTitle,
  rightSubtitle,
  mediaType = "video",
  mediaUrl,
  pdfUrl,
  pdfLabel,
  moreDetailUrl,
  moreDetailIconUrl,
  videoIconUrl,
  contactIconUrl,
  onMoreDetailClick,
  onVideoClick,
  onContactClick,
  onExploreClick,
  onNextMedia,
  showWelcome,
  onShowWelcome,
  onDismissWelcome,
}: MockMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isWelcomeActive, setIsWelcomeActive] = useState<boolean>(showWelcome ?? true);

  useEffect(() => {
    if (showWelcome !== undefined) {
      setIsWelcomeActive(showWelcome);
    }
  }, [showWelcome]);

  // Section 6: Video opening state and In Depth preview states
  const [videoMode, setVideoMode] = useState<"idle" | "opening" | "playing">("idle");
  const [showInDepthModal, setShowInDepthModal] = useState(false);
  const [downloadConfirmed, setDownloadConfirmed] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const displayTitle = isWelcomeActive
    ? "Getting Started"
    : (title || "Operational Demonstration");
  const displayTagline = isWelcomeActive
    ? "Welcome to your Marketers tool workspace!"
    : (tagline || subtitle || "BuyFacts B2B Validation Pipeline Walkthrough");

  const isYouTube = Boolean(mediaUrl && isYouTubeUrl(mediaUrl));
  const isPlayable = Boolean(
    (mediaType === "video" || mediaType === "audio") && mediaUrl && !isYouTube
  );

  const handleNextMedia = () => {
    setIsWelcomeActive(false);
    onDismissWelcome?.();
    onNextMedia?.();
  };

  // Reset playback states on media change
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setVideoMode("idle");
    setDownloadConfirmed(null);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [mediaUrl, mediaType]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const el = e.currentTarget;
    if (el.duration) {
      setCurrentTime(el.currentTime);
      setProgress((el.currentTime / el.duration) * 100);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setDuration(e.currentTarget.duration || 0);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    const el =
      mediaType === "video"
        ? videoRef.current
        : mediaType === "audio"
          ? audioRef.current
          : null;
    if (el) {
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
      } else {
        setVideoMode("playing");
        el.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("Playback blocked or failed: ", err);
          });
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextProgress = parseFloat(e.target.value);
    const el =
      mediaType === "video"
        ? videoRef.current
        : mediaType === "audio"
          ? audioRef.current
          : null;
    if (el && el.duration) {
      const nextTime = (nextProgress / 100) * el.duration;
      el.currentTime = nextTime;
      setCurrentTime(nextTime);
      setProgress(nextProgress);
    }
  };

  const resetPlayback = () => {
    const el =
      mediaType === "video"
        ? videoRef.current
        : mediaType === "audio"
          ? audioRef.current
          : null;
    if (el) {
      el.currentTime = 0;
      el.pause();
    }
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const el =
      mediaType === "video"
        ? videoRef.current
        : mediaType === "audio"
          ? audioRef.current
          : null;
    if (el) {
      el.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (mediaType === "video" && videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs <= 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Section 6: Video Button Action
  const handleVideoAction = () => {
    if (onVideoClick) {
      onVideoClick();
    } else if (onExploreClick) {
      onExploreClick("video");
    } else {
      togglePlay();
    }
  };

  const handleStartVideo = () => {
    setVideoMode("playing");
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch((err) => {
          console.warn("Video play interrupted:", err);
        });
        setIsPlaying(true);
      }
    }, 50);
  };

  const handleCancelVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setVideoMode("idle");
    setIsPlaying(false);
  };

  // Section 6: In Depth Action (Opens Preview Modal before download)
  const handleInDepthAction = () => {
    if (onMoreDetailClick) {
      onMoreDetailClick();
    } else if (onExploreClick) {
      onExploreClick("more_detail");
    } else {
      setShowInDepthModal(true);
    }
  };

  const handleDownloadDocument = () => {
    const targetUrl = pdfUrl || moreDetailUrl || "/sample-details.pdf";
    // Create temporary link and trigger download
    const link = document.createElement("a");
    link.href = targetUrl;
    link.download = `${displayTitle.replace(/[^a-zA-Z0-9]/g, "_")}_Documentation.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close preview modal and show confirmation alert
    setShowInDepthModal(false);
    setDownloadConfirmed(`Document download complete: "${displayTitle}" has been saved. Your active dashboard selection remains preserved.`);
  };

  const handleContactAction = () => {
    if (onContactClick) {
      onContactClick();
    } else if (onExploreClick) {
      onExploreClick("contact_us");
    }
  };

  return (
    <div className={styles.playerCard} id="mock-media-player-card">
      {/* 1. Header Banner Box with Button Label and Tagline Combination */}
      <div className={styles.headerBanner}>
        <div className={styles.headerLeft}>
          <h3 className={styles.headerTitle}>{displayTitle}</h3>
          <p className={styles.headerSubtitle}>{displayTagline}</p>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={`${styles.gettingStartedToggleBtn} ${
              isWelcomeActive ? styles.gettingStartedToggleBtnActive : ""
            }`}
            onClick={() => {
              const next = !isWelcomeActive;
              setIsWelcomeActive(next);
              if (next) {
                onShowWelcome?.();
              } else {
                onDismissWelcome?.();
              }
            }}
            aria-label="Getting Started guide"
            title="Getting Started guide"
          >
            Getting Started
          </button>
          <Link
            href="/"
            style={{
              fontSize: "0.78rem",
              color: "var(--color-blue-3)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* 2. Player Screen Frame */}
      <div
        className={`${styles.screenFrame} ${
          mediaType === "video" || mediaType === "image"
            ? styles.videoScreenFrame
            : styles.audioScreenFrame
        }`}
      >
        {/* Section 6: Opening Animation Overlay with Start Video & Cancel */}
        {videoMode === "opening" && !isWelcomeActive && (
          <div className={styles.videoOpeningCard}>
            <span className={styles.openingBadge}>Preview Presentation</span>
            <h4 className={styles.openingTitle}>{displayTitle}</h4>
            <p className={styles.openingTagline}>{displayTagline}</p>
            <div className={styles.openingButtons}>
              <button
                type="button"
                className={styles.btnStartVideo}
                onClick={handleStartVideo}
                id="btn-start-video"
              >
                <Play size={16} fill="white" /> Start Video
              </button>
              <button
                type="button"
                className={styles.btnCancelVideo}
                onClick={handleCancelVideo}
                id="btn-cancel-video"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Video Render */}
        {mediaType === "video" && mediaUrl && (
          isYouTube ? (
            <iframe
              src={getYouTubeEmbedUrl(mediaUrl)}
              className={styles.realVideo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={mediaUrl}
              className={styles.realVideo}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => {
                setIsPlaying(true);
                setVideoMode("playing");
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={handleEnded}
              onClick={togglePlay}
              preload="metadata"
              playsInline
            />
          )
        )}

        {/* Idle Audio Wave Background or Video Fallback when no url */}
        {(mediaType !== "video" || !mediaUrl) && (
          <div className={styles.videoBackground}>
            <div
              className={styles.dataNode}
              style={{ top: "30%", left: "20%", animationDelay: "0s" }}
            ></div>
            <div
              className={styles.dataNode}
              style={{ top: "60%", left: "45%", animationDelay: "1s" }}
            ></div>
            <div
              className={styles.dataNode}
              style={{ top: "25%", left: "70%", animationDelay: "2s" }}
            ></div>
            <div
              className={styles.dataNode}
              style={{ top: "70%", left: "80%", animationDelay: "1.5s" }}
            ></div>
            <svg
              className={styles.waveSvg}
              viewBox="0 0 500 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,100 C150,150 250,50 500,120 L500,200 L0,200 Z"
                fill="url(#wave-grad)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-blue-2)" />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent-green-mint)"
                  />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* Audio Render */}
        {mediaType === "audio" && mediaUrl && (
          <audio
            ref={audioRef}
            src={mediaUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          />
        )}

        {/* Image Render */}
        {mediaType === "image" && mediaUrl && (
          <div className={styles.imageViewer}>
            <img
              src={mediaUrl}
              className={styles.realImage}
              alt={displayTitle}
            />
          </div>
        )}

        {/* PDF Render */}
        {mediaType === "pdf" && mediaUrl && (
          <div className={styles.pdfViewer}>
            <div className={styles.pdfCard}>
              <FileText size={48} color="var(--primary-color)" />
              <h5 className={styles.pdfName}>{displayTitle}</h5>
              <span className={styles.pdfTag}>Documentation</span>
              <button
                type="button"
                onClick={handleInDepthAction}
                className={styles.pdfLink}
                style={{ cursor: "pointer", border: "none" }}
              >
                Preview Document
              </button>
            </div>
          </div>
        )}

        {/* Large Central Play Button (when playable and welcome not active) */}
        {isPlayable && !isWelcomeActive && (
          <button
            className={`${styles.playButton} ${isPlaying ? styles.isPlayingBtn : ""} ${mediaType === "video" && isPlaying ? styles.videoPlaying : ""}`}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            id="mock-media-play-btn"
          >
            {isPlaying ? (
              <Pause size={32} fill="white" stroke="white" />
            ) : (
              <Play
                size={32}
                fill="white"
                stroke="white"
                className={styles.playIconOffset}
              />
            )}
          </button>
        )}

        {/* Right Arrow Translucent Action Circle Button (when welcome not active) */}
        {!isWelcomeActive && (
          <button
            className={styles.nextMediaButton}
            onClick={handleNextMedia}
            aria-label="Next media option"
            title="Next option"
          >
            <ChevronRight size={22} color="#ffffff" />
          </button>
        )}

        {/* Audio Oscilloscope visualizer when playing audio and welcome not active */}
        {mediaType === "audio" && isPlaying && !isWelcomeActive && (
          <div className={styles.barsVisualizer}>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
          </div>
        )}

        {/* Getting Started Welcome Overlay or Topic Description Overlay */}
        {isWelcomeActive ? (
          <div
            className={`${styles.descriptionOverlay} ${styles.welcomeOverlay} ${
              isPlaying ? styles.descriptionOverlayHidden : ""
            }`}
            id="mock-media-welcome-overlay"
          >
            <button
              type="button"
              className={styles.welcomeDismissBtn}
              onClick={() => {
                setIsWelcomeActive(false);
                onDismissWelcome?.();
              }}
              aria-label="Dismiss guide"
              title="Explore topics"
            >
              <X size={18} />
            </button>
            <div className={styles.welcomeContent}>
              <h4 className={styles.welcomeIntro}>Here are the basics:</h4>
              <ul className={styles.welcomeList}>
                <li>
                  <span
                    className={styles.bulletDot}
                    style={{ color: "var(--color-orange-1, #ff9900)" }}
                  >
                    •
                  </span>
                  <span>Click on Any Tool or Resource topic</span>
                </li>
                <li>
                  <span
                    className={styles.bulletDot}
                    style={{ color: "var(--color-accent-green-mint, #42ea86)" }}
                  >
                    •
                  </span>
                  <span>View a description and available resources</span>
                </li>
                <li>
                  <span
                    className={styles.bulletDot}
                    style={{ color: "var(--color-blue-2, #0089d2)" }}
                  >
                    •
                  </span>
                  <span>See, hear, read and apply our shared learnings that will save you time</span>
                </li>
                <li>
                  <span
                    className={styles.bulletDot}
                    style={{ color: "var(--color-accent-green-lime, #b0e843)" }}
                  >
                    •
                  </span>
                  <span>Pose a question or a request to Robert for help</span>
                </li>
                <li>
                  <span
                    className={styles.bulletDot}
                    style={{ color: "var(--color-orange-2, #ffc164)" }}
                  >
                    •
                  </span>
                  <span>Download and save time with our ideas and tools (no strings attached)</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          description && (
            <div
              className={`${styles.descriptionOverlay} ${
                isPlaying ? styles.descriptionOverlayHidden : ""
              }`}
            >
              <p className={styles.descriptionOverlayText}>
                <span className={styles.descriptionHighlight}>
                  {displayTitle}:{" "}
                </span>
                {description}
              </p>
            </div>
          )
        )}
      </div>

      {/* Seek Control Panel (Only for active playable media and when welcome not active) */}
      {isPlayable && !isWelcomeActive && (
        <div className={styles.controlPanel}>
          <div className={styles.sliderWrapper}>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSliderChange}
              className={styles.seekBar}
              id="mock-media-seek-bar"
            />
            <div
              className={styles.seekFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.timeInfo}>
              <span className={styles.timeText}>{formatTime(currentTime)}</span>
              <span className={styles.timeDivider}>/</span>
              <span className={styles.timeText}>
                {duration > 0 ? formatTime(duration) : "Available on start"}
              </span>
            </div>

            <div className={styles.utilityBtns}>
              <button
                className={styles.utilBtn}
                onClick={resetPlayback}
                title="Reset"
              >
                <RotateCcw size={16} />
              </button>
              <button
                className={styles.utilBtn}
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              {mediaType === "video" && (
                <>
                  <button
                    className={styles.utilBtn}
                    onClick={toggleFullscreen}
                    title="Full Screen"
                  >
                    <Maximize size={16} />
                  </button>
                  <button
                    className={styles.utilBtn}
                    onClick={handleCancelVideo}
                    title="Close Video"
                    style={{ marginLeft: "6px", color: "#f87171" }}
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download Confirmation Alert Banner (Section 6) */}
      {downloadConfirmed && (
        <div className={styles.downloadSuccessBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>{downloadConfirmed}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadConfirmed(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Horizontal Separator Divider */}
      <hr className={styles.divider} />

      {/* 5. Bottom Action Buttons: Three Principal Choices (Section 6) */}
      <div className={styles.actionSection}>
        <div className={styles.actionButtonsRow}>
          {/* Principal Choice 1: Video */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnVideo}`}
            onClick={handleVideoAction}
            aria-label="Video"
            id="action-btn-video"
          >
            {videoIconUrl ? (
              <img src={videoIconUrl} alt="" className={styles.btnIconImage} />
            ) : (
              <Video size={17} className={styles.btnIconPlaceholder} />
            )}
            <span>Video</span>
          </button>

          {/* Principal Choice 2: In Depth */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnMoreDetail}`}
            onClick={handleInDepthAction}
            aria-label="In Depth"
            id="action-btn-in-depth"
          >
            {moreDetailIconUrl ? (
              <img
                src={moreDetailIconUrl}
                alt=""
                className={styles.btnIconImage}
              />
            ) : (
              <FileText size={17} className={styles.btnIconPlaceholder} />
            )}
            <span>In Depth</span>
          </button>

          {/* Principal Choice 3: Talk to Us */}
          <Link
            href="/#contact"
            className={`${styles.roundedActionBtn} ${styles.btnContact}`}
            onClick={handleContactAction}
            aria-label="Talk to Us"
            id="action-btn-talk-to-us"
          >
            {contactIconUrl ? (
              <img
                src={contactIconUrl}
                alt=""
                className={styles.btnIconImage}
              />
            ) : (
              <Mail size={17} className={styles.btnIconPlaceholder} />
            )}
            <span>Talk to Us</span>
          </Link>
        </div>
      </div>

      {/* Section 6 & 11: In Depth Preview Modal Dialog */}
      {showInDepthModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowInDepthModal(false)}>
          <div className={styles.inDepthModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h4 className={styles.modalTitle}>{displayTitle}</h4>
                <p className={styles.modalSubtitle}>{displayTagline}</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowInDepthModal(false)}
                aria-label="Close Preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Review the comprehensive documentation and methodology specs for <strong>{displayTitle}</strong> before saving the reference file.
              </p>

              <div className={styles.modalDocCard}>
                <FileText size={32} color="var(--interactive-blue)" />
                <div>
                  <h5 style={{ margin: "0 0 2px 0", fontSize: "0.95rem", color: "#00507b" }}>
                    {pdfLabel || `${displayTitle} Technical Reference`}
                  </h5>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Executive Briefing (PDF) • Version 2026.1
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                {description}
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancelVideo}
                style={{ color: "#475569", borderColor: "#cbd5e1" }}
                onClick={() => setShowInDepthModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnStartVideo}
                onClick={handleDownloadDocument}
                id="btn-confirm-download"
              >
                <Download size={16} /> Download Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
