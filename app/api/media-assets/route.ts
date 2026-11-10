import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

/**
 * GET Handler: Fetches upload history from database (Admin authorized).
 * Returns all MediaAsset records including objectKey and folder fields.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin access required." },
        { status: 401 }
      );
    }

    const assets = await prisma.mediaAsset.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    console.error("Failed to fetch media assets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

/**
 * POST Handler: Saves a new uploaded asset's metadata to the database.
 * Accepts objectKey and folder in addition to existing fields.
 * Uses upsert by objectKey when objectKey is provided, to avoid duplicates.
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

    const body = await req.json();

    const isBatch = Array.isArray(body.assets);
    const assetsToInsert = isBatch
      ? body.assets
      : [
          {
            publicUrl: body.publicUrl,
            fileName: body.fileName || body.filename,
            fileType: body.fileType || body.mimeType || "application/octet-stream",
            fileSize: Number(body.fileSize || body.size) || 0,
            objectKey: body.objectKey || null,
            folder: body.folder || null,
          },
        ];

    if (assetsToInsert.length === 0) {
      return NextResponse.json(
        { error: "Missing required asset parameters" },
        { status: 400 }
      );
    }

    const createdAssets = [];
    for (const item of assetsToInsert) {
      if (!item.publicUrl || !item.fileName) {
        continue;
      }

      const data = {
        publicUrl: item.publicUrl,
        fileName: item.fileName,
        fileType: item.fileType || "application/octet-stream",
        fileSize: Number(item.fileSize) || 0,
        objectKey: item.objectKey || null,
        folder: item.folder || null,
      };

      let asset;
      if (item.objectKey) {
        // Upsert by objectKey to avoid duplicates for the same MinIO object
        const existing = await prisma.mediaAsset.findFirst({
          where: { objectKey: item.objectKey },
        });
        if (existing) {
          asset = await prisma.mediaAsset.update({
            where: { id: existing.id },
            data,
          });
        } else {
          asset = await prisma.mediaAsset.create({ data });
        }
      } else {
        asset = await prisma.mediaAsset.create({ data });
      }

      createdAssets.push(asset);
    }

    if (!isBatch && createdAssets.length > 0) {
      return NextResponse.json({ success: true, asset: createdAssets[0], assets: createdAssets });
    }

    return NextResponse.json({
      success: true,
      count: createdAssets.length,
      assets: createdAssets,
    });
  } catch (error: any) {
    console.error("Failed to save media asset(s):", error);
    return NextResponse.json(
      { error: error.message || "Failed to save asset(s)" },
      { status: 500 }
    );
  }
}

/**
 * DELETE Handler: Removes a specific MediaAsset record by objectKey or id,
 * or clears all history when no body or filter is provided.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin access required." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body
    }

    if (body.objectKey) {
      await prisma.mediaAsset.deleteMany({
        where: { objectKey: body.objectKey },
      });
      return NextResponse.json({
        success: true,
        message: `Asset record for ${body.objectKey} deleted.`,
      });
    }

    if (body.id) {
      await prisma.mediaAsset.deleteMany({
        where: { id: body.id },
      });
      return NextResponse.json({
        success: true,
        message: `Asset record ${body.id} deleted.`,
      });
    }

    await prisma.mediaAsset.deleteMany({});
    return NextResponse.json({
      success: true,
      message: "History cleared successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete media asset record(s):", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete record(s)" },
      { status: 500 }
    );
  }
}
