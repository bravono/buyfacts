import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");
const EXPECTED_CDN_VIDEO_URL =
  "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1792093688513-7zjffs-Faster_Digital_Asset_Creation_With_ResearchLib.mp4";

describe("Hero Triplet Button Middle Video Playback Test Suite", () => {
  it("should have RESEARCH_LIB_VIDEO_CDN constant defined with the exact CDN URL", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );

    assert.ok(
      pageContent.includes(EXPECTED_CDN_VIDEO_URL),
      "page.tsx must contain the exact public CDN video URL for Research Libs"
    );
    assert.ok(
      pageContent.includes("RESEARCH_LIB_VIDEO_CDN"),
      "page.tsx must declare the RESEARCH_LIB_VIDEO_CDN constant"
    );
  });

  it("should configure the middle triplet button with videoUrl and onClick handler", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );

    // Locate the middle button configuration (faster-digital-asset-creation)
    const buttonMatch = pageContent.match(
      /id:\s*["']faster-digital-asset-creation["'][\s\S]*?videoUrl:\s*RESEARCH_LIB_VIDEO_CDN[\s\S]*?onClick:\s*\(\)\s*=>/
    );

    assert.ok(
      buttonMatch,
      "Middle button (faster-digital-asset-creation) must have videoUrl and onClick wired"
    );
  });

  it("should provide ready-to-use video plumbing for the remaining left (Cubicon) and right (TRIAD) triplet buttons", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );

    assert.ok(
      pageContent.includes("CUBICON_VIDEO_CDN"),
      "page.tsx must declare CUBICON_VIDEO_CDN constant for the left button"
    );
    assert.ok(
      pageContent.includes("TRIAD_VIDEO_CDN"),
      "page.tsx must declare TRIAD_VIDEO_CDN constant for the right button"
    );

    const cubiconMatch = pageContent.match(
      /id:\s*["']validate-survey-participants["'][\s\S]*?videoUrl:\s*CUBICON_VIDEO_CDN[\s\S]*?onClick:\s*\(\)\s*=>/
    );
    assert.ok(
      cubiconMatch,
      "Left button (validate-survey-participants) must be plumbed with videoUrl: CUBICON_VIDEO_CDN and onClick handler"
    );

    const triadMatch = pageContent.match(
      /id:\s*["']market-changes-in-real-time["'][\s\S]*?videoUrl:\s*TRIAD_VIDEO_CDN[\s\S]*?onClick:\s*\(\)\s*=>/
    );
    assert.ok(
      triadMatch,
      "Right button (market-changes-in-real-time) must be plumbed with videoUrl: TRIAD_VIDEO_CDN and onClick handler"
    );
  });

  it("should implement video modal lightbox with full accessibility and player attributes", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );

    assert.ok(
      pageContent.includes("styles.videoModalOverlay"),
      "page.tsx must include the video modal overlay"
    );
    assert.ok(
      pageContent.includes('role="dialog"'),
      "Video modal must declare role='dialog' for accessibility"
    );
    assert.ok(
      pageContent.includes('aria-modal="true"'),
      "Video modal must declare aria-modal='true'"
    );
    assert.ok(
      pageContent.includes("styles.videoModalPlayer"),
      "Video modal must render video player element"
    );
    assert.ok(
      pageContent.includes("controls") &&
        pageContent.includes("autoPlay") &&
        pageContent.includes("playsInline"),
      "Video player element must include controls, autoPlay, and playsInline attributes"
    );
    assert.ok(
      pageContent.includes("id=\"close-video-modal-btn\""),
      "Video modal must provide a dedicated close button with id"
    );
    assert.ok(
      pageContent.includes("/research-lib"),
      "Video modal must link to /research-lib for deeper pathway exploration"
    );
  });

  it("should include Escape key and scroll lock handling for activeVideoModal", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );

    assert.ok(
      pageContent.includes("activeVideoModal?.isOpen"),
      "Scroll lock and Escape listener must account for activeVideoModal.isOpen"
    );
    assert.ok(
      pageContent.includes('document.body.style.overflow = "hidden"'),
      "Modal must lock body scroll when active"
    );
  });

  it("should define video modal styles in page.module.css", () => {
    const cssContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      "utf-8"
    );

    assert.ok(
      cssContent.includes(".videoModalOverlay"),
      "page.module.css must contain .videoModalOverlay"
    );
    assert.ok(
      cssContent.includes(".videoModalDialog"),
      "page.module.css must contain .videoModalDialog"
    );
    assert.ok(
      cssContent.includes(".videoModalPlayer"),
      "page.module.css must contain .videoModalPlayer"
    );
    assert.ok(
      cssContent.includes("aspect-ratio: 16 / 9"),
      "Video container should enforce 16:9 aspect ratio"
    );
  });
});

