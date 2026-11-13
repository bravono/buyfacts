"use client";

import React from "react";
import TransportControls from "./TransportControls";
import { useMediaTransport, type TransportActions } from "./useMediaTransport";
import { useResponsiveVideoSrc } from "./useResponsiveVideoSrc";
import styles from "./TransportVideo.module.css";

interface TransportVideoProps {
  /** Desktop render (> 768px), also used everywhere when there is no mobile render. */
  src: string;
  /** Mobile portrait render (<= 768px). Falls back to MOBILE_VIDEO_VARIANTS, then `src`. */
  mobileSrc?: string;
  /** Accessible name of the video. */
  title: string;
  autoPlay?: boolean;
  preload?: "none" | "metadata" | "auto";
  className?: string;
  videoClassName?: string;
  controlsClassName?: string;
  /** Rendered over the video once playback has ended (e.g. "Where to next?"). */
  endScreen?: (transport: TransportActions) => React.ReactNode;
}

/**
 * A video with the custom transport controls and responsive desktop/mobile source
 * selection. Clicking the picture toggles playback.
 */
export default function TransportVideo({
  src,
  mobileSrc,
  title,
  autoPlay = false,
  preload = "metadata",
  className,
  videoClassName,
  controlsClassName,
  endScreen,
}: TransportVideoProps) {
  const { attach, ...transport } = useMediaTransport();
  const activeSrc = useResponsiveVideoSrc({ desktopUrl: src, mobileUrl: mobileSrc });

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <div className={styles.stage}>
        {/* Keyed by the logical video, so a desktop/mobile swap keeps the element (and its
            position) while a different video starts fresh. */}
        <video
          key={src}
          ref={attach}
          src={activeSrc}
          className={`${styles.video} ${videoClassName ?? ""}`}
          autoPlay={autoPlay}
          preload={preload}
          playsInline
          onClick={transport.togglePlay}
          aria-label={title}
          data-video-source={activeSrc === src ? "desktop" : activeSrc ? "mobile" : "pending"}
        >
          Your browser does not support the video tag.
        </video>
        {transport.ended && endScreen ? endScreen(transport) : null}
      </div>
      <TransportControls transport={transport} label={`${title} video`} className={controlsClassName} />
    </div>
  );
}
