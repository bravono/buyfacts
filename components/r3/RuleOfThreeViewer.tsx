"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Layers,
} from "lucide-react";
import styles from "./RuleOfThreeViewer.module.css";

interface RouteTab {
  id: string;
  label: string;
  subPath: string;
}

const ROUTE_TABS: RouteTab[] = [
  { id: "welcome", label: "Welcome", subPath: "welcome" },
  { id: "active", label: "Active Survey", subPath: "activemode" },
  { id: "marketing", label: "Push Marketing", subPath: "push-marketing" },
  { id: "social", label: "Social Media", subPath: "social-media" },
  { id: "summary", label: "Top Level Summary", subPath: "top-level" },
];

export default function RuleOfThreeViewer() {
  const [activeTab, setActiveTab] = useState<string>("welcome");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedTab = ROUTE_TABS.find((t) => t.id === activeTab) || ROUTE_TABS[0];
  const activeUrl = `/rule-of-three-app/${selectedTab.subPath}`;

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
              <Sparkles size={14} />
              Rule of Three Interactive
            </span>

            <nav className={styles.navTabs} aria-label="Rule of Three module navigation">
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
              title="Open Rule of Three in new browser window"
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
                Loading Rule of Three Interactive Platform...
              </p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            key={`${iframeKey}-${selectedTab.subPath}`}
            src={activeUrl}
            title="Rule of Three Interactive Explorer"
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
                Rule of Three - Fullscreen
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
            key={`fs-${iframeKey}-${selectedTab.subPath}`}
            src={activeUrl}
            title="Rule of Three Interactive Fullscreen"
            className={styles.fullscreenIframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
}