describe("Navbar Logo Tagline No-Wrap & Responsive Font Size Test Suite", () => {
  it("should preserve the logo tagline text in Navbar.tsx", () => {
    const navbarContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      "utf-8"
    );

    assert.ok(
      navbarContent.includes("Real Data - Real People"),
      "Navbar must retain the tagline 'Real Data - Real People'"
    );
    assert.ok(
      navbarContent.includes("styles.logoSubtitle"),
      "Navbar must use styles.logoSubtitle for the tagline element"
    );
  });

  it("should enforce white-space: nowrap on logo, logoTextWrapper, and logoSubtitle", () => {
    const navbarCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "Navbar.module.css"),
      "utf-8"
    );

    // .logo rule
    const logoRule = navbarCss.match(/\.logo\s*\{[\s\S]*?\}/);
    assert.ok(logoRule, ".logo CSS class must exist");
    assert.ok(
      logoRule[0].includes("white-space: nowrap"),
      ".logo must have white-space: nowrap"
    );
    assert.ok(
      logoRule[0].includes("flex-shrink: 0"),
      ".logo must have flex-shrink: 0 to prevent container squeezing"
    );

    // .logoTextWrapper rule
    const wrapperRule = navbarCss.match(/\.logoTextWrapper\s*\{[\s\S]*?\}/);
    assert.ok(wrapperRule, ".logoTextWrapper CSS class must exist");
    assert.ok(
      wrapperRule[0].includes("white-space: nowrap"),
      ".logoTextWrapper must have white-space: nowrap"
    );

    // .logoSubtitle rule
    const subtitleRule = navbarCss.match(/\.logoSubtitle\s*\{[\s\S]*?\}/);
    assert.ok(subtitleRule, ".logoSubtitle CSS class must exist");
    assert.ok(
      subtitleRule[0].includes("white-space: nowrap"),
      ".logoSubtitle must have white-space: nowrap"
    );
  });

  it("should use fluid clamp font-size on logoSubtitle instead of wrapping", () => {
    const navbarCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "Navbar.module.css"),
      "utf-8"
    );

    const subtitleRule = navbarCss.match(/\.logoSubtitle\s*\{[\s\S]*?\}/);
    assert.ok(subtitleRule, ".logoSubtitle CSS class must exist");
    assert.ok(
      subtitleRule[0].includes("clamp("),
      ".logoSubtitle must use clamp() for responsive font size scaling"
    );
  });

  it("should adjust tagline font size responsively across mobile breakpoints", () => {
    const navbarCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "Navbar.module.css"),
      "utf-8"
    );

    assert.ok(
      navbarCss.includes("@media (max-width: 768px)") &&
        navbarCss.includes("@media (max-width: 480px)"),
      "Navbar CSS must have 768px and 480px media queries"
    );

    // Verify responsive scaling rules exist inside media queries
    const media768 = navbarCss.match(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.logoSubtitle\s*\{[\s\S]*?\}/
    );
    assert.ok(media768, "768px media query must specify .logoSubtitle scaling");

    const media480 = navbarCss.match(
      /@media\s*\(max-width:\s*480px\)[\s\S]*?\.logoSubtitle\s*\{[\s\S]*?\}/
    );
    assert.ok(media480, "480px media query must specify .logoSubtitle scaling");
  });
});

describe("TripletButton Component Extended Capabilities Test Suite", () => {
  it("should support onClick handler and videoUrl in TripletButtonItem interface", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("onClick?:"),
      "TripletButtonItem must declare optional onClick handler"
    );
    assert.ok(
      componentContent.includes("videoUrl?:"),
      "TripletButtonItem must declare optional videoUrl property"
    );
  });

  it("should execute preventDefault and call item.onClick when action button is activated", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("e.preventDefault()"),
      "handleActionClick must invoke e.preventDefault() to handle client-side action"
    );
    assert.ok(
      componentContent.includes("item.onClick(e)"),
      "handleActionClick must call item.onClick(e)"
    );
    assert.ok(
      componentContent.includes('role={item.onClick ? "button" : undefined}'),
      "Element must announce role='button' when onClick is specified"
    );
  });
});

describe("Zero-Emoji Compliance Test Suite", () => {
  it("should contain zero emojis across all modified files", () => {
    const targetFiles = [
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      path.join(BUYFACTS_ROOT, "components", "Navbar.module.css"),
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
    ];

    const emojiRegex =
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

    for (const file of targetFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf-8");
        const match = content.match(emojiRegex);
        assert.equal(
          match,
          null,
          `File ${path.basename(file)} must not contain any emojis. Found: ${match?.[0]}`
        );
      }
    }
  });
});
