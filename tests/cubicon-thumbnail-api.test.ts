import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as thumbnailGet, isAllowedUrl } from "../app/api/cubicon/thumbnail/route";
import { getThumbnailUrl } from "../lib/cubicon/coordinateHelper";
import { GET as puzzleImagesGet } from "../app/api/cubicon/puzzle-images/route";

test("Cubicon Thumbnail API and Performance Optimization Test Suite", async (t) => {
  await t.test("1. isAllowedUrl security and SSRF protection", async () => {
    // Allowed relative paths
    assert.equal(isAllowedUrl("/cubicon-app/arts/Puzzle1.webp"), true);
    assert.equal(isAllowedUrl("/cubicon-app/cubicon_logo.png"), true);

    // Allowed S3 host
    assert.equal(
      isAllowedUrl("https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle1.webp"),
      true
    );
    assert.equal(isAllowedUrl("http://localhost:3000/some-image.png"), true);

    // Rejected hosts / protocols
    assert.equal(isAllowedUrl("https://malicious-site.com/exploit.png"), false);
    assert.equal(isAllowedUrl("http://169.254.169.254/latest/meta-data"), false);
    assert.equal(isAllowedUrl("ftp://s3.buyfacts.com/image.png"), false);
    assert.equal(isAllowedUrl("javascript:alert(1)"), false);
    assert.equal(isAllowedUrl(""), false);
    assert.equal(isAllowedUrl(null as any), false);
    assert.equal(isAllowedUrl(undefined as any), false);
  });

  await t.test("2. getThumbnailUrl helper formatting and edge cases", async () => {
    // Formats standard URL with width
    const formatted = getThumbnailUrl("https://s3.buyfacts.com/assets/img.webp", 160);
    assert.ok(formatted.startsWith("/api/cubicon/thumbnail?url="));
    assert.ok(formatted.includes("&w=160"));
    assert.ok(formatted.includes(encodeURIComponent("https://s3.buyfacts.com/assets/img.webp")));

    // Already thumbnail URL is preserved without double-wrapping
    const existing = "/api/cubicon/thumbnail?url=someUrl&w=160";
    assert.equal(getThumbnailUrl(existing), existing);

    // Empty or non-string input falls back safely
    assert.equal(getThumbnailUrl(""), "/cubicon-app/cubicon_logo.png");
    assert.equal(getThumbnailUrl(undefined as any), "/cubicon-app/cubicon_logo.png");
  });

  await t.test("3. Thumbnail API Validation: 400 on missing url and 403 on unauthorized domain", async () => {
    // Missing url
    const reqMissing = new NextRequest("http://localhost:3000/api/cubicon/thumbnail");
    const resMissing = await thumbnailGet(reqMissing);
    assert.equal(resMissing.status, 400);
    const dataMissing = await resMissing.json();
    assert.ok(dataMissing.error);

    // Unauthorized domain
    const reqForbidden = new NextRequest(
      "http://localhost:3000/api/cubicon/thumbnail?url=https://unauthorized-domain.com/hack.jpg"
    );
    const resForbidden = await thumbnailGet(reqForbidden);
    assert.equal(resForbidden.status, 403);
    const dataForbidden = await resForbidden.json();
    assert.ok(dataForbidden.error);
  });

  await t.test("4. Thumbnail API Local Asset Resizing and Caching (Cache MISS then HIT)", async () => {
    const testLocalUrl = "/cubicon-app/arts/Puzzle1.webp";
    const req = new NextRequest(
      `http://localhost:3000/api/cubicon/thumbnail?url=${encodeURIComponent(testLocalUrl)}&w=120&q=70`
    );

    // First request: Cache MISS or HIT depending on prior run
    const res1 = await thumbnailGet(req);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get("content-type"), "image/webp");
    assert.ok(res1.headers.get("cache-control")?.includes("max-age"));

    const buf1 = await res1.arrayBuffer();
    assert.ok(buf1.byteLength > 0);
    // 120px WebP thumbnail should be lightweight (typically under 10KB)
    assert.ok(buf1.byteLength < 30000, `Thumbnail should be compact, was ${buf1.byteLength} bytes`);

    // Second request: Cache HIT
    const res2 = await thumbnailGet(req);
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get("X-Thumbnail-Cache"), "HIT");
    assert.equal(res2.headers.get("content-type"), "image/webp");
  });

  await t.test("5. Puzzle Images API returns thumbnailUrl for every image", async () => {
    const req = new NextRequest("http://localhost:3000/api/cubicon/puzzle-images");
    const res = await puzzleImagesGet(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.images));
    assert.ok(data.images.length > 0);

    for (const img of data.images) {
      assert.ok(img.publicUrl, `Image ${img.id} must have publicUrl`);
      assert.ok(img.thumbnailUrl, `Image ${img.id} must have thumbnailUrl`);
      assert.ok(
        img.thumbnailUrl.startsWith("/api/cubicon/thumbnail?url="),
        `thumbnailUrl must route via thumbnail endpoint: ${img.thumbnailUrl}`
      );
    }
  });

  await t.test("6. Zero-Emoji Compliance across all Thumbnail and Picker Files", async () => {
    const filesToCheck = [
      path.resolve(__dirname, "../app/api/cubicon/thumbnail/route.ts"),
      path.resolve(__dirname, "../app/api/cubicon/puzzle-images/route.ts"),
      path.resolve(__dirname, "../components/CubiconCoordinatePicker.tsx"),
      path.resolve(__dirname, "../tests/cubicon-thumbnail-api.test.ts"),
    ];

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        assert.equal(
          emojiRegex.test(content),
          false,
          `File ${path.basename(file)} must not contain emojis`
        );
      }
    }
  });
});
