import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";
import { GREAT_EIGHT_CARDS } from "@/lib/greatEightManifest";
import type { Prisma } from "@prisma/client";

export interface GreatEightData {
  id: number;
  orderIndex: number;
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  seeItUrl?: string | null;
  hearItUrl?: string | null;
  readItUrl?: string | null;
  iconUrl?: string | null;
  iconColor?: string | null;
  bgColor?: string | null;
  isActive?: boolean;
}

/**
 * Fallback rows (and the seed for GreatEightItem), derived from lib/greatEightManifest.ts so
 * titles, order and links have a single source.
 */
export const DEFAULT_GREAT_EIGHT: GreatEightData[] = GREAT_EIGHT_CARDS.map((card) => ({
  id: card.orderIndex,
  orderIndex: card.orderIndex,
  slug: card.slug,
  title: card.title,
  tagline: card.summary,
  description: card.viewpoint.join("\n\n"),
  seeItUrl: "",
  hearItUrl: card.audioUrl ?? "",
  readItUrl: card.articleUrl ?? "",
  iconUrl: card.iconUrl,
  iconColor: card.iconColor,
  bgColor: card.bgColor,
  isActive: true,
}));

/**
 * GET Handler: Returns list of Great Eight items from database with fallback.
 */
export async function GET() {
  try {
    const items = await prisma.greatEightItem.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    if (items && items.length > 0) {
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ success: true, items: DEFAULT_GREAT_EIGHT });
  } catch {
    // Return fallback items cleanly if database connection is offline or unmigrated
    return NextResponse.json({ success: true, items: DEFAULT_GREAT_EIGHT });
  }
}

/**
 * POST / PUT Handler: Updates or creates a Great Eight item (Admin authenticated).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin access required." },
        { status: 401 }
      );
    }

    const payload = await req.json();
    const {
      id,
      slug,
      orderIndex,
      title,
      tagline,
      description,
      readItUrl,
      seeItUrl,
      hearItUrl,
      iconUrl,
      iconColor,
      bgColor,
      isActive,
    } = payload;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const targetSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const updateData: Prisma.GreatEightItemUpdateInput = {
      title,
      slug: targetSlug,
    };
    if (orderIndex !== undefined) updateData.orderIndex = Number(orderIndex);
    if (tagline !== undefined) updateData.tagline = tagline;
    if (description !== undefined) updateData.description = description;
    if (readItUrl !== undefined) updateData.readItUrl = readItUrl;
    if (seeItUrl !== undefined) updateData.seeItUrl = seeItUrl;
    if (hearItUrl !== undefined) updateData.hearItUrl = hearItUrl;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (iconColor !== undefined) updateData.iconColor = iconColor;
    if (bgColor !== undefined) updateData.bgColor = bgColor;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    let savedItem;
    if (id) {
      savedItem = await prisma.greatEightItem.update({
        where: { id: Number(id) },
        data: updateData,
      });
    } else {
      savedItem = await prisma.greatEightItem.upsert({
        where: { slug: targetSlug },
        update: updateData,
        create: {
          title,
          slug: targetSlug,
          orderIndex: Number(orderIndex ?? 1),
          tagline: tagline ?? "",
          description: description ?? "",
          readItUrl: readItUrl ?? "",
          seeItUrl: seeItUrl ?? "",
          hearItUrl: hearItUrl ?? "",
          iconUrl: iconUrl ?? "",
          iconColor: iconColor ?? "#14a38b",
          bgColor: bgColor ?? "rgba(20, 163, 139, 0.08)",
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    }

    return NextResponse.json({ success: true, item: savedItem });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error && error.message) || "Failed to save Great Eight item" },
      { status: 500 }
    );
  }
}
