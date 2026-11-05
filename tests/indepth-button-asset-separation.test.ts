import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

describe("In-Depth and Primary Button Asset Separation Test Suite", () => {
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

  it("3. Pages pass readItUrl from the database as moreDetailUrl to MockMediaPlayer", () => {
    for (const rel of [["app", "products-services", "page.tsx"], ["app", "research-imperatives", "page.tsx"]]) {
      const content = fs.readFileSync(path.join(BUYFACTS_ROOT, ...rel), "utf-8");
      assert.ok(content.includes("moreDetailUrl={currentMedia?.readItUrl}"), `${rel.join("/")} must pass moreDetailUrl`);
      assert.ok(content.includes("readItUrl={currentMedia?.readItUrl}"), `${rel.join("/")} must pass readItUrl`);
    }
  });

  it("6. Zero-Emoji Compliance across all test code", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const testContent = fs.readFileSync(__filename, "utf-8");
    assert.ok(!emojiRegex.test(testContent), "tests/indepth-button-asset-separation.test.ts must contain zero emojis");
  });
});
