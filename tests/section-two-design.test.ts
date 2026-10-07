import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Section 2 Design Revamp Test Suite", async (t) => {
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
      pageContent.includes("Peer Benchmark Incentive Surveys"),
      "Section 2 must contain the exact title 'Peer Benchmark Incentive Surveys'"
    );

    // Primary Description
    assert.ok(
      pageContent.includes(
        "Real-Time Peer Comparisons. Relevant Insight for Eery participant."
      ),
      "Section 2 must retain the primary description verbatim"
    );

    // Secondary Description / Callout Banner
    assert.ok(
      pageContent.includes("styles.calloutBanner"),
      "Section 2 must render a styled calloutBanner component"
    );
    const normalizedPage = pageContent.replace(/\s+/g, " ");
    assert.ok(
      normalizedPage.includes(
        "Protect Data Quality - Remove Payola that Promotes Cash-Grab Perticipation"
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

  await t.test("3. All 8 Pillar Cards and Exact Titles Preserved", () => {
    const expectedCards = [
      {
        id: "survey-design",
        title: "Survey Design",
      },
      {
        id: "perticipant-insight-choices",
        title: "Perticipant Insight Choices",
      },
      {
        id: "traditional-story-based-instruments",
        title: "Traditional and Story-based Instruments",
      },
      {
        id: "best-practices",
        title: "Best Practices",
      },
      {
        id: "every-question-maps-to-its-purspose",
        title: "Every Question Maps to Its Purspose",
      },
      {
        id: "executives-get-peer-comparison-not-coffee-cards",
        title: "Executives Get peer Comparison Not Coffee Cards",
      },
      {
        id: "a-dual-approach-delivers-stories-backed-by-facts",
        title: "A Dual Approach Delivers Stories Backed by Facts",
      },
      {
        id: "inclusive-stakeholder-engagement-reduces-malicious-compliance",
        title: "Inclusive Stakeholder Engagement Reduces Malicious Compliance",
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
        `portfolioCards data must contain title: ${card.title}`
      );
      assert.ok(
        pageContent.includes("portfolio-card-${card.id}"),
        "Section 2 card element must have dynamic id portfolio-card-${card.id}"
      );
    }
  });

  await t.test("4. Card Component Architecture (Header Row, Index, Accent Bar)", () => {
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
  });

  await t.test("5. CSS Grid Specifications & Responsiveness", () => {
    // Grid desktop definition
    assert.ok(
      cssContent.includes(".servicesGrid {"),
      "CSS must define .servicesGrid"
    );
    assert.ok(
      cssContent.includes("grid-template-columns: repeat(4, 1fr)"),
      "CSS must set 4 columns for desktop servicesGrid"
    );

    // Tablet definition (1024px)
    assert.ok(
      cssContent.includes("grid-template-columns: repeat(2, 1fr)"),
      "CSS must adapt servicesGrid to 2 columns on tablet"
    );

    // Mobile definition (768px)
    assert.ok(
      cssContent.includes("grid-template-columns: 1fr"),
      "CSS must adapt servicesGrid to 1 column on mobile"
    );

    // Structured card CSS properties
    assert.ok(
      cssContent.includes(".serviceCard {"),
      "CSS must define .serviceCard"
    );
    assert.ok(
      cssContent.includes(".calloutBanner {"),
      "CSS must define .calloutBanner"
    );
    assert.ok(
      cssContent.includes(".cardAccentBar {"),
      "CSS must define .cardAccentBar"
    );
    assert.ok(
      cssContent.includes(".badgeDot {"),
      "CSS must define .badgeDot"
    );
  });

  await t.test("6. CDN Icon Integration and Fallback Architecture", () => {
    // ServiceCardIcon component existence
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

    // CSS class for CDN icon sizing
    assert.ok(
      cssContent.includes(".cardCdnIcon {"),
      "CSS must define .cardCdnIcon"
    );
    assert.ok(
      cssContent.includes("object-fit: contain;"),
      ".cardCdnIcon must maintain aspect ratio with object-fit: contain"
    );

    // CDN URLs for all 8 portfolio cards
    const expectedCdnIcons = [
      {
        id: "survey-design",
        iconFilename: "BuyFacts_Survey_Hosting.svg",
      },
      {
        id: "perticipant-insight-choices",
        iconFilename: "BuyFacts_Early_Recognition.svg",
      },
      {
        id: "traditional-story-based-instruments",
        iconFilename: "BuyFacts_Research_Tools_Concept.svg",
      },
      {
        id: "best-practices",
        iconFilename: "BuyFacts_Best_Practices_Keystone.svg",
      },
      {
        id: "every-question-maps-to-its-purspose",
        iconFilename: "BuyFacts_Question_Design.svg",
      },
      {
        id: "executives-get-peer-comparison-not-coffee-cards",
        iconFilename: "BuyFacts_Value_Quantification.svg",
      },
      {
        id: "a-dual-approach-delivers-stories-backed-by-facts",
        iconFilename: "BuyFacts_Thought_Leadership_TL1.svg",
      },
      {
        id: "inclusive-stakeholder-engagement-reduces-malicious-compliance",
        iconFilename: "BuyFacts_Bot_Detection.svg",
      },
    ];

    for (const item of expectedCdnIcons) {
      assert.ok(
        pageContent.includes(item.iconFilename),
        `Section 2 must configure CDN icon ${item.iconFilename} for ${item.id}`
      );
      assert.ok(
        pageContent.includes("https://s3.buyfacts.com/buyfacts-public-assets/uploads/"),
        "Section 2 CDN icons must use BuyFacts public assets CDN path"
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
