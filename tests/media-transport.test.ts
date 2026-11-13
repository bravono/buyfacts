import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MOBILE_VIDEO_MAX_WIDTH,
  MOBILE_VIDEO_QUERY,
  SKIP_SECONDS,
  applyVolume,
  clampSeek,
  formatClock,
  formatProgress,
  seekMedia,
  selectVideoSource,
  skipBackward,
  skipForward,
  skipMediaBackward,
  skipMediaForward,
  stopMedia,
  toggleMuteState,
  togglePlayback,
  volumeFromSlider,
  type MediaLike,
} from "../lib/mediaTransport";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

/** A stand-in for HTMLMediaElement with the same play/pause/seek semantics. */
class FakeMedia implements MediaLike {
  currentTime = 0;
  volume = 1;
  muted = false;
  paused = true;
  ended = false;
  playCalls = 0;
  constructor(public duration: number = NaN) {}
  play() {
    this.playCalls++;
    this.paused = false;
    this.ended = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const DESKTOP = "https://s3.buyfacts.com/buyfacts-public-assets/uploads/clip_Desktop.mp4";
const MOBILE = "https://s3.buyfacts.com/buyfacts-public-assets/uploads/clip_Mobile.mp4";

test("Media Transport Controls Suite", async (t) => {
  await t.test("1. Play / Pause toggles the element", () => {
    const media = new FakeMedia(120);
    assert.equal(togglePlayback(media), true, "first press plays");
    assert.equal(media.paused, false);
    assert.equal(togglePlayback(media), false, "second press pauses");
    assert.equal(media.paused, true);
    media.ended = true;
    assert.equal(togglePlayback(media), true, "after the end, Play starts again");
    assert.equal(media.playCalls, 2);
  });

  await t.test("2. Stop pauses and resets currentTime to 0", () => {
    const media = new FakeMedia(120);
    togglePlayback(media);
    media.currentTime = 73.4;
    assert.equal(stopMedia(media), 0);
    assert.equal(media.currentTime, 0);
    assert.equal(media.paused, true);
  });

  await t.test("3. -10s uses Math.max(0, currentTime - 10)", () => {
    assert.equal(SKIP_SECONDS, 10);
    const media = new FakeMedia(120);
    media.currentTime = 45;
    assert.equal(skipMediaBackward(media), 35);
    assert.equal(media.currentTime, 35);
    media.currentTime = 4;
    assert.equal(skipMediaBackward(media), 0, "never before the start");
    assert.equal(skipBackward(Number.NaN), 0);
  });

  await t.test("4. +10s uses Math.min(duration || Infinity, currentTime + 10)", () => {
    const media = new FakeMedia(120);
    media.currentTime = 45;
    assert.equal(skipMediaForward(media), 55);
    media.currentTime = 115;
    assert.equal(skipMediaForward(media), 120, "never past the end");
    const unknown = new FakeMedia(Number.NaN);
    unknown.currentTime = 5;
    assert.equal(skipMediaForward(unknown), 15, "unbounded while the duration is unknown");
    assert.equal(skipForward(5, 0), 15, "duration 0 counts as unknown");
    assert.equal(skipForward(5, Infinity), 15, "live streams have no end");
  });

  await t.test("5. Scrubber seeks within 0..duration and shows MM:SS / MM:SS", () => {
    const media = new FakeMedia(200);
    assert.equal(seekMedia(media, 61.5), 61.5);
    assert.equal(media.currentTime, 61.5);
    assert.equal(seekMedia(media, 500), 200);
    assert.equal(seekMedia(media, -3), 0);
    assert.equal(clampSeek(10, Number.NaN), 0, "no seeking before the duration is known");

    assert.equal(formatClock(0), "00:00");
    assert.equal(formatClock(9.9), "00:09");
    assert.equal(formatClock(61.5), "01:01");
    assert.equal(formatClock(4503), "75:03", "minutes keep counting past an hour");
    assert.equal(formatClock(Number.NaN), "00:00");
    assert.equal(formatProgress(61.5, 200), "01:01 / 03:20");
    assert.equal(formatProgress(3, Number.NaN), "00:03 / --:--");
  });

  await t.test("6. Volume slider and Mute / Unmute", () => {
    const media = new FakeMedia(60);
    applyVolume(media, 0.4, false);
    assert.equal(media.volume, 0.4);
    assert.equal(media.muted, false);
    applyVolume(media, 3, true);
    assert.equal(media.volume, 1, "volume is clamped to 0..1");
    assert.equal(media.muted, true);

    assert.deepEqual(volumeFromSlider(0.6), { volume: 0.6, muted: false }, "raising the slider unmutes");
    assert.deepEqual(volumeFromSlider(0), { volume: 0, muted: true }, "dragging to zero mutes");
    assert.deepEqual(volumeFromSlider(-1), { volume: 0, muted: true });

    assert.deepEqual(toggleMuteState({ volume: 0.7, muted: false }), { volume: 0.7, muted: true });
    assert.deepEqual(toggleMuteState({ volume: 0.7, muted: true }), { volume: 0.7, muted: false });
    assert.deepEqual(
      toggleMuteState({ volume: 0, muted: true }),
      { volume: 0.5, muted: false },
      "unmuting at zero restores an audible level"
    );
  });

  await t.test("7. Responsive source: mobile portrait at <= 768px, desktop above", () => {
    assert.equal(MOBILE_VIDEO_MAX_WIDTH, 768);
    assert.equal(MOBILE_VIDEO_QUERY, "(max-width: 768px)");

    // Explicit mobile render.
    assert.equal(selectVideoSource({ desktopUrl: DESKTOP, mobileUrl: MOBILE }, false), DESKTOP);
    assert.equal(selectVideoSource({ desktopUrl: DESKTOP, mobileUrl: MOBILE }, true), MOBILE);

    // Registry lookup by desktop URL.
    const registry = { [DESKTOP]: MOBILE };
    assert.equal(selectVideoSource({ desktopUrl: DESKTOP }, true, registry), MOBILE);
    assert.equal(selectVideoSource({ desktopUrl: DESKTOP }, false, registry), DESKTOP);

    // No mobile render: the desktop video plays everywhere.
    assert.equal(selectVideoSource({ desktopUrl: DESKTOP }, true, {}), DESKTOP);
    assert.equal(selectVideoSource({ desktopUrl: DESKTOP, mobileUrl: "  " }, true, {}), DESKTOP);

    // A mobile render alone is never shown on desktop, and nothing in means nothing out.
    assert.equal(selectVideoSource({ mobileUrl: MOBILE }, false), undefined);
    assert.equal(selectVideoSource({}, true), undefined);
  });

  await t.test("8. Controls expose every transport action with accessible labels", () => {
    const controls = read("components", "media", "TransportControls.tsx");
    for (const label of [
      'aria-label={isPlaying ? "Pause" : "Play"}',
      'aria-label="Stop"',
      "aria-label={`Skip back ${SKIP_SECONDS} seconds`}",
      "aria-label={`Skip forward ${SKIP_SECONDS} seconds`}",
      'aria-label="Seek"',
      'aria-label={muted ? "Unmute" : "Mute"}',
      'aria-label="Volume"',
    ]) {
      assert.ok(controls.includes(label), `TransportControls must include ${label}`);
    }
    assert.equal((controls.match(/type="range"/g) ?? []).length, 2, "scrubber and volume are range inputs");
    assert.ok(controls.includes("formatProgress(currentTime, duration)"), "time shows MM:SS / MM:SS");

    const hook = read("components", "media", "useMediaTransport.ts");
    for (const op of ["stopMedia(", "skipMediaBackward(", "skipMediaForward(", "seekMedia(", "applyVolume(", "togglePlayback("]) {
      assert.ok(hook.includes(op), `useMediaTransport must use ${op} from lib/mediaTransport`);
    }
    const responsive = read("components", "media", "useResponsiveVideoSrc.ts");
    assert.ok(responsive.includes("MOBILE_VIDEO_QUERY") && responsive.includes("selectVideoSource("));
  });

  await t.test("9. Players use the shared controls and responsive sources", () => {
    const player = read("components", "MediaPlayer.tsx");
    assert.ok(player.includes("<TransportControls"), "MediaPlayer renders the transport bar");
    assert.ok(player.includes("mobileSeeItUrl?: string;"), "MediaPlayer accepts a mobile SEE IT render");
    assert.ok(player.includes("useResponsiveVideoSrc("), "MediaPlayer picks the render for the viewport");
    assert.ok(player.includes("ref={attachMedia}"), "video and audio are both driven by the transport");

    const home = read("app", "page.tsx");
    assert.ok(home.includes("<TransportVideo") && home.includes("mobileSrc={activeVideoModal.mobileVideoUrl}"));
    assert.ok(!home.includes("setVideoEnded"), "the end screen follows the player's own ended state");

    const triad = read("app", "triad", "page.tsx");
    assert.ok(triad.includes("<TransportVideo"), "TRIAD page uses the custom controls");
  });

  await t.test("10. New styles use no !important", () => {
    for (const file of [
      ["components", "media", "TransportControls.module.css"],
      ["components", "media", "TransportVideo.module.css"],
    ]) {
      assert.ok(!read(...file).includes("!important"), `${file.join("/")} must not use !important`);
    }
  });

  await t.test("11. Zero-Emoji Compliance", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const file of [
      ["lib", "mediaTransport.ts"],
      ["components", "media", "TransportControls.tsx"],
      ["components", "media", "TransportVideo.tsx"],
      ["components", "media", "useMediaTransport.ts"],
      ["components", "media", "useResponsiveVideoSrc.ts"],
      ["tests", "media-transport.test.ts"],
    ]) {
      assert.ok(!emojiRegex.test(read(...file)), `${file.join("/")} must contain no emoji`);
    }
  });
});
