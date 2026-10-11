import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Cubicon Founding Client Facts & Sections Verification Suite", async (t) => {
  const cubiconPagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");

  assert.ok(fs.existsSync(cubiconPagePath), "app/cubicon/page.tsx must exist");
  const rawContent = fs.readFileSync(cubiconPagePath, "utf-8");
  // Normalize whitespace for text comparison across multiline JSX blocks
  const normalizedContent = rawContent.replace(/\s+/g, " ");

  await t.test("1. CUBICON FOUNDING CLIENT INVITATION Section Presence & Copy", () => {
    // Section anchor and title
    assert.ok(
      rawContent.includes('id="founding-client-invitation"'),
      "Must have section id='founding-client-invitation'"
    );
    assert.ok(
      normalizedContent.includes("Cubicon Founding Client Invitation"),
      "Must include 'Cubicon Founding Client Invitation' title"
    );

    // Subtitle copy
    assert.ok(
      normalizedContent.includes(
        "Become a Founding client and experience the future of survey participant validation."
      ),
      "Must include exact invitation subtitle"
    );

    // Body copy with invitation details
    assert.ok(
      normalizedContent.includes("BuyFacts is inviting qualified organizations to become the first users of") &&
        normalizedContent.includes("Cubriton") &&
        normalizedContent.includes("revolutionary validation method, designed to insure genuine human survey participation prior to pending commercial launch."),
      "Must include exact body copy for founding client invitation"
    );

    // Apply Now button linking to form on the same page
    assert.ok(
      rawContent.includes('id="invitation-apply-now-btn"'),
      "Exclusive invitation section must include 'invitation-apply-now-btn'"
    );
    assert.ok(
      rawContent.includes('href="#founding-client"'),
      "Apply now button must link to #founding-client anchor"
    );
    assert.ok(
      normalizedContent.includes("Apply Now"),
      "Must display 'Apply Now' button text"
    );
  });

  await t.test("2. WHY WE CREATED CUBICON Section Copy Verification", () => {
    assert.ok(
      normalizedContent.includes("Why We Created Cubicon"),
      "Must include 'Why We Created Cubicon' heading"
    );

    // Section rationale description
    assert.ok(
      normalizedContent.includes(
        "Organizations are placing increasing reliance on online research. Before people can place confidence in what people say, there must be confidence that people, rather than automated bots are the participants."
      ),
      "Must contain updated rationale statement"
    );

    // Visual validation methods card copy
    assert.ok(
      normalizedContent.includes(
        "Cubicon improves human survey participation though visual validation methods that automated bots are incapable evaluating."
      ),
      "Must contain exact visual validation statement"
    );

    // Real data from real people
    assert.ok(
      normalizedContent.includes("Real data from real people"),
      "Must contain 'Real data from real people'"
    );
  });

  await t.test("3. FOUNDING CLIENT BENEFITS Section Copy Verification", () => {
    assert.ok(
      rawContent.includes('id="founding-client-benefits"'),
      "Benefits section id must exist"
    );
    assert.ok(
      normalizedContent.includes("Founding Client Benefits"),
      "Must include 'Founding Client Benefits' heading"
    );

    // Benefit 1: 30% Wholesale Pricing
    assert.ok(
      normalizedContent.includes(
        "Permanent wholesale pricing 30% below current and future Cubicon prices"
      ),
      "Must include Benefit 1: Permanent wholesale pricing 30% below current and future Cubicon prices"
    );

    // Benefit 2: Taste Test
    assert.ok(
      normalizedContent.includes(
        "A taste test including one use with an upcoming survey or online activity allowing you to evaluate Cubicon under real world conditions using your own project"
      ),
      "Must include Benefit 2: Taste test evaluation"
    );

    // Benefit 3: Referral Bonus
    assert.ok(
      normalizedContent.includes(
        "One additional free survey validation test for introducing a new corporate client to Cubicon after a paid survey validation."
      ),
      "Must include Benefit 3: Additional survey validation test referral bonus"
    );

    // Benefit 4: Priority Access
    assert.ok(
      normalizedContent.includes(
        "Priority access to future Cubicon enhancements and other BuyFacts innovations"
      ),
      "Must include Benefit 4: Priority access to innovations"
    );
  });

  await t.test("4. FOUNDATION CLIENT REQUIREMENTS Section Copy Verification", () => {
    assert.ok(
      normalizedContent.includes("Foundation Client Requirements"),
      "Must include 'Foundation Client Requirements' heading"
    );

    // Requirement 1: US Headquarter B-2-B Organization
    assert.ok(
      normalizedContent.includes("Registration to US headquarter B-2-B organization"),
      "Must include Requirement 1: US headquarter B-2-B organization"
    );

    // Requirement 2: $100 Investment with 10% Bot Refund Guarantee
    assert.ok(
      normalizedContent.includes(
        "$100 investment to complete the trial test taste survey. The $100 fee is fully refundable on request if Cubicon does not uncover at 10% automated bots among the survey participants. In tests to date, bot participation often exceeded 30%."
      ),
      "Must include Requirement 2: $100 taste test investment and refundable bot guarantee"
    );

    // Requirement 3: 60-day start requirement
    assert.ok(
      normalizedContent.includes("Survey or online must begin within 60 days of registration"),
      "Must include Requirement 3: 60-day start requirement"
    );
  });

  await t.test("5. Navigation Anchors and Target IDs Consistency", () => {
    // Verify required navigation targets are intact
    assert.ok(rawContent.includes('id="founding-client"'), "id='founding-client' intact");
    assert.ok(rawContent.includes('id="founding-client-form"'), "id='founding-client-form' intact");
    assert.ok(rawContent.includes('id="register-form"'), "id='register-form' intact");
    assert.ok(rawContent.includes('id="cubicon-registration-form"'), "id='cubicon-registration-form' intact");
  });

  await t.test("6. Zero-Emoji Compliance across Modified and Test Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

    const filesToCheck = [
      cubiconPagePath,
      path.join(BUYFACTS_ROOT, "tests", "cubicon-founding-client-facts.test.ts"),
    ];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf-8");
      assert.equal(
        content.match(emojiRegex),
        null,
        `File ${path.basename(filePath)} must not contain emojis`
      );
    }
  });
});
