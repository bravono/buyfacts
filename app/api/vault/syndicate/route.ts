import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeContentFormat,
  parseKeywords,
  serializeKeywords,
  generateYouTubeEmbed,
  extractAIKeywordsAndTopic,
} from "@/lib/vault";

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
      },
      orderBy: { name: "asc" },
    });

    const assetCount = await prisma.vaultAsset.count({
      where: { isPublished: true },
    });

    return NextResponse.json({
      status: "ready",
      service: "BuyFacts Content Vault Syndication API",
      audience: "Guests",
      publishedAssetCount: assetCount,
      supportedFormats: ["ARTICLE", "VIDEO", "PDF", "AUDIO"],
      topics,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve syndication status", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Payload Processing
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Validation error: 'title' is required for syndication." },
        { status: 400 }
      );
    }

    const sourceUrl =
      typeof body.sourceUrl === "string"
        ? body.sourceUrl.trim()
        : typeof body.mediaUrl === "string"
        ? body.mediaUrl.trim()
        : typeof body.fileUrl === "string"
        ? body.fileUrl.trim()
        : null;

    const rawText =
      typeof body.transcript === "string"
        ? body.transcript.trim()
        : typeof body.text === "string"
        ? body.text.trim()
        : typeof body.body === "string"
        ? body.body.trim()
        : typeof body.description === "string"
        ? body.description.trim()
        : "";

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : rawText
        ? rawText.slice(0, 500)
        : null;

    const format = normalizeContentFormat(body.format);

    // Auto-generate embed code for YouTube if not explicitly supplied
    let embedCode = typeof body.embedCode === "string" && body.embedCode.trim() ? body.embedCode.trim() : null;
    if (!embedCode && sourceUrl) {
      embedCode = generateYouTubeEmbed(sourceUrl, title);
    }

    // 2. Fetch existing topics for AI classification
    const existingTopics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
      },
    });

    // 3. AI Keyword Generation & Topic Classification
    const aiResult = await extractAIKeywordsAndTopic(rawText, title, existingTopics);

    // Resolve Keywords
    let resolvedKeywords: string[] = [];
    const passedKeywords = parseKeywords(body.keywords);
    if (passedKeywords.length > 0) {
      // Merge passed keywords with AI keywords, deduplicating
      const set = new Set([...passedKeywords, ...aiResult.keywords]);
      resolvedKeywords = Array.from(set).slice(0, 7);
    } else {
      resolvedKeywords = aiResult.keywords;
    }

    // 4. Resolve Topic
    let resolvedTopicId: string | null = null;

    if (body.topicId && typeof body.topicId === "string") {
      const found = existingTopics.find((t) => t.id === body.topicId.trim());
      if (found) resolvedTopicId = found.id;
    }

    if (!resolvedTopicId && (body.topicSlug || body.topic)) {
      const topicIdent = String(body.topicSlug || body.topic).trim().toLowerCase();
      const found = existingTopics.find(
        (t) => t.slug.toLowerCase() === topicIdent || t.name.toLowerCase() === topicIdent
      );
      if (found) resolvedTopicId = found.id;
    }

    if (!resolvedTopicId && aiResult.matchedTopicId) {
      resolvedTopicId = aiResult.matchedTopicId;
    }

    // If still no topic, find or create default topic
    if (!resolvedTopicId) {
      if (existingTopics.length > 0) {
        resolvedTopicId = existingTopics[0].id;
      } else {
        const defaultTopic = await prisma.topic.create({
          data: {
            name: "Research Insights",
            slug: "research-insights",
            category: "Dashboard Topic",
          },
        });
        resolvedTopicId = defaultTopic.id;
      }
    }

    // 5. Storage: Save normalized asset to VaultAsset table
    const isPublished = typeof body.isPublished === "boolean" ? body.isPublished : true;
    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();

    const newAsset = await prisma.vaultAsset.create({
      data: {
        title,
        description,
        format,
        sourceUrl,
        embedCode,
        topicId: resolvedTopicId,
        keywords: serializeKeywords(resolvedKeywords),
        isPublished,
        publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      },
      include: {
        topic: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Asset syndicated and indexed successfully for Guests.",
        asset: {
          id: newAsset.id,
          title: newAsset.title,
          description: newAsset.description,
          format: newAsset.format,
          sourceUrl: newAsset.sourceUrl,
          embedCode: newAsset.embedCode,
          topicId: newAsset.topicId,
          topic: newAsset.topic,
          keywords: parseKeywords(newAsset.keywords),
          isPublished: newAsset.isPublished,
          publishedAt: newAsset.publishedAt,
          createdAt: newAsset.createdAt,
          updatedAt: newAsset.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal error during content syndication",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
