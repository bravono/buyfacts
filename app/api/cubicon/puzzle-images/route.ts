import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

export interface PuzzleCdnImage {
  id: string;
  name: string;
  fileName: string;
  objectKey: string;
  publicUrl: string;
  thumbnailUrl?: string;
  format: string;
  size?: number;
}

/**
 * Resilient static catalog of verified CDN puzzle assets hosted at s3.buyfacts.com.
 * Provides instant zero-latency loading and serves as a reliable fallback if S3
 * credentials or remote connections experience transient disruption.
 */
export const VERIFIED_CDN_PUZZLE_IMAGES: PuzzleCdnImage[] = [
  {
    id: "puzzle-alice-wonderland-webp",
    name: "Alice In Wonderland",
    fileName: "Alice_In_Wonderland_Colored.webp",
    objectKey: "cubicon/Puzzle/1792082419103-hp8641-Alice_In_Wonderland_Colored.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082419103-hp8641-Alice_In_Wonderland_Colored.webp",
    format: "webp",
    size: 1844442,
  },
  {
    id: "puzzle-benjamin-franklin-webp",
    name: "Benjamin Franklin",
    fileName: "Benjamin_Franklin_Color.webp",
    objectKey: "cubicon/Puzzle/1792082419479-0sm0h3-Benjamin_Franklin_Color.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082419479-0sm0h3-Benjamin_Franklin_Color.webp",
    format: "webp",
    size: 2651254,
  },
  {
    id: "puzzle-beverly-hillbillies-webp",
    name: "Beverly Hillbillies",
    fileName: "Beverly_Hillbillies_Colored.webp",
    objectKey: "cubicon/Puzzle/1792082420168-v0qr3q-Beverly_Hillbillies_Colored.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082420168-v0qr3q-Beverly_Hillbillies_Colored.webp",
    format: "webp",
    size: 829898,
  },
  {
    id: "puzzle-grand-central-station-webp",
    name: "Grand Central Station",
    fileName: "WOW_Grand_Central_Station_Color_No_Text.webp",
    objectKey: "cubicon/Puzzle/1792082428358-lf20q4-WOW_Grand_Central_Station_Color_No_Text.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082428358-lf20q4-WOW_Grand_Central_Station_Color_No_Text.webp",
    format: "webp",
    size: 1483648,
  },
  {
    id: "puzzle-great-pyramids-webp",
    name: "Great Pyramids",
    fileName: "WOW_Great_Pyramids_Illustration_Color.webp",
    objectKey: "cubicon/Puzzle/1792082435451-y5oisv-WOW_Great_Pyramids_Illustration_Color.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082435451-y5oisv-WOW_Great_Pyramids_Illustration_Color.webp",
    format: "webp",
    size: 2654212,
  },
  {
    id: "puzzle-lost-city-atlantis-webp",
    name: "Lost City of Atlantis",
    fileName: "WOW_Lost_City_of_Atlantis_Color-2.webp",
    objectKey: "cubicon/Puzzle/1792082442162-6yjqpe-WOW_Lost_City_of_Atlantis_Color-2.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082442162-6yjqpe-WOW_Lost_City_of_Atlantis_Color-2.webp",
    format: "webp",
    size: 199850,
  },
  {
    id: "puzzle-moonbows-rainbows-webp",
    name: "Moonbows and Rainbows",
    fileName: "WOW_Moonbows_and_Rainbows_Color_All.webp",
    objectKey: "cubicon/Puzzle/1792082442527-mqu7ea-WOW_Moonbows_and_Rainbows_Color_All.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082442527-mqu7ea-WOW_Moonbows_and_Rainbows_Color_All.webp",
    format: "webp",
    size: 425496,
  },
  {
    id: "puzzle-alice-cooper-webp",
    name: "Alice Cooper (People)",
    fileName: "WOW_People_Alice_Cooper_Color.webp",
    objectKey: "cubicon/Puzzle/1792082447166-7ujbit-WOW_People_Alice_Cooper_Color.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082447166-7ujbit-WOW_People_Alice_Cooper_Color.webp",
    format: "webp",
    size: 1823522,
  },
  {
    id: "puzzle-cheech-marin-webp",
    name: "Cheech Marin (People)",
    fileName: "WOW_People_Cheech_Marin_Color.webp",
    objectKey: "cubicon/Puzzle/1792082449182-e0iov1-WOW_People_Cheech_Marin_Color.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082449182-e0iov1-WOW_People_Cheech_Marin_Color.webp",
    format: "webp",
    size: 2763236,
  },
  {
    id: "puzzle-bermuda-triangle-webp",
    name: "Bermuda Triangle (Things)",
    fileName: "WOW_Things_BermudaTriangle_Color.webp",
    objectKey: "cubicon/Puzzle/1792082472298-9m556g-WOW_Things_BermudaTriangle_Color.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082472298-9m556g-WOW_Things_BermudaTriangle_Color.webp",
    format: "webp",
    size: 483414,
  },
  {
    id: "puzzle-wojtek-bear-png",
    name: "Wonder of Weird Wojtek",
    fileName: "Wonder_of_Weird_Portrait_Wojtek_Colored_No_Text.png",
    objectKey: "cubicon/Puzzle/1792080399584-ex3q6o-Wonder_of_Weird_Portrait_Wojtek_Colored_No_Text.png",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792080399584-ex3q6o-Wonder_of_Weird_Portrait_Wojtek_Colored_No_Text.png",
    format: "png",
    size: 71030766,
  },
  {
    id: "puzzle-festival-of-colors-png",
    name: "Festival of Colors",
    fileName: "WOW_Festival_of_Colors_Color.png",
    objectKey: "cubicon/Puzzle/1792080548227-7e4hx6-WOW_Festival_of_Colors_Color.png",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792080548227-7e4hx6-WOW_Festival_of_Colors_Color.png",
    format: "png",
    size: 15126354,
  },
  {
    id: "puzzle-volkswagen-beetle-png",
    name: "Volkswagen Beetle",
    fileName: "WOW_VolkswagenBeetle_Color_All.png",
    objectKey: "cubicon/Puzzle/1792080978126-8f8epp-WOW_VolkswagenBeetle_Color_All.png",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792080978126-8f8epp-WOW_VolkswagenBeetle_Color_All.png",
    format: "png",
    size: 30295064,
  },
  {
    id: "puzzle-classic-wolf-webp",
    name: "Classic Puzzle 1 (Wolf / Howling)",
    fileName: "Puzzle1.webp",
    objectKey: "cubicon/1788505108337-1zkn2t-Puzzle1.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
    format: "webp",
    size: 1048576,
  },
  {
    id: "puzzle-classic-characters-webp",
    name: "Classic Puzzle 2 (Characters)",
    fileName: "Puzzle2.webp",
    objectKey: "cubicon/1788505110243-kde8r0-Puzzle2.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
    format: "webp",
    size: 5242880,
  },
  {
    id: "puzzle-classic-anticipation-webp",
    name: "Classic Puzzle 3 (Anticipation Path)",
    fileName: "Puzzle3.webp",
    objectKey: "cubicon/1788505110606-pcdywj-Puzzle3.webp",
    publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
    format: "webp",
    size: 2097152,
  },
];

