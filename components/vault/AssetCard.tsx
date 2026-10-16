"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Video,
  FileDown,
  Headphones,
  Calendar,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
  Eye,
} from "lucide-react";
import styles from "./Vault.module.css";
import { ParsedVaultAsset } from "@/lib/vault";

interface AssetCardProps {
  asset: ParsedVaultAsset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatLabels: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
    ARTICLE: {
      label: "Article",
      icon: <FileText size={14} />,
      badgeClass: styles.badgeArticle,
    },
    VIDEO: {
      label: "Video",
      icon: <Video size={14} />,
      badgeClass: styles.badgeVideo,
    },
    PDF: {
      label: "PDF",
      icon: <FileDown size={14} />,
      badgeClass: styles.badgePdf,
    },
    AUDIO: {
      label: "Audio",
      icon: <Headphones size={14} />,
      badgeClass: styles.badgeAudio,
    },
  };

  const currentFormat = formatLabels[asset.format] || formatLabels.ARTICLE;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(asset.publishedAt));

  const hasMediaViewer =
    (asset.format === "VIDEO" && (Boolean(asset.embedCode) || Boolean(asset.sourceUrl))) ||
    (asset.format === "AUDIO" && Boolean(asset.sourceUrl)) ||
    (asset.format === "PDF" && Boolean(asset.sourceUrl));

  const renderMedia = () => {
    if (asset.format === "VIDEO") {
      if (asset.embedCode) {
        return (
          <div
            className={styles.mediaFrameWrapper}
            dangerouslySetInnerHTML={{ __html: asset.embedCode }}
          />
        );
      }
      if (asset.sourceUrl) {
        return (
          <video
            controls
            preload="metadata"
            style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", background: "#000" }}
          >
            <source src={asset.sourceUrl} />
            Your browser does not support the video tag.
          </video>
        );
      }
    }

    if (asset.format === "AUDIO" && asset.sourceUrl) {
      return (
        <div style={{ padding: "0.5rem 0" }}>
          <audio controls className={styles.audioPlayer} preload="metadata">
            <source src={asset.sourceUrl} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (asset.format === "PDF" && asset.sourceUrl) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <iframe
            src={`${asset.sourceUrl}#view=FitH`}
            style={{
              width: "100%",
              height: "360px",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
            }}
            title={`Guest PDF viewer: ${asset.title}`}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <a
              href={asset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              title="Guest, open PDF in dedicated tab"
            >
              Open PDF In New Window <ExternalLink size={14} />
            </a>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <article className={styles.assetCard} aria-labelledby={`asset-title-${asset.id}`}>
      <div className={styles.cardHeader}>
        <span className={`${styles.formatBadge} ${currentFormat.badgeClass}`}>
          {currentFormat.icon}
          {currentFormat.label}
        </span>
        <span className={styles.publishDate} title={`Published on ${formattedDate}`}>
          <Calendar size={13} />
          {formattedDate}
        </span>
      </div>

      <h3 id={`asset-title-${asset.id}`} className={styles.cardTitle}>
        {asset.title}
      </h3>

      {asset.topic && (
        <Link
          href={`/vault?topic=${asset.topic.slug}`}
          className={styles.cardTopicLink}
          title={`Guest, filter by topic: ${asset.topic.name}`}
        >
          <Tag size={12} />
          <span>{asset.topic.name}</span>
        </Link>
      )}

      {asset.description && (
        <p className={styles.cardDescription}>
          {asset.description}
        </p>
      )}

      {asset.keywords && asset.keywords.length > 0 && (
        <div className={styles.keywordContainer} aria-label="Keywords">
          {asset.keywords.map((kw, idx) => (
            <Link
              key={idx}
              href={`/vault?q=${encodeURIComponent(kw)}`}
              className={styles.keywordTag}
              title={`Guest, search assets matching '${kw}'`}
            >
              {kw}
            </Link>
          ))}
        </div>
      )}

      {/* Expandable media trigger / viewer */}
      {isExpanded && hasMediaViewer && (
        <div className={styles.mediaExpandedArea}>
          {renderMedia()}
        </div>
      )}

      <div className={styles.cardActions}>
        {hasMediaViewer ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`${styles.actionBtn} ${isExpanded ? styles.actionBtnSecondary : styles.actionBtnPrimary}`}
            title={
              asset.format === "VIDEO"
                ? "Guest, click to play video"
                : asset.format === "AUDIO"
                ? "Guest, click to listen to audio"
                : "Guest, click to view PDF"
            }
          >
            {isExpanded ? (
              <>
                <ChevronUp size={15} /> Hide Player
              </>
            ) : asset.format === "VIDEO" ? (
              <>
                <Play size={15} /> Guest Play Video
              </>
            ) : asset.format === "AUDIO" ? (
              <>
                <Headphones size={15} /> Guest Listen
              </>
            ) : (
              <>
                <Eye size={15} /> Guest View PDF
              </>
            )}
          </button>
        ) : (
          <div />
        )}

        {asset.sourceUrl && (
          <a
            href={asset.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            title="Guest, view external source link"
          >
            Source <ExternalLink size={14} />
          </a>
        )}
      </div>
    </article>
  );
}
