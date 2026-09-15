import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");
const CUBICON_ROOT = path.resolve(BUYFACTS_ROOT, "..", "cubicon");

test("Cubicon 1-Minute Timed Preview and Interactive Player Suite (Item 5)", async (t) => {
  await t.test("1. 1-Minute Duration Disclosure (Section 7.1)", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/cubicon/page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Must clearly state the duration before beginning
    assert.ok(
      content.includes("1-Minute Preview") || content.includes("1-MINUTE TIMED PREVIEW"),
      "Cubicon page must display 1-minute duration notice before preview starts"
    );
    assert.ok(
      content.includes("7 seconds each") || content.includes("7 seconds per state"),
      "Must state that preview runs across demonstration states at 7 seconds each"
    );
  });

  await t.test("2. Three Approved Demonstration States (Section 7.2)", () => {
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

  await t.test("3. Interactive Controls: Pause, Replay, Cancel, See It Live (Section 7.2)", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.ok(
      content.includes("handleTogglePause") && content.includes("Pause"),
      "Must provide working Pause control"
    );
    assert.ok(
      content.includes("handleReplayPreview") && content.includes("Replay"),
      "Must provide working Replay control"
    );
    assert.ok(
      content.includes("handleCancelPreview") && content.includes("Cancel"),
      "Must provide working Cancel control"
    );
    assert.ok(
      content.includes("handleSeeLiveClick") && content.includes("See It Live"),
      "Must provide working See It Live control"
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

  await t.test("6. Standalone TimedPreview Component in c:/Users/USER/cubicon", () => {
    const componentPath = path.join(CUBICON_ROOT, "src", "components", "TimedPreview.jsx");
    assert.ok(fs.existsSync(componentPath), "TimedPreview.jsx must exist in standalone cubicon");
    const content = fs.readFileSync(componentPath, "utf-8");

    assert.ok(
      content.includes("1-Minute Interactive Preview"),
      "Standalone TimedPreview must state 1-minute duration"
    );
    assert.ok(
      content.includes("handleTogglePause") && content.includes("Pause"),
      "Standalone TimedPreview must provide Pause control"
    );
    assert.ok(
      content.includes("handleReplay") && content.includes("Replay"),
      "Standalone TimedPreview must provide Replay control"
    );
    assert.ok(
      content.includes("handleCancel") && content.includes("Cancel"),
      "Standalone TimedPreview must provide Cancel control"
    );
    assert.ok(
      content.includes("handleSeeLive") && content.includes("See It Live"),
      "Standalone TimedPreview must provide See It Live control"
    );
  });

  await t.test("7. Welcome Card Integration in Standalone Cubicon.jsx", () => {
    const cubiconPath = path.join(CUBICON_ROOT, "src", "Cubicon.jsx");
    const content = fs.readFileSync(cubiconPath, "utf-8");

    assert.ok(
      content.includes("1-Minute Preview"),
      "Cubicon.jsx must offer 1-Minute Preview button on welcome screen"
    );
    assert.ok(
      content.includes("<TimedPreview"),
      "Cubicon.jsx must render TimedPreview modal"
    );
    assert.ok(
      content.includes("CUBICON_OPEN_PREVIEW"),
      "Cubicon.jsx must support CUBICON_OPEN_PREVIEW postMessage event"
    );
  });

  await t.test("8. Uncropped Graphics Containment & Zero-Emoji Compliance", () => {
    const cssPath = path.join(CUBICON_ROOT, "src", "styles", "timedPreview.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.ok(
      content.includes("object-fit: contain"),
      "Must specify object-fit: contain for uncropped graphics"
    );

    const componentPath = path.join(CUBICON_ROOT, "src", "components", "TimedPreview.jsx");
    const compContent = fs.readFileSync(componentPath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    assert.equal(
      compContent.match(emojiRegex),
      null,
      "TimedPreview.jsx must not contain emojis"
    );
  });
});