/**
 * Derives a clean human-friendly name from an object key or filename
 */
export function formatFriendlyPuzzleName(rawKey: string): string {
  const filename = rawKey.split("/").pop() || rawKey;
  // Remove timestamp prefix e.g. 1792082419103-hp8641-
  const withoutPrefix = filename.replace(/^\d+-[a-z0-9]+-/, "");
  // Remove file extension
  const withoutExt = withoutPrefix.replace(/\.[a-zA-Z0-9]+$/, "");
  // Replace underscores and dashes with spaces
  const withSpaces = withoutExt
    .replace(/^WOW_/, "")
    .replace(/^cubicon_/, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim();

  return withSpaces || filename;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const formatFilter = (searchParams.get("format") || "all").toLowerCase().trim();

    // Map by publicUrl to deduplicate entries
    const imageMap = new Map<string, PuzzleCdnImage>();

    // 1. Populate with verified baseline CDN assets
    for (const item of VERIFIED_CDN_PUZZLE_IMAGES) {
      imageMap.set(item.publicUrl, item);
    }

    // 2. Fetch live objects from S3/MinIO bucket under cubicon/Puzzle/
    try {
      const endpoint = process.env.S3_ENDPOINT || "https://s3.buyfacts.com";
      const accessKeyId = process.env.MINIO_ACCESS_KEY || "minioadmin";
      const secretAccessKey = process.env.MINIO_SECRET_KEY || "tcaF2328";
      const bucket = process.env.MINIO_BUCKET || "buyfacts-public-assets";

      const s3 = new S3Client({
        endpoint,
        region: process.env.MINIO_REGION || "us-east-1",
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });

      // Query both uppercase and lowercase prefixes for compatibility
      const prefixes = ["cubicon/Puzzle/", "cubicon/puzzle/"];
      for (const prefix of prefixes) {
        try {
          const listCmd = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
          });
          const res = await s3.send(listCmd);
          if (res.Contents && res.Contents.length > 0) {
            for (const obj of res.Contents) {
              if (!obj.Key || obj.Key.endsWith("/") || obj.Key.endsWith(".keep")) continue;
              const ext = obj.Key.split(".").pop()?.toLowerCase() || "webp";
              if (!["webp", "png", "jpg", "jpeg", "svg"].includes(ext)) continue;

              const publicUrl = `https://s3.buyfacts.com/${bucket}/${obj.Key}`;
              const friendlyName = formatFriendlyPuzzleName(obj.Key);

              imageMap.set(publicUrl, {
                id: `s3-${obj.Key.replace(/[^a-zA-Z0-9]/g, "-")}`,
                name: friendlyName,
                fileName: obj.Key.split("/").pop() || obj.Key,
                objectKey: obj.Key,
                publicUrl,
                format: ext,
                size: obj.Size || 0,
              });
            }
          }
        } catch (prefixErr) {
          // Gracefully continue to next prefix
        }
      }
    } catch (s3Err) {
      console.warn("[Puzzle Images API] Live S3 scan notice:", s3Err);
    }

    // 3. Query Prisma MediaAsset table for any matching entries
    try {
      const dbAssets = await prisma.mediaAsset.findMany({
        where: {
          OR: [
            { publicUrl: { contains: "cubicon/Puzzle" } },
            { publicUrl: { contains: "cubicon/puzzle" } },
            { publicUrl: { contains: "Puzzle" } },
            { fileName: { contains: "Puzzle" } },
          ],
        },
        take: 100,
      });

      for (const asset of dbAssets) {
        if (!asset.publicUrl) continue;
        const ext = asset.publicUrl.split(".").pop()?.toLowerCase() || "webp";
        if (!["webp", "png", "jpg", "jpeg", "svg"].includes(ext)) continue;

        if (!imageMap.has(asset.publicUrl)) {
          imageMap.set(asset.publicUrl, {
            id: `db-${asset.id}`,
            name: formatFriendlyPuzzleName(asset.fileName || asset.publicUrl),
            fileName: asset.fileName || "puzzle-image",
            objectKey: asset.publicUrl.replace(/^https?:\/\/[^\/]+\/[^\/]+\//, ""),
            publicUrl: asset.publicUrl,
            format: ext,
            size: asset.fileSize || 0,
          });
        }
      }
    } catch (dbErr) {
      console.warn("[Puzzle Images API] DB scan notice:", dbErr);
    }

    // Convert map to array and apply filters
    let images = Array.from(imageMap.values());

    if (query) {
      images = images.filter(
        (img) =>
          img.name.toLowerCase().includes(query) ||
          img.fileName.toLowerCase().includes(query) ||
          img.objectKey.toLowerCase().includes(query)
      );
    }

    if (formatFilter && formatFilter !== "all") {
      images = images.filter((img) => img.format.toLowerCase() === formatFilter);
    }

    // Sort order: WebP images first (optimized for 3D load speed), then alphabetical
    images.sort((a, b) => {
      if (a.format === "webp" && b.format !== "webp") return -1;
      if (a.format !== "webp" && b.format === "webp") return 1;
      return a.name.localeCompare(b.name);
    });

    // Populate lightweight 160px WebP thumbnail URLs for responsive gallery rendering
    const imagesWithThumbnails = images.map((img) => ({
      ...img,
      thumbnailUrl:
        img.thumbnailUrl ||
        `/api/cubicon/thumbnail?url=${encodeURIComponent(img.publicUrl)}&w=160`,
    }));

    return NextResponse.json({
      success: true,
      count: imagesWithThumbnails.length,
      images: imagesWithThumbnails,
    });
  } catch (error: any) {
    console.error("[Puzzle Images API] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load puzzle images",
        images: VERIFIED_CDN_PUZZLE_IMAGES,
      },
      { status: 500 }
    );
  }
}
