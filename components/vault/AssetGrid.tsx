"use client";

import React from "react";
import Link from "next/link";
import { FolderSearch, RotateCcw } from "lucide-react";
import styles from "./Vault.module.css";
import AssetCard from "./AssetCard";
import { ParsedVaultAsset } from "@/lib/vault";

interface AssetGridProps {
  assets: ParsedVaultAsset[];
  hasActiveFilters?: boolean;
}

export default function AssetGrid({ assets, hasActiveFilters = false }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FolderSearch size={48} color="var(--text-dim)" />
        <h3 className={styles.emptyStateTitle}>
          No assets found for your search, Guest
        </h3>
        <p className={styles.emptyStateText}>
          {hasActiveFilters
            ? "No assets match your current filters or search terms, Guest. Try selecting a different topic, clearing your format filter, or searching for other keywords."
            : "Welcome Guest! Search assets by keyword or select a topic to get started."}
        </p>
        {hasActiveFilters && (
          <div className={styles.emptyStateAction}>
            <Link
              href="/vault"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              title="Guest, reset all filters and return to all assets"
            >
              <RotateCcw size={15} /> Guest Reset All Filters
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.assetGrid} role="feed" aria-label="Chronological Content Assets">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
