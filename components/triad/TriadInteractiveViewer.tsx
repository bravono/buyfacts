"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  ExternalLink,
  Compass,
  Layers,
} from "lucide-react";
import styles from "./TriadInteractiveViewer.module.css";

interface RouteTab {
  id: string;
  label: string;
  hash: string;
}

const ROUTE_TABS: RouteTab[] = [
  { id: "roles", label: "Role Portal", hash: "#/" },
  { id: "triad", label: "20-Question Assessment", hash: "#/triad" },
  { id: "quiz", label: "Quick Quiz", hash: "#/quiz" },
  { id: "browse", label: "Browse Majors", hash: "#/browse" },
];

export default function TriadInteractiveViewer() {
  const [activeTab, setActiveTab] = useState<string>("roles");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedTab = ROUTE_TABS.find((t) => t.id === activeTab) || ROUTE_TABS[0];
  const activeUrl = `/triad-app/index.html${selectedTab.hash}`;

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    setIsIframeLoaded(false);
  };

  const handleReload = () => {
    setIsIframeLoaded(false);
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Listen for Escape key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={styles.wrapper}>
      {/* Normal Embedded Card */}
      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.badge}>
              <Compass size={14} />
              Interactive Platform
            </span>

            <nav className={styles.navTabs} aria-label="TRIAD module navigation">
              {ROUTE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tabBtn} ${
                    activeTab === tab.id ? styles.tabBtnActive : ""
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.toolbarRight}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleReload}
              title="Reset application session"
              aria-label="Reset application session"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionBtn}
              title="Open TRIAD in new browser window"
              aria-label="Open in new window"
            >
              <ExternalLink size={14} />
              <span>Open Tab</span>
            </a>

            <button
              type="button"
              className={styles.actionBtn}
              onClick={toggleFullscreen}
              title="Toggle fullscreen view"
              aria-label="Toggle fullscreen view"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>

        <div className={styles.iframeWrapper}>
          {!isIframeLoaded && (
            <div className={styles.preloader}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>
                Loading TRIAD Interactive Platform...
              </p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            key={`${iframeKey}-${selectedTab.hash}`}
            src={activeUrl}
            title="TRIAD Interactive Explorer"
            className={styles.iframe}
            style={{ opacity: isIframeLoaded ? 1 : 0 }}
            onLoad={() => setIsIframeLoaded(true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>

      {/* Fullscreen Overlay Mode */}
      {isFullscreen && (
        <div className={styles.fullscreenOverlay}>
          <div className={styles.fullscreenHeader}>
            <div className={styles.toolbarLeft}>
              <span className={styles.badge}>
                <Layers size={14} />
                TRIAD Explorer - Fullscreen
              </span>
              <p className={styles.fullscreenTitle}>
                {selectedTab.label}
              </p>
            </div>

            <button
              type="button"
              className={styles.exitFullscreenBtn}
              onClick={toggleFullscreen}
              aria-label="Exit fullscreen view"
            >
              <Minimize2 size={16} />
              <span>Exit Fullscreen (Esc)</span>
            </button>
          </div>

          <iframe
            key={`fs-${iframeKey}-${selectedTab.hash}`}
            src={activeUrl}
            title="TRIAD Interactive Explorer Fullscreen"
            className={styles.fullscreenIframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
}
