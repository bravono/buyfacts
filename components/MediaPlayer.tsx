"use client";

import React, { useState, useEffect, useRef } from "react";
import TransportControls from "./media/TransportControls";
import { useMediaTransport } from "./media/useMediaTransport";
import { useResponsiveVideoSrc } from "./media/useResponsiveVideoSrc";
import {
  Play,
  Pause,
  Maximize,
  ChevronRight,
  FileText,
  Download,
  Mail,
  Video,
  Headphones,
  CheckCircle2,
  X,
  ExternalLink,
  Loader2,
  FileQuestion,
} from "lucide-react";
import Link from "next/link";
import styles from "./MediaPlayer.module.css";
import {
  isDocxUrl,
  fetchAndConvertDocx,
  getDocumentProxyUrl,
  isUnreachableForThirdParty,
} from "../lib/document-parser";

export interface MediaPlayerProps {
  title?: string;
  tagline?: string;
  subtitle?: string;
  description?: string;
  descriptionText?: string;
  welcomeTitle?: string;
  welcomeTagline?: string;
  welcomeParagraphs?: string[];
  rightTitle?: string;
  rightSubtitle?: string;
  /**
   * @deprecated The primary link no longer exists: a dashboard button is a description
   * plus three independent links. Kept only so older callers still type-check; ignored.
   */
  mediaType?: "video" | "audio" | "image" | "pdf" | "docx";
  /** @deprecated See mediaType. Ignored: the player has no primary media link. */
  mediaUrl?: string;
  /** SEE IT: this button's own video. Independent of the other two links. */
  seeItUrl?: string;
  /**
   * Mobile portrait render of the SEE IT video, loaded at <= 768px. Without it the
   * MOBILE_VIDEO_VARIANTS registry is consulted, then seeItUrl is used everywhere.
   */
  mobileSeeItUrl?: string;
  /** HEAR IT: this button's own audio. Independent of the other two links. */
  hearItUrl?: string;
  /** READ IT: this button's own document. Independent of the other two links. */
  readItUrl?: string;
  pdfUrl?: string;
  pdfLabel?: string;
  moreDetailUrl?: string;
  moreDetailIconUrl?: string;
  videoIconUrl?: string;
  audioIconUrl?: string;
  contactIconUrl?: string;
  onMoreDetailClick?: () => void;
  onVideoClick?: () => void;
  onAudioClick?: () => void;
  onContactClick?: () => void;
  onExploreClick?: (action: string) => void;
  onNextMedia?: () => void;
  showWelcome?: boolean;
  onShowWelcome?: () => void;
  onDismissWelcome?: () => void;
  initialScreenMode?: "auto" | "video" | "audio" | "document";
}

export type MockMediaPlayerProps = MediaPlayerProps;

