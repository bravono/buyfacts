"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, ChevronRight, FileText, Download, Mail, Video, Headphones } from "lucide-react";
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
}: MockMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const displayTitle = title || "Operational Demonstration";
  const displayTagline = tagline || subtitle || "BuyFacts B2B Validation Pipeline Walkthrough";
  const displayRightTitle = rightTitle || `${mediaType.toUpperCase()} PREVIEW`;
  const displayRightSubtitle =
    rightSubtitle ||
    (mediaType === "video" || mediaType === "audio"
      ? "Interactive Audio / Video Stream"
      : "Interactive Document Stream");

  // Reset playback states on media change
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    if (videoRef.current) {
      videoRef.current.load();
    }
    if (audioRef.current) {
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
    const el = mediaType === "video" ? videoRef.current : mediaType === "audio" ? audioRef.current : null;
    if (el) {
      if (isPlaying) {
        el.pause();
      } else {
        el.play().catch((err) => {
          console.warn("Playback blocked or failed: ", err);
        });
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextProgress = parseFloat(e.target.value);
    const el = mediaType === "video" ? videoRef.current : mediaType === "audio" ? audioRef.current : null;
    if (el && el.duration) {
      const nextTime = (nextProgress / 100) * el.duration;
      el.currentTime = nextTime;
      setCurrentTime(nextTime);
      setProgress(nextProgress);
    }
  };

  const resetPlayback = () => {
    const el = mediaType === "video" ? videoRef.current : mediaType === "audio" ? audioRef.current : null;
    if (el) {
      el.currentTime = 0;
      el.pause();
    }
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const el = mediaType === "video" ? videoRef.current : mediaType === "audio" ? audioRef.current : null;
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
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isPlayable = mediaType === "video" || mediaType === "audio";

  const handleMoreDetail = () => {
    if (onMoreDetailClick) {
      onMoreDetailClick();
    } else if (onExploreClick) {
      onExploreClick("more_detail");
    } else if (pdfUrl || moreDetailUrl) {
      window.open(pdfUrl || moreDetailUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleVideoAction = () => {
    if (onVideoClick) {
      onVideoClick();
    } else if (onExploreClick) {
      onExploreClick("video");
    } else {
      togglePlay();
    }
  };

  const handleContactAction = () => {
    if (onContactClick) {
      onContactClick();
    } else if (onExploreClick) {
      onExploreClick("contact_us");
    }
  };

  return (
    <div className={styles.playerCard}>
      {/* 1. Header Banner Box with Button Label and Tagline Combination */}
      <div className={styles.headerBanner}>
        <div className={styles.headerLeft}>
          <h3 className={styles.headerTitle}>{displayTitle}</h3>
          <p className={styles.headerSubtitle}>{displayTagline}</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerRightTitle}>{displayRightTitle}</span>
          <span className={styles.headerRightSubtitle}>{displayRightSubtitle}</span>
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
        {/* Video Render */}
        {mediaType === "video" && mediaUrl && (
          <video
            ref={videoRef}
            src={mediaUrl}
            className={styles.realVideo}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
            onClick={togglePlay}
            playsInline
          />
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

        {/* Visualizer Background for Audio or Default */}
        {(mediaType === "audio" || !mediaUrl) && (
          <div className={styles.videoBackground}>
            <div className={styles.dataNode} style={{ top: "30%", left: "20%", animationDelay: "0s" }}></div>
            <div className={styles.dataNode} style={{ top: "60%", left: "45%", animationDelay: "1s" }}></div>
            <div className={styles.dataNode} style={{ top: "25%", left: "70%", animationDelay: "2s" }}></div>
            <div className={styles.dataNode} style={{ top: "70%", left: "80%", animationDelay: "1.5s" }}></div>
            <svg className={styles.waveSvg} viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,100 C150,150 250,50 500,120 L500,200 L0,200 Z" fill="url(#wave-grad)" opacity="0.3" />
              <defs>
                <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-blue-2)" />
                  <stop offset="100%" stopColor="var(--color-accent-green-mint)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* Image Render */}
        {mediaType === "image" && mediaUrl && (
          <div className={styles.imageViewer}>
            <img src={mediaUrl} className={styles.realImage} alt={displayTitle} />
          </div>
        )}

        {/* PDF Render */}
        {mediaType === "pdf" && mediaUrl && (
          <div className={styles.pdfViewer}>
            <div className={styles.pdfCard}>
              <svg className={styles.pdfIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <h5 className={styles.pdfName}>{displayTitle}</h5>
              <span className={styles.pdfTag}>Document Mockup</span>
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={styles.pdfLink}>
                View PDF Document
              </a>
            </div>
          </div>
        )}

        {/* Large Central Play Button (For video/audio) */}
        {isPlayable && (
          <button
            className={`${styles.playButton} ${isPlaying ? styles.isPlayingBtn : ""}`}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            id="mock-media-play-btn"
          >
            {isPlaying ? (
              <Pause size={32} fill="white" stroke="white" />
            ) : (
              <Play size={32} fill="white" stroke="white" className={styles.playIconOffset} />
            )}
          </button>
        )}

        {/* Right Arrow Translucent Action Circle Button */}
        <button
          className={styles.nextMediaButton}
          onClick={onNextMedia}
          aria-label="Next media option"
          title="Next slide"
        >
          <ChevronRight size={22} color="#ffffff" />
        </button>

        {/* Audio Oscilloscope visualizer when playing audio */}
        {mediaType === "audio" && isPlaying && (
          <div className={styles.barsVisualizer}>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
          </div>
        )}
      </div>

      {/* Seek Control Panel (Only for playables: video/audio) */}
      {isPlayable && (
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
            <div className={styles.seekFill} style={{ width: `${progress}%` }}></div>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.timeInfo}>
              <span className={styles.timeText}>{formatTime(currentTime)}</span>
              <span className={styles.timeDivider}>/</span>
              <span className={styles.timeText}>{formatTime(duration)}</span>
            </div>

            <div className={styles.utilityBtns}>
              <button className={styles.utilBtn} onClick={resetPlayback} title="Reset">
                <RotateCcw size={16} />
              </button>
              <button className={styles.utilBtn} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              {mediaType === "video" && (
                <button className={styles.utilBtn} onClick={toggleFullscreen} title="Full Screen">
                  <Maximize size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF / Audio Download Option below Player Screen */}
      {pdfUrl && (
        <div className={styles.pdfDownloadBanner}>
          <div className={styles.pdfDownloadInfo}>
            <FileText className={styles.pdfDownloadIcon} size={24} />
            <div>
              <span className={styles.pdfDownloadTag}>Detailed Documentation</span>
              <h5 className={styles.pdfDownloadTitle}>{pdfLabel || "A Deeper Preview"}</h5>
            </div>
          </div>
          <div className={styles.pdfDownloadActionGroup}>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={styles.pdfDownloadBtn}
            >
              <Download size={18} /> Download PDF
            </a>
            <a
              href={mediaUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`${styles.pdfDownloadBtn} ${styles.audioDownloadBtn}`}
            >
              <Headphones size={18} /> Audio Recording
            </a>
          </div>
        </div>
      )}

      {/* 3. Top-to-Bottom Rapid Reveal Description Paragraph Panel */}
      {description && (
        <div key={displayTitle} className={styles.revealContainer}>
          <p className={styles.descriptionParagraph}>
            <span className={styles.descriptionHighlight}>{displayTitle}: </span>
            {description}
          </p>
        </div>
      )}

      {/* 4. Horizontal Separator Divider */}
      <hr className={styles.divider} />

      {/* 5. Bottom Action Buttons: Three Rounded Corner Buttons with Left Icons */}
      <div className={styles.actionSection}>
        <div className={styles.actionButtonsRow}>
          {/* Button 1: More Detail */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnMoreDetail}`}
            onClick={handleMoreDetail}
            aria-label="More Detail"
          >
            {moreDetailIconUrl ? (
              <img src={moreDetailIconUrl} alt="" className={styles.btnIconImage} />
            ) : (
              <FileText size={17} className={styles.btnIconPlaceholder} />
            )}
            <span>More Detail</span>
          </button>

          {/* Button 2: 3-Minute Video */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnVideo}`}
            onClick={handleVideoAction}
            aria-label="3-Minute Video"
          >
            {videoIconUrl ? (
              <img src={videoIconUrl} alt="" className={styles.btnIconImage} />
            ) : (
              <Video size={17} className={styles.btnIconPlaceholder} />
            )}
            <span>3-Minute Video</span>
          </button>

          {/* Button 3: Contact Us */}
          <Link
            href="/#contact"
            className={`${styles.roundedActionBtn} ${styles.btnContact}`}
            onClick={handleContactAction}
            aria-label="Contact Us"
          >
            {contactIconUrl ? (
              <img src={contactIconUrl} alt="" className={styles.btnIconImage} />
            ) : (
              <Mail size={17} className={styles.btnIconPlaceholder} />
            )}
            <span>Contact Us</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


