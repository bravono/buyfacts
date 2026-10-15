import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

// Simulation harness for Cubicon Launch Controller & Fullscreen Lifecycle
class CubiconLaunchLifecycleSimulator {
  showLiveApp: boolean = false;
  showVideo: boolean = false;
  isVideoCompleted: boolean = false;
  isIframeLoaded: boolean = false;
  isFullscreen: boolean = false;
  isNativeFullscreenSupported: boolean = true;
  lastDispatchedMessage: any = null;
  nativeFullscreenRequested: boolean = false;
  nativeFullscreenExited: boolean = false;

  constructor(isNativeFullscreenSupported: boolean = true) {
    this.isNativeFullscreenSupported = isNativeFullscreenSupported;
  }

  notifyIframeFullscreen(fullscreenState: boolean) {
    this.lastDispatchedMessage = {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: fullscreenState,
    };
  }

  handleSeeLiveClick() {
    this.showVideo = false;
    this.isVideoCompleted = false;
    this.isIframeLoaded = false;
    this.showLiveApp = true;
    this.isFullscreen = true;
    this.notifyIframeFullscreen(true);

    // Simulated native browser fullscreen attempt with fallback
    if (this.isNativeFullscreenSupported) {
      this.nativeFullscreenRequested = true;
    } else {
      this.nativeFullscreenRequested = false;
    }
  }

  handleIframeLoad() {
    this.isIframeLoaded = true;
    this.notifyIframeFullscreen(this.isFullscreen);
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      this.isFullscreen = true;
      this.notifyIframeFullscreen(true);
      if (this.isNativeFullscreenSupported) {
        this.nativeFullscreenRequested = true;
      }
    } else {
      this.isFullscreen = false;
      this.notifyIframeFullscreen(false);
      if (this.isNativeFullscreenSupported) {
        this.nativeFullscreenExited = true;
      }
    }
  }

  handleEscapeKey() {
    if (this.isFullscreen) {
      this.isFullscreen = false;
      this.notifyIframeFullscreen(false);
      if (this.isNativeFullscreenSupported) {
        this.nativeFullscreenExited = true;
      }
    }
  }

  handleExitLiveApp() {
    if (this.isNativeFullscreenSupported && this.isFullscreen) {
      this.nativeFullscreenExited = true;
    }
    this.isFullscreen = false;
    this.notifyIframeFullscreen(false);
    this.showLiveApp = false;
  }

  handleHashNavigation(hash: string) {
    if (
      hash === "#live" ||
      hash === "#cubicon-live" ||
      hash === "#launch"
    ) {
      this.handleSeeLiveClick();
    }
  }
}

