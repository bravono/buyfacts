"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import styles from "./Vault.module.css";

interface VaultSearchProps {
  initialQuery?: string;
}

export default function VaultSearch({ initialQuery = "" }: VaultSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const updateSearchQuery = (newQuery: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (newQuery.trim()) {
      params.set("q", newQuery.trim());
    } else {
      params.delete("q");
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(`/vault${qs ? `?${qs}` : ""}`);
    });
  };

  const handleClear = () => {
    setQuery("");
    updateSearchQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchQuery(query);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchContainer} role="search">
      <Search size={18} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Welcome Guest! Search assets by keyword, title, or topic..."
        aria-label="Welcome Guest! Search assets by keyword, title, or topic"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            updateSearchQuery(query);
          }
        }}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className={styles.searchClearBtn}
          title="Guest, clear keyword search"
          aria-label="Clear search query"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}
