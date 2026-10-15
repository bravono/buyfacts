"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Video,
  FileDown,
  Headphones,
  Compass,
  X,
  RotateCcw,
} from "lucide-react";
import styles from "./Vault.module.css";
import TopicSidebar from "./TopicSidebar";
import VaultSearch from "./VaultSearch";
import AssetGrid from "./AssetGrid";
import { ParsedVaultAsset, TopicWithCount } from "@/lib/vault";

interface VaultLayoutProps {
  topics: TopicWithCount[];
  assets: ParsedVaultAsset[];
  currentTopicSlug?: string;
  currentFormat?: string;
  currentQuery?: string;
}

export default function VaultLayout({
  topics,
  assets,
  currentTopicSlug,
  currentFormat = "ALL",
  currentQuery = "",
}: VaultLayoutProps) {
  const searchParams = useSearchParams();

  const formats = [
    { id: "ALL", label: "All Formats", icon: <Compass size={15} /> },
    { id: "ARTICLE", label: "Articles", icon: <FileText size={15} /> },
    { id: "VIDEO", label: "Videos", icon: <Video size={15} /> },
    { id: "PDF", label: "PDFs", icon: <FileDown size={15} /> },
    { id: "AUDIO", label: "Audio", icon: <Headphones size={15} /> },
  ];

  const buildFormatUrl = (fmt: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (fmt && fmt !== "ALL") {
      params.set("format", fmt);
    } else {
      params.delete("format");
    }
    const qs = params.toString();
    return `/vault${qs ? `?${qs}` : ""}`;
  };

  const removeFilterUrl = (key: "topic" | "format" | "q") => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.delete(key);
    const qs = params.toString();
    return `/vault${qs ? `?${qs}` : ""}`;
  };

  const normalizedCurrentFormat = (currentFormat || "ALL").toUpperCase();
  const activeTopic = topics.find((t) => t.slug === currentTopicSlug);
  const hasActiveFilters = Boolean(currentTopicSlug || (normalizedCurrentFormat !== "ALL") || currentQuery);

  return (
    <div className={styles.vaultContainer}>
      {/* Header Bar */}
      <header className={styles.vaultHeader}>
        <div className={styles.vaultTitleRow}>
          <h1 className={styles.vaultTitle}>
            Content <span className={styles.vaultTitleAccent}>Vault</span>
          </h1>
          <p className={styles.vaultSubtitle}>
            Structured, multi-format resource hub aggregating articles, videos, PDFs, and audio content with AI-indexed keyword search.
          </p>
        </div>

        <div className={styles.headerBarControls}>
          <VaultSearch initialQuery={currentQuery} />

          {/* Format Filter Tabs */}
          <nav className={styles.formatTabs} aria-label="Format Filter Tabs">
            {formats.map((fmt) => {
              const isActive =
                fmt.id === normalizedCurrentFormat ||
                (fmt.id === "ALL" && (!normalizedCurrentFormat || normalizedCurrentFormat === "ALL"));

              return (
                <Link
                  key={fmt.id}
                  href={buildFormatUrl(fmt.id)}
                  className={`${styles.formatTab} ${isActive ? styles.formatTabActive : ""}`}
                  title={`Guest, filter by ${fmt.label}`}
                >
                  {fmt.icon}
                  <span>{fmt.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Body: Left Sidebar + Main Area */}
      <div className={styles.vaultBody}>
        <TopicSidebar topics={topics} currentTopicSlug={currentTopicSlug} />

        <main className={styles.mainContent}>
          {/* Status bar with Guest greeting and active filter chips */}
          <div className={styles.statusBar}>
            <div>
              <p className={styles.guestGreeting}>
                Welcome Guest! Search assets by keyword or select a topic to get started.
              </p>
              <span className={styles.assetCountText}>
                Showing {assets.length} {assets.length === 1 ? "asset" : "assets"} sorted chronologically
              </span>
            </div>

            {hasActiveFilters && (
              <div className={styles.filterChips}>
                {activeTopic && (
                  <Link
                    href={removeFilterUrl("topic")}
                    className={styles.filterChip}
                    title="Guest, remove topic filter"
                  >
                    Topic: {activeTopic.name} <X size={12} />
                  </Link>
                )}

                {normalizedCurrentFormat !== "ALL" && (
                  <Link
                    href={removeFilterUrl("format")}
                    className={styles.filterChip}
                    title="Guest, remove format filter"
                  >
                    Format: {normalizedCurrentFormat} <X size={12} />
                  </Link>
                )}

                {currentQuery && (
                  <Link
                    href={removeFilterUrl("q")}
                    className={styles.filterChip}
                    title="Guest, remove search query"
                  >
                    Search: &quot;{currentQuery}&quot; <X size={12} />
                  </Link>
                )}

                <Link
                  href="/vault"
                  className={styles.clearAllFiltersBtn}
                  title="Guest, clear all active filters"
                >
                  Reset all
                </Link>
              </div>
            )}
          </div>

          {/* Asset Grid */}
          <AssetGrid assets={assets} hasActiveFilters={hasActiveFilters} />
        </main>
      </div>
    </div>
  );
}
