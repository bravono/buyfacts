"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./TripletButton.module.css";

export type TripletButtonTheme = "orange" | "blue" | "purple" | "teal";

/**
 * Prevents orphan words by binding the final words together with a non-breaking space.
 * This guarantees that a single trailing word will never appear isolated on its own line
 * across any screen width.
 */
export function preventOrphanWords(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  const lastSpaceIdx = trimmed.lastIndexOf(" ");
  if (lastSpaceIdx === -1) return trimmed;
  return (
    trimmed.substring(0, lastSpaceIdx) +
    "\u00A0" +
    trimmed.substring(lastSpaceIdx + 1)
  );
}

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

  return (
    <div className={`${styles.tripletItem} ${className}`} id={`triplet-item-${item.id}`}>
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

      {/* Hover Information Card */}
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
          <h3 className={styles.hoverCardTitle}>{item.hoverCard.title}</h3>

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
                {item.hoverCard.prompt}
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

export default function TripletButtonGroup({
  items,
  columns = 3,
  className = "",
  showCaption = false,
  onHoverChange,
}: TripletButtonGroupProps) {
  const notifyHover = (isHovered: boolean) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("buyfacts:navbar-collapse", {
          detail: { collapsed: isHovered },
        })
      );
    }
    onHoverChange?.(isHovered);
  };

  return (
    <div
      className={`${styles.tripletGrid} ${className}`}
      data-columns={columns}
      role="group"
      aria-label="Key pathways"
      onMouseEnter={() => notifyHover(true)}
      onMouseLeave={() => notifyHover(false)}
      onFocusCapture={() => notifyHover(true)}
      onBlurCapture={() => notifyHover(false)}
    >
      {items.map((item) => (
        <TripletButton key={item.id} item={item} showCaption={showCaption} />
      ))}
    </div>
  );
}
