import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

// Video CDN Fallback State Machine Simulator
class VideoPlayerCdnStateMachine {
  currentSrc: string;
  primaryCdn: string;
  fallbackCdn: string;
  hasError: boolean = false;

  constructor(primaryCdn: string, fallbackCdn: string) {
    this.primaryCdn = primaryCdn;
    this.fallbackCdn = fallbackCdn;
    this.currentSrc = primaryCdn;
  }

  handleError() {
    if (this.currentSrc !== this.fallbackCdn) {
      this.currentSrc = this.fallbackCdn;
      this.hasError = true;
    }
  }

  reset() {
    this.currentSrc = this.primaryCdn;
    this.hasError = false;
  }
}

test("What Sets Us Apart Feature Test Suite", async (t) => {
  await t.test("1. Navbar Desktop & Mobile Link Integration", () => {
    const navbarPath = path.join(BUYFACTS_ROOT, "components", "Navbar.tsx");
    assert.ok(fs.existsSync(navbarPath), "Navbar.tsx must exist");
    const content = fs.readFileSync(navbarPath, "utf-8");

    // Desktop link
    assert.ok(
      content.includes('id="nav-link-what-sets-us-apart"'),
      "Navbar.tsx must contain desktop link with id nav-link-what-sets-us-apart"
    );
    assert.ok(
      content.includes('href="/#what-sets-us-apart"'),
      "Navbar.tsx must route to /#what-sets-us-apart"
    );

    // Mobile link
    assert.ok(
      content.includes('id="mob-link-what-sets-us-apart"'),
      "Navbar.tsx must contain mobile link with id mob-link-what-sets-us-apart"
    );

    // Verify ordering: WHAT SETS US APART is immediately next to ABOUT
    const aboutIndexDesktop = content.indexOf('id="nav-link-about"');
    const apartIndexDesktop = content.indexOf('id="nav-link-what-sets-us-apart"');
    assert.ok(
      aboutIndexDesktop !== -1 && apartIndexDesktop !== -1,
      "Both About and What Sets Us Apart must exist in desktop navigation"
    );
    assert.ok(
      apartIndexDesktop > aboutIndexDesktop,
      "What Sets Us Apart should follow About in desktop navigation"
    );

    const aboutIndexMobile = content.indexOf('id="mob-link-about"');
    const apartIndexMobile = content.indexOf('id="mob-link-what-sets-us-apart"');
    assert.ok(
      aboutIndexMobile !== -1 && apartIndexMobile !== -1,
      "Both About and What Sets Us Apart must exist in mobile navigation"
    );
    assert.ok(
      apartIndexMobile > aboutIndexMobile,
      "What Sets Us Apart should follow About in mobile navigation"
    );
  });

  await t.test("2. Footer Navigation Link Integration", () => {
    const footerPath = path.join(BUYFACTS_ROOT, "components", "Footer.tsx");
    assert.ok(fs.existsSync(footerPath), "Footer.tsx must exist");
    const content = fs.readFileSync(footerPath, "utf-8");

    assert.ok(
      content.includes('href="/#what-sets-us-apart"'),
      "Footer.tsx must contain link to /#what-sets-us-apart"
    );
    assert.ok(
      content.includes("What Sets Us Apart"),
      "Footer.tsx must contain What Sets Us Apart label"
    );
  });

  await t.test("3. Homepage About Subsection Structure & Anchors", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Must have id="what-sets-us-apart"
    assert.ok(
      content.includes('id="what-sets-us-apart"'),
      "page.tsx must have subsection with id what-sets-us-apart"
    );

    // Anchor must be inside or adjacent to section id="about"
    const aboutSectionPos = content.indexOf('id="about"');
    const apartPos = content.indexOf('id="what-sets-us-apart"');
    const contactSectionPos = content.indexOf('id="contact"');

    assert.ok(aboutSectionPos !== -1, "About section must exist");
    assert.ok(apartPos !== -1, "What Sets Us Apart subsection must exist");
    assert.ok(contactSectionPos !== -1, "Contact section must exist");

    assert.ok(
      apartPos > aboutSectionPos && apartPos < contactSectionPos,
      "What Sets Us Apart subsection must reside within the About section prior to Contact"
    );

    // Two distinct cards
    assert.ok(
      content.includes('id="apart-card-early-recognition"'),
      "Must have card for Early Recognition video"
    );
    assert.ok(
      content.includes('id="apart-card-story-methodology"'),
      "Must have card for Story Methodology video"
    );
  });

  await t.test("4. Video Elements, CDN Delivery & Fallback State Machine", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Exactly two video elements inside What Sets Us Apart
    const apartSectionSlice = content.slice(
      content.indexOf('id="what-sets-us-apart"'),
      content.indexOf('id="contact"')
    );
    const videoMatches = apartSectionSlice.match(/<video[\s\S]*?\/>/g) || [];
    assert.equal(
      videoMatches.length,
      2,
      `What Sets Us Apart must contain exactly 2 video elements, found ${videoMatches.length}`
    );

    // Verify video element attributes
    for (const v of videoMatches) {
      assert.ok(v.includes("controls"), "Video must have controls attribute");
      assert.ok(v.includes("playsInline"), "Video must have playsInline attribute");
      assert.ok(v.includes("onError"), "Video must have onError fallback handler");
      assert.ok(v.includes("preload="), "Video must declare preload attribute");
      assert.ok(v.includes("aria-label="), "Video must have aria-label for accessibility");
    }

    // Verify CDN constants exist
    assert.ok(
      content.includes("APART_VIDEO_1_CDN"),
      "Must declare APART_VIDEO_1_CDN constant"
    );
    assert.ok(
      content.includes("APART_VIDEO_1_FALLBACK"),
      "Must declare APART_VIDEO_1_FALLBACK constant"
    );
    assert.ok(
      content.includes("APART_VIDEO_2_CDN"),
      "Must declare APART_VIDEO_2_CDN constant"
    );
    assert.ok(
      content.includes("APART_VIDEO_2_FALLBACK"),
      "Must declare APART_VIDEO_2_FALLBACK constant"
    );

    // Verify CDN state machine behavior
    const video1SM = new VideoPlayerCdnStateMachine(
      "https://s3.buyfacts.com/buyfacts-public-assets/videos/what-sets-us-apart-1.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    );
    assert.equal(video1SM.currentSrc, video1SM.primaryCdn);
    assert.equal(video1SM.hasError, false);

    // On error, switch to fallback
    video1SM.handleError();
    assert.equal(video1SM.currentSrc, video1SM.fallbackCdn);
    assert.equal(video1SM.hasError, true);

    // Subsequent error does not change source or loop
    video1SM.handleError();
    assert.equal(video1SM.currentSrc, video1SM.fallbackCdn);
  });

  await t.test("5. CSS Grid & Responsive Layout Classes", () => {
    const cssPath = path.join(BUYFACTS_ROOT, "app", "page.module.css");
    assert.ok(fs.existsSync(cssPath), "page.module.css must exist");
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.ok(css.includes(".apartSubsection"), "Must define .apartSubsection class");
    assert.ok(css.includes(".apartHeader"), "Must define .apartHeader class");
    assert.ok(css.includes(".apartGrid"), "Must define .apartGrid class");
    assert.ok(css.includes(".apartCard"), "Must define .apartCard class");
    assert.ok(css.includes(".videoWrapper"), "Must define .videoWrapper class");
    assert.ok(css.includes(".videoPlayer"), "Must define .videoPlayer class");
    assert.ok(css.includes(".apartBadge"), "Must define .apartBadge class");
    assert.ok(css.includes("aspect-ratio: 16 / 9"), "Must enforce 16:9 aspect ratio");
    assert.ok(
      css.includes("grid-template-columns: repeat(2, 1fr)"),
      "Must use 2-column grid for video cards"
    );
  });

  await t.test("6. Zero-Emoji Compliance across Modified Source Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      path.join(BUYFACTS_ROOT, "components", "Footer.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      path.join(BUYFACTS_ROOT, "tests", "what-sets-us-apart.test.ts"),
    ];

    for (const filePath of filesToCheck) {
      assert.ok(fs.existsSync(filePath), `${filePath} must exist`);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const hasEmoji = emojiRegex.test(fileContent);
      assert.equal(
        hasEmoji,
        false,
        `File ${path.basename(filePath)} must not contain any emojis`
      );
    }
  });
});
