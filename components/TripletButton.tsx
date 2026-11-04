"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import styles from "./TripletButton.module.css";

export type TripletButtonTheme = "orange" | "blue" | "purple" | "teal";

import { preventOrphanWords } from "../lib/orphan-prevention";
export { preventOrphanWords };

export interface TripletHoverCardData {
  title: string;
  description: string;
  prompt: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export interface TripletButtonItem {
  id: string;
  title: string;
  tagline: string;
  href?: string;
  iconUrl?: string;
  fallbackIcon?: React.ReactNode;
  iconAlt?: string;
  theme?: TripletButtonTheme;
  badge?: string;
  external?: boolean;
  actionHint?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  videoUrl?: string;
  hoverCard?: TripletHoverCardData;
}

export interface TripletButtonProps {
  item: TripletButtonItem;
  className?: string;
  showCaption?: boolean;
  column?: number;
  /** True when this card's hover information is revealed by the mobile collapsible. */
  isExpanded?: boolean;
  /** Toggles the mobile collapsible (mobile only). */
  onToggleExpand?: (id: string) => void;
}

export interface TripletButtonGroupProps {
  items: TripletButtonItem[];
  columns?: 1 | 2 | 3;
  className?: string;
  showCaption?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
}

export function TripletButton({
  item,
  className = "",
  showCaption = false,
  column,
  isExpanded = false,
  onToggleExpand,
}: TripletButtonProps) {
  const [imageError, setImageError] = useState(false);
  const [hoverImageError, setHoverImageError] = useState(false);

  const themeClass = (() => {
    switch (item.theme) {
      case "blue":
        return styles.themeBlue;
      case "purple":
        return styles.themePurple;
      case "teal":
        return styles.themeTeal;
      case "orange":
      default:
        return styles.themeOrange;
    }
  })();

  const hoverThemeClass = (() => {
    switch (item.theme) {
      case "blue":
        return styles.hoverThemeBlue;
      case "purple":
        return styles.hoverThemePurple;
      case "teal":
        return styles.hoverThemeTeal;
      case "orange":
      default:
        return styles.hoverThemeOrange;
    }
  })();

  const isExternal = Boolean(
    item.external ||
    (item.href && (item.href.startsWith("http://") || item.href.startsWith("https://")))
  );
  const linkProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  const hasCdnIcon = Boolean(item.iconUrl && item.iconUrl.trim().length > 0 && !imageError);

  const buttonContent = (
    <>
      <div className={styles.iconWrapper}>
        {hasCdnIcon ? (
          <img
            src={item.iconUrl}
            alt={item.iconAlt || item.title}
            className={styles.cdnIcon}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={styles.fallbackIcon}>{item.fallbackIcon}</span>
        )}
      </div>

      <span className={styles.btnDivider} aria-hidden="true" />

      <span className={styles.btnLabel}>{preventOrphanWords(item.title)}</span>

      <span className={styles.arrowWrapper} aria-hidden="true">
        <ArrowRight size={20} />
      </span>
    </>
  );

  const hasActiveVideo = item.videoUrl === undefined || item.videoUrl.trim().length > 0;

  const handleActionClick = (e: React.MouseEvent<HTMLElement>) => {
    if (item.onClick && hasActiveVideo) {
      e.preventDefault();
      item.onClick(e);
    }
  };

  const handleActionKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (item.onClick && hasActiveVideo && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      item.onClick(e as unknown as React.MouseEvent<HTMLElement>);
    }
  };

  const canExpand = Boolean(item.hoverCard && onToggleExpand);

  const handleToggleExpand = () => {
    onToggleExpand?.(item.id);
  };

