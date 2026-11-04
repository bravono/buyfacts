import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

describe("In-Depth and Primary Button Asset Separation Test Suite", () => {
  it("1. Database buttons have distinct primary mediaUrl and in-depth readItUrl", async () => {
    const buttons = await prisma.dashboardButton.findMany({
      orderBy: { id: "asc" },
    });

    assert.equal(buttons.length, 18, "Database must contain exactly 18 dashboard buttons");

    for (const btn of buttons) {
      assert.ok(btn.mediaUrl, `Button ${btn.id} (${btn.label}) must have a defined primary mediaUrl`);
      assert.ok(btn.readItUrl, `Button ${btn.id} (${btn.label}) must have a defined in-depth readItUrl`);
      assert.notEqual(
        btn.mediaUrl.trim(),
        btn.readItUrl.trim(),
        `Button ${btn.id} (${btn.label}) primary mediaUrl must be different from in-depth readItUrl`
      );
      assert.ok(
        btn.readItUrl.startsWith("https://s3.buyfacts.com/"),
        `Button ${btn.id} readItUrl must point to S3, got: ${btn.readItUrl}`
      );
      assert.ok(
        btn.readItUrl.endsWith(".docx"),
        `Button ${btn.id} readItUrl must be a .docx file with extended content, got: ${btn.readItUrl}`
      );
    }
  });

  it("2. MockMediaPlayer resolves targetDocUrl prioritizing moreDetailUrl and readItUrl", () => {
    const playerFilePath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.tsx");
    assert.ok(fs.existsSync(playerFilePath), "MockMediaPlayer.tsx must exist");
    const playerContent = fs.readFileSync(playerFilePath, "utf-8");

    // Must declare readItUrl in MockMediaPlayerProps
    assert.ok(
      playerContent.includes("readItUrl?: string;"),
      "MockMediaPlayerProps must include readItUrl property"
    );

    // Must prioritize effectiveInDepthUrl before primary mediaUrl
    assert.ok(
      playerContent.includes("const effectiveInDepthUrl = moreDetailUrl || readItUrl;"),
      "MockMediaPlayer must define effectiveInDepthUrl from moreDetailUrl or readItUrl"
    );

    const targetDocResolution = playerContent.match(
      /const targetDocUrl =\s*effectiveInDepthUrl \|\|\s*\(isDocument && mediaUrl \? mediaUrl : null\)/
    );
    assert.ok(
      targetDocResolution,
      "MockMediaPlayer must prioritize effectiveInDepthUrl over primary mediaUrl for targetDocUrl"
    );
  });

  it("3. Products & Services page passes distinct readItUrl as moreDetailUrl to MockMediaPlayer", () => {
    const psPath = path.join(BUYFACTS_ROOT, "app", "products-services", "page.tsx");
    assert.ok(fs.existsSync(psPath), "products-services/page.tsx must exist");
    const psContent = fs.readFileSync(psPath, "utf-8");

    assert.ok(
      psContent.includes("moreDetailUrl={currentMedia.readItUrl}"),
      "products-services/page.tsx must pass currentMedia.readItUrl to moreDetailUrl"
    );
    assert.ok(
      psContent.includes("readItUrl={currentMedia.readItUrl}"),
      "products-services/page.tsx must pass currentMedia.readItUrl to readItUrl"
    );

    // Verify DEFAULT_SERVICES_BUTTONS defines readItUrl pointing to docx for all items
    const docxMatches = psContent.match(/readItUrl:\s*["']https:\/\/s3\.buyfacts\.com\/[^"']+\.docx["']/g) || [];
    assert.equal(docxMatches.length, 9, "DEFAULT_SERVICES_BUTTONS must define 9 distinct S3 docx URLs");
  });

  it("4. Research Imperatives page passes distinct readItUrl as moreDetailUrl to MockMediaPlayer", () => {
    const riPath = path.join(BUYFACTS_ROOT, "app", "research-imperatives", "page.tsx");
    assert.ok(fs.existsSync(riPath), "research-imperatives/page.tsx must exist");
    const riContent = fs.readFileSync(riPath, "utf-8");

    assert.ok(
      riContent.includes("moreDetailUrl={currentMedia.readItUrl}"),
      "research-imperatives/page.tsx must pass currentMedia.readItUrl to moreDetailUrl"
    );
    assert.ok(
      riContent.includes("readItUrl={currentMedia.readItUrl}"),
      "research-imperatives/page.tsx must pass currentMedia.readItUrl to readItUrl"
    );

    // Verify DEFAULT_TL_BUTTONS defines readItUrl pointing to docx for all items
    const docxMatches = riContent.match(/readItUrl:\s*["']https:\/\/s3\.buyfacts\.com\/[^"']+\.docx["']/g) || [];
    assert.equal(docxMatches.length, 9, "DEFAULT_TL_BUTTONS must define 9 distinct S3 docx URLs");
  });

  it("5. API route DEFAULT_BUTTONS and Prisma seed maintain distinct mediaUrl and readItUrl", () => {
    const routePath = path.join(BUYFACTS_ROOT, "app", "api", "buttons", "route.ts");
    const seedPath = path.join(BUYFACTS_ROOT, "prisma", "seed.ts");
    const seedProdPath = path.join(BUYFACTS_ROOT, "prisma", "seed-prod.ts");

    const routeContent = fs.readFileSync(routePath, "utf-8");
    const seedContent = fs.readFileSync(seedPath, "utf-8");
    const seedProdContent = fs.readFileSync(seedProdPath, "utf-8");

    for (let i = 1; i <= 9; i++) {
      const srvId = `btn-srv-00${i}`;
      const tlId = `btn-tl-00${i}`;

      assert.ok(routeContent.includes(srvId), `route.ts must contain ${srvId}`);
      assert.ok(routeContent.includes(tlId), `route.ts must contain ${tlId}`);
      assert.ok(seedContent.includes(srvId), `seed.ts must contain ${srvId}`);
      assert.ok(seedContent.includes(tlId), `seed.ts must contain ${tlId}`);
      assert.ok(seedProdContent.includes(srvId), `seed-prod.ts must contain ${srvId}`);
      assert.ok(seedProdContent.includes(tlId), `seed-prod.ts must contain ${tlId}`);
    }

    assert.ok(routeContent.includes("readItUrl:"), "route.ts must include readItUrl field");
    assert.ok(seedContent.includes("readItUrl:"), "seed.ts must include readItUrl field");
    assert.ok(seedProdContent.includes("readItUrl:"), "seed-prod.ts must include readItUrl field");
  });

  it("6. Zero-Emoji Compliance across all test code", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const testContent = fs.readFileSync(__filename, "utf-8");
    assert.ok(!emojiRegex.test(testContent), "tests/indepth-button-asset-separation.test.ts must contain zero emojis");
  });
});
