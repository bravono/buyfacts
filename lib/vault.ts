import { prisma } from "./prisma";
import { ContentFormat } from "@prisma/client";

export type ContentFormatType = ContentFormat;
export { ContentFormat };

export interface ParsedVaultAsset {
  id: string;
  title: string;
  description: string | null;
  format: ContentFormat;
  sourceUrl: string | null;
  embedCode: string | null;
  topicId: string;
  topic: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  keywords: string[];
  isPublished: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicWithCount {
  id: string;
  name: string;
  slug: string;
  category: string;
  assetCount: number;
}

export function parseKeywords(rawKeywords: unknown): string[] {
  if (!rawKeywords) return [];
  if (Array.isArray(rawKeywords)) {
    return rawKeywords
      .map((k) => String(k).trim())
      .filter((k) => k.length > 0);
  }
  if (typeof rawKeywords === "string") {
    const trimmed = rawKeywords.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((k) => String(k).trim())
            .filter((k) => k.length > 0);
        }
      } catch {
        // Fall back to splitting
      }
    }
    return trimmed
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }
  return [];
}

export function serializeKeywords(keywords: unknown): string {
  const parsed = parseKeywords(keywords);
  return JSON.stringify(parsed);
}

export function normalizeContentFormat(rawFormat: unknown): ContentFormat {
  const val = String(rawFormat || "").trim().toUpperCase();
  if (val === "ARTICLE" || val === "ARTICLES") return ContentFormat.ARTICLE;
  if (val === "VIDEO" || val === "VIDEOS") return ContentFormat.VIDEO;
  if (val === "PDF" || val === "PDFS" || val === "DOCUMENT" || val === "DOCS") return ContentFormat.PDF;
  if (val === "AUDIO" || val === "PODCAST" || val === "SOUND") return ContentFormat.AUDIO;
  return ContentFormat.ARTICLE;
}

export function generateYouTubeEmbed(url: string, title?: string): string | null {
  if (!url) return null;

  try {
    const trimmed = url.trim();
    let videoId: string | null = null;

    // Pattern 1: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
    if (watchMatch) {
      videoId = watchMatch[1];
    } else {
      // Pattern 2: https://youtu.be/VIDEO_ID
      const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
      if (shortMatch) {
        videoId = shortMatch[1];
      }
    }

    if (videoId) {
      const escapedTitle = (title || "YouTube video player").replace(/"/g, "&quot;");
      return `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${escapedTitle}" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    }
  } catch {
    return null;
  }

  return null;
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
  "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
  "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
  "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
  "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
  "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those",
  "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll",
  "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you",
  "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
]);

export async function extractAIKeywordsAndTopic(
  text: string,
  title?: string,
  existingTopics?: { id: string; name: string; slug: string; category: string }[]
): Promise<{ keywords: string[]; matchedTopicId?: string; topicSuggestion?: string }> {
  const combinedText = `${title || ""} ${text || ""}`.trim();
  const prompt = "Extract 5 to 7 high-intent search keywords and classify into existing topic categories from the provided text.";

  // Option 1: OpenAI Completion API if OPENAI_API_KEY is configured
  if (process.env.OPENAI_API_KEY && combinedText.length > 0) {
    try {
      const topicList = existingTopics?.map((t) => `${t.name} (${t.category})`).join(", ") || "";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI metadata extraction pipeline for the BuyFacts Content Vault. ${prompt} Available topics: [${topicList}]. Respond with strict JSON format: { "keywords": string[], "category": string, "matchedTopic": string }`,
            },
            {
              role: "user",
              content: combinedText.slice(0, 4000),
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 7) : [];
          if (keywords.length >= 3) {
            let matchedTopicId: string | undefined;
            if (parsed.matchedTopic && existingTopics) {
              const lower = String(parsed.matchedTopic).toLowerCase();
              const found = existingTopics.find(
                (t) => t.name.toLowerCase() === lower || t.slug.toLowerCase() === lower || lower.includes(t.name.toLowerCase())
              );
              if (found) matchedTopicId = found.id;
            }
            return {
              keywords,
              matchedTopicId,
              topicSuggestion: parsed.matchedTopic,
            };
          }
        }
      }
    } catch {
      // Continue to deterministic fallback
    }
  }

  // Option 2: Anthropic Claude Completion API if ANTHROPIC_API_KEY is configured
  if (process.env.ANTHROPIC_API_KEY && combinedText.length > 0) {
    try {
      const topicList = existingTopics?.map((t) => `${t.name} (${t.category})`).join(", ") || "";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          system: `You are an AI metadata extraction pipeline for the BuyFacts Content Vault. ${prompt} Available topics: [${topicList}]. Output JSON only: { "keywords": ["keyword1", "keyword2", ...], "matchedTopic": "Topic Name" }`,
          messages: [
            {
              role: "user",
              content: combinedText.slice(0, 4000),
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content?.[0]?.text;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 7) : [];
            if (keywords.length >= 3) {
              let matchedTopicId: string | undefined;
              if (parsed.matchedTopic && existingTopics) {
                const lower = String(parsed.matchedTopic).toLowerCase();
                const found = existingTopics.find(
                  (t) => t.name.toLowerCase() === lower || t.slug.toLowerCase() === lower || lower.includes(t.name.toLowerCase())
                );
                if (found) matchedTopicId = found.id;
              }
              return {
                keywords,
                matchedTopicId,
                topicSuggestion: parsed.matchedTopic,
              };
            }
          }
        }
      }
    } catch {
      // Continue to deterministic fallback
    }
  }

  // Deterministic NLP keyword extraction fallback
  const keywords = extractDeterministicKeywords(combinedText);
  let matchedTopicId: string | undefined;
  let topicSuggestion: string | undefined;

  if (existingTopics && existingTopics.length > 0) {
    const lowerCombined = combinedText.toLowerCase();
    for (const t of existingTopics) {
      if (lowerCombined.includes(t.name.toLowerCase()) || lowerCombined.includes(t.slug.toLowerCase())) {
        matchedTopicId = t.id;
        topicSuggestion = t.name;
        break;
      }
    }
    if (!matchedTopicId && existingTopics.length > 0) {
      matchedTopicId = existingTopics[0].id;
      topicSuggestion = existingTopics[0].name;
    }
  }

  return {
    keywords,
    matchedTopicId,
    topicSuggestion,
  };
}