/** Host of a URL, for error messages. Never throws. */
function safeHost(url?: string): string {
  if (!url) return "an unknown host";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
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

/**
 * The dashboard media player. A different post, or a different link on the same post,
 * remounts the screen: screen mode, playback, document state and notices all start fresh.
 */
export default function MediaPlayer(props: MediaPlayerProps) {
  const resetKey = [
    props.title,
    props.seeItUrl,
    props.mobileSeeItUrl,
    props.hearItUrl,
    props.readItUrl,
  ].join("\u0000");
  return <MediaPlayerScreen key={resetKey} {...props} />;
}

function MediaPlayerScreen({
  title,
  tagline,
  subtitle,
  description,
  descriptionText,
  welcomeTitle,
  welcomeTagline,
  welcomeParagraphs,
  seeItUrl,
  mobileSeeItUrl,
  hearItUrl,
  moreDetailUrl,
  readItUrl,
  moreDetailIconUrl,
  videoIconUrl,
  audioIconUrl,
  contactIconUrl,
  onMoreDetailClick,
  onVideoClick,
  onAudioClick,
  onContactClick,
  onExploreClick,
  onNextMedia,
  showWelcome,
  onDismissWelcome,
  initialScreenMode,
}: MediaPlayerProps) {
  // Custom transport (play/pause, stop, -10s/+10s, scrubber, volume) for the SEE IT video
  // or HEAR IT audio on screen; only one of them is mounted at a time.
  const { attach: attachMedia, ...transport } = useMediaTransport();
  const { isPlaying } = transport;
  const [isWelcomeActive, setIsWelcomeActive] = useState<boolean>(
    showWelcome ?? true,
  );
  // Follow the parent's showWelcome (adjusting state during render, not in an effect).
  const [syncedShowWelcome, setSyncedShowWelcome] = useState(showWelcome);
  if (showWelcome !== syncedShowWelcome) {
    setSyncedShowWelcome(showWelcome);
    if (showWelcome !== undefined) setIsWelcomeActive(showWelcome);
  }

  // Section 6: Video opening state and In Depth preview states
  const [videoMode, setVideoMode] = useState<"idle" | "opening" | "playing">(
    "idle",
  );
  const [downloadConfirmed, setDownloadConfirmed] = useState<string | null>(
    null,
  );

  /**
   * What SEE IT / HEAR IT / READ IT have put on the player screen.
   * "auto"   — the post's own default media (its video, else its audio, else its document)
   * "video"  — this post's SEE IT video
   * "audio"  — this post's HEAR IT audio
   * "document" — this post's READ IT document, rendered in the player (and its full screen)
   */
  const [screenMode, setScreenMode] = useState<
    "auto" | "video" | "audio" | "document"
  >(initialScreenMode || "auto");

  /**
   * The READ IT document converted to HTML (or the error), tagged with the URL it belongs
   * to. Anything for another URL is ignored, so a stale result is never shown.
   */
  const [docResult, setDocResult] = useState<{
    url: string;
    html?: string;
    error?: string;
  } | null>(null);
  /** The player screen itself — this is what goes full screen, whatever it is showing. */
  const screenFrameRef = useRef<HTMLDivElement>(null);

  const displayTitle = isWelcomeActive
    ? welcomeTitle || ""
    : title || "";
  const displayTagline = isWelcomeActive
    ? welcomeTagline || ""
    : tagline || subtitle || "";

  const rawDescription = descriptionText || description || "";
  const buttonParagraphs = rawDescription
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p.toLowerCase() !== (displayTitle || "").toLowerCase());
  const hasDescription = buttonParagraphs.length > 0 || Boolean(rawDescription);

  // --- Three independent links -----------------------------------------------------
  // A button is a description plus SEE IT (video), HEAR IT (audio) and READ IT (document).
  // There is no primary media link any more, so nothing here falls back from one link
  // to another: each action shows only its own asset, and shows nothing when it has none.
  const videoSrc = (seeItUrl || "").trim() || undefined;
  /** The SEE IT render for this viewport: mobile portrait at <= 768px when one exists. */
  const videoPlaybackSrc = useResponsiveVideoSrc({
    desktopUrl: videoSrc,
    mobileUrl: mobileSeeItUrl,
  });
  const audioSrc = (hearItUrl || "").trim() || undefined;
  const documentSrc = (readItUrl || "").trim() || undefined;

  /**
   * What is on the player screen. "auto" is the description screen (no media yet);
   * SEE IT / HEAR IT / READ IT each put their own asset on this one screen.
   */
  const screenType: "video" | "audio" | "pdf" | "docx" | null = (() => {
    if (screenMode === "video") return videoSrc ? "video" : null;
    if (screenMode === "audio") return audioSrc ? "audio" : null;
    if (screenMode === "document") {
      if (!documentSrc) return null;
      return /(\.docx|\.doc)($|\?|#)/i.test(documentSrc) ? "docx" : "pdf";
    }
    return null;
  })();

  const screenMediaUrl =
    screenType === "video"
      ? videoPlaybackSrc
      : screenType === "audio"
        ? audioSrc
        : screenType === "docx" || screenType === "pdf"
          ? documentSrc
          : undefined;

  const isScreenDocx = screenType === "docx";
  const isScreenPdf = screenType === "pdf";
  const isScreenDocument = isScreenDocx || isScreenPdf;

  const isScreenYouTube = Boolean(
    screenMediaUrl && isYouTubeUrl(screenMediaUrl),
  );
  const isPlayable = Boolean(
    (screenType === "video" || screenType === "audio") &&
    screenMediaUrl &&
    !isScreenYouTube &&
    !isScreenDocument,
  );

  const effectiveInDepthUrl = moreDetailUrl || readItUrl;
  const targetDocUrl = effectiveInDepthUrl || undefined;

  // Fetch and convert the DOCX that is on the player screen — always this post's READ IT document
  const inlineDocxUrl = isScreenDocx ? screenMediaUrl : undefined;
  useEffect(() => {
    if (!inlineDocxUrl) return;
    let isMounted = true;
    fetchAndConvertDocx(inlineDocxUrl)
      .then((result) => {
        if (!isMounted) return;
        setDocResult(
          result.success && result.html
            ? { url: inlineDocxUrl, html: result.html }
            : {
                url: inlineDocxUrl,
                error: result.error || "Failed to convert Word document to HTML",
              },
        );
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error ? err.message : "Error reading document";
        setDocResult({ url: inlineDocxUrl, error: msg });
      });
    return () => {
      isMounted = false;
    };
  }, [inlineDocxUrl]);

  const currentDoc =
    inlineDocxUrl && docResult?.url === inlineDocxUrl ? docResult : null;
  const isLoadingDoc = Boolean(inlineDocxUrl) && !currentDoc;
  const docError = currentDoc?.error ?? null;
  const modalDocxHtml = currentDoc?.html ?? null;

  // Escape closes full screen, whether the screen holds a video, audio or a document.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNextMedia = () => {
    setIsWelcomeActive(false);
    onDismissWelcome?.();
    onNextMedia?.();
  };



  /**
   * Full screen the player's screen frame, so whatever is on it (video, audio visualiser
   * or the READ IT document) fills the display. Falls back to the media element itself.
   */
  const toggleFullscreen = () => {
    const frame = screenFrameRef.current;
    frame?.requestFullscreen?.().catch(() => {
      console.warn("Full screen is not available here.");
    });
  };

  // The Full Screen control is offered for whatever is on the screen: video, audio or document.
  const canFullscreen = Boolean(screenMediaUrl) && !isWelcomeActive;


  /** Transient notice shown when an action button has no asset of its own (auto-dismisses). */
  const [missingNotice, setMissingNotice] = useState<{
    kind: "video" | "audio" | "document";
    text: string;
  } | null>(null);
  const missingTimer = useRef<number | null>(null);

  const flashMissing = (kind: "video" | "audio" | "document", text: string) => {
    setMissingNotice({ kind, text });
    if (missingTimer.current) window.clearTimeout(missingTimer.current);
    missingTimer.current = window.setTimeout(() => {
      setMissingNotice(null);
      missingTimer.current = null;
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (missingTimer.current) window.clearTimeout(missingTimer.current);
    };
  }, []);

  /** Pause whatever the player is currently playing (used when the screen swaps source). */
  const pauseScreenMedia = () => {
    transport.pause();
  };

  /**
   * Play the media element that is already on screen, once React has rendered the new
   * source for the mode we just selected.
   */
  const playScreenAfterSwitch = () => {
    transport.setMuted(false);
    transport.playWhenReady();
  };

  // Section 6: Video Button Action (SEE IT)
  // Always puts this button's own video on the player screen, never someone else's asset.
  const handleVideoAction = () => {
    if (onVideoClick) {
      onVideoClick();
    } else if (onExploreClick) {
      onExploreClick("video");
    } else if (videoSrc) {
      if (screenType === "video") {
        transport.togglePlay();
      } else {
        pauseScreenMedia();
        setScreenMode("video");
        playScreenAfterSwitch();
      }
    } else {
      // This post has no video of its own: the primary content stays on screen untouched.
      console.info(`No video is linked to "${displayTitle}".`);
      flashMissing(
        "video",
        `No video is attached to "${displayTitle}" yet — this button has no media for it.`,
      );
    }
  };

  // Section 6: Audio Button Action (HEAR IT)
  // Puts this button's own audio on the player screen and plays it there.
  const handleAudioAction = () => {
    if (onAudioClick) {
      onAudioClick();
    } else if (onExploreClick) {
      onExploreClick("audio");
    } else if (audioSrc) {
      if (screenType === "audio") {
        if (transport.muted) transport.setMuted(false);
        transport.togglePlay();
      } else {
        // Swap the player screen over to this post's audio, then play it there.
        pauseScreenMedia();
        setScreenMode("audio");
        playScreenAfterSwitch();
      }
    } else {
      // This post has no audio of its own: the primary content stays on screen untouched.
      console.info(`No audio is linked to "${displayTitle}".`);
      flashMissing(
        "audio",
        `No audio is attached to "${displayTitle}" yet — this button has no media for it.`,
      );
    }
  };

  const handleStartVideo = () => {
    setVideoMode("playing");
    transport.play();
  };

  const handleCancelVideo = () => {
    transport.stop();
    setVideoMode("idle");
  };

  // Section 6: READ IT — the document is rendered inside the player, never in a modal.
  const handleInDepthAction = () => {
    if (onMoreDetailClick) {
      onMoreDetailClick();
    } else if (onExploreClick) {
      onExploreClick("more_detail");
    } else if (documentSrc) {
      // Swap the player screen over to this post's own document.
      pauseScreenMedia();
      setScreenMode("document");
    } else {
      // This post has no document of its own: the primary content stays on screen untouched.
      console.info(`No document is linked to "${displayTitle}".`);
      flashMissing(
        "document",
        `No document is attached to "${displayTitle}" yet — this button has no media for it.`,
      );
    }
  };

  const handleDownloadDocument = () => {
    const targetUrl = targetDocUrl;
    if (!targetUrl) return;
    const isDocxTarget = isDocxUrl(targetUrl);
    const extension = isDocxTarget ? "docx" : "pdf";
    // Create temporary link and trigger download
    const link = document.createElement("a");
    link.href = targetUrl;
    link.download = `${displayTitle.replace(/[^a-zA-Z0-9]/g, "_")}_Documentation.${extension}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // The reader stays on the player screen; just confirm the save.
    setDownloadConfirmed(
      `Document download complete: "${displayTitle}" has been saved. Your active dashboard selection remains preserved.`,
    );
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

      {/* 2. Player Screen Frame — SEE IT, HEAR IT and READ IT all render inside this one screen,
          and this is the element that goes full screen. */}
      <div
        ref={screenFrameRef}
        className={`${styles.screenFrame} ${
          screenType === "video"
            ? styles.videoScreenFrame
            : styles.audioScreenFrame
        } ${
          screenType === "video" && screenMediaUrl && screenMediaUrl !== videoSrc
            ? styles.portraitScreenFrame
            : ""
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

        {/* No Media Found State — never covers a document that is being read */}
        {!screenMediaUrl &&
          !isScreenDocument &&
          !isLoadingDoc &&
          !isWelcomeActive && (
            <div className={styles.noMediaContainer}>
              <div className={styles.noMediaIconWrapper}>
                <FileQuestion size={36} className={styles.noMediaIcon} />
              </div>
              <h4 className={styles.noMediaTitle}>No Media Found</h4>
              <p className={styles.noMediaSubtitle}>
                No media asset is currently linked to {displayTitle}.
              </p>
            </div>
          )}

        {/* Video Render */}
        {screenType === "video" &&
          screenMediaUrl &&
          (isScreenYouTube ? (
            <iframe
              src={getYouTubeEmbedUrl(screenMediaUrl)}
              className={styles.realVideo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              // Keyed by the post's video, so a desktop/mobile render swap on resize keeps
              // the element and its position.
              key={videoSrc}
              ref={attachMedia}
              /* This post's SEE IT video, in the render for this viewport. */
              src={screenMediaUrl}
              className={styles.realVideo}
              onPlay={() => setVideoMode("playing")}
              onClick={transport.togglePlay}
              preload="metadata"
              playsInline
              data-video-source={
                screenMediaUrl === videoSrc ? "desktop" : "mobile"
              }
            />
          ))}

        {/* Idle Audio Wave Background or Video Fallback when no url */}
        {(screenType !== "video" || !screenMediaUrl) && (
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
        {screenType === "audio" && screenMediaUrl && (
          <audio
            key={screenMediaUrl}
            ref={attachMedia}
            src={screenMediaUrl}
          />
        )}

        {/* Document Render: PDF — this post's READ IT document, read inside the player */}
        {isScreenPdf && screenMediaUrl && (
          <div className={styles.inlineDocViewer}>
            <div className={styles.inlineDocHeader}>
              <div className={styles.inlineDocBadge}>
                <FileText size={14} color="#00507b" />
                <span>PDF Document</span>
              </div>
            </div>
            <div className={styles.inlineDocBody}>
              <iframe
                src={`${getDocumentProxyUrl(screenMediaUrl)}#view=FitH&toolbar=1&navpanes=0`}
                className={styles.inlineDocIframe}
                title={displayTitle}
              />
            </div>
          </div>
        )}

        {/* Document Render: DOCX — this post's READ IT document, read inside the player */}
        {isScreenDocx && screenMediaUrl && (
          <div className={styles.inlineDocViewer}>
            <div className={styles.inlineDocHeader}></div>
            <div className={styles.inlineDocBody}>
              {isLoadingDoc && (
                <div className={styles.inlineDocLoading}>
                  <Loader2 size={24} className={styles.docSpinnerIcon} />
                  <span>Rendering Word document...</span>
                </div>
              )}
              {!isLoadingDoc && docError && (
                <div className={styles.inlineDocFallback}>
                  {isUnreachableForThirdParty(screenMediaUrl) ? (
                    <div className={styles.inlineDocErrorNotice}>
                      <FileQuestion size={26} />
                      <h4>This document cannot be displayed here</h4>
                      <p>
                        It is hosted at <code>{safeHost(screenMediaUrl)}</code>,
                        which is not reachable from the internet. Save the link
                        using the public bucket URL (for example{" "}
                        <code>https://s3.buyfacts.com</code>).
                      </p>
                      <a
                        href={screenMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.btnOpenExternal}
                      >
                        <ExternalLink size={15} /> Download the file
                      </a>
                    </div>
                  ) : (
                    <div className={styles.inlineDocErrorNotice}>
                      <FileQuestion size={26} />
                      <h4>The document could not be read</h4>
                      <p>{docError}</p>
                      <a
                        href={screenMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.btnOpenExternal}
                      >
                        <ExternalLink size={15} /> Download the file
                      </a>
                    </div>
                  )}
                </div>
              )}
              {!isLoadingDoc && !docError && modalDocxHtml && (
                <div className={styles.inlineDocxScroll}>
                  <div
                    className={styles.inlineDocxContent}
                    dangerouslySetInnerHTML={{ __html: modalDocxHtml }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Large Central Play Button (when playable and welcome not active) */}
        {isPlayable && !isWelcomeActive && (
          <button
            className={`${styles.playButton} ${isPlaying ? styles.isPlayingBtn : ""} ${screenType === "video" && isPlaying ? styles.videoPlaying : ""}`}
            onClick={transport.togglePlay}
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
        {screenType === "audio" && isPlaying && !isWelcomeActive && (
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
              <h4 className={styles.welcomeIntro}>
                {welcomeTitle}
              </h4>
              {welcomeParagraphs?.map((para, idx) => (
                <p key={idx} className={styles.welcomeParagraph}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        ) : screenMode === "auto" && hasDescription ? (
          <div
            className={`${styles.descriptionOverlay} ${styles.welcomeOverlay}`}
            id="mock-media-button-description"
          >
            <div className={styles.welcomeContent}>
              <h4 className={styles.welcomeIntro}>{displayTitle}</h4>
              {buttonParagraphs.length > 0 ? (
                buttonParagraphs.map((para, idx) => (
                  <p key={idx} className={styles.welcomeParagraph}>
                    {para}
                  </p>
                ))
              ) : (
                <p className={styles.welcomeParagraph}>{rawDescription}</p>
              )}
            </div>
          </div>
        ) : (
          description && (
            <div
              className={`${styles.descriptionOverlay} ${
                isPlaying || isScreenDocument
                  ? styles.descriptionOverlayHidden
                  : ""
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

      {/* Control Panel — playable media gets the full transport, a document gets the screen
          controls (including Full Screen) so a document can still be enlarged. */}
      {(isPlayable || isScreenDocument) && !isWelcomeActive && (
        <div className={styles.controlPanel}>
          {isPlayable ? (
            <TransportControls
              transport={transport}
              label={`${displayTitle} ${screenType === "video" ? "video" : "audio"}`}
              className={styles.transportBar}
            >
              {canFullscreen && (
                <button
                  type="button"
                  className={styles.utilBtn}
                  onClick={toggleFullscreen}
                  title="Full Screen"
                  aria-label="Full Screen"
                  id="mock-media-fullscreen-btn"
                >
                  <Maximize size={16} />
                </button>
              )}
              {screenType === "video" && (
                <button
                  type="button"
                  className={`${styles.utilBtn} ${styles.closeVideoBtn}`}
                  onClick={handleCancelVideo}
                  title="Close Video"
                  aria-label="Close video"
                >
                  <X size={16} />
                </button>
              )}
            </TransportControls>
          ) : (
            <div className={styles.controlsRow}>
              <div className={styles.timeInfo}>
                <div className={styles.inlineDocActions}>
                  <button
                    type="button"
                    className={styles.inlineDocActionBtn}
                    onClick={handleDownloadDocument}
                    title="Download a copy"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className={styles.utilityBtns}>
                {canFullscreen && (
                  <button
                    type="button"
                    className={styles.utilBtn}
                    onClick={toggleFullscreen}
                    title="Full Screen"
                    aria-label="Full Screen"
                    id="mock-media-fullscreen-btn"
                  >
                    <Maximize size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#065f46",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Missing-asset feedback: tells the user the clicked button has nothing attached yet. */}
      {missingNotice && (
        <div
          className={`${styles.missingNotice} ${
            missingNotice.kind === "video"
              ? styles.missingVideo
              : missingNotice.kind === "audio"
                ? styles.missingAudio
                : styles.missingDocument
          }`}
          role="status"
          aria-live="polite"
          id="mock-media-missing-notice"
        >
          <div className={styles.missingNoticeBody}>
            {missingNotice.kind === "video" ? (
              <Video size={16} aria-hidden="true" />
            ) : missingNotice.kind === "audio" ? (
              <Headphones size={16} aria-hidden="true" />
            ) : (
              <FileQuestion size={16} aria-hidden="true" />
            )}
            <span>{missingNotice.text}</span>
          </div>
          <button
            type="button"
            className={styles.missingNoticeDismiss}
            onClick={() => setMissingNotice(null)}
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Horizontal Separator Divider */}
      <hr className={styles.divider} />

      {/* 5. Bottom Action Buttons: Four Choices (SEE IT, HEAR IT, READ IT, CONTACT US) */}
      <div className={styles.actionSection}>
        <div className={styles.actionButtonsRow}>
          {/* Choice 1: SEE IT */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnVideo} ${videoSrc ? "" : ` ${styles.btnEmpty}`}`}
            onClick={handleVideoAction}
            aria-label="SEE IT"
            aria-disabled={videoSrc ? undefined : true}
            aria-describedby={videoSrc ? undefined : "action-hint-see-it"}
            title={
              videoSrc
                ? "SEE IT"
                : `No video is attached to ${displayTitle} yet`
            }
            id="action-btn-see-it"
          >
            {videoIconUrl ? (
              <img src={videoIconUrl} alt="" className={styles.btnIconImage} />
            ) : (
              <Video size={14} className={styles.btnIconPlaceholder} />
            )}
            <span>SEE IT</span>
          </button>

          {/* Choice 2: HEAR IT */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnAudio} ${audioSrc ? "" : ` ${styles.btnEmpty}`}`}
            onClick={handleAudioAction}
            aria-label="HEAR IT"
            aria-disabled={audioSrc ? undefined : true}
            aria-describedby={audioSrc ? undefined : "action-hint-hear-it"}
            title={
              audioSrc
                ? "HEAR IT"
                : `No audio is attached to ${displayTitle} yet`
            }
            id="action-btn-hear-it"
          >
            {audioIconUrl ? (
              <img src={audioIconUrl} alt="" className={styles.btnIconImage} />
            ) : (
              <Headphones size={14} className={styles.btnIconPlaceholder} />
            )}
            <span>HEAR IT</span>
          </button>

          {/* Choice 3: READ IT */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnMoreDetail} ${documentSrc ? "" : ` ${styles.btnEmpty}`}`}
            onClick={handleInDepthAction}
            aria-label="READ IT"
            aria-disabled={documentSrc ? undefined : true}
            aria-describedby={documentSrc ? undefined : "action-hint-read-it"}
            title={
              documentSrc
                ? "READ IT"
                : `No document is attached to ${displayTitle} yet`
            }
            id="action-btn-read-it"
          >
            {moreDetailIconUrl ? (
              <img
                src={moreDetailIconUrl}
                alt=""
                className={styles.btnIconImage}
              />
            ) : (
              <FileText size={14} className={styles.btnIconPlaceholder} />
            )}
            <span>READ IT</span>
          </button>

          {/* Choice 4: CONTACT US */}
          <Link
            href="/#contact"
            className={`${styles.roundedActionBtn} ${styles.btnContact}`}
            onClick={handleContactAction}
            aria-label="CONTACT US"
            id="action-btn-contact-us"
          >
            {contactIconUrl ? (
              <img
                src={contactIconUrl}
                alt=""
                className={styles.btnIconImage}
              />
            ) : (
              <Mail size={14} className={styles.btnIconPlaceholder} />
            )}
            <span>CONTACT US</span>
          </Link>
        </div>

        {/* Screen-reader hints for actions that have no media attached yet */}
        <span id="action-hint-see-it" hidden>
          No video is attached to this topic yet.
        </span>
        <span id="action-hint-hear-it" hidden>
          No audio is attached to this topic yet.
        </span>
        <span id="action-hint-read-it" hidden>
          No document is attached to this topic yet.
        </span>
      </div>
    </div>
  );
}
