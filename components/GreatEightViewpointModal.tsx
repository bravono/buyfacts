"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { GREAT_EIGHT_SECTION, type GreatEightCard } from "@/lib/greatEightManifest";
import MediaPlayer from "./MediaPlayer";
import styles from "./GreatEightViewpointModal.module.css";

interface GreatEightViewpointModalProps {
  card: GreatEightCard;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * "The Great Eight" viewpoint modal: number, title and byline, then the shared dashboard
 * MediaPlayer with its SEE IT (video), HEAR IT (audio) and READ IT (article) buttons.
 */
export default function GreatEightViewpointModal({ card, onClose }: GreatEightViewpointModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the dialog on open, keep Tab inside it, close on Escape, and hand focus back to
  // the card that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      // Escape leaves a full-screen player first (MediaPlayer handles that); close only otherwise.
      if (event.key === "Escape" && !document.fullscreenElement) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  const readerHref = card.articleUrl
    ? `/document-viewer?url=${encodeURIComponent(card.articleUrl)}&title=${encodeURIComponent(card.title)}`
    : null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-great-eight-slug={card.slug}
      >
        <header className={styles.header}>
          <span className={styles.number} aria-hidden="true">
            {card.number}
          </span>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>
              {GREAT_EIGHT_SECTION.heading} <span className={styles.srOnly}>viewpoint {card.number}</span>
            </p>
            <h2 id={titleId} className={styles.title}>
              {card.title}
            </h2>
            <p className={styles.byline}>{GREAT_EIGHT_SECTION.byline}</p>
          </div>
          <div className={styles.actions}>
            {readerHref && (
              <Link
                href={readerHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.readerLink}
                aria-label="Open in Reader (new tab)"
              >
                <ExternalLink size={15} aria-hidden="true" />
                <span>Open in Reader</span>
              </Link>
            )}
            <button
              ref={closeRef}
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close viewpoint"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          <MediaPlayer
            title={card.title}
            tagline={card.summary}
            description={[card.summary, ...card.viewpoint].join("\n")}
            seeItUrl={card.videoUrl}
            hearItUrl={card.audioUrl}
            readItUrl={card.articleUrl}
            // Open on the article (inline PDF/Word), as on Yousuf's original Great Eight player.
            initialScreenMode={card.articleUrl ? "document" : "auto"}
            showWelcome={false}
            onContactClick={onClose}
          />
          {card.graphicUrl && (
            // External CDN graphic of unknown dimensions; next/image would need remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.graphic} src={card.graphicUrl} alt="" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
