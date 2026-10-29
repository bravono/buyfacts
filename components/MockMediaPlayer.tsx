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
  ExternalLink,
  Loader2,
  FileQuestion,
} from "lucide-react";
import Link from "next/link";
import styles from "./MockMediaPlayer.module.css";
import {
  isPdfUrl,
  isDocxUrl,
  fetchAndConvertDocx,
  getDocumentProxyUrl,
  isUnreachableForThirdParty,
} from "../lib/document-parser";

export interface MockMediaPlayerProps {
  title?: string;
  tagline?: string;
  subtitle?: string;
  description?: string;
  rightTitle?: string;
  rightSubtitle?: string;
  mediaType?: "video" | "audio" | "image" | "pdf" | "docx";
  mediaUrl?: string;
  /** Dedicated video source for the SEE IT action (falls back to mediaUrl). */
  seeItUrl?: string;
  /** Dedicated audio source for the HEAR IT action (falls back to mediaUrl). */
  hearItUrl?: string;
  /** Dedicated document source for the READ IT action (falls back to mediaUrl / pdfUrl). */
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
}

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

export default function MockMediaPlayer({
  title,
  tagline,
  subtitle,
  description,
  rightTitle,
  rightSubtitle,
  mediaType = "video",
  mediaUrl,
  seeItUrl,
  hearItUrl,
  pdfUrl,
  pdfLabel,
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
  const [downloadConfirmed, setDownloadConfirmed] = useState<string | null>(null);

  /**
   * What SEE IT / HEAR IT / READ IT have put on the player screen.
   * "auto"   — the post's own default media (its video, else its audio, else its document)
   * "video"  — this post's SEE IT video
   * "audio"  — this post's HEAR IT audio
   * "document" — this post's READ IT document, rendered in the player (and its full screen)
   */
  const [screenMode, setScreenMode] = useState<"auto" | "video" | "audio" | "document">("auto");

  // Document state for DOCX client-side rendering
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  /** READ IT document converted to HTML, shown on the player screen. */
  const [modalDocxHtml, setModalDocxHtml] = useState<string | null>(null);
  const [isLoadingModalDoc, setIsLoadingModalDoc] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  /** The player screen itself — this is what goes full screen, whatever it is showing. */
  const screenFrameRef = useRef<HTMLDivElement>(null);

  const displayTitle = isWelcomeActive
    ? "Getting Started"
    : (title || "Operational Demonstration");
  const displayTagline = isWelcomeActive
    ? "Welcome to your Marketers tool workspace!"
    : (tagline || subtitle || "BuyFacts B2B Validation Pipeline Walkthrough");

  const isDocx =
    mediaType === "docx" ||
    isDocxUrl(mediaUrl) ||
    Boolean(mediaUrl && /\.(docx|doc)($|\?|#)/i.test(mediaUrl));

  const isPdf =
    mediaType === "pdf" ||
    isPdfUrl(mediaUrl) ||
    Boolean(mediaUrl && /\.pdf($|\?|#)/i.test(mediaUrl));

  const isDocument = isDocx || isPdf;

  // --- Dedicated per-button sources -------------------------------------------------
  // Each of the three action buttons owns its own media, exactly like the primary
  // BUTTON LINK does. When a dedicated link is not configured we fall back to the
  // primary link only if that primary link is actually of the right kind.
  const primaryIsVideo = Boolean(
    mediaUrl &&
      !isDocument &&
      (isYouTubeUrl(mediaUrl) || /\.(mp4|m4v|webm|ogv|ogg|mov|avi|mkv)($|\?|#)/i.test(mediaUrl))
  );
  const primaryIsAudio = Boolean(
    mediaUrl &&
      !isDocument &&
      /\.(mp3|m4a|aac|wav|oga|opus|flac)($|\?|#)/i.test(mediaUrl)
  );

  /** Video shown inside the player for SEE IT (and as the default screen for video rows). */
  const videoSrc =
    (seeItUrl && seeItUrl.trim()) || (primaryIsVideo ? mediaUrl : undefined);
  /** Audio played by HEAR IT (and as the default screen for audio rows). */
  const audioSrc =
    (hearItUrl && hearItUrl.trim()) || (primaryIsAudio ? mediaUrl : undefined);
  /** Document opened by READ IT and downloaded from the reader modal. */
  const documentSrc =
    (readItUrl && readItUrl.trim()) || (isDocument && mediaUrl ? mediaUrl : undefined);

  /**
   * The media actually shown on the player screen right now. The page passes the row's
   * mediaType, but the screen must always match the dedicated link that really exists,
   * otherwise every post ends up playing the same fallback asset.
   *
   * SEE IT / HEAR IT / READ IT each put their own asset on this one screen, so the
   * screen mode decides first; the row's mediaType only decides the default screen.
   */
  const screenType: "video" | "audio" | "image" | "pdf" | "docx" = (() => {
    // Explicit choices made with SEE IT / HEAR IT / READ IT win while they last.
    if (screenMode === "document") {
      if (documentSrc) return isDocxUrl(documentSrc) ? "docx" : "pdf";
      return "video";
    }
    if (screenMode === "audio") return audioSrc ? "audio" : "video";
    if (screenMode === "video") {
      return videoSrc ? "video" : audioSrc ? "audio" : documentSrc ? (isDocxUrl(documentSrc) ? "docx" : "pdf") : "video";
    }

    // Default screen: ALWAYS the primary button link. The extras play no part in it.
    const primaryIsAudioLink = Boolean(
      mediaUrl && /(\.mp3|\.m4a|\.aac|\.wav|\.oga|\.opus|\.flac)($|\?|#)/i.test(mediaUrl)
    );
    if (mediaType === "image") return mediaUrl ? "image" : "video";
    if (mediaType === "audio") return mediaUrl ? "audio" : "video";
    if (mediaType === "pdf") return mediaUrl ? "pdf" : "video";
    if (mediaType === "docx") return mediaUrl ? "docx" : "video";
    if (mediaType === "video") {
      return primaryIsAudioLink ? "audio" : mediaUrl ? "video" : "video";
    }
    return "video";
  })();

  /**
   * On the default screen this is the primary link itself (mediaUrl); the SEE IT / HEAR IT /
   * READ IT sources are only used when one of those buttons put its own media on screen.
   */
  const screenMediaUrl =
    screenMode === "video"
      ? videoSrc
      : screenMode === "audio"
        ? audioSrc
        : screenMode === "document"
          ? documentSrc
          : screenType === "docx" || screenType === "pdf"
            ? documentSrc
            : mediaUrl;

  const isScreenDocx = screenType === "docx";
  const isScreenPdf = screenType === "pdf";
  const isScreenDocument = isScreenDocx || isScreenPdf;

  const isScreenYouTube = Boolean(screenMediaUrl && isYouTubeUrl(screenMediaUrl));
  const isPlayable = Boolean(
    (screenType === "video" || screenType === "audio") &&
      screenMediaUrl &&
      !isScreenYouTube &&
      !isScreenDocument
  );

  const effectiveInDepthUrl = moreDetailUrl || readItUrl;
  const targetDocUrl =
    effectiveInDepthUrl ||
    (isDocument && mediaUrl ? mediaUrl : null) ||
    pdfUrl ||
    "/sample-details.pdf";

  // Fetch and convert the DOCX that is on the player screen — always this post's READ IT document
  useEffect(() => {
    const inlineDocxUrl = isScreenDocx ? screenMediaUrl : undefined;
    if (!isScreenDocx || !inlineDocxUrl) {
      setDocxHtml(null);
      setIsLoadingDoc(false);
      setDocError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDoc(true);
    setDocError(null);

    fetchAndConvertDocx(inlineDocxUrl)
      .then((result) => {
        if (!isMounted) return;
        if (result.success && result.html) {
          setDocxHtml(result.html);
          setModalDocxHtml(result.html);
          setDocError(null);
        } else {
          setDocxHtml(null);
          setModalDocxHtml(null);
          setDocError(result.error || "Failed to convert Word document to HTML");
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Error reading document";
        setDocxHtml(null);
        setModalDocxHtml(null);
        setDocError(msg);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDoc(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isScreenDocx, screenMediaUrl]);


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

  // Selecting another post puts the player back on that post's primary content:
  // whatever SEE IT / HEAR IT / READ IT had swapped onto the screen is cleared.
  useEffect(() => {
    setScreenMode("auto");
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setVideoMode("idle");
    setDownloadConfirmed(null);
  }, [mediaUrl, seeItUrl, hearItUrl, readItUrl, title]);

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
  }, [screenMediaUrl, screenType]);

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
    // Ref access stays inside the handler so the lint rule about values used by effects
    // does not flag these media elements.
    const el =
      screenType === "video"
        ? videoRef.current
        : screenType === "audio"
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
      screenType === "video"
        ? videoRef.current
        : screenType === "audio"
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
      screenType === "video"
        ? videoRef.current
        : screenType === "audio"
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
      screenType === "video"
        ? videoRef.current
        : screenType === "audio"
          ? audioRef.current
          : null;
    if (el) {
      el.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  /**
   * Full screen the player's screen frame, so whatever is on it (video, audio visualiser
   * or the READ IT document) fills the display. Falls back to the media element itself.
   */
  const toggleFullscreen = () => {
    const frame = screenFrameRef.current;
    if (frame?.requestFullscreen) {
      frame.requestFullscreen().catch(() => {
        videoRef.current?.requestFullscreen?.();
      });
      return;
    }
    videoRef.current?.requestFullscreen?.();
  };

  // The Full Screen control is offered for whatever is on the screen: video, audio or document.
  const canFullscreen = Boolean(screenMediaUrl) && !isWelcomeActive;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs <= 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  /** Pause whatever the player is currently playing (used when the screen swaps source). */
  const pauseScreenMedia = () => {
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
  };

  /**
   * Play the media element that is already on screen, once React has rendered the new
   * source for the mode we just selected.
   */
  const playScreenAfterSwitch = (next: "video" | "audio") => {
    window.setTimeout(() => {
      const el = next === "video" ? videoRef.current : audioRef.current;
      if (!el) return;
      el.muted = false;
      setIsMuted(false);
      el.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Playback blocked or failed: ", err));
    }, 60);
  };

  // Section 6: Video Button Action (SEE IT)
  // Always puts this button's own video on the player screen, never someone else's asset.
  const handleVideoAction = () => {
    if (onVideoClick) {
      onVideoClick();
    } else if (onExploreClick) {
      onExploreClick("video");
    } else if (videoSrc) {
      if (screenType === "video" && videoRef.current) {
        togglePlay();
      } else {
        pauseScreenMedia();
        setScreenMode("video");
        playScreenAfterSwitch("video");
      }
    } else {
      // This post has no video of its own: the primary content stays on screen untouched.
      console.info(`No video is linked to "${displayTitle}".`);
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
      if (screenType === "audio" && audioRef.current) {
        if (isMuted) {
          setIsMuted(false);
          audioRef.current.muted = false;
          if (videoRef.current) videoRef.current.muted = false;
        }
        togglePlay();
      } else {
        // Swap the player screen over to this post's audio, then play it there.
        pauseScreenMedia();
        setScreenMode("audio");
        playScreenAfterSwitch("audio");
      }
    } else {
      // This post has no audio of its own: the primary content stays on screen untouched.
      console.info(`No audio is linked to "${displayTitle}".`);
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
    }
  };

  const handleDownloadDocument = () => {
    const targetUrl = targetDocUrl;
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

      {/* 2. Player Screen Frame — SEE IT, HEAR IT and READ IT all render inside this one screen,
          and this is the element that goes full screen. */}
      <div
        ref={screenFrameRef}
        className={`${styles.screenFrame} ${
          screenType === "video" || screenType === "image"
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

        {/* No Media Found State — never covers a document that is being read */}
        {!screenMediaUrl && !isScreenDocument && !isWelcomeActive && (
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
        {screenType === "video" && screenMediaUrl && (
          isScreenYouTube ? (
            <iframe
              src={getYouTubeEmbedUrl(screenMediaUrl)}
              className={styles.realVideo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={screenMediaUrl}
              ref={videoRef}
              src={screenMediaUrl}
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
            ref={audioRef}
            src={screenMediaUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          />
        )}

        {/* Image Render */}
        {screenType === "image" && screenMediaUrl && (
          <div className={styles.imageViewer}>
            <img
              src={screenMediaUrl}
              className={styles.realImage}
              alt={displayTitle}
            />
          </div>
        )}

        {/* Document Render: PDF — this post's READ IT document, read inside the player */}
        {isScreenPdf && screenMediaUrl && (
          <div className={styles.inlineDocViewer}>
            <div className={styles.inlineDocHeader}>
              <div className={styles.inlineDocBadge}>
                <FileText size={14} color="#00507b" />
                <span>PDF Document</span>
              </div>
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
            <div className={styles.inlineDocHeader}>
              <div className={styles.inlineDocBadge}>
                <FileText size={14} color="#00507b" />
                <span>Word Document (.docx)</span>
              </div>
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
            <div className={styles.inlineDocBody}>
              {isLoadingModalDoc && (
                <div className={styles.inlineDocLoading}>
                  <Loader2 size={24} className={styles.docSpinnerIcon} />
                  <span>Rendering Word document...</span>
                </div>
              )}
              {!isLoadingModalDoc && docError && (
                <div className={styles.inlineDocFallback}>
                  {isUnreachableForThirdParty(screenMediaUrl) ? (
                    <div className={styles.inlineDocErrorNotice}>
                      <FileQuestion size={26} />
                      <h4>This document cannot be displayed here</h4>
                      <p>
                        It is hosted at <code>{safeHost(screenMediaUrl)}</code>, which is not
                        reachable from the internet. Save the link using the public bucket URL
                        (for example <code>https://s3.buyfacts.com</code>).
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
              {!isLoadingModalDoc && !docError && modalDocxHtml && (
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
                isPlaying || isScreenDocument ? styles.descriptionOverlayHidden : ""
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
          {isPlayable && (
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
          )}

          <div className={styles.controlsRow}>
            {isPlayable ? (
              <div className={styles.timeInfo}>
                <span className={styles.timeText}>{formatTime(currentTime)}</span>
                <span className={styles.timeDivider}>/</span>
                <span className={styles.timeText}>
                  {duration > 0 ? formatTime(duration) : "Available on start"}
                </span>
              </div>
            ) : (
              <div className={styles.timeInfo}>
                <span className={styles.timeText}>
                  {isScreenDocx ? "Word document (.docx)" : "PDF document"}
                </span>
              </div>
            )}

            <div className={styles.utilityBtns}>
              {isPlayable && (
                <button
                  className={styles.utilBtn}
                  onClick={resetPlayback}
                  title="Reset"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              {isPlayable && (
                <button
                  className={styles.utilBtn}
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}
              {canFullscreen && (
                <button
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
                  className={styles.utilBtn}
                  onClick={handleCancelVideo}
                  title="Close Video"
                  style={{ marginLeft: "6px", color: "#f87171" }}
                >
                  <X size={16} />
                </button>
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

      {/* 5. Bottom Action Buttons: Four Choices (SEE IT, HEAR IT, READ IT, CONTACT US) */}
      <div className={styles.actionSection}>
        <div className={styles.actionButtonsRow}>
          {/* Choice 1: SEE IT */}
          <button
            type="button"
            className={`${styles.roundedActionBtn} ${styles.btnVideo}`}
            onClick={handleVideoAction}
            aria-label="SEE IT"
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
            className={`${styles.roundedActionBtn} ${styles.btnAudio}`}
            onClick={handleAudioAction}
            aria-label="HEAR IT"
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
            className={`${styles.roundedActionBtn} ${styles.btnMoreDetail}`}
            onClick={handleInDepthAction}
            aria-label="READ IT"
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
      </div>
    </div>
  );
}