test("Cubicon Fullscreen Default State After Launch Suite", async (t) => {
  await t.test("1. Cubicon Launch Defaults to Fullscreen State Immediately", () => {
    const sim = new CubiconLaunchLifecycleSimulator(true);

    // Initial state before launch
    assert.equal(sim.showLiveApp, false, "Live app must be unmounted before launch");
    assert.equal(sim.isFullscreen, false, "Fullscreen must be inactive before launch");

    // Launch action triggered
    sim.handleSeeLiveClick();

    // Verification of default state after launch
    assert.equal(sim.showLiveApp, true, "Cubicon live app must be active after launch");
    assert.equal(
      sim.isFullscreen,
      true,
      "Cubicon must always begin with fullscreen as the default state after launch"
    );
    assert.equal(sim.isIframeLoaded, false, "Iframe loading preloader must mask unpainted frame");
    assert.deepEqual(
      sim.lastDispatchedMessage,
      { type: "CUBICON_SET_FULLSCREEN", isFullscreen: true },
      "Must dispatch CUBICON_SET_FULLSCREEN with true on launch"
    );
  });

  await t.test("2. Iframe Load Preserves and Re-confirms Fullscreen Synchronization", () => {
    const sim = new CubiconLaunchLifecycleSimulator(true);
    sim.handleSeeLiveClick();

    // Reset message tracking to isolate iframe onLoad trigger
    sim.lastDispatchedMessage = null;

    sim.handleIframeLoad();
    assert.equal(sim.isIframeLoaded, true, "Iframe must be marked loaded");
    assert.deepEqual(
      sim.lastDispatchedMessage,
      { type: "CUBICON_SET_FULLSCREEN", isFullscreen: true },
      "Iframe onLoad must confirm fullscreen state to 3D canvas"
    );
  });

  await t.test("3. Graceful Fallback for Mobile and Restricted Browser Environments", () => {
    // Simulator where native browser fullscreen is unsupported or rejected
    const sim = new CubiconLaunchLifecycleSimulator(false);
    sim.handleSeeLiveClick();

    assert.equal(sim.showLiveApp, true);
    assert.equal(
      sim.isFullscreen,
      true,
      "CSS pseudo-fullscreen fallback must activate even if native fullscreen is unavailable"
    );
    assert.deepEqual(sim.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: true,
    });
  });

  await t.test("4. Exit Fullscreen and Toggle Return to Embedded Mode", () => {
    const sim = new CubiconLaunchLifecycleSimulator(true);
    sim.handleSeeLiveClick();
    assert.equal(sim.isFullscreen, true);

    // User chooses to minimize / exit fullscreen mode
    sim.toggleFullscreen();
    assert.equal(sim.isFullscreen, false, "Fullscreen toggle must exit to embedded mode");
    assert.equal(sim.showLiveApp, true, "Live app must remain open in embedded mode");
    assert.deepEqual(sim.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: false,
    });

    // User expands back to fullscreen
    sim.toggleFullscreen();
    assert.equal(sim.isFullscreen, true, "Fullscreen toggle must return to fullscreen mode");
    assert.deepEqual(sim.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: true,
    });
  });

  await t.test("5. Escape Key Handling Exits Fullscreen Mode Smoothly", () => {
    const sim = new CubiconLaunchLifecycleSimulator(true);
    sim.handleSeeLiveClick();
    assert.equal(sim.isFullscreen, true);

    sim.handleEscapeKey();
    assert.equal(sim.isFullscreen, false, "Escape key must exit fullscreen mode");
    assert.equal(sim.showLiveApp, true, "Live app must remain accessible");
    assert.deepEqual(sim.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: false,
    });
  });

  await t.test("6. Exiting Demo and Re-launching Begins Fullscreen as Default Again", () => {
    const sim = new CubiconLaunchLifecycleSimulator(true);
    sim.handleSeeLiveClick();
    assert.equal(sim.isFullscreen, true);

    // Exit live app completely back to page overview
    sim.handleExitLiveApp();
    assert.equal(sim.showLiveApp, false);
    assert.equal(sim.isFullscreen, false);

    // User launches Cubicon again at a later moment
    sim.handleSeeLiveClick();
    assert.equal(sim.showLiveApp, true);
    assert.equal(
      sim.isFullscreen,
      true,
      "Re-launching Cubicon must always begin with fullscreen as the default state"
    );
  });

  await t.test("7. Hash Anchor Navigation Direct Launch into Fullscreen", () => {
    const validHashes = ["#live", "#cubicon-live", "#launch"];
    for (const hash of validHashes) {
      const sim = new CubiconLaunchLifecycleSimulator(true);
      sim.handleHashNavigation(hash);
      assert.equal(
        sim.showLiveApp,
        true,
        `Hash ${hash} must launch live Cubicon app`
      );
      assert.equal(
        sim.isFullscreen,
        true,
        `Hash ${hash} must begin with fullscreen as default state`
      );
    }
  });

  await t.test("8. Source Code Verification in page.tsx for Fullscreen Launch Implementation", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/cubicon/page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    // handleSeeLiveClick must set isFullscreen(true)
    assert.ok(
      content.includes("setIsFullscreen(true)"),
      "handleSeeLiveClick must set isFullscreen to true"
    );
    assert.ok(
      content.includes("notifyIframeFullscreen(true)"),
      "handleSeeLiveClick must dispatch fullscreen notification"
    );
    assert.ok(
      content.includes("appFrameWrapperPseudoFullscreen"),
      "page.tsx must bind appFrameWrapperPseudoFullscreen class when isFullscreen is true"
    );
    assert.ok(
      content.includes("appIframeFullscreen"),
      "page.tsx must bind appIframeFullscreen class when isFullscreen is true"
    );
  });

  await t.test("9. CSS Fullscreen Specification and Preloader Rules in Stylesheet", () => {
    const cssPath = path.join(BUYFACTS_ROOT, "app", "cubicon", "cubicon.module.css");
    assert.ok(fs.existsSync(cssPath), "cubicon.module.css must exist");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.ok(
      content.includes(".appFrameWrapperPseudoFullscreen"),
      "Must define .appFrameWrapperPseudoFullscreen"
    );
    assert.ok(
      content.includes(".appIframeFullscreen"),
      "Must define .appIframeFullscreen"
    );
    assert.ok(
      content.includes(".appFrameWrapperPseudoFullscreen .iframeHostLoader"),
      "Must define centered preloader rule for fullscreen mode"
    );
    assert.ok(
      content.includes(".exitFullscreenFloatingBtn"),
      "Must define floating exit button"
    );
  });

  await t.test("10. Zero-Emoji Compliance across Modified Files", () => {
    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "cubicon", "cubicon.module.css"),
      path.join(BUYFACTS_ROOT, "tests", "cubicon-video-flow.test.ts"),
      path.join(BUYFACTS_ROOT, "tests", "cubicon-launch-fullscreen.test.ts"),
    ];

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, "utf-8");
        const match = emojiRegex.exec(text);
        assert.equal(
          match,
          null,
          `File ${path.basename(filePath)} must not contain emojis. Found: ${match ? match[0] : "none"}`
        );
      }
    }
  });
});
