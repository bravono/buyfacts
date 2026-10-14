import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Media Player Video Playability & Controls Test Suite", async (t) => {
  const playerFilePath = path.join(__dirname, "..", "components", "MockMediaPlayer.tsx");
  const playerCssPath = path.join(__dirname, "..", "components", "MockMediaPlayer.module.css");

  assert.ok(fs.existsSync(playerFilePath), "MockMediaPlayer.tsx must exist");
  assert.ok(fs.existsSync(playerCssPath), "MockMediaPlayer.module.css must exist");

  const playerContent = fs.readFileSync(playerFilePath, "utf-8").replace(/\r\n/g, "\n");
  const cssContent = fs.readFileSync(playerCssPath, "utf-8").replace(/\r\n/g, "\n");

  await t.test("1. Video element renders with active source, preload metadata, and click-to-play", () => {
    assert.ok(
      playerContent.includes('ref={videoRef}'),
      "MockMediaPlayer must bind videoRef to the video element"
    );
    assert.ok(
      playerContent.includes('src={mediaUrl}'),
      "MockMediaPlayer must bind mediaUrl to the video source"
    );
    assert.ok(
      playerContent.includes('preload="metadata"'),
      "MockMediaPlayer must declare preload metadata so first video frame loads"
    );
    assert.ok(
      playerContent.includes('onClick={togglePlay}'),
      "MockMediaPlayer video element must support direct click to toggle playback"
    );
  });

  await t.test("2. Large central play button is rendered directly for playable video media", () => {
    assert.ok(
      playerContent.includes('id="mock-media-play-btn"'),
      "MockMediaPlayer must contain id mock-media-play-btn for direct interaction"
    );
    assert.ok(
      playerContent.includes("isPlayable"),
      "MockMediaPlayer must calculate isPlayable state"
    );
    assert.ok(
      playerContent.includes('mediaType === "video"'),
      "isPlayable must include mediaType === video"
    );
    assert.ok(
      playerContent.includes("<Play"),
      "MockMediaPlayer must render Play icon when paused"
    );
    assert.ok(
      playerContent.includes("<Pause"),
      "MockMediaPlayer must render Pause icon when playing"
    );
  });

  await t.test("3. Seek control panel and utilities are rendered for playable video", () => {
    assert.ok(
      playerContent.includes('id="mock-media-seek-bar"'),
      "MockMediaPlayer must render seek bar for playable media"
    );
    assert.ok(
      playerContent.includes("formatTime(currentTime)"),
      "MockMediaPlayer must render formatted current playback time"
    );
    assert.ok(
      playerContent.includes("toggleFullscreen"),
      "MockMediaPlayer must support fullscreen action for video playback"
    );
    assert.ok(
      playerContent.includes("toggleMute"),
      "MockMediaPlayer must support mute/unmute toggle"
    );
  });

  await t.test("4. CSS styles define videoPlaying hover states and video cursor pointer", () => {
    assert.ok(
      cssContent.includes(".videoPlaying"),
      "CSS must include .videoPlaying class for playback fading"
    );
    assert.ok(
      cssContent.includes(".realVideo"),
      "CSS must include .realVideo class"
    );
    assert.ok(
      cssContent.includes("cursor: pointer"),
      "CSS must declare cursor pointer on realVideo for clear interactivity"
    );
  });

  await t.test("5. YouTube video URL helper resolves embed links properly", () => {
    assert.ok(
      playerContent.includes("isYouTubeUrl"),
      "MockMediaPlayer must support YouTube URL detection"
    );
    assert.ok(
      playerContent.includes("getYouTubeEmbedUrl"),
      "MockMediaPlayer must extract and format YouTube embed URLs"
    );
  });

  await t.test("6. Screen frame size is identical, enlarged to 480px, and unified across all media types", () => {
    // Both audioScreenFrame and videoScreenFrame must use the exact same enlarged dimensions
    assert.ok(
      cssContent.includes(".audioScreenFrame {\n  aspect-ratio: 16 / 9;\n  max-height: 480px;"),
      "audioScreenFrame must have 16 / 9 aspect-ratio and 480px max-height matching video"
    );
    assert.ok(
      cssContent.includes(".videoScreenFrame {\n  aspect-ratio: 16 / 9;\n  max-height: 480px;"),
      "videoScreenFrame must have 16 / 9 aspect-ratio and 480px max-height"
    );
    assert.ok(
      cssContent.includes(".screenFrame {\n  position: relative;\n  width: 100%;\n  aspect-ratio: 16 / 9;\n  max-height: 480px;"),
      "screenFrame base layout must enforce 16 / 9 aspect-ratio and 480px max-height"
    );
    assert.ok(
      cssContent.includes("max-width: 860px;"),
      "playerCard must have enlarged max-width of 860px"
    );
  });

  await t.test("7. Description overlay is rendered inside screenFrame and toggles with playback state", () => {
    assert.ok(
      playerContent.includes("descriptionOverlay"),
      "MockMediaPlayer must render description overlay inside screen frame"
    );
    assert.ok(
      playerContent.includes("descriptionOverlayHidden"),
      "MockMediaPlayer must apply descriptionOverlayHidden class when isPlaying is true"
    );
    assert.ok(
      cssContent.includes(".descriptionOverlay {"),
      "MockMediaPlayer.module.css must define .descriptionOverlay"
    );
    assert.ok(
      cssContent.includes(".descriptionOverlayHidden {"),
      "MockMediaPlayer.module.css must define .descriptionOverlayHidden"
    );
    assert.ok(
      cssContent.includes("pointer-events: none;"),
      "descriptionOverlay must have pointer-events none to pass clicks to media canvas"
    );
  });

  await t.test("8. Getting Started welcome overlay displays verbatim required copy on initial landing", () => {
    assert.ok(
      playerContent.includes("Welcome to your Marketers tool workspace!"),
      "MockMediaPlayer must render Welcome to your Marketers tool workspace! in the header banner"
    );
    assert.ok(
      playerContent.includes("Here are the basics:"),
      "MockMediaPlayer must render Here are the basics:"
    );
    assert.ok(
      playerContent.includes("Click on Any Tool or Resource topic"),
      "MockMediaPlayer must include bullet 1: Click on Any Tool or Resource topic"
    );
    assert.ok(
      playerContent.includes("View a description and available resources"),
      "MockMediaPlayer must include bullet 2: View a description and available resources"
    );
    assert.ok(
      playerContent.includes("See, hear, read and apply our shared learnings that will save you time"),
      "MockMediaPlayer must include bullet 3: See, hear, read and apply our shared learnings"
    );
    assert.ok(
      playerContent.includes("Pose a question or a request to Robert for help"),
      "MockMediaPlayer must include bullet 4: Pose a question or a request to Robert for help"
    );
    assert.ok(
      playerContent.includes("Download and save time with our ideas and tools (no strings attached)"),
      "MockMediaPlayer must include bullet 5: Download and save time"
    );
    assert.ok(
      playerContent.includes("gettingStartedToggleBtn"),
      "MockMediaPlayer must include Getting Started header toggle button"
    );
    assert.ok(
      playerContent.includes("welcomeDismissBtn"),
      "MockMediaPlayer must include dismiss action for welcome overlay"
    );
    assert.ok(
      cssContent.includes(".welcomeOverlay {"),
      "MockMediaPlayer.module.css must define .welcomeOverlay"
    );
    assert.ok(
      cssContent.includes("inset: 0;"),
      "welcomeOverlay must occupy entirety of media display area with inset: 0"
    );
    assert.ok(
      cssContent.includes(".bulletDot {"),
      "MockMediaPlayer.module.css must define .bulletDot"
    );

    // Verify media controls are hidden when welcome overlay is active
    assert.ok(
      playerContent.includes("isPlayable && !isWelcomeActive"),
      "Play button and seek control panel must be hidden when isWelcomeActive is true"
    );
    assert.ok(
      playerContent.includes("!isWelcomeActive && (\n          <button\n            className={styles.nextMediaButton}"),
      "Next media button must be hidden when isWelcomeActive is true"
    );

    // Verify phrases are not repeated inside the display area
    const welcomeOverlayMatch = playerContent.match(/id="mock-media-welcome-overlay"[\s\S]*?<\/div>\s*<\/div>/);
    assert.ok(welcomeOverlayMatch, "mock-media-welcome-overlay block must exist");
    const welcomeBlock = welcomeOverlayMatch[0];
    assert.ok(
      !welcomeBlock.includes("welcomeBadge"),
      "welcomeBadge phrase must not be repeated inside the display area"
    );
    assert.ok(
      !welcomeBlock.includes("welcomeTitle"),
      "welcomeTitle phrase must not be repeated inside the display area"
    );
    assert.ok(
      !welcomeBlock.includes("Welcome to your Marketers tool workspace!"),
      "Subtitle phrase must not be duplicated inside the display area"
    );
    assert.ok(
      !welcomeBlock.includes("Getting Started"),
      "Header phrase must not be duplicated inside the display area"
    );
  });

  await t.test("9. Products & Services page preserves colorful theme and glowing ambience", () => {
    const psPath = path.join(__dirname, "..", "app", "products-services", "page.tsx");
    const riPath = path.join(__dirname, "..", "app", "research-imperatives", "page.tsx");
    assert.ok(fs.existsSync(psPath), "products-services/page.tsx must exist");
    assert.ok(fs.existsSync(riPath), "research-imperatives/page.tsx must exist");

    const psContent = fs.readFileSync(psPath, "utf-8");
    const riContent = fs.readFileSync(riPath, "utf-8");

    assert.ok(
      !psContent.includes("section-light"),
      "products-services/page.tsx must not use section-light to prevent washing colors to grey"
    );
    assert.ok(
      psContent.includes("glow-blob blob-green"),
      "products-services/page.tsx must include green glow blob for colorful ambience"
    );
    assert.ok(
      psContent.includes("glow-blob blob-blue"),
      "products-services/page.tsx must include blue glow blob for colorful ambience"
    );
    assert.ok(
      riContent.includes("glow-blob blob-green"),
      "research-imperatives/page.tsx must retain green glow blob"
    );
    assert.ok(
      psContent.includes("showWelcome={showWelcome}"),
      "products-services/page.tsx must bind showWelcome to MockMediaPlayer"
    );
    assert.ok(
      riContent.includes("showWelcome={showWelcome}"),
      "research-imperatives/page.tsx must bind showWelcome to MockMediaPlayer"
    );
  });

  await t.test("10. Public S3 Affinity video URL is wired to Pattern Insights and Early Recognition buttons", () => {
    const s3VideoUrl = "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4";
    const seedPath = path.join(__dirname, "..", "prisma", "seed.ts");
    const psPath = path.join(__dirname, "..", "app", "products-services", "page.tsx");
    const riPath = path.join(__dirname, "..", "app", "research-imperatives", "page.tsx");

    const seedContent = fs.readFileSync(seedPath, "utf-8");
    const psContent = fs.readFileSync(psPath, "utf-8");
    const riContent = fs.readFileSync(riPath, "utf-8");

    assert.ok(
      seedContent.includes(s3VideoUrl),
      "prisma/seed.ts must include the S3 Affinity video URL"
    );
    assert.ok(
      psContent.includes(s3VideoUrl),
      "products-services/page.tsx must configure S3 Affinity video URL"
    );
    assert.ok(
      riContent.includes(s3VideoUrl),
      "research-imperatives/page.tsx must configure S3 Affinity video URL"
    );
  });

  await t.test("11. Zero-Emoji Compliance across player component, CSS, and test files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(
      !emojiRegex.test(playerContent),
      "MockMediaPlayer.tsx must not contain any emojis"
    );
    assert.ok(
      !emojiRegex.test(cssContent),
      "MockMediaPlayer.module.css must not contain any emojis"
    );
  });
});
