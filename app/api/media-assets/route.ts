import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET Handler: Fetches upload history from database
 */
export async function GET() {
  try {
    const assets = await prisma.mediaAsset.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 50, // Cap at latest 50 uploads
    });

    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    console.error("Failed to fetch media assets:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch assets" }, { status: 500 });
  }
}

/**
 * POST Handler: Saves a new uploaded asset's public URL and metadata to database
 */
export async function POST(req: NextRequest) {
  try {
    const { publicUrl, fileName, fileType, fileSize } = await req.json();

    if (!publicUrl || !fileName) {
      return NextResponse.json({ error: "Missing required parameters (publicUrl, fileName)" }, { status: 400 });
    }

    const newAsset = await prisma.mediaAsset.create({
      data: {
        publicUrl,
        fileName,
        fileType: fileType || "application/octet-stream",
        fileSize: Number(fileSize) || 0,
      },
    });

    return NextResponse.json({ success: true, asset: newAsset });
  } catch (error: any) {
    console.error("Failed to save media asset:", error);
    return NextResponse.json({ error: error.message || "Failed to save asset" }, { status: 500 });
  }
}

/**
 * DELETE Handler: Clears local history
 */
export async function DELETE() {
  try {
    await prisma.mediaAsset.deleteMany({});
    return NextResponse.json({ success: true, message: "History cleared successfully" });
  } catch (error: any) {
    console.error("Failed to clear media asset history:", error);
    return NextResponse.json({ error: error.message || "Failed to clear history" }, { status: 500 });
  }
}
