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

  await t.test("6. Screen frame size is identical and unified across all media types", () => {
    // Both audioScreenFrame and videoScreenFrame must use the exact same dimensions
    assert.ok(
      cssContent.includes(".audioScreenFrame {\n  aspect-ratio: 16 / 9;\n  max-height: 380px;"),
      "audioScreenFrame must have 16 / 9 aspect-ratio and 380px max-height matching video"
    );
    assert.ok(
      cssContent.includes(".videoScreenFrame {\n  aspect-ratio: 16 / 9;\n  max-height: 380px;"),
      "videoScreenFrame must have 16 / 9 aspect-ratio and 380px max-height"
    );
    assert.ok(
      cssContent.includes(".screenFrame {\n  position: relative;\n  width: 100%;\n  aspect-ratio: 16 / 9;\n  max-height: 380px;"),
      "screenFrame base layout must enforce 16 / 9 aspect-ratio and 380px max-height"
    );
  });

  await t.test("7. Zero-Emoji Compliance across player component and CSS", () => {
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
