"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Maximize, RotateCcw } from "lucide-react";
import styles from "./MockMediaPlayer.module.css";

interface MockMediaPlayerProps {
  title?: string;
  subtitle?: string;
  mediaType?: "video" | "audio";
}

export default function MockMediaPlayer({ title, subtitle, mediaType }: MockMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(25); // Start at 25% to mimic the mockup's seek handle position
  const [currentTime, setCurrentTime] = useState(38); // Starts at 38s
  const duration = 150; // Total 2m 30s
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const displayTitle = title || "Operational Demonstration";
  const displaySubtitle = subtitle || "BuyFacts® B2B Validation Pipeline Walkthrough";
  const isVideo = (mediaType || "video") === "video";

  // Simulate playback timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          const nextProgress = prev + 0.5;
          setCurrentTime(Math.floor((nextProgress / 100) * duration));
          return nextProgress;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextProgress = parseFloat(e.target.value);
    setProgress(nextProgress);
    setCurrentTime(Math.floor((nextProgress / 100) * duration));
  };

  const resetPlayback = () => {
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`${styles.playerCard} glass-card`}>
      {/* Player Screen Frame */}
      <div className={styles.screenFrame}>
        {/* Abstract vector video background representing data validation flow */}
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

        {/* Dynamic Display Title */}
        <div className={styles.videoHeader}>
          <span className={styles.mediaTag}>{isVideo ? "VIDEO DEMO" : "AUDIO STREAM"}</span>
          <h4 className={styles.mediaTitle}>{displayTitle}</h4>
        </div>

        {/* Large Play/Pause Button inside circular overlay */}
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

        {/* Live Audio Oscilloscope visualizer when playing */}
        {isPlaying && (
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

      {/* Seek Control Panel */}
      <div className={styles.controlPanel}>
        {/* Slider element representing the handle in mockup */}
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
          {/* Re-fills the custom progress track background color */}
          <div className={styles.seekFill} style={{ width: `${progress}%` }}></div>
        </div>

        {/* Time and Utility Controls */}
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
            <button className={styles.utilBtn} title="Volume">
              <Volume2 size={16} />
            </button>
            <button className={styles.utilBtn} title="Full Screen">
              <Maximize size={16} />
            </button>
          </div>
        </div>

        <div className={styles.mediaMeta}>
          <p className={styles.metaDesc}>{displaySubtitle}</p>
        </div>
      </div>
    </div>
  );
}
