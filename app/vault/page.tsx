import React from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VaultLayout from "@/components/vault/VaultLayout";
import { getVaultAssets, getVaultTopics } from "@/lib/vault";

export const metadata: Metadata = {
  title: "Content Vault | BuyFacts Multi-Format Asset Hub",
  description:
    "Structured, multi-format resource hub for Guests aggregating B2B research articles, videos, PDFs, and audio content with AI-indexed keyword search.",
  keywords: [
    "Content Vault",
    "BuyFacts",
    "B2B Research",
    "Asset Hub",
    "Cubicon 3D",
    "ResearchLib",
    "TRIAD Framework",
    "Return on Effort",
  ],
  openGraph: {
    title: "Content Vault | BuyFacts Multi-Format Asset Hub",
    description:
      "Explore articles, videos, PDFs, and audio briefings across B2B research methodologies and tools.",
    type: "website",
  },
};

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const topicSlug =
    typeof resolvedSearchParams.topic === "string"
      ? resolvedSearchParams.topic
      : undefined;

  const format =
    typeof resolvedSearchParams.format === "string"
      ? resolvedSearchParams.format
      : undefined;

  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q
      : undefined;

  // Server-side data fetching for SEO and fast initial paint
  const [topics, assets] = await Promise.all([
    getVaultTopics(),
    getVaultAssets({
      topicSlug,
      format,
      query,
    }),
  ]);

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "80px", minHeight: "100vh", background: "var(--bg-color)" }}>
        <VaultLayout
          topics={topics}
          assets={assets}
          currentTopicSlug={topicSlug}
          currentFormat={format}
          currentQuery={query}
        />
      </div>
      <Footer />
    </>
  );
}
