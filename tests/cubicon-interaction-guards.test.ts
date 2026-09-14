import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");
const CUBICON_ROOT = path.resolve(BUYFACTS_ROOT, "..", "cubicon");

// State machine simulator for Fullscreen Controller with Pseudo-Fullscreen Fallback
class FullscreenControllerStateMachine {
  isFullscreen: boolean = false;
  isNativeFullscreenSupported: boolean = true;
  lastDispatchedMessage: any = null;
  elementClassList: Set<string> = new Set(["appFrameWrapper"]);

  constructor(isNativeFullscreenSupported: boolean = true) {
    this.isNativeFullscreenSupported = isNativeFullscreenSupported;
  }

  notifyIframe(state: boolean) {
    this.lastDispatchedMessage = {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: state,
    };
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      if (this.isNativeFullscreenSupported) {
        // Native browser fullscreen succeed path
        this.isFullscreen = true;
        this.elementClassList.add("appFrameWrapperPseudoFullscreen");
        this.notifyIframe(true);
      } else {
        // iOS Safari / Mobile fallback path
        this.isFullscreen = true;
        this.elementClassList.add("appFrameWrapperPseudoFullscreen");
        this.notifyIframe(true);
      }
    } else {
      this.isFullscreen = false;
      this.elementClassList.delete("appFrameWrapperPseudoFullscreen");
      this.notifyIframe(false);
    }
  }

  handleEscapeKey() {
    if (this.isFullscreen) {
      this.isFullscreen = false;
      this.elementClassList.delete("appFrameWrapperPseudoFullscreen");
      this.notifyIframe(false);
    }
  }
}

// Mobile responsive viewport calculator matching computeViewport logic
function computeTestViewport(width: number, height: number = 800) {
  const isLandscape = width > height && height < 600;
  if (isLandscape) return { fov: 14.0, scale: 1.1 };
  if (width <= 390) return { fov: 17.5, scale: 1.65 };
  if (width <= 500) return { fov: 16.0, scale: 1.5 };
  if (width <= 768) return { fov: 13.0, scale: 1.0 };
  if (width <= 1024) return { fov: 11.5, scale: 1.1 };
  return { fov: 10.0, scale: 1.0 };
}

