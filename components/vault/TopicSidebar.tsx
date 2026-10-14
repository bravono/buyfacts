"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Layers, Folder, Box } from "lucide-react";
import styles from "./Vault.module.css";
import { TopicWithCount } from "@/lib/vault";

interface TopicSidebarProps {
  topics: TopicWithCount[];
  currentTopicSlug?: string;
}

export default function TopicSidebar({ topics, currentTopicSlug }: TopicSidebarProps) {
  const searchParams = useSearchParams();

  const buildUrlWithTopic = (slug?: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (slug && slug !== "all") {
      params.set("topic", slug);
    } else {
      params.delete("topic");
    }
    const qs = params.toString();
    return `/vault${qs ? `?${qs}` : ""}`;
  };

  const productTopics = topics.filter((t) => t.category === "Product");
  const dashboardTopics = topics.filter((t) => t.category === "Dashboard Topic");
  const otherTopics = topics.filter((t) => t.category !== "Product" && t.category !== "Dashboard Topic");

  const totalAssets = topics.reduce((acc, t) => acc + t.assetCount, 0);

  return (
    <aside className={styles.sidebar} aria-label="Topic and Product Navigation">
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>
          <Layers size={18} />
          Categories
        </h2>
        {currentTopicSlug && (
          <Link
            href={buildUrlWithTopic(undefined)}
            className={styles.sidebarResetLink}
            title="Guest, view all topics"
          >
            Clear
          </Link>
        )}
      </div>

      <div className={styles.topicSection}>
        <ul className={styles.topicList}>
          <li className={styles.topicItem}>
            <Link
              href={buildUrlWithTopic(undefined)}
              className={`${styles.topicLink} ${!currentTopicSlug ? styles.topicLinkActive : ""}`}
              title="Guest, view all topics and products"
            >
              <span>All Topics & Products</span>
              <span className={styles.topicCountBadge}>{totalAssets}</span>
            </Link>
          </li>
        </ul>
      </div>

      {productTopics.length > 0 && (
        <div className={styles.topicSection}>
          <h3 className={styles.topicSectionTitle}>
            Products
          </h3>
          <ul className={styles.topicList}>
            {productTopics.map((topic) => {
              const isActive = currentTopicSlug === topic.slug;
              return (
                <li key={topic.id} className={styles.topicItem}>
                  <Link
                    href={buildUrlWithTopic(topic.slug)}
                    className={`${styles.topicLink} ${isActive ? styles.topicLinkActive : ""}`}
                    title={`Guest, filter by product: ${topic.name}`}
                  >
                    <span>{topic.name}</span>
                    <span className={styles.topicCountBadge}>{topic.assetCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dashboardTopics.length > 0 && (
        <div className={styles.topicSection}>
          <h3 className={styles.topicSectionTitle}>
            Dashboard Topics
          </h3>
          <ul className={styles.topicList}>
            {dashboardTopics.map((topic) => {
              const isActive = currentTopicSlug === topic.slug;
              return (
                <li key={topic.id} className={styles.topicItem}>
                  <Link
                    href={buildUrlWithTopic(topic.slug)}
                    className={`${styles.topicLink} ${isActive ? styles.topicLinkActive : ""}`}
                    title={`Guest, filter by dashboard topic: ${topic.name}`}
                  >
                    <span>{topic.name}</span>
                    <span className={styles.topicCountBadge}>{topic.assetCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {otherTopics.length > 0 && (
        <div className={styles.topicSection}>
          <h3 className={styles.topicSectionTitle}>
            Additional Topics
          </h3>
          <ul className={styles.topicList}>
            {otherTopics.map((topic) => {
              const isActive = currentTopicSlug === topic.slug;
              return (
                <li key={topic.id} className={styles.topicItem}>
                  <Link
                    href={buildUrlWithTopic(topic.slug)}
                    className={`${styles.topicLink} ${isActive ? styles.topicLinkActive : ""}`}
                    title={`Guest, filter by topic: ${topic.name}`}
                  >
                    <span>{topic.name}</span>
                    <span className={styles.topicCountBadge}>{topic.assetCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
