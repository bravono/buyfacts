"use client";

import React, { useId } from "react";
import { Pause, Play, Square, Volume1, Volume2, VolumeX } from "lucide-react";
import { formatClock, formatProgress, SKIP_SECONDS } from "@/lib/mediaTransport";
import type { TransportActions } from "./useMediaTransport";
import styles from "./TransportControls.module.css";

interface TransportControlsProps {
  transport: TransportActions;
  /** What is playing, for screen readers, e.g. "TRIAD preview video". */
  label: string;
  className?: string;
  /** Extra buttons placed at the end of the row (full screen, close, ...). */
  children?: React.ReactNode;
}

/**
 * Custom transport bar for a video or audio element: Play/Pause, Stop, -10s, +10s,
 * a timeline scrubber with MM:SS / MM:SS, Mute/Unmute and a volume slider.
 */
export default function TransportControls({ transport, label, className, children }: TransportControlsProps) {
  const timeId = useId();
  const { isPlaying, currentTime, duration, volume, muted } = transport;
  const hasDuration = duration > 0;
  const progress = hasDuration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const shownVolume = muted ? 0 : volume;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={`${styles.transport} ${className ?? ""}`} role="group" aria-label={`${label} controls`}>
      <input
        type="range"
        className={styles.range}
        min={0}
        max={hasDuration ? duration : 0}
        step={0.1}
        value={hasDuration ? currentTime : 0}
        disabled={!hasDuration}
        onChange={(event) => transport.seek(Number(event.target.value))}
        style={{ "--fill": `${progress}%` } as React.CSSProperties}
        aria-label="Seek"
        aria-describedby={timeId}
        aria-valuetext={`${formatClock(currentTime)} of ${hasDuration ? formatClock(duration) : "unknown length"}`}
        data-transport="scrubber"
      />

      <div className={styles.row}>
        <div className={styles.group}>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={transport.togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
            data-transport="play-pause"
          >
            {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </button>
          <button type="button" className={styles.button} onClick={transport.stop} aria-label="Stop" data-transport="stop">
            <Square size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.skip}`}
            onClick={transport.skipBack}
            aria-label={`Skip back ${SKIP_SECONDS} seconds`}
            data-transport="skip-back"
          >
            -{SKIP_SECONDS}s
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.skip}`}
            onClick={transport.skipForward}
            aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
            data-transport="skip-forward"
          >
            +{SKIP_SECONDS}s
          </button>
          <span id={timeId} className={styles.time} data-transport="time">
            {formatProgress(currentTime, duration)}
          </span>
        </div>

        <div className={styles.group}>
          <button
            type="button"
            className={styles.button}
            onClick={transport.toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            data-transport="mute"
          >
            <VolumeIcon size={17} aria-hidden="true" />
          </button>
          <input
            type="range"
            className={`${styles.range} ${styles.volume}`}
            min={0}
            max={1}
            step={0.05}
            value={shownVolume}
            onChange={(event) => transport.setVolume(Number(event.target.value))}
            style={{ "--fill": `${shownVolume * 100}%` } as React.CSSProperties}
            aria-label="Volume"
            aria-valuetext={`${Math.round(shownVolume * 100)}%`}
            data-transport="volume"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
