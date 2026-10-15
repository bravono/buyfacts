import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeFolderPrefix,
  generateObjectKey,
  getPublicUrl,
  STORAGE_FOLDERS,
  extractFolderFromKey,
  extractFilenameFromKey,
} from "../lib/minio";

describe("MinIO Folder Prefix Sanitization & Key Generation", () => {
  test("should normalize empty or whitespace prefix to 'uploads'", () => {
    assert.equal(sanitizeFolderPrefix(""), "uploads");
    assert.equal(sanitizeFolderPrefix("   "), "uploads");
    assert.equal(sanitizeFolderPrefix(undefined), "uploads");
    assert.equal(sanitizeFolderPrefix(null as any), "uploads");
  });

  test("should preserve valid single and nested folder prefixes", () => {
    assert.equal(sanitizeFolderPrefix("media"), "media");
    assert.equal(sanitizeFolderPrefix("cubicon/models"), "cubicon/models");
    assert.equal(sanitizeFolderPrefix("surveys/2026/q1"), "surveys/2026/q1");
    assert.equal(sanitizeFolderPrefix("products/specs"), "products/specs");
    assert.equal(sanitizeFolderPrefix("products-services"), "products-services");
    assert.equal(sanitizeFolderPrefix("research-imperatives"), "research-imperatives");
    assert.equal(sanitizeFolderPrefix("research-lib"), "research-lib");
    assert.equal(sanitizeFolderPrefix("triad"), "triad");
    assert.equal(sanitizeFolderPrefix("rule-of-three"), "rule-of-three");
  });

  test("should strip leading and trailing slashes and backslashes", () => {
    assert.equal(sanitizeFolderPrefix("/media/"), "media");
    assert.equal(sanitizeFolderPrefix("///cubicon/models///"), "cubicon/models");
    assert.equal(sanitizeFolderPrefix("\\surveys\\data\\"), "surveys/data");
  });

  test("should prevent path traversal attempts", () => {
    assert.equal(sanitizeFolderPrefix("../../../etc/passwd"), "etc/passwd");
    assert.equal(sanitizeFolderPrefix("media/../private/data"), "media/private/data");
    assert.equal(sanitizeFolderPrefix(".."), "uploads");
    assert.equal(sanitizeFolderPrefix("../.."), "uploads");
  });

  test("should sanitize illegal special characters in folder segments", () => {
    assert.equal(sanitizeFolderPrefix("my folder$name!/sub#dir"), "my_folder_name/sub_dir");
    assert.equal(sanitizeFolderPrefix("cool*folder?"), "cool_folder");
  });

  test("should generate unique object key under destination folder", () => {
    const key1 = generateObjectKey("chart.png", "media/reports");
    const key2 = generateObjectKey("chart.png", "media/reports");

    assert.ok(key1.startsWith("media/reports/"), "Key must start with destination folder prefix");
    assert.ok(key1.endsWith("-chart.png"), "Key must end with sanitized filename");
    assert.notEqual(key1, key2, "Two generated keys for same filename must be unique");
  });

  test("should sanitize object key filenames", () => {
    const key = generateObjectKey("my invalid & file (1).mp4", "cubicon");
    assert.ok(key.startsWith("cubicon/"), "Key must start with cubicon folder prefix");
    assert.ok(key.endsWith("-my_invalid_file_1_.mp4"), "Special characters in filename must be sanitized");
  });

  test("should format public URL with bucket and object key", () => {
    const objectKey = "cubicon/models/12345-abc-test.glb";
    const publicUrl = getPublicUrl(objectKey);

    assert.ok(publicUrl.includes("/" + objectKey), "Public URL must contain object key");
    assert.ok(publicUrl.startsWith("http"), "Public URL must be a valid HTTP/HTTPS endpoint");
  });

  test("should define all required system storage folders", () => {
    const expectedValues = [
      "products-services",
      "research-imperatives",
      "cubicon",
      "research-lib",
      "triad",
      "rule-of-three",
      "uploads",
    ];

    assert.equal(STORAGE_FOLDERS.length, 7);
    for (const val of expectedValues) {
      assert.ok(
        STORAGE_FOLDERS.some((f) => f.value === val),
        `STORAGE_FOLDERS must include ${val}`
      );
    }
  });

  test("should correctly extract folder and filename from object keys", () => {
    assert.equal(extractFolderFromKey("cubicon/1740000-abc-model.glb"), "cubicon");
    assert.equal(extractFolderFromKey("products-services/q1/1740000-xyz-spec.pdf"), "products-services/q1");
    assert.equal(extractFolderFromKey("singlefile.jpg"), "uploads");

    assert.equal(extractFilenameFromKey("cubicon/1740000-abc-model.glb"), "model.glb");
    assert.equal(extractFilenameFromKey("uploads/plain-file.png"), "plain-file.png");
  });
});

