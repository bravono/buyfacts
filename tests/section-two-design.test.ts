import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("The Great Eight Section 2 Design and Interactivity Test Suite", async (t) => {
  const pagePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
  const cssPath = path.join(BUYFACTS_ROOT, "app", "page.module.css");

  assert.ok(fs.existsSync(pagePath), "app/page.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "app/page.module.css must exist");

  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  // Copy and card data live in the manifest; the page renders them from it.
  const manifestContent = fs.readFileSync(path.join(BUYFACTS_ROOT, "lib", "greatEightManifest.ts"), "utf-8");
  const modalPath = path.join(BUYFACTS_ROOT, "components", "GreatEightViewpointModal.tsx");
  const modalCssPath = path.join(BUYFACTS_ROOT, "components", "GreatEightViewpointModal.module.css");

  await t.test("1. Section 2 Header, Copy, and Callout Banner Preservation", () => {
    assert.ok(pageContent.includes('id="portfolio"'), "Section 2 must retain the #portfolio anchor id");

    for (const copy of [
      "The Great Eight",
      "Better Surveys, Smarter Research, and Putting the Findings to Work",
      "From the Research Minds at BuyFacts",
      "Eight perspectives on making research more useful, from designing the survey to putting what you learn to work.",
    ]) {
      assert.ok(manifestContent.includes(`"${copy}"`), `Section 2 copy must include: ${copy}`);
    }
    for (const field of ["heading", "subtitle", "byline", "banner"]) {
      assert.ok(pageContent.includes(`GREAT_EIGHT_SECTION.${field}`), `page must render GREAT_EIGHT_SECTION.${field}`);
    }
    assert.ok(pageContent.includes("styles.calloutBanner"), "Section 2 must render a styled calloutBanner component");
    assert.ok(!pageContent.includes("Robert&apos;s Research"), "the old author credit must be replaced");
  });

  await t.test("2. Trust Badges System & Copy", () => {
    for (const badgeText of [
      "Better Questions, Better Research",
      "Fresh Thinking, Practical Ideas",
      "More Value from Your Findings",
    ]) {
      assert.ok(manifestContent.includes(`"${badgeText}"`), `Section 2 must contain badge text: ${badgeText}`);
    }
    assert.ok(pageContent.includes("GREAT_EIGHT_SECTION.pills"), "page must render the pills from the manifest");
    for (const legacy of ["Peer Share for Real People", "No Cash Incentive Stigma", "Participants Provide Accurate Data"]) {
      assert.ok(!pageContent.includes(legacy), `legacy badge "${legacy}" must be gone`);
    }
    assert.ok(
      pageContent.includes("styles.badgeNavy") &&
        pageContent.includes("styles.badgeBlue") &&
        pageContent.includes("styles.badgeTeal"),
      "All three badge color styles (Navy, Blue, Teal) must be utilized"
    );
    assert.ok(pageContent.includes("styles.badgeDot"), "Badges must include indicator dot styling");
  });

  await t.test("3. All 8 Pillar Cards and Exact Updated Titles Preserved", () => {
    const expectedCards = [
      { slug: "targeting-your-survey", title: "Targeting Your Survey", legacy: "Survey Design" },
      { slug: "the-allure-of-too-many-choices", title: "The Allure of Too Many Choices", legacy: "Participant Insight Choices" },
      { slug: "stories-supported-by-facts", title: "Stories Supported by Facts", legacy: "Traditional and Story-based Instruments" },
      { slug: "the-top-ten-market-research-best-practices", title: "The Top Ten Market Research Best Practices", legacy: "Best Practices" },
      { slug: "the-art-of-asking-great-survey-questions", title: "The Art of Asking Great Survey Questions", legacy: "Every Question Maps to Its Purpose" },
      { slug: "executives-want-insight-not-coffee-cards", title: "Executives Want Insight, Not Coffee Cards", legacy: "Executives Get Peer Comparison Not Coffee Cards" },
      { slug: "build-content-fast-from-survey-findings", title: "Build Content Fast from Survey Findings", legacy: "A Dual Approach Delivers Stories Backed by Facts" },
      { slug: "avoid-death-from-doubt", title: "Avoid Death from Doubt", legacy: "Inclusive Stakeholder Engagement Reduces Malicious Compliance" },
    ];

    assert.ok(pageContent.includes("styles.servicesGrid"), "Section 2 must render servicesGrid container");
    assert.ok(pageContent.includes("greatEightCards.map("), "cards must be rendered from the manifest");
    assert.ok(pageContent.includes("great-eight-card-${card.slug}"), "card element must have id great-eight-card-${card.slug}");

    for (const card of expectedCards) {
      assert.ok(manifestContent.includes(`slug: "${card.slug}"`), `manifest must contain card slug: ${card.slug}`);
      assert.ok(manifestContent.includes(`title: "${card.title}"`), `manifest must contain title: ${card.title}`);
      assert.ok(manifestContent.includes(`legacyTitle: "${card.legacy}"`), `manifest must record replaced title: ${card.legacy}`);
    }
  });

  await t.test("4. Card Component Architecture and Clickable Interaction", () => {
    for (const cls of ["styles.cardHeaderRow", "styles.cardIndex", "styles.cardAccentBar", "styles.serviceCardClickable"]) {
      assert.ok(pageContent.includes(cls), `Card structure must include ${cls}`);
    }
    assert.ok(pageContent.includes("{card.number}"), "Card index must show the manifest number (01 to 08)");
    assert.ok(manifestContent.includes('String(index + 1).padStart(2, "0")'), "numbers must be two digits");
    assert.ok(pageContent.includes('role="button"') && pageContent.includes("tabIndex={0}"), "cards must be focusable buttons");
    assert.ok(pageContent.includes('e.key === "Enter" || e.key === " "'), "cards must open with Enter and Space");
    assert.ok(pageContent.includes("setActiveGreatEightSlug(card.slug)"), "cards must open their own viewpoint by slug");
    assert.ok(pageContent.includes("<GreatEightViewpointModal"), "page must render the viewpoint modal");
    assert.ok(fs.existsSync(modalPath), "components/GreatEightViewpointModal.tsx must exist");
  });

  await t.test("5. CSS Grid Specifications & Responsiveness", () => {
    assert.ok(cssContent.includes(".servicesGrid {"), "CSS must define .servicesGrid");
    assert.ok(cssContent.includes("grid-template-columns: repeat(4, 1fr)"), "CSS must set 4 columns for desktop servicesGrid");
    assert.ok(cssContent.includes(".serviceCard {"), "CSS must define .serviceCard");
    assert.ok(cssContent.includes(".serviceCardClickable {"), "CSS must define .serviceCardClickable");
    const modalCss = fs.readFileSync(modalCssPath, "utf-8");
    assert.ok(modalCss.includes(".overlay {") && modalCss.includes(".dialog {"), "modal CSS must define overlay and dialog");
    assert.ok(!modalCss.includes("!important"), "modal CSS must not use !important");
    assert.ok(!cssContent.includes(".greatEightModalOverlay"), "the old page-level modal CSS must be removed");
  });

  await t.test("6. CDN Icon Integration and Fallback Architecture", () => {
    assert.ok(pageContent.includes("function GreatEightCardIcon"), "GreatEightCardIcon helper component must be defined");
    assert.ok(pageContent.includes("<GreatEightCardIcon card={card} />"), "cards must render GreatEightCardIcon inside iconCircle");
    assert.ok(pageContent.includes("setImageError(true)"), "GreatEightCardIcon must contain onError fallback handler");
    assert.ok(pageContent.includes("GREAT_EIGHT_FALLBACK_ICONS"), "each card must have a fallback icon");
    assert.ok(cssContent.includes(".cardCdnIcon {"), "CSS must define .cardCdnIcon");

    for (const iconFilename of [
      "BuyFacts_Survey_Hosting.svg",
      "BuyFacts_Early_Recognition.svg",
      "BuyFacts_Research_Tools_Concept.svg",
      "BuyFacts_Best_Practices_Keystone.svg",
      "BuyFacts_Question_Design.svg",
      "BuyFacts_Value_Quantification.svg",
      "BuyFacts_Thought_Leadership_TL1.svg",
      "BuyFacts_Bot_Detection.svg",
    ]) {
      assert.ok(manifestContent.includes(iconFilename), `Section 2 must configure CDN icon ${iconFilename}`);
    }
  });

  await t.test("7. Zero-Emoji Compliance across Modified Source & Test Files", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      path.join(BUYFACTS_ROOT, "tests", "section-two-design.test.ts"),
    ];

    for (const filePath of filesToCheck) {
      assert.ok(fs.existsSync(filePath), `${filePath} must exist`);
      const content = fs.readFileSync(filePath, "utf-8");
      const hasEmoji = emojiRegex.test(content);
      assert.equal(
        hasEmoji,
        false,
        `File ${path.basename(filePath)} must not contain any emojis.`
      );
    }
  });
});
