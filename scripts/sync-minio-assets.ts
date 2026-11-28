/**
 * Sync script: populates MediaAsset records for all existing MinIO bucket objects.
 *
 * It loads .env.local first (which points to https://s3.buyfacts.com),
 * connects to MinIO storage, and populates or updates MediaAsset table rows
 * with complete objectKey, folder, fileName, fileType, fileSize, and publicUrl.
 *
 * Run with: npx tsx scripts/sync-minio-assets.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { listMinioObjects } from "../lib/minio";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

export function detectFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "json":
      return "application/json";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

async function main() {
  console.log("Starting full MinIO bucket synchronization...");
  console.log("MinIO Endpoint:", process.env.MINIO_ENDPOINT || "https://s3.buyfacts.com");
  console.log("MinIO Bucket:", process.env.MINIO_BUCKET || "buyfacts-public-assets");

  const objects = await listMinioObjects();
  console.log(`Discovered ${objects.length} total objects in MinIO bucket.\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const obj of objects) {
    // Skip empty folder placeholder markers
    if (obj.objectKey.endsWith("/.keep") || obj.objectKey === ".keep") {
      skipped++;
      continue;
    }

    const objectKey = obj.objectKey;
    const folder = obj.folder || (objectKey.includes("/") ? objectKey.split("/").slice(0, -1).join("/") : "uploads");
    const fileName = obj.fileName || objectKey.split("/").pop() || "unknown";
    const fileType = detectFileType(fileName);
    const fileSize = obj.size || 0;
    const publicUrl = obj.publicUrl;

    try {
      const existing = await prisma.mediaAsset.findFirst({
        where: {
          OR: [
            { objectKey },
            { publicUrl },
          ],
        },
      });

      if (existing) {
        // Update existing record to guarantee all columns are populated with exact values
        await prisma.mediaAsset.update({
          where: { id: existing.id },
          data: {
            objectKey,
            folder,
            fileName,
            fileType,
            fileSize: fileSize || existing.fileSize,
            publicUrl,
          },
        });
        updated++;
      } else {
        await prisma.mediaAsset.create({
          data: {
            objectKey,
            folder,
            fileName,
            fileType,
            fileSize,
            publicUrl,
          },
        });
        inserted++;
      }
    } catch (err: any) {
      errors++;
      console.error(`  [ERROR] Failed to process ${objectKey}:`, err.message);
    }
  }

  console.log(`Synchronization complete:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);

  const totalInDb = await prisma.mediaAsset.count();
  console.log(`\nTotal MediaAsset rows in database now: ${totalInDb}`);

  const byFolder = await prisma.mediaAsset.groupBy({
    by: ["folder"],
    _count: { id: true },
  });
  console.log("Assets breakdown by folder:");
  for (const item of byFolder) {
    console.log(`  ${item.folder || "root"}: ${item._count.id} files`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Synchronization script encountered fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
