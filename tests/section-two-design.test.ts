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

  await t.test("1. Section 2 Header, Copy, and Callout Banner Preservation", () => {
    // Section 2 anchor
    assert.ok(
      pageContent.includes('id="portfolio"'),
      "Section 2 must retain the #portfolio anchor id"
    );

    // Header Title
    assert.ok(
      pageContent.includes("The Great Eight"),
      "Section 2 must contain the updated title 'The Great Eight'"
    );

    // Primary Subtitle
    assert.ok(
      pageContent.includes(
        "Better Surveys, Smarter Research, and Putting the Findings to Work"
      ),
      "Section 2 must retain the updated subtitle verbatim"
    );

    // Author credit
    assert.ok(
      pageContent.includes("From Robert&apos;s Research and Robert&apos;s Way") ||
        pageContent.includes("From Robert's Research and Robert's Way"),
      "Section 2 must contain the author attribution"
    );

    // Callout Banner
    assert.ok(
      pageContent.includes("styles.calloutBanner"),
      "Section 2 must render a styled calloutBanner component"
    );
    assert.ok(
      pageContent.includes(
        "Fresh Thinking, Practical Ideas, More Value from Your Findings"
      ),
      "Section 2 must include the callout heading"
    );
    assert.ok(
      pageContent.includes(
        "Eight perspectives on making research more useful, from designing the survey to putting what you learn to work."
      ),
      "Section 2 must preserve the callout text verbatim"
    );
  });

  await t.test("2. Trust Badges System & Copy", () => {
    const badges = [
      "Peer Share for Real People",
      "No Cash Incentive Stigma",
      "Participants Provide Accurate Data",
    ];

    for (const badgeText of badges) {
      assert.ok(
        pageContent.includes(badgeText),
        `Section 2 must contain badge text: ${badgeText}`
      );
    }

    assert.ok(
      pageContent.includes("styles.badgeNavy") &&
        pageContent.includes("styles.badgeBlue") &&
        pageContent.includes("styles.badgeTeal"),
      "All three badge color styles (Navy, Blue, Teal) must be utilized"
    );

    assert.ok(
      pageContent.includes("styles.badgeDot"),
      "Badges must include indicator dot styling"
    );
  });

  await t.test("3. All 8 Pillar Cards and Exact Updated Titles Preserved", () => {
    const expectedCards = [
      {
        id: "survey-design",
        slug: "targeting-your-survey",
        title: "Targeting Your Survey",
      },
      {
        id: "participant-insight-choices",
        slug: "the-allure-of-too-many-choices",
        title: "The Allure of Too Many Choices",
      },
      {
        id: "traditional-story-based-instruments",
        slug: "stories-supported-by-facts",
        title: "Stories Supported by Facts",
      },
      {
        id: "best-practices",
        slug: "the-top-ten-market-research-best-practices",
        title: "The Top Ten Market Research Best Practices",
      },
      {
        id: "every-question-maps-to-its-purpose",
        slug: "the-art-of-asking-great-survey-questions",
        title: "The Art of Asking Great Survey Questions",
      },
      {
        id: "executives-get-peer-comparison-not-coffee-cards",
        slug: "executives-want-insight-not-coffee-cards",
        title: "Executives Want Insight, Not Coffee Cards",
      },
      {
        id: "a-dual-approach-delivers-stories-backed-by-facts",
        slug: "build-content-fast-from-survey-findings",
        title: "Build Content Fast from Survey Findings",
      },
      {
        id: "inclusive-stakeholder-engagement-reduces-malicious-compliance",
        slug: "avoid-death-from-doubt",
        title: "Avoid Death from Doubt",
      },
    ];

    assert.ok(
      pageContent.includes("styles.servicesGrid"),
      "Section 2 must render servicesGrid container"
    );

    for (const card of expectedCards) {
      assert.ok(
        pageContent.includes(`id: "${card.id}"`),
        `portfolioCards data must contain card id: ${card.id}`
      );
      assert.ok(
        pageContent.includes(`title: "${card.title}"`),
        `portfolioCards data must contain updated title: ${card.title}`
      );
      assert.ok(
        pageContent.includes("portfolio-card-${card.id}"),
        "Section 2 card element must have dynamic id portfolio-card-${card.id}"
      );
    }
  });

  await t.test("4. Card Component Architecture and Clickable Interaction", () => {
    assert.ok(
      pageContent.includes("styles.cardHeaderRow"),
      "Card structure must include cardHeaderRow"
    );
    assert.ok(
      pageContent.includes("styles.cardIndex"),
      "Card structure must include cardIndex"
    );
    assert.ok(
      pageContent.includes("String(index + 1).padStart(2, \"0\")"),
      "Card index must format numbers sequentially as two digits (01 to 08)"
    );
    assert.ok(
      pageContent.includes("styles.cardAccentBar"),
      "Card structure must include cardAccentBar for micro-interaction hover highlight"
    );
    assert.ok(
      pageContent.includes("styles.serviceCardClickable"),
      "Cards must apply serviceCardClickable class"
    );
    assert.ok(
      pageContent.includes("handleCardClick"),
      "Cards must attach handleCardClick handler"
    );
    assert.ok(
      pageContent.includes("activeGreatEightModal"),
      "Page must track activeGreatEightModal state"
    );
    assert.ok(
      pageContent.includes("<MediaPlayer"),
      "Modal must render MediaPlayer component for audio, document, and video viewing"
    );
  });

  await t.test("5. CSS Grid Specifications & Responsiveness", () => {
    assert.ok(
      cssContent.includes(".servicesGrid {"),
      "CSS must define .servicesGrid"
    );
    assert.ok(
      cssContent.includes("grid-template-columns: repeat(4, 1fr)"),
      "CSS must set 4 columns for desktop servicesGrid"
    );
    assert.ok(
      cssContent.includes(".serviceCard {"),
      "CSS must define .serviceCard"
    );
    assert.ok(
      cssContent.includes(".serviceCardClickable {"),
      "CSS must define .serviceCardClickable"
    );
    assert.ok(
      cssContent.includes(".greatEightModalOverlay {"),
      "CSS must define .greatEightModalOverlay"
    );
    assert.ok(
      cssContent.includes(".greatEightModalDialog {"),
      "CSS must define .greatEightModalDialog"
    );
  });

  await t.test("6. CDN Icon Integration and Fallback Architecture", () => {
    assert.ok(
      pageContent.includes("function ServiceCardIcon"),
      "ServiceCardIcon helper component must be defined"
    );
    assert.ok(
      pageContent.includes("<ServiceCardIcon card={card} />"),
      "Section 2 cards must render ServiceCardIcon inside iconCircle"
    );
    assert.ok(
      pageContent.includes("setImageError(true)"),
      "ServiceCardIcon must contain onError fallback handler"
    );

    assert.ok(
      cssContent.includes(".cardCdnIcon {"),
      "CSS must define .cardCdnIcon"
    );

    const expectedCdnIcons = [
      { id: "survey-design", iconFilename: "BuyFacts_Survey_Hosting.svg" },
      { id: "participant-insight-choices", iconFilename: "BuyFacts_Early_Recognition.svg" },
      { id: "traditional-story-based-instruments", iconFilename: "BuyFacts_Research_Tools_Concept.svg" },
      { id: "best-practices", iconFilename: "BuyFacts_Best_Practices_Keystone.svg" },
      { id: "every-question-maps-to-its-purpose", iconFilename: "BuyFacts_Question_Design.svg" },
      { id: "executives-get-peer-comparison-not-coffee-cards", iconFilename: "BuyFacts_Value_Quantification.svg" },
      { id: "a-dual-approach-delivers-stories-backed-by-facts", iconFilename: "BuyFacts_Thought_Leadership_TL1.svg" },
      { id: "inclusive-stakeholder-engagement-reduces-malicious-compliance", iconFilename: "BuyFacts_Bot_Detection.svg" },
    ];

    for (const item of expectedCdnIcons) {
      assert.ok(
        pageContent.includes(item.iconFilename),
        `Section 2 must configure CDN icon ${item.iconFilename} for ${item.id}`
      );
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