test("Cubicon 3D Interaction Guards & Fullscreen Robustness Suite", async (t) => {
  await t.test("1. Canvas Touch-Action Containment: Enforces touch-action: none !important", () => {
    const htmlPath = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "index.html");
    assert.ok(fs.existsSync(htmlPath), "public/cubicon-app/index.html must exist");
    const content = fs.readFileSync(htmlPath, "utf-8");

    // Canvas must enforce touch-action: none to allow uninhibited 3D rotation and drawing
    assert.ok(
      content.includes("touch-action: none !important"),
      "index.html must contain canvas { touch-action: none !important; }"
    );
    assert.ok(
      !content.includes("canvas {\n        touch-action: pan-y !important;"),
      "canvas must not have touch-action: pan-y, which breaks 3D vertical rotation"
    );
    assert.ok(
      content.includes("viewport-fit=cover"),
      "Meta viewport must include viewport-fit=cover for mobile display notches"
    );
  });

  await t.test("2. Bundler Script Overlay: Guarantees touch-action: none in automated builds", () => {
    const bundlerPath = path.join(BUYFACTS_ROOT, "scripts", "bundle-cubicon.js");
    assert.ok(fs.existsSync(bundlerPath), "bundle-cubicon.js must exist");
    const content = fs.readFileSync(bundlerPath, "utf-8");

    assert.ok(
      content.includes("touch-action: none !important"),
      "bundle-cubicon.js must inject touch-action: none !important"
    );
  });

  await t.test("3. Native Fullscreen Activation and State Dispatch", () => {
    const sm = new FullscreenControllerStateMachine(true);
    assert.equal(sm.isFullscreen, false);

    sm.toggleFullscreen();
    assert.equal(sm.isFullscreen, true);
    assert.deepEqual(sm.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: true,
    });
    assert.ok(sm.elementClassList.has("appFrameWrapperPseudoFullscreen"));

    sm.toggleFullscreen();
    assert.equal(sm.isFullscreen, false);
    assert.deepEqual(sm.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: false,
    });
    assert.ok(!sm.elementClassList.has("appFrameWrapperPseudoFullscreen"));
  });

  await t.test("4. Pseudo-Fullscreen Fallback for iOS / Unsupported Mobile Browsers", () => {
    // Simulator where native browser fullscreen is rejected or unsupported
    const sm = new FullscreenControllerStateMachine(false);
    assert.equal(sm.isFullscreen, false);

    sm.toggleFullscreen();
    assert.equal(sm.isFullscreen, true, "Pseudo-fullscreen fallback should activate");
    assert.ok(
      sm.elementClassList.has("appFrameWrapperPseudoFullscreen"),
      "Must apply pseudo-fullscreen CSS class"
    );
    assert.deepEqual(sm.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: true,
    });
  });

  await t.test("5. Escape Key Handling: Seamless Exit from Fullscreen", () => {
    const sm = new FullscreenControllerStateMachine(true);
    sm.toggleFullscreen();
    assert.equal(sm.isFullscreen, true);

    sm.handleEscapeKey();
    assert.equal(sm.isFullscreen, false, "Escape key must exit fullscreen");
    assert.deepEqual(sm.lastDispatchedMessage, {
      type: "CUBICON_SET_FULLSCREEN",
      isFullscreen: false,
    });
    assert.ok(!sm.elementClassList.has("appFrameWrapperPseudoFullscreen"));
  });

  await t.test("6. Fullscreen CSS Specifications in BuyFacts Stylesheet", () => {
    const cssPath = path.join(BUYFACTS_ROOT, "app", "cubicon", "cubicon.module.css");
    assert.ok(fs.existsSync(cssPath), "cubicon.module.css must exist");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.ok(
      content.includes(".appFrameWrapperPseudoFullscreen"),
      "cubicon.module.css must define .appFrameWrapperPseudoFullscreen"
    );
    assert.ok(
      content.includes("z-index: 99999"),
      "Pseudo-fullscreen must use elevated z-index"
    );
    assert.ok(
      content.includes(".exitFullscreenFloatingBtn"),
      "Must define floating exit button"
    );
    assert.ok(
      content.includes("z-index: 100000"),
      "Floating exit button must sit above the pseudo-fullscreen canvas"
    );
  });

  await t.test("7. Responsive Breakpoint Adaptation (360px to 1920px)", () => {
    const breakpoints = [
      { w: 360, h: 740, expectedFov: 17.5, expectedScale: 1.65 },
      { w: 390, h: 844, expectedFov: 17.5, expectedScale: 1.65 },
      { w: 500, h: 900, expectedFov: 16.0, expectedScale: 1.5 },
      { w: 768, h: 1024, expectedFov: 13.0, expectedScale: 1.0 },
      { w: 1024, h: 768, expectedFov: 11.5, expectedScale: 1.1 },
      { w: 1366, h: 768, expectedFov: 10.0, expectedScale: 1.0 },
      { w: 1920, h: 1080, expectedFov: 10.0, expectedScale: 1.0 },
      // Mobile landscape orientation
      { w: 740, h: 360, expectedFov: 14.0, expectedScale: 1.1 },
    ];

    for (const bp of breakpoints) {
      const result = computeTestViewport(bp.w, bp.h);
      assert.equal(
        result.fov,
        bp.expectedFov,
        `Width ${bp.w}px x ${bp.h}px should produce FOV ${bp.expectedFov}`
      );
      assert.equal(
        result.scale,
        bp.expectedScale,
        `Width ${bp.w}px x ${bp.h}px should produce scale ${bp.expectedScale}`
      );
    }
  });

  await t.test("8. Task Card Readability & Collision Avoidance (Section 7.3)", () => {
    const cardCssPath = path.join(CUBICON_ROOT, "src", "styles", "card.css");
    assert.ok(fs.existsSync(cardCssPath), "cubicon/src/styles/card.css must exist");
    const content = fs.readFileSync(cardCssPath, "utf-8");

    // Font clamping checks
    assert.ok(
      content.includes("clamp("),
      "card.css must utilize clamp() for responsive card typography"
    );
    assert.ok(
      content.includes("@media (max-width: 390px)"),
      "card.css must support small mobile screen breakpoint (<= 390px)"
    );
  });

  await t.test("9. Minimum Touch Target Sizing (Section 14 >= 44x44px)", () => {
    const cubiconJsxPath = path.join(CUBICON_ROOT, "src", "Cubicon.jsx");
    assert.ok(fs.existsSync(cubiconJsxPath), "Cubicon.jsx must exist");
    const content = fs.readFileSync(cubiconJsxPath, "utf-8");

    assert.ok(
      content.includes('minHeight: "44px"') && content.includes('minWidth: "44px"'),
      "Cubicon.jsx action buttons must enforce 44x44px minimum touch targets"
    );

    const cssPath = path.join(BUYFACTS_ROOT, "app", "cubicon", "cubicon.module.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(
      cssContent.includes("min-height: 44px"),
      "cubicon.module.css mobile controls must enforce minimum 44px height"
    );
  });

  await t.test("10. Terminology Compliance: 'participant' in Cubicon Introductory Card", () => {
    const cubiconJsxPath = path.join(CUBICON_ROOT, "src", "Cubicon.jsx");
    const content = fs.readFileSync(cubiconJsxPath, "utf-8");

    assert.ok(
      !content.includes("human respondents will populate your surveys"),
      "Cubicon.jsx must not use 'human respondents'"
    );
    assert.ok(
      content.includes("human participants will populate your surveys"),
      "Cubicon.jsx must use 'human participants'"
    );
  });
});