export function extractDeterministicKeywords(text: string): string[] {
  if (!text) return ["b2b research", "buyfacts", "market insights", "data validation", "return on effort"];

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const phrases: string[] = [];
  const phraseCounts: Record<string, number> = {};

  // Extract bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      phraseCounts[bigram] = (phraseCounts[bigram] || 0) + 2;
    }
  }

  // Count unigrams
  for (const w of words) {
    phraseCounts[w] = (phraseCounts[w] || 0) + 1;
  }

  // Sort by frequency
  const sorted = Object.entries(phraseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase);

  // Pick high-intent phrases (5 to 7 keywords)
  const results: string[] = [];
  for (const p of sorted) {
    if (!results.some((r) => r.includes(p) || p.includes(r))) {
      results.push(p);
    }
    if (results.length >= 7) break;
  }

  // Ensure between 5 and 7 keywords
  const domainDefaults = [
    "b2b research",
    "market movement",
    "validation framework",
    "customer insights",
    "return on effort",
    "survey methodology",
    "actionable data",
  ];

  for (const fallback of domainDefaults) {
    if (results.length >= 7) break;
    if (!results.includes(fallback)) {
      results.push(fallback);
    }
  }

  return results.slice(0, 7);
}

export async function getVaultTopics(): Promise<TopicWithCount[]> {
  const topics = await prisma.topic.findMany({
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: {
          assets: {
            where: { isPublished: true },
          },
        },
      },
    },
  });

  return topics.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    category: t.category,
    assetCount: t._count.assets,
  }));
}

export interface VaultAssetFilters {
  topicSlug?: string;
  format?: string;
  query?: string;
}

export async function getVaultAssets(filters: VaultAssetFilters = {}): Promise<ParsedVaultAsset[]> {
  const { topicSlug, format, query } = filters;

  const whereClause: {
    isPublished: boolean;
    format?: any;
    topic?: { slug: string };
    OR?: Array<
      | { title: { contains: string } }
      | { description: { contains: string } }
      | { keywords: { contains: string } }
    >;
  } = {
    isPublished: true,
  };

  if (format && format.toUpperCase() !== "ALL") {
    whereClause.format = normalizeContentFormat(format);
  }

  if (topicSlug && topicSlug !== "all") {
    whereClause.topic = { slug: topicSlug };
  }

  if (query && query.trim()) {
    const q = query.trim();
    whereClause.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { keywords: { contains: q } },
    ];
  }

  // Strictly chronological sort: publishedAt DESC
  const assets = await prisma.vaultAsset.findMany({
    where: whereClause,
    orderBy: {
      publishedAt: "desc",
    },
    include: {
      topic: true,
    },
  });

  return assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    description: asset.description,
    format: asset.format as ContentFormatType,
    sourceUrl: asset.sourceUrl,
    embedCode: asset.embedCode,
    topicId: asset.topicId,
    topic: asset.topic,
    keywords: parseKeywords(asset.keywords),
    isPublished: asset.isPublished,
    publishedAt: asset.publishedAt,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  }));
}
