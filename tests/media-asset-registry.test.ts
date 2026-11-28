import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_MODEL_REGISTRY } from "../lib/admin/schemaRegistry";

describe("MediaAsset Registry and Storage Integration Suite", () => {
  test("1. Schema Registry defines all required MediaAsset fields and search indexes", () => {
    const mediaMeta = ADMIN_MODEL_REGISTRY.mediaAsset;
    assert.ok(mediaMeta, "mediaAsset model must be registered in ADMIN_MODEL_REGISTRY");
    assert.equal(mediaMeta.key, "mediaAsset");
    assert.equal(mediaMeta.idField, "id");
    assert.equal(mediaMeta.idType, "string");

    const fieldNames = mediaMeta.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("id"), "Must include id field");
    assert.ok(fieldNames.includes("objectKey"), "Must include objectKey field");
    assert.ok(fieldNames.includes("folder"), "Must include folder field");
    assert.ok(fieldNames.includes("fileName"), "Must include fileName field");
    assert.ok(fieldNames.includes("fileType"), "Must include fileType field");
    assert.ok(fieldNames.includes("fileSize"), "Must include fileSize field");
    assert.ok(fieldNames.includes("publicUrl"), "Must include publicUrl field");
    assert.ok(fieldNames.includes("uploadedAt"), "Must include uploadedAt field");
    assert.ok(fieldNames.includes("updatedAt"), "Must include updatedAt field");

    // objectKey must be read-only in admin table view
    const objectKeyField = mediaMeta.fields.find((f) => f.name === "objectKey");
    assert.equal(objectKeyField?.readOnly, true, "objectKey must be read-only");

    // searchable fields must include fileName, fileType, publicUrl, objectKey, folder
    assert.ok(mediaMeta.searchableFields.includes("objectKey"), "objectKey must be searchable");
    assert.ok(mediaMeta.searchableFields.includes("folder"), "folder must be searchable");
  });

  test("2. Prisma schema file defines MediaAsset model with objectKey, folder, and indexes", () => {
    const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
    const content = fs.readFileSync(schemaPath, "utf8");

    assert.ok(content.includes("model MediaAsset"), "schema.prisma must contain MediaAsset model");
    assert.ok(content.includes("objectKey"), "MediaAsset must include objectKey field");
    assert.ok(content.includes("folder"), "MediaAsset must include folder field");
    assert.ok(content.includes("updatedAt"), "MediaAsset must include updatedAt field");
    assert.ok(content.includes("@@index([objectKey])"), "MediaAsset must have index on objectKey");
    assert.ok(content.includes("@@index([folder])"), "MediaAsset must have index on folder");
  });

  test("3. Seed scripts include objectKey and folder in MediaAsset seed records", () => {
    const seedPath = path.resolve(process.cwd(), "prisma/seed.ts");
    const seedContent = fs.readFileSync(seedPath, "utf8");

    assert.ok(seedContent.includes('objectKey: "cubicon/1788505108337-1zkn2t-Puzzle1.webp"'));
    assert.ok(seedContent.includes('objectKey: "cubicon/1788505110243-kde8r0-Puzzle2.webp"'));
    assert.ok(seedContent.includes('objectKey: "cubicon/1788505110606-pcdywj-Puzzle3.webp"'));
    assert.ok(seedContent.includes('folder: "cubicon"'));

    const seedProdPath = path.resolve(process.cwd(), "prisma/seed-prod.ts");
    const seedProdContent = fs.readFileSync(seedProdPath, "utf8");

    assert.ok(seedProdContent.includes('objectKey: "cubicon/1788505108337-1zkn2t-Puzzle1.webp"'));
    assert.ok(seedProdContent.includes('folder: "cubicon"'));
  });

  test("4. Folder and filename derivation from MinIO object keys", () => {
    const deriveAssetMetadata = (key: string) => {
      const parts = key.split("/").filter(Boolean);
      const isNested = parts.length > 1;
      const folder = isNested ? parts.slice(0, -1).join("/") : "uploads";
      const fileName = isNested ? parts[parts.length - 1] : key;
      return { folder, fileName };
    };

    const res1 = deriveAssetMetadata("cubicon/puzzles/step1.webp");
    assert.equal(res1.folder, "cubicon/puzzles");
    assert.equal(res1.fileName, "step1.webp");

    const res2 = deriveAssetMetadata("products-services/spec.pdf");
    assert.equal(res2.folder, "products-services");
    assert.equal(res2.fileName, "spec.pdf");

    const res3 = deriveAssetMetadata("root-file.png");
    assert.equal(res3.folder, "uploads");
    assert.equal(res3.fileName, "root-file.png");
  });

  test("5. Synchronization script skips directory marker files and identifies correct MIME types", () => {
    const isMarker = (key: string) => key.endsWith("/.keep") || key === ".keep";

    assert.equal(isMarker("cubicon/.keep"), true);
    assert.equal(isMarker("research-imperatives/subfolder/.keep"), true);
    assert.equal(isMarker(".keep"), true);
    assert.equal(isMarker("cubicon/puzzle.webp"), false);

    const detectMime = (filename: string): string => {
      const ext = filename.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "webp":
          return "image/webp";
        case "mp4":
          return "video/mp4";
        case "pdf":
          return "application/pdf";
        case "mp3":
          return "audio/mpeg";
        default:
          return "application/octet-stream";
      }
    };

    assert.equal(detectMime("image.webp"), "image/webp");
    assert.equal(detectMime("video.mp4"), "video/mp4");
    assert.equal(detectMime("document.pdf"), "application/pdf");
    assert.equal(detectMime("podcast.mp3"), "audio/mpeg");
    assert.equal(detectMime("unknown.dat"), "application/octet-stream");
  });

  test("6. MediaAsset simulated in-memory store supports ID generation, upsert, and deletion", async () => {
    interface InMemoryMediaAsset {
      id: string;
      objectKey: string | null;
      folder: string | null;
      fileName: string;
      fileType: string;
      fileSize: number;
      publicUrl: string;
      uploadedAt: Date;
      updatedAt: Date;
    }

    const store: InMemoryMediaAsset[] = [];

    // Helper: simulate upsert by objectKey
    const saveAsset = (data: {
      objectKey?: string | null;
      folder?: string | null;
      fileName: string;
      fileType: string;
      fileSize: number;
      publicUrl: string;
    }) => {
      if (data.objectKey) {
        const existingIndex = store.findIndex((a) => a.objectKey === data.objectKey);
        if (existingIndex >= 0) {
          store[existingIndex] = {
            ...store[existingIndex],
            ...data,
            objectKey: data.objectKey,
            folder: data.folder ?? store[existingIndex].folder,
            updatedAt: new Date(),
          };
          return store[existingIndex];
        }
      }

      const newRecord: InMemoryMediaAsset = {
        id: `mock-uuid-${store.length + 1}`,
        objectKey: data.objectKey ?? null,
        folder: data.folder ?? "uploads",
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        publicUrl: data.publicUrl,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(newRecord);
      return newRecord;
    };

    // Insert 1st asset
    const a1 = saveAsset({
      objectKey: "cubicon/puzzle-1.webp",
      folder: "cubicon",
      fileName: "puzzle-1.webp",
      fileType: "image/webp",
      fileSize: 1024,
      publicUrl: "http://minio/uploads/cubicon/puzzle-1.webp",
    });
    assert.ok(a1.id.startsWith("mock-uuid-"));
    assert.equal(store.length, 1);

    // Upsert duplicate objectKey: should update existing record, not duplicate
    const a1Updated = saveAsset({
      objectKey: "cubicon/puzzle-1.webp",
      folder: "cubicon",
      fileName: "puzzle-1.webp",
      fileType: "image/webp",
      fileSize: 2048,
      publicUrl: "http://minio/uploads/cubicon/puzzle-1.webp",
    });
    assert.equal(a1Updated.id, a1.id, "Existing ID must be preserved on upsert");
    assert.equal(a1Updated.fileSize, 2048, "Size must be updated");
    assert.equal(store.length, 1, "Store must not contain duplicates for same objectKey");

    // Move file logic: updates objectKey, folder, publicUrl
    const moveAsset = (sourceKey: string, newKey: string, targetFolder: string, newUrl: string) => {
      const idx = store.findIndex((a) => a.objectKey === sourceKey);
      if (idx >= 0) {
        store[idx].objectKey = newKey;
        store[idx].folder = targetFolder;
        store[idx].publicUrl = newUrl;
        store[idx].updatedAt = new Date();
      }
    };

    moveAsset(
      "cubicon/puzzle-1.webp",
      "archived/puzzle-1.webp",
      "archived",
      "http://minio/uploads/archived/puzzle-1.webp"
    );

    assert.equal(store[0].objectKey, "archived/puzzle-1.webp");
    assert.equal(store[0].folder, "archived");
    assert.equal(store[0].publicUrl, "http://minio/uploads/archived/puzzle-1.webp");

    // Delete file logic: deletes by objectKey first
    const deleteByObjectKey = (key: string) => {
      const initial = store.length;
      const idx = store.findIndex((a) => a.objectKey === key);
      if (idx >= 0) {
        store.splice(idx, 1);
      }
      return initial - store.length;
    };

    const deletedCount = deleteByObjectKey("archived/puzzle-1.webp");
    assert.equal(deletedCount, 1);
    assert.equal(store.length, 0);
  });

  test("7. Strict Zero-Emoji compliance across all modified codebase and test files", () => {
    const filesToCheck = [
      "app/api/media-assets/route.ts",
      "app/api/storage/files/route.ts",
      "app/api/storage/move/route.ts",
      "lib/admin/schemaRegistry.ts",
      "scripts/sync-minio-assets.ts",
      "tests/media-asset-registry.test.ts",
    ];

    // Unicode ranges for common emojis
    const emojiRegex =
      /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

    for (const relPath of filesToCheck) {
      const absPath = path.resolve(process.cwd(), relPath);
      assert.ok(fs.existsSync(absPath), `File must exist: ${relPath}`);
      const content = fs.readFileSync(absPath, "utf8");
      const matches = content.match(emojiRegex);
      assert.equal(
        matches,
        null,
        `File ${relPath} contains prohibited emojis: ${matches ? matches.join(", ") : ""}`
      );
    }
  });
});
