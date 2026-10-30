import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");
const EXPECTED_CDN_VIDEO_URL =
  "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1792572243537-m08z4w-BuyFacts_Research_Libs_Website_Preview_Cloned_Voice_Layout_Corrected_2026-10-16.mp4";

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

  it("should render triplet buttons as self-contained pill cards with vertical divider and left-aligned label", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );
    const cssContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("styles.btnDivider"),
      "TripletButton must include vertical divider inside the pill card"
    );
    assert.ok(
      componentContent.includes("showCaption = false"),
      "TripletButton must default showCaption to false so card text is self-contained inside the card"
    );
    assert.ok(
      cssContent.includes(".btnDivider"),
      "TripletButton.module.css must define .btnDivider styles"
    );
  });

  it("should render the new Hero section header, lead copy, and 3 bottom value pillars", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );
    const pageCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      "utf-8"
    );

    assert.ok(
      pageContent.includes("THE EARLY RECOGNITION COMPANY"),
      "Hero section must display 'THE EARLY RECOGNITION COMPANY' eyebrow"
    );
    assert.ok(
      pageContent.includes("BuyFacts Gives Marketers Earlier") &&
        pageContent.includes("Recognition, Better Choices, and More Time."),
      "Hero section must display the updated main heading"
    );
    assert.ok(
      pageContent.includes("More information isn&apos;t the answer.") &&
        pageContent.includes("helping marketers decide where to focus, what to do, and when to"),
      "Hero section must display the directional buyer research lead paragraph"
    );
    assert.ok(
      pageContent.includes("Recognize Earlier") &&
        pageContent.includes("See meaningful changes before they become obvious."),
      "Hero section must include the 'Recognize Earlier' value pillar"
    );
    assert.ok(
      pageContent.includes("Understand Choices") &&
        pageContent.includes("Gain time to consider possibilities and choose a direction."),
      "Hero section must include the 'Understand Choices' value pillar"
    );
    assert.ok(
      pageContent.includes("Act for Impact") &&
        pageContent.includes("Turn informed decisions into meaningful results."),
      "Hero section must include the 'Act for Impact' value pillar"
    );
    assert.ok(
      pageCss.includes(".heroPillarsGrid") && pageCss.includes(".heroPillarItem"),
      "page.module.css must define styles for the 3-column hero value pillars"
    );
  });

  it("should prevent orphan words on triplet buttons with non-breaking space and balanced wrap", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );
    const cssContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("preventOrphanWords"),
      "TripletButton.tsx must define and use preventOrphanWords"
    );
    assert.ok(
      componentContent.includes("preventOrphanWords(item.title)"),
      "TripletButton.tsx must apply preventOrphanWords to item.title in .btnLabel"
    );
    assert.ok(
      cssContent.includes("text-wrap: balance") && cssContent.includes("text-wrap: pretty"),
      "TripletButton.module.css must specify text-wrap: balance and pretty on .btnLabel"
    );
    assert.ok(
      cssContent.includes("clamp("),
      "TripletButton.module.css must use fluid clamp for font-size"
    );
  });

  it("should render hover cards strictly above the buttons without covering them", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );
    const cssContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      "utf-8"
    );
    const heroCssContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("item.hoverCard") &&
        componentContent.includes("styles.hoverCard"),
      "TripletButton.tsx must conditionally render hoverCard"
    );
    assert.ok(
      componentContent.includes("styles.hoverPointer"),
      "TripletButton.tsx must render hover pointer caret"
    );
    assert.ok(
      componentContent.includes("styles.hoverCallout"),
      "TripletButton.tsx must render callout box in hoverCard"
    );
    assert.ok(
      cssContent.includes("bottom: calc(100% + 14px)"),
      "hoverCard must be positioned above the button so it never covers up the button and avoids scrolling truncation"
    );
    assert.ok(
      heroCssContent.includes("overflow-y: visible"),
      "page.module.css hero section must have overflow-y: visible to prevent card clipping"
    );
  });

  it("should use viewport-safe width on hoverCard so cards never overflow the screen", () => {
    const cssContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      "utf-8"
    );

    assert.ok(
      cssContent.includes("width: min(460px, 92vw)"),
      "hoverCard must use viewport-clamped width: min(460px, 92vw)"
    );
    assert.ok(
      cssContent.includes('data-column="1"') && cssContent.includes('data-column="3"'),
      "CSS must define edge-anchor overrides for data-column=1 and data-column=3"
    );
  });

  it("should pass data-column to each TripletButton so edge cards never clip off-screen", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("column?: number"),
      "TripletButtonProps must declare optional column prop"
    );
    assert.ok(
      componentContent.includes("data-column={column}"),
      "TripletButton wrapper div must forward data-column attribute"
    );
    assert.ok(
      componentContent.includes("column={index + 1}"),
      "TripletButtonGroup must pass 1-based column index to each TripletButton"
    );
  });

  it("should apply preventOrphanWords to hover card title and prompt", () => {
    const componentContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );

    assert.ok(
      componentContent.includes("preventOrphanWords(item.hoverCard.title)"),
      "TripletButton must apply preventOrphanWords to hoverCard.title"
    );
    assert.ok(
      componentContent.includes("preventOrphanWords(item.hoverCard.prompt)"),
      "TripletButton must apply preventOrphanWords to hoverCard.prompt"
    );
  });

  it("should use SEE MORE as the action label on all three hero hover cards", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );

    const matches = [...pageContent.matchAll(/actionLabel:\s*["']SEE MORE["']/g)];
    assert.ok(
      matches.length >= 3,
      `All three hover cards must use actionLabel: "SEE MORE" — found ${matches.length}`
    );
  });

  it("should configure all three hero hover cards with exact mockup copy and dedicated tool links", () => {
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );
    const nextConfigContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "next.config.ts"),
      "utf-8"
    );

    // Cubicon
    assert.ok(
      pageContent.includes("Cubicon uses short, engaging puzzle challenges designed to distinguish human respondents from automated bots."),
      "page.tsx must contain exact Cubicon hover description"
    );
    assert.ok(
      pageContent.includes("Experience one of the puzzle challenges designed to distinguish humans from automated bots."),
      "page.tsx must contain exact Cubicon callout prompt"
    );
    assert.ok(
      pageContent.includes('actionHref: "/cubicon"'),
      "Cubicon hover card must link to /cubicon"
    );
    assert.ok(
      nextConfigContent.includes('source: "/cubion"') &&
        nextConfigContent.includes('destination: "/cubicon"'),
      "next.config.ts must rewrite /cubion to /cubicon"
    );

    // Research Libs
    assert.ok(
      pageContent.includes("Research Libs turns one survey into two valuable marketing resources:"),
      "page.tsx must contain exact Research Libs hover description"
    );
    assert.ok(
      pageContent.includes("Experience how survey answers can become engaging stories and useful marketing content."),
      "page.tsx must contain exact Research Libs callout prompt"
    );
    assert.ok(
      pageContent.includes('actionHref: "/research-lib"'),
      "Research Libs hover card must link to /research-lib"
    );

    // TRIAD
    assert.ok(
      pageContent.includes("Markets change before those changes become obvious. TRIAD is designed to measure shifts in buyer sentiment"),
      "page.tsx must contain exact TRIAD hover description"
    );
    assert.ok(
      pageContent.includes("Experience how measuring practical and emotional drivers can help reveal emerging directional patterns."),
      "page.tsx must contain exact TRIAD callout prompt"
    );
    assert.ok(
      pageContent.includes('actionHref: "/triad"'),
      "TRIAD hover card must link to /triad"
    );
  });

  it("should coordinate navbar auto-collapse when hovering over triplet buttons", () => {
    const navbarContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      "utf-8"
    );
    const tripletContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      "utf-8"
    );
    const pageContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      "utf-8"
    );
    const tripletCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      "utf-8"
    );

    assert.ok(
      navbarContent.includes("isCollapsed") &&
        navbarContent.includes("buyfacts:navbar-collapse"),
      "Navbar.tsx must support isCollapsed prop and listen for buyfacts:navbar-collapse events"
    );
    assert.ok(
      tripletContent.includes("buyfacts:navbar-collapse") &&
        tripletContent.includes("onHoverChange"),
      "TripletButton.tsx must dispatch buyfacts:navbar-collapse and notify onHoverChange"
    );
    assert.ok(
      pageContent.includes("isNavHoverCollapsed") &&
        pageContent.includes("isCollapsed={isNavHoverCollapsed}") &&
        pageContent.includes("onHoverChange={setIsNavHoverCollapsed}"),
      "page.tsx must wire isNavHoverCollapsed state between Navbar and TripletButtonGroup"
    );
    assert.ok(
      tripletCss.includes("z-index: 1100"),
      "TripletButton.module.css must elevate hoverCard z-index to 1100 during transitions"
    );
  });

  it("should enforce balanced orphan prevention across 3, 4, and 5-word phrases", async () => {
    // Dynamically import the preventOrphanWords utility from lib/orphan-prevention
    const { preventOrphanWords } = await import(
      "../lib/orphan-prevention"
    );

    // 3-word title: all 3 words bound so neither line 1 nor line 2 has an orphan single word
    const title3 = preventOrphanWords("Validate Survey Participants");
    assert.equal(
      title3,
      "Validate\u00A0Survey\u00A0Participants",
      "3-word titles must bind all words to prevent an isolated single-word line"
    );

    // 4-word title: pair 1+2 and 3+4 for balanced 2x2 wrapping
    const title4 = preventOrphanWords("Faster Digital Asset Creation");
    assert.equal(
      title4,
      "Faster\u00A0Digital Asset\u00A0Creation",
      "4-word titles must pair words as 2-and-2 so any line break yields 2 words per line"
    );

    // 5-word title: pair 1+2 and 3+4+5 for balanced 2 and 3 wrapping
    const title5 = preventOrphanWords("Market Changes in Real Time");
    assert.equal(
      title5,
      "Market\u00A0Changes in\u00A0Real\u00A0Time",
      "5-word titles must pair words as 2-and-3 so any line break yields at least 2 words per line"
    );
  });

  it("should configure hero and triplet elements with fluid vertical clamping to fit within non-mobile screens", () => {
    const pageCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      "utf-8"
    );
    const tripletCss = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      "utf-8"
    );

    assert.ok(
      pageCss.includes("min-height: 100svh"),
      "Hero section must use min-height: 100svh"
    );
    assert.ok(
      pageCss.includes("overflow-y: visible") && pageCss.includes("overflow-x: clip"),
      "Hero section must allow hover cards to extend vertically (overflow-y: visible) while clipping horizontal scroll"
    );
    assert.ok(
      tripletCss.includes("min-height: clamp("),
      "Triplet buttons must use clamp() on min-height to fit within viewport height"
    );
    assert.ok(
      tripletCss.includes("width: clamp("),
      "Triplet button icons must use clamp() to scale down responsively"
    );
  });
});

describe("Zero-Emoji Compliance Test Suite", () => {
  it("should contain zero emojis across all modified files", () => {
    const targetFiles = [
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      path.join(BUYFACTS_ROOT, "app", "triad", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "triad", "triad.module.css"),
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      path.join(BUYFACTS_ROOT, "components", "Navbar.module.css"),
      path.join(BUYFACTS_ROOT, "components", "TripletButton.tsx"),
      path.join(BUYFACTS_ROOT, "components", "TripletButton.module.css"),
      path.join(BUYFACTS_ROOT, "lib", "orphan-prevention.ts"),
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
