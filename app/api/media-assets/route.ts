import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

/**
 * GET Handler: Fetches upload history from database (Admin authorized)
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
      take: 50, // Cap at latest 50 uploads
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
 * POST Handler: Saves a new uploaded asset's public URL and metadata to database
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
      const asset = await prisma.mediaAsset.create({
        data: {
          publicUrl: item.publicUrl,
          fileName: item.fileName,
          fileType: item.fileType || "application/octet-stream",
          fileSize: Number(item.fileSize) || 0,
        },
      });
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
 * DELETE Handler: Clears local history
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

    await prisma.mediaAsset.deleteMany({});
    return NextResponse.json({
      success: true,
      message: "History cleared successfully",
    });
  } catch (error: any) {
    console.error("Failed to clear media asset history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clear history" },
      { status: 500 }
    );
  }
}
