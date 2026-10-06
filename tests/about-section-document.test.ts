import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("About Section Document Integration Test Suite", async (t) => {
  const pagePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
  const cssPath = path.join(BUYFACTS_ROOT, "app", "page.module.css");

  assert.ok(fs.existsSync(pagePath), "app/page.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "app/page.module.css must exist");

  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  await t.test("1. About Section Structure, Anchor, and Old Text Removal", () => {
    // Section anchor
    assert.ok(
      pageContent.includes('id="about"'),
      "About section must retain id=\"about\" anchor"
    );

    // Section title
    assert.ok(
      pageContent.includes("styles.tealTitle"),
      "About section must render tealTitle component"
    );

    // Old description text must be removed
    const oldTextSnippet =
      "BuyFacts is a framework of methods and tools designed to help organizations recognize meaningful movement earlier";
    assert.ok(
      !pageContent.includes(oldTextSnippet),
      "The legacy About text description must be removed"
    );

    // Meet Our Team button must exist
    assert.ok(
      pageContent.includes('href="#team"'),
      "Meet Our Team link targeting #team must exist"
    );
    assert.ok(
      pageContent.includes("Meet Our Team"),
      "Meet Our Team button text must be present"
    );
  });

  await t.test("2. Document Heading, Lead, and Core Positioning Preservation", () => {
    // Title
    assert.ok(
      pageContent.includes("Who Is BuyFacts?"),
      "Document must contain title 'Who Is BuyFacts?'"
    );

    // Lead paragraph
    const leadSnippet =
      "BuyFacts is a hybrid research and professional services company that combines proprietary time-saving tools and methods with directional pattern recognition, human-validated research, and story-based evergreen assets to help B2B marketers cut through market noise, gain time, and make better competitive decisions.";
    assert.ok(
      pageContent.includes(leadSnippet),
      "Document must contain exact lead paragraph"
    );

    // Reality statements
    assert.ok(
      pageContent.includes("We built BuyFacts around a simple reality."),
      "Must contain 'We built BuyFacts around a simple reality.'"
    );
    assert.ok(
      pageContent.includes(
        "Marketers are being asked to do more with fewer resources while competing in markets crowded with more data, more content, more messages, and more noise."
      ),
      "Must contain reality statement about marketers' constraints"
    );
    assert.ok(
      pageContent.includes("The problem is no longer accessing information."),
      "Must contain 'The problem is no longer accessing information.'"
    );
    assert.ok(
      pageContent.includes(
        "The problem is recognizing what matters early enough to do something useful with it."
      ),
      "Must contain 'The problem is recognizing what matters early enough to do something useful with it.'"
    );
    assert.ok(
      pageContent.includes("That is where BuyFacts comes in."),
      "Must contain 'That is where BuyFacts comes in.'"
    );
  });

  await t.test("3. Time Cadence, 50 Percent Metric, and Earlier Recognition", () => {
    assert.ok(
      pageContent.includes("The goal is Earlier Recognition."),
      "Must contain 'The goal is Earlier Recognition.'"
    );
    assert.ok(
      pageContent.includes("Earlier Recognition creates time."),
      "Must contain 'Earlier Recognition creates time.'"
    );
    assert.ok(
      pageContent.includes("Time to understand."),
      "Must contain 'Time to understand.'"
    );
    assert.ok(
      pageContent.includes("Time to evaluate choices."),
      "Must contain 'Time to evaluate choices.'"
    );
    assert.ok(
      pageContent.includes("Time to test."),
      "Must contain 'Time to test.'"
    );
    assert.ok(
      pageContent.includes(
        "Time to act before a change becomes obvious to everyone else."
      ),
      "Must contain 'Time to act before a change becomes obvious to everyone else.'"
    );
    assert.ok(
      pageContent.includes("at least 50 percent"),
      "Must preserve the 'at least 50 percent' effort reduction metric"
    );
  });

  await t.test("4. Proprietary Tools and Approaches (TRIAD, Story, Human Validation, Rule of Three, Edutainment)", () => {
    const approaches = [
      "helps identify directional patterns and emerging movements that affect positioning and messages.",
      "adds context by showing what people are thinking, feeling, experiencing, and trying to accomplish behind the data.",
      "helps confirm that research participants are real people, not bots presenting themselves as respondents.",
      "turn findings into concise, reusable, co-branded content designed to make insight easier to understand, remember, share, and use.",
      "edutainment",
    ];

    assert.ok(pageContent.includes("TRIAD"), "Must mention TRIAD");
    assert.ok(
      pageContent.includes("Story-based research"),
      "Must mention Story-based research"
    );
    assert.ok(
      pageContent.includes("Human validation"),
      "Must mention Human validation"
    );
    assert.ok(
      pageContent.includes("Rule of Three assets"),
      "Must mention Rule of Three assets"
    );

    for (const approach of approaches) {
      assert.ok(
        pageContent.includes(approach),
        `Must contain proprietary approach description: ${approach}`
      );
    }
  });

  await t.test("5. Innovation Philosophy, History, and Mission Statements", () => {
    assert.ok(
      pageContent.includes("The result is research with a longer life."),
      "Must contain 'The result is research with a longer life.'"
    );
    assert.ok(
      pageContent.includes("Not simply a report."),
      "Must contain 'Not simply a report.'"
    );
    assert.ok(
      pageContent.includes("Not simply another content asset."),
      "Must contain 'Not simply another content asset.'"
    );
    assert.ok(
      pageContent.includes(
        "We also believe innovation should not require organizations to destroy what already works."
      ),
      "Must contain innovation belief statement"
    );
    assert.ok(
      pageContent.includes(
        "BuyFacts is designed around rapid evolution, not wholesale replacement."
      ),
      "Must contain rapid evolution statement"
    );
    assert.ok(
      pageContent.includes(
        "BuyFacts began in 2020 and grew from more than four decades of experience"
      ),
      "Must contain company origins statement"
    );
    assert.ok(
      pageContent.includes(
        "recognize earlier, gain time, create more choices, and make better competitive decisions."
      ),
      "Must contain client impact statement"
    );
    assert.ok(
      pageContent.includes("That is why BuyFacts exists."),
      "Must contain closing line 'That is why BuyFacts exists.'"
    );
  });

  await t.test("6. Placement Order: Document Must Reside Above Meet Our Team Button", () => {
    const docIndex = pageContent.indexOf("Who Is BuyFacts?");
    const teamButtonIndex = pageContent.indexOf("Meet Our Team");

    assert.ok(docIndex !== -1, "Document title must exist in page.tsx");
    assert.ok(
      teamButtonIndex !== -1,
      "Meet Our Team button must exist in page.tsx"
    );
    assert.ok(
      docIndex < teamButtonIndex,
      "The 'Who Is BuyFacts?' document must be positioned above the 'Meet Our Team' button"
    );
  });

  await t.test("7. CSS Stylesheet Class Specifications & Responsive Rules", () => {
    const requiredClasses = [
      ".aboutDocument",
      ".aboutDocTitle",
      ".aboutLead",
      ".aboutDocSection",
      ".aboutParagraph",
      ".aboutHighlightBlock",
      ".aboutHighlightTitle",
      ".aboutHighlightLead",
      ".aboutTimeList",
      ".aboutPillarsGrid",
      ".aboutPillarItem",
      ".aboutResultBox",
      ".aboutImpactQuote",
      ".aboutFinalCall",
      ".btnSecondary",
    ];

    for (const className of requiredClasses) {
      assert.ok(
        cssContent.includes(className),
        `CSS must define class: ${className}`
      );
    }

    // Responsive rule verification
    assert.ok(
      cssContent.includes("@media (max-width: 768px)"),
      "CSS must contain mobile media query"
    );
  });

  await t.test("8. Zero-Emoji Compliance across Modified Files", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      path.join(BUYFACTS_ROOT, "tests", "about-section-document.test.ts"),
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
