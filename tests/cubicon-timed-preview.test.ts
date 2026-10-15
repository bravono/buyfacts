import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");
const CUBICON_ROOT = path.resolve(BUYFACTS_ROOT, "..", "cubicon");

test("Cubicon 1-Minute Video Preview and Interactive Player Suite", async (t) => {
  await t.test("1. 1-Minute Preview Duration Disclosure & Direct START Action (Section 7.1 & 7.2)", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/cubicon/page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Must clearly state the duration before beginning
    assert.ok(
      content.includes("1-MINUTE PREVIEW") || content.includes("1-Minute Preview"),
      "Cubicon page must display 1-minute duration badge before preview starts"
    );
    assert.ok(
      content.includes("handleStartVideoClick"),
      "START button must initiate video playback directly"
    );
    assert.ok(
      content.includes("handleSeeLiveClick") && content.includes("See It Live!"),
      "Must provide secondary See It Live button to jump directly to 3D solver"
    );
  });

  await t.test("2. Three Approved Demonstration Puzzle Slides (Section 7.2)", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // State 1: Spatial Orientation
    assert.ok(
      content.includes("Spatial Orientation") && content.includes("concerned by howling"),
      "Must include State 1 (Spatial Orientation)"
    );

    // State 2: Multi-Angle Alignment
    assert.ok(
      content.includes("Multi-Angle Alignment") && content.includes("change of shirt"),
      "Must include State 2 (Multi-Angle Alignment)"
    );

    // State 3: 3D Object Verification
    assert.ok(
      content.includes("3D Object Verification") && content.includes("Where does his next go"),
      "Must include State 3 (3D Object Verification)"
    );
  });

  await t.test("3. Video Player Controls: Skip, Reload, Cancel, Completion (Section 7.2)", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // HTML5 Video element with direct autoPlay and controls
    assert.ok(
      content.includes("<video") && content.includes("autoPlay") && content.includes("controls"),
      "Must render native video element with autoplay and controls"
    );

    // Skip video button
    assert.ok(
      content.includes("Skip Video") && content.includes("setIsVideoCompleted(true)"),
      "Must provide Skip Video control advancing to completion overlay"
    );

    // Reload video button
    assert.ok(
      content.includes("Reload Video"),
      "Must provide Reload Video control"
    );

    // Cancel / Return to Preview button (Section 7.2.06)
    assert.ok(
      content.includes("handleCancelVideo") && content.includes("Back to Preview"),
      "Must provide Cancel control returning to preview introduction without losing state"
    );

    // Completion overlay with Try It Yourself / See It Live button
    assert.ok(
      content.includes("TRY IT YOURSELF NOW") && content.includes("handleSeeLiveClick"),
      "Must provide TRY IT YOURSELF NOW button on video completion launching the 3D solver"
    );
  });

  await t.test("4. Embedded Local Asset Fallbacks in public/cubicon-app", () => {
    const artsDir = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "arts");
    assert.ok(fs.existsSync(artsDir), "public/cubicon-app/arts must exist");

    const requiredAssets = [
      "ballon.webp",
      "Puzzle1_explainer.webp",
      "Puzzle2_explainer.webp",
      "Puzzle3_explainer.webp",
    ];

    for (const asset of requiredAssets) {
      const assetPath = path.join(artsDir, asset);
      assert.ok(
        fs.existsSync(assetPath),
        `Embedded arts must contain fallback asset: ${asset}`
      );
    }
  });

  await t.test("5. Image onError Local Fallback in Host page.tsx", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.ok(
      content.includes("SLIDE_FALLBACK_IMAGES"),
      "page.tsx must define SLIDE_FALLBACK_IMAGES for graceful CDN fallback"
    );
    assert.ok(
      content.includes("onError="),
      "Slide images must register onError fallback handlers"
    );
  });

  await t.test("6. Standalone Cubicon Scope Parity (No Slideshow in Standalone)", () => {
    const cubiconPath = path.join(CUBICON_ROOT, "src", "Cubicon.jsx");
    const content = fs.readFileSync(cubiconPath, "utf-8");

    // Standalone welcome card must have a direct Start button without slideshow
    assert.ok(
      content.includes("Start"),
      "Cubicon.jsx must provide Start button on welcome screen"
    );
    assert.ok(
      !content.includes("<TimedPreview"),
      "Standalone Cubicon.jsx must not render TimedPreview slideshow"
    );
  });

  await t.test("7. Zero-Emoji Compliance across Modified Source Files", () => {
    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "cubicon", "cubicon.module.css"),
      path.join(CUBICON_ROOT, "src", "Cubicon.jsx"),
    ];

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, "utf-8");
        assert.equal(
          text.match(emojiRegex),
          null,
          `File ${filePath} must not contain emojis`
        );
      }
    }
  });
});