  return (
    <div
      className={`${styles.tripletItem} ${className}`}
      id={`triplet-item-${item.id}`}
      data-column={column}
      data-expanded={canExpand ? (isExpanded ? "true" : "false") : undefined}
    >
      {item.badge && <span className={styles.itemBadge}>{item.badge}</span>}

      {/* Primary Pill Action Button */}
      {item.onClick && !item.href ? (
        <button
          type="button"
          onClick={item.onClick}
          className={`${styles.tripletBtn} ${themeClass}`}
          id={`triplet-btn-${item.id}`}
          aria-label={`${item.title}: ${item.tagline}`}
        >
          {buttonContent}
        </button>
      ) : isExternal ? (
        <a
          href={item.href || "#"}
          draggable={false}
          className={`${styles.tripletBtn} ${themeClass}`}
          id={`triplet-btn-${item.id}`}
          aria-label={`${item.title}: ${item.tagline}`}
          onClick={item.onClick ? handleActionClick : undefined}
          onKeyDown={item.onClick ? handleActionKeyDown : undefined}
          role={item.onClick ? "button" : undefined}
          {...linkProps}
        >
          {buttonContent}
        </a>
      ) : (
        <Link
          href={item.href || "#"}
          draggable={false}
          className={`${styles.tripletBtn} ${themeClass}`}
          id={`triplet-btn-${item.id}`}
          aria-label={`${item.title}: ${item.tagline}`}
          onClick={item.onClick ? handleActionClick : undefined}
          onKeyDown={item.onClick ? handleActionKeyDown : undefined}
          role={item.onClick ? "button" : undefined}
        >
          {buttonContent}
        </Link>
      )}

      {/* Hover Information Card (hover on desktop/tablet, collapsible on mobile) */}
      {item.hoverCard && (
        <div
          className={`${styles.hoverCard} ${hoverThemeClass}`}
          id={`hover-card-${item.id}`}
          role="region"
          aria-label={`${item.hoverCard.title} overview`}
        >
          {/* Top Triangle Pointer Caret */}
          <span className={styles.hoverPointer} aria-hidden="true" />

          {/* Card Title */}
          <h3 className={styles.hoverCardTitle}>{preventOrphanWords(item.hoverCard.title)}</h3>

          {/* Description Paragraph */}
          <p className={styles.hoverCardDesc}>{item.hoverCard.description}</p>

          {/* Callout Box */}
          <div className={styles.hoverCallout}>
            <div className={styles.hoverCalloutIcon}>
              {hasCdnIcon && !hoverImageError ? (
                <img
                  src={item.iconUrl}
                  alt={item.iconAlt || item.hoverCard.title}
                  className={styles.hoverIconImg}
                  onError={() => setHoverImageError(true)}
                />
              ) : (
                <span className={styles.hoverFallbackIcon}>
                  {item.fallbackIcon}
                </span>
              )}
            </div>

            <span className={styles.hoverCalloutDivider} aria-hidden="true" />

            <div className={styles.hoverCalloutContent}>
              <p className={styles.hoverCalloutPrompt}>
                {preventOrphanWords(item.hoverCard.prompt)}
              </p>
              <Link
                href={item.hoverCard.actionHref || item.href || "#"}
                className={styles.hoverCalloutAction}
                onClick={item.hoverCard.onActionClick}
                aria-label={`${item.hoverCard.actionLabel || "Try It"} ${item.hoverCard.title}`}
              >
                <span>{item.hoverCard.actionLabel || "Try It"}</span>
                <ArrowRight
                  size={15}
                  className={styles.hoverActionArrow}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-only collapsible trigger for the information card */}
      {canExpand && (
        <button
          type="button"
          className={styles.expandToggle}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`hover-card-${item.id}`}
          aria-label={
            isExpanded
              ? `Hide details for ${item.title}`
              : `Show details for ${item.title}`
          }
        >
          <span className={styles.expandToggleLabel}>
            {isExpanded ? "Hide details" : "Details"}
          </span>
          <ChevronDown
            size={15}
            className={styles.expandChevron}
            aria-hidden="true"
          />
        </button>
      )}

      {/* Optional brief text below the button when showCaption is enabled */}
      {showCaption && (
        <div className={styles.captionBox}>
          <p className={styles.captionText}>{item.tagline}</p>
          {item.actionHint && (
            <span className={styles.captionHint}>{item.actionHint}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Below this width the pathway cards become a swipeable carousel and each
 * card's hover information is revealed by a collapsible instead of hover.
 * Kept in sync with the mobile media queries in TripletButton.module.css.
 */
const MOBILE_CAROUSEL_QUERY = "(max-width: 680px)";

/** Minimum horizontal drag (px) before a swipe changes the active card. */
const SWIPE_THRESHOLD = 40;

/** Auto-advance cadence for the mobile carousel, in milliseconds. */
const AUTOPLAY_INTERVAL = 5000;

export default function TripletButtonGroup({
  items,
  columns = 3,
  className = "",
  showCaption = false,
  onHoverChange,
}: TripletButtonGroupProps) {
  const [rawActiveIndex, setActiveIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive instead of syncing in an effect: keeps the active slide valid if
  // the item list ever shrinks.
  const activeIndex = Math.min(
    Math.max(rawActiveIndex, 0),
    Math.max(items.length - 1, 0)
  );

  const trackRef = useRef<HTMLDivElement | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  const [isMobileCarousel, setIsMobileCarousel] = useState(false);
  const [isPausedByTouch, setIsPausedByTouch] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isAutoAdvanceHeld, setIsAutoAdvanceHeld] = useState(false);

  const notifyHover = useCallback(
    (isHovered: boolean) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("buyfacts:navbar-collapse", {
            detail: { collapsed: isHovered },
          })
        );
      }
      onHoverChange?.(isHovered);
    },
    [onHoverChange]
  );

  const goToSlide = useCallback(
    (index: number, options?: { focusCard?: boolean }) => {
      const next = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0));
      setActiveIndex(next);

      // Close any open collapsible that belongs to a card we are leaving.
      setExpandedId((current) => {
        if (!current) return current;
        const currentIndex = items.findIndex((item) => item.id === current);
        return currentIndex === next ? current : null;
      });

      const track = trackRef.current;
      if (!track || typeof window === "undefined") return;

      // Actually move the carousel. Setting the active index only updates the
      // pager dots; the pills are a horizontally scrollable track, so it has to
      // be scrolled to the new card as well.
      const query = window.matchMedia(MOBILE_CAROUSEL_QUERY);
      if (!query.matches) return;

      const card = track.children[next] as HTMLElement | undefined;
      if (card) {
        const targetLeft =
          card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
        track.scrollTo({ left: targetLeft, behavior: "smooth" });
      }

      // Let keyboard users land on the newly active card.
      if (options?.focusCard) {
        card?.focus({ preventScroll: true });
      }
    },
    [items]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    // A finger on the carousel means the reader is browsing: hold auto-advance.
    setIsPausedByTouch(true);
  };

  /*
   * While the track is scrolling (autoplay, pager dot, swipe, or a manual
   * scroll), keep the active index in sync with whichever card actually sits
   * nearest the middle of the viewport.
   */
  const handleTrackScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    if (typeof window === "undefined") return;
    if (!window.matchMedia(MOBILE_CAROUSEL_QUERY).matches) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    Array.from(track.children).forEach((child, index) => {
      const el = child as HTMLElement;
      const childCenter = el.offsetLeft + el.clientWidth / 2;
      const distance = Math.abs(childCenter - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    setActiveIndex(nearest);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const startX = swipeStartX.current;
    const startY = swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    setIsPausedByTouch(false);

    if (startX === null || startY === null) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Ignore taps and mostly-vertical gestures (page scroll).
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    goToSlide(activeIndex + (deltaX < 0 ? 1 : -1));
  };

  const handlePointerCancel = () => {
    swipeStartX.current = null;
    swipeStartY.current = null;
    setIsPausedByTouch(false);
  };

  // Track whether we are actually in the mobile carousel layout, and whether
  // the reader has asked for reduced motion.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const carouselQuery = window.matchMedia(MOBILE_CAROUSEL_QUERY);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setIsMobileCarousel(carouselQuery.matches);
      setPrefersReducedMotion(motionQuery.matches);
    };

    sync();
    carouselQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);

    return () => {
      carouselQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  /*
   * Auto-advance: every 5 seconds the carousel moves to the next pathway.
   * It stands down whenever the reader is engaged - an open details card,
   * a finger on the carousel, keyboard focus inside it, a hover, or a
   * reduced-motion preference - and resumes once they let go.
   */
  const isAutoAdvanceEnabled =
    isMobileCarousel &&
    !prefersReducedMotion &&
    !expandedId &&
    !isPausedByTouch &&
    !isAutoAdvanceHeld &&
    items.length > 1;

  useEffect(() => {
    if (!isAutoAdvanceEnabled) return;

    const timer = window.setTimeout(() => {
      goToSlide(activeIndex + 1 >= items.length ? 0 : activeIndex + 1);
    }, AUTOPLAY_INTERVAL);

    return () => window.clearTimeout(timer);
  }, [isAutoAdvanceEnabled, activeIndex, items.length, goToSlide]);

  return (
    <div className={`${styles.tripletGroup} ${className}`}>
      <div
        className={styles.tripletGrid}
        data-columns={columns}
        data-active-index={activeIndex}
        ref={trackRef}
        role="group"
        aria-label="Key pathways"
        onMouseEnter={() => {
          notifyHover(true);
          setIsAutoAdvanceHeld(true);
        }}
        onMouseLeave={() => {
          notifyHover(false);
          setIsAutoAdvanceHeld(false);
        }}
        onFocusCapture={() => {
          notifyHover(true);
          setIsAutoAdvanceHeld(true);
        }}
        onBlurCapture={() => {
          notifyHover(false);
          setIsAutoAdvanceHeld(false);
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onScroll={handleTrackScroll}
      >
        {items.map((item, index) => (
          <TripletButton
            key={item.id}
            item={item}
            showCaption={showCaption}
            column={index + 1}
            isExpanded={expandedId === item.id}
            onToggleExpand={toggleExpanded}
          />
        ))}
      </div>

      {/* Mobile-only carousel pager dots */}
      {items.length > 1 && (
        <div
          className={styles.carouselDots}
          role="tablist"
          aria-label="Pathway slides"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={styles.carouselDot}
              aria-selected={index === activeIndex}
              aria-label={`Show ${item.title} (${index + 1} of ${items.length})`}
              onClick={() => goToSlide(index)}
            >
              <span className={styles.carouselDotCore} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
