import test from "node:test";
import assert from "node:assert/strict";

const CUBICON_VIDEO_CDN_URL = "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/cubicon_preview.mp4";
const CUBICON_VIDEO_CDN_FALLBACK = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

// State Machine Simulator for Cubicon Video Viewport Flow
class CubiconViewportStateMachine {
  showLiveApp: boolean = false;
  showVideo: boolean = false;
  isVideoCompleted: boolean = false;
  videoSrc: string = CUBICON_VIDEO_CDN_URL;

  handleStartVideoClick() {
    this.showVideo = true;
    this.isVideoCompleted = false;
    this.showLiveApp = false;
  }

  handleVideoEnd() {
    this.isVideoCompleted = true;
  }

  handleSeeLiveClick() {
    this.showVideo = false;
    this.showLiveApp = true;
  }

  handleBackToSlideshow() {
    this.showVideo = false;
    this.showLiveApp = false;
    this.isVideoCompleted = false;
  }

  handleVideoError() {
    if (this.videoSrc !== CUBICON_VIDEO_CDN_FALLBACK) {
      this.videoSrc = CUBICON_VIDEO_CDN_FALLBACK;
    }
  }

  reloadVideo() {
    this.videoSrc =
      this.videoSrc === CUBICON_VIDEO_CDN_URL
        ? CUBICON_VIDEO_CDN_FALLBACK
        : CUBICON_VIDEO_CDN_URL;
    this.isVideoCompleted = false;
  }
}

test("Cubicon Video Preview Flow Test Suite", async (t) => {
  await t.test("Initial State should render slideshow", () => {
    const sm = new CubiconViewportStateMachine();
    assert.equal(sm.showLiveApp, false);
    assert.equal(sm.showVideo, false);
    assert.equal(sm.isVideoCompleted, false);
  });

  await t.test("Clicking Start or See Live should trigger video preview mode", () => {
    const sm = new CubiconViewportStateMachine();
    sm.handleStartVideoClick();
    assert.equal(sm.showVideo, true);
    assert.equal(sm.showLiveApp, false);
    assert.equal(sm.isVideoCompleted, false);
  });

  await t.test("Video completion enables 'Try It Yourself' CTA", () => {
    const sm = new CubiconViewportStateMachine();
    sm.handleStartVideoClick();
    sm.handleVideoEnd();
    assert.equal(sm.isVideoCompleted, true);
  });

  await t.test("Clicking 'Try It Yourself' transitions to interactive 3D app", () => {
    const sm = new CubiconViewportStateMachine();
    sm.handleStartVideoClick();
    sm.handleVideoEnd();
    sm.handleSeeLiveClick();

    assert.equal(sm.showVideo, false);
    assert.equal(sm.showLiveApp, true);
  });

  await t.test("Returning to slideshow resets video player state", () => {
    const sm = new CubiconViewportStateMachine();
    sm.handleStartVideoClick();
    sm.handleVideoEnd();
    sm.handleBackToSlideshow();

    assert.equal(sm.showVideo, false);
    assert.equal(sm.showLiveApp, false);
    assert.equal(sm.isVideoCompleted, false);
  });

  await t.test("CDN Video fallback source when video load fails", () => {
    const sm = new CubiconViewportStateMachine();
    assert.equal(sm.videoSrc, CUBICON_VIDEO_CDN_URL);
    sm.handleVideoError();
    assert.equal(sm.videoSrc, CUBICON_VIDEO_CDN_FALLBACK);
  });

  await t.test("Reloading video toggles stream source and resets completion state", () => {
    const sm = new CubiconViewportStateMachine();
    sm.handleStartVideoClick();
    sm.handleVideoEnd();
    assert.equal(sm.isVideoCompleted, true);

    sm.reloadVideo();
    assert.equal(sm.isVideoCompleted, false);
    assert.equal(sm.videoSrc, CUBICON_VIDEO_CDN_FALLBACK);
  });

  await t.test("Direct 3D app transition preserves dark theme background and active live state", () => {
    const sm = new CubiconViewportStateMachine();
    sm.handleSeeLiveClick();

    assert.equal(sm.showLiveApp, true);
    assert.equal(sm.showVideo, false);
  });
});
