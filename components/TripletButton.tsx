"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./TripletButton.module.css";

export type TripletButtonTheme = "orange" | "blue" | "purple" | "teal";

export interface TripletButtonItem {
  id: string;
  title: string;
  tagline: string;
  href: string;
  iconUrl?: string;
  fallbackIcon?: React.ReactNode;
  iconAlt?: string;
  theme?: TripletButtonTheme;
  badge?: string;
  external?: boolean;
  actionHint?: string;
}

export interface TripletButtonProps {
  item: TripletButtonItem;
  className?: string;
}

export interface TripletButtonGroupProps {
  items: TripletButtonItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}

export function TripletButton({ item, className = "" }: TripletButtonProps) {
  const [imageError, setImageError] = useState(false);

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

  const isExternal = item.external || item.href.startsWith("http://") || item.href.startsWith("https://");
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

      <span className={styles.btnLabel}>{item.title}</span>

      <span className={styles.arrowWrapper} aria-hidden="true">
        <ArrowRight size={18} />
      </span>
    </>
  );

  return (
    <div className={`${styles.tripletItem} ${className}`} id={`triplet-item-${item.id}`}>
      {item.badge && <span className={styles.itemBadge}>{item.badge}</span>}

      {isExternal ? (
        <a
          href={item.href}
          className={`${styles.tripletBtn} ${themeClass}`}
          id={`triplet-btn-${item.id}`}
          aria-label={`${item.title}: ${item.tagline}`}
          {...linkProps}
        >
          {buttonContent}
        </a>
      ) : (
        <Link
          href={item.href}
          className={`${styles.tripletBtn} ${themeClass}`}
          id={`triplet-btn-${item.id}`}
          aria-label={`${item.title}: ${item.tagline}`}
        >
          {buttonContent}
        </Link>
      )}

      {/* Brief text below the button */}
      <div className={styles.captionBox}>
        <p className={styles.captionText}>{item.tagline}</p>
        {item.actionHint && (
          <span className={styles.captionHint}>{item.actionHint}</span>
        )}
      </div>
    </div>
  );
}

export default function TripletButtonGroup({
  items,
  columns = 3,
  className = "",
}: TripletButtonGroupProps) {
  return (
    <div
      className={`${styles.tripletGrid} ${className}`}
      data-columns={columns}
      role="group"
      aria-label="Key pathways"
    >
      {items.map((item) => (
        <TripletButton key={item.id} item={item} />
      ))}
    </div>
  );
}
