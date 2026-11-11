"use client";

import React, { useState } from "react";
import {
  Link as LinkIcon,
  Check,
  Globe,
  MonitorPlay,
  FileText,
  Volume2,
  Eye,
  Video,
  Headphones,
  Layers,
} from "lucide-react";
import styles from "./page.module.css";

export interface GreatEightButton {
  id: string;
  label: string;
  descriptionText: string;
  seeItUrl?: string | null;
  hearItUrl?: string | null;
  readItUrl?: string | null;
  mediaType: string;
  subtitle: string | null;
  category: string;
}

interface GreatEightSectionProps {
  /** Buttons loaded from /api/buttons (single source of truth). */
  buttons: GreatEightButton[];
  /** The category that populates The Great Eight. */
  category?: string;
  /** Currently staged URL from the Active URL Stager (section 2). */
  stagedUrl: string | null;
  /** Optimistic local edit, kept in the page-level button state. */
  onLocalChange: (
    buttonId: string,
    field: "seeItUrl" | "hearItUrl" | "readItUrl" | "descriptionText",
    value: string
  ) => void;
  /** Persists a single sub-link/description edit. */
  onSave: (
    buttonId: string,
    field: "seeItUrl" | "hearItUrl" | "readItUrl" | "descriptionText",
    value: string
  ) => Promise<void> | void;
  /** Opens the media preview modal. */
  onPreview: (url: string, label: string) => void;
  /** Key of the row currently being saved, e.g. "btn-srv-001-seeItUrl". */
  savingKey: string | null;
}

type Field = "seeItUrl" | "hearItUrl" | "readItUrl" | "descriptionText";

const getIconForType = (type: string) => {
  switch (type?.toLowerCase()) {
    case "video":
      return MonitorPlay;
    case "audio":
      return Volume2;
    case "pdf":
      return FileText;
    default:
      return Globe;
  }
};

export default function GreatEightSection({
  buttons,
  category = "Research Imperatives",
  stagedUrl,
  onLocalChange,
  onSave,
  onPreview,
  savingKey,
}: GreatEightSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cards = buttons.filter((btn) => btn.category === category);

  return (
    <div className={styles.section}>
      <div className={styles.greatEightHeader}>
        <div
          className={styles.sectionTitle}
          style={{
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "0.5rem",
            flex: 1,
          }}
        >
          <Layers className="w-5 h-5 text-[var(--interactive-orange)]" />
          The Great Eight
        </div>
        <span className={styles.greatEightCount}>
          {cards.length} card{cards.length === 1 ? "" : "s"} · collapsed by default
        </span>
      </div>

      {cards.length === 0 ? (
        <div className={styles.placeholderText}>
          <div className={styles.pulseDot}></div>
          No buttons found in the &quot;{category}&quot; category yet.
        </div>
      ) : (
        <div className={styles.grid}>
          {cards.map((btn) => {
            const BtnIcon = getIconForType(btn.mediaType);
            const isOpen = expandedId === btn.id;
            const linkedCount = [btn.seeItUrl, btn.hearItUrl, btn.readItUrl].filter(
              Boolean
            ).length;

            const rows: {
              field: Field;
              label: string;
              icon: React.ReactNode;
              placeholder: string;
              multiline?: boolean;
              value: string;
              isUrl: boolean;
            }[] = [
              {
                field: "descriptionText",
                label: "DESCRIPTION",
                icon: <LinkIcon className="w-3.5 h-3.5 text-[var(--interactive-blue)]" />,
                placeholder:
                  "Description text shown in the media player (blank line = new paragraph)...",
                multiline: true,
                value: btn.descriptionText ?? "",
                isUrl: false,
              },
              {
                field: "seeItUrl",
                label: "SEE IT (Video)",
                icon: <Video className="w-3.5 h-3.5 text-[#ea425f]" />,
                placeholder: "Paste or type video link (e.g. .mp4, YouTube, S3)...",
                value: btn.seeItUrl ?? "",
                isUrl: true,
              },
              {
                field: "hearItUrl",
                label: "HEAR IT (Audio)",
                icon: <Headphones className="w-3.5 h-3.5 text-[#006398]" />,
                placeholder: "Paste or type audio link (e.g. .mp3, S3)...",
                value: btn.hearItUrl ?? "",
                isUrl: true,
              },
              {
                field: "readItUrl",
                label: "READ IT (Text / Doc)",
                icon: <FileText className="w-3.5 h-3.5 text-[#ff9900]" />,
                placeholder: "Paste or type text/document link (e.g. .pdf, doc)...",
                value: btn.readItUrl ?? "",
                isUrl: true,
              },
            ];

            return (
              <div
                key={btn.id}
                className={`${styles.card} ${styles.collapsibleCard} ${
                  isOpen ? styles.cardOpen : ""
                }`}
              >
                <button
                  type="button"
                  className={styles.cardToggle}
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : btn.id)}
                  title={isOpen ? "Collapse card" : "Expand card"}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIcon}>
                      <BtnIcon className="w-4 h-4" />
                    </div>
                    <div className={styles.cardTitleGroup}>
                      <span className={styles.cardLabel}>{btn.label}</span>
                      {btn.subtitle && (
                        <span className={styles.cardSubtitle}>{btn.subtitle}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardToggleMeta}>
                    <span className={styles.cardBadge}>{linkedCount}/3 linked</span>
                    <svg
                      className={`${styles.cardChevron} ${isOpen ? styles.cardChevronOpen : ""}`}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className={styles.subLinksSection}>
                    {rows.map((row) => (
                      <div key={row.field} className={styles.subLinkRow}>
                        <div className={styles.subLinkHeader}>
                          <div className={styles.subLinkLabel}>
                            {row.icon}
                            <span>{row.label}</span>
                          </div>
                          <div className={styles.subLinkActions}>
                            {row.isUrl && (
                              <button
                                type="button"
                                disabled={!stagedUrl}
                                onClick={() => onSave(btn.id, row.field, stagedUrl!)}
                                className={styles.subLinkPasteBtn}
                                title={
                                  stagedUrl ? `Link staged URL: ${stagedUrl}` : "No staged URL"
                                }
                              >
                                {savingKey === `${btn.id}-${row.field}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" /> Linked!
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="w-3 h-3" /> Link Staged
                                  </>
                                )}
                              </button>
                            )}
                            {!row.isUrl && savingKey === `${btn.id}-${row.field}` && (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" /> Saved!
                              </>
                            )}
                            {row.isUrl && (
                              <button
                                type="button"
                                disabled={!row.value}
                                onClick={() => onPreview(row.value, `${btn.label} - ${row.label}`)}
                                className={styles.previewIconBtn}
                                title={`Preview ${row.label}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={styles.subLinkInputWrapper}>
                          {row.multiline ? (
                            <textarea
                              rows={6}
                              value={row.value}
                              onChange={(e) => onLocalChange(btn.id, row.field, e.target.value)}
                              onBlur={(e) => onSave(btn.id, row.field, e.target.value)}
                              placeholder={row.placeholder}
                              className={styles.subLinkInput}
                            />
                          ) : (
                            <input
                              type="text"
                              value={row.value}
                              onChange={(e) => onLocalChange(btn.id, row.field, e.target.value)}
                              onBlur={(e) => onSave(btn.id, row.field, e.target.value)}
                              placeholder={row.placeholder}
                              className={styles.subLinkInput}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
