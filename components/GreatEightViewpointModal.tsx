"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, FileText, Headphones, Loader2, X } from "lucide-react";
import { GREAT_EIGHT_SECTION, type GreatEightCard } from "@/lib/greatEightManifest";
import { fetchAndConvertDocx, isDocxUrl, isPdfUrl } from "@/lib/document-parser";
import styles from "./GreatEightViewpointModal.module.css";

interface GreatEightViewpointModalProps {
  card: GreatEightCard;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), audio[controls], iframe, [tabindex]:not([tabindex="-1"])';

/** Renders the viewpoint article: an inline Word document, an embedded PDF, or a pending note. */
function ArticleReader({ card }: { card: GreatEightCard }) {
  const url = card.articleUrl;
  const isDocx = Boolean(url && isDocxUrl(url));
  const [docx, setDocx] = useState<{ url: string; html?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!url || !isDocx) return;
    let active = true;
    fetchAndConvertDocx(url).then((result) => {
      if (!active) return;
      setDocx(
        result.success && result.html
          ? { url, html: result.html }
          : { url, error: result.error || "The article could not be displayed." }
      );
    });
    return () => {
      active = false;
    };
  }, [url, isDocx]);

  if (!url) {
    return (
      <p className={styles.pending}>
        The full viewpoint article for this perspective will be published here.
      </p>
    );
  }

  if (isPdfUrl(url)) {
    return <iframe className={styles.pdfFrame} src={`${url}#view=FitH`} title={`${card.title} article`} />;
  }

  if (!isDocx) {
    return (
      <p className={styles.pending}>
        This article opens in the document reader.
      </p>
    );
  }

  const current = docx?.url === url ? docx : null;
  if (!current) {
    return (
      <p className={styles.pending} role="status">
        <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> Loading article
      </p>
    );
  }
  if (current.error) {
    return <p className={styles.pending}>{current.error} Use Open in Reader to view it.</p>;
  }
  // Same rendering path as /document-viewer: mammoth's HTML for a CDN document.
  return <div className={styles.docxContent} dangerouslySetInnerHTML={{ __html: current.html ?? "" }} />;
}

/**
 * "The Great Eight" viewpoint article modal: number, title and byline; Robert's audio
 * performance; then the card's graphic, viewpoint text and full article.
 */
export default function GreatEightViewpointModal({ card, onClose }: GreatEightViewpointModalProps) {
  const titleId = useId();
  const summaryId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the dialog on open, keep Tab inside it, close on Escape, and hand focus back to
  // the card that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
        aria-describedby={summaryId}
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
          <section className={styles.audio} aria-label="Audio performance">
            <h3 className={styles.sectionLabel}>
              <Headphones size={16} aria-hidden="true" /> Audio Performance
            </h3>
            {card.audioUrl ? (
              <audio className={styles.audioPlayer} controls preload="none" src={card.audioUrl}>
                Your browser does not support audio playback.
              </audio>
            ) : (
              <p className={styles.pending}>The audio performance of this viewpoint is coming soon.</p>
            )}
          </section>

          <article className={styles.article}>
            {card.graphicUrl && (
              // External CDN graphic of unknown dimensions; next/image would need remotePatterns.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.graphic} src={card.graphicUrl} alt="" />
            )}
            <p id={summaryId} className={styles.summary}>
              {card.summary}
            </p>
            {card.viewpoint.map((paragraph) => (
              <p key={paragraph} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}

            <h3 className={styles.sectionLabel}>
              <FileText size={16} aria-hidden="true" /> Viewpoint Article
            </h3>
            <ArticleReader card={card} />
          </article>
        </div>
      </div>
    </div>,
    document.body
  );
}
