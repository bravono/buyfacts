import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Media Player Four Buttons & Responsive Layout Specification Test Suite", async (t) => {
  const playerTsxPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.tsx");
  const playerCssPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.module.css");
  const pageTsxPath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
  const pageCssPath = path.join(BUYFACTS_ROOT, "app", "page.module.css");

  assert.ok(fs.existsSync(playerTsxPath), "MockMediaPlayer.tsx must exist");
  assert.ok(fs.existsSync(playerCssPath), "MockMediaPlayer.module.css must exist");

  const playerTsx = fs.readFileSync(playerTsxPath, "utf-8").replace(/\r\n/g, "\n");
  const playerCss = fs.readFileSync(playerCssPath, "utf-8").replace(/\r\n/g, "\n");

  await t.test("1. Four Consistent Action Buttons with Uppercase Labels", () => {
    const expectedButtons = ["SEE IT", "HEAR IT", "READ IT", "CONTACT US"];

    for (const label of expectedButtons) {
      assert.ok(
        playerTsx.includes(`<span>${label}</span>`),
        `MockMediaPlayer.tsx must render exact uppercase label "${label}"`
      );
    }

    // Verify IDs and aria-labels
    assert.ok(playerTsx.includes('id="action-btn-see-it"'), "Must provide id action-btn-see-it");
    assert.ok(playerTsx.includes('id="action-btn-hear-it"'), "Must provide id action-btn-hear-it");
    assert.ok(playerTsx.includes('id="action-btn-read-it"'), "Must provide id action-btn-read-it");
    assert.ok(playerTsx.includes('id="action-btn-contact-us"'), "Must provide id action-btn-contact-us");

    assert.ok(playerTsx.includes('aria-label="SEE IT"'), "Must have aria-label SEE IT");
    assert.ok(playerTsx.includes('aria-label="HEAR IT"'), "Must have aria-label HEAR IT");
    assert.ok(playerTsx.includes('aria-label="READ IT"'), "Must have aria-label READ IT");
    assert.ok(playerTsx.includes('aria-label="CONTACT US"'), "Must have aria-label CONTACT US");
  });

  await t.test("2. Retain Icons for Each Action Button", () => {
    assert.ok(playerTsx.includes("<Video"), "SEE IT button must retain Video icon");
    assert.ok(playerTsx.includes("<Headphones"), "HEAR IT button must retain Headphones icon");
    assert.ok(playerTsx.includes("<FileText"), "READ IT button must retain FileText icon");
    assert.ok(playerTsx.includes("<Mail"), "CONTACT US button must retain Mail icon");
  });

  await t.test("3. Dimensions Enforced in CSS: 120px Width and 36px Height", () => {
    assert.ok(
      playerCss.includes("width: 120px;"),
      "roundedActionBtn must enforce width: 120px;"
    );
    assert.ok(
      playerCss.includes("height: 36px;"),
      "roundedActionBtn must enforce height: 36px;"
    );
    assert.ok(
      playerCss.includes("min-width: 120px;"),
      "roundedActionBtn must enforce min-width: 120px;"
    );
    assert.ok(
      playerCss.includes("max-width: 120px;"),
      "roundedActionBtn must enforce max-width: 120px;"
    );
    assert.ok(
      playerCss.includes("flex: 0 0 120px;"),
      "roundedActionBtn must fix flex basis to 120px"
    );
  });

  await t.test("4. Equal Sizes and 12px Gap between Buttons", () => {
    assert.ok(
      playerCss.includes("gap: 12px;"),
      "actionButtonsRow must define gap: 12px;"
    );
    assert.ok(
      playerCss.includes("box-sizing: border-box;"),
      "roundedActionBtn must use border-box to ensure identical total bounds"
    );
  });

  await t.test("5. Responsive Layout with Dynamic Column Rearrangement", () => {
    assert.ok(
      playerCss.includes("flex-wrap: wrap;"),
      "actionButtonsRow must declare flex-wrap: wrap to allow rearranging into fewer columns"
    );
    assert.ok(
      playerCss.includes("justify-content: center;"),
      "actionButtonsRow must center rearranged buttons across viewports"
    );

    // Verify mobile media query does not stretch buttons to 1fr
    const mobileQueryMatch = playerCss.match(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.actionButtonsRow\s*\{([\s\S]*?)\}/);
    assert.ok(mobileQueryMatch, "Must contain media query for mobile actionButtonsRow");
    const mobileRules = mobileQueryMatch[1];
    assert.ok(
      !mobileRules.includes("grid-template-columns: 1fr"),
      "Mobile actionButtonsRow must not stretch buttons to full-width (1fr)"
    );
    assert.ok(
      mobileRules.includes("flex-wrap: wrap"),
      "Mobile actionButtonsRow must preserve flex-wrap: wrap"
    );
    assert.ok(
      mobileRules.includes("gap: 12px"),
      "Mobile actionButtonsRow must preserve gap: 12px"
    );
  });

  await t.test("6. Other Buttons Do Not Take Width of Parent Container & Center Alignment", () => {
    const pageTsx = fs.readFileSync(pageTsxPath, "utf-8").replace(/\r\n/g, "\n");
    const pageCss = fs.readFileSync(pageCssPath, "utf-8").replace(/\r\n/g, "\n");
    const cubiconTsxPath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    const cubiconTsx = fs.readFileSync(cubiconTsxPath, "utf-8").replace(/\r\n/g, "\n");

    // Contact submit button should not be width: 100% and must be center aligned
    assert.ok(
      !pageTsx.includes('id="contact-submit-btn"\n                  style={{ width: "100%"'),
      "contact-submit-btn inline style must not enforce width 100%"
    );
    assert.ok(
      pageTsx.includes('id="contact-submit-btn"'),
      "contact-submit-btn must exist"
    );
    assert.ok(
      pageTsx.includes('width: "fit-content"') && pageTsx.includes('alignSelf: "center"'),
      "contact-submit-btn must use width fit-content and alignSelf center"
    );

    assert.ok(
      pageCss.includes("width: fit-content;") && pageCss.includes("align-self: center;"),
      "page.module.css submitBtn must use width: fit-content; and align-self: center;"
    );

    // Founding client form Continue button should not take entire width of parent container
    assert.ok(
      cubiconTsx.includes('key="continue-btn"'),
      "Founding client form must include continue-btn"
    );
    assert.ok(
      !cubiconTsx.includes('key="continue-btn"\n                        type="button"\n                        onClick={nextStep}\n                        className="btn btn-primary"\n                        style={{\n                          padding: "1.1rem",\n                          fontSize: "1.1rem",\n                          flex: 2,\n                        }}'),
      "Founding client continue button must not take entire width with flex: 2"
    );
    assert.ok(
      cubiconTsx.includes('key="continue-btn"\n                        type="button"\n                        onClick={nextStep}\n                        className="btn btn-primary"\n                        style={{\n                          padding: "0.85rem 2.2rem",\n                          fontSize: "1.05rem",\n                          width: "fit-content",\n                        }}'),
      "Founding client continue button must use width fit-content with padding"
    );
  });

  await t.test("7. Zero-Emoji Compliance across All Affected Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(playerTsx), "MockMediaPlayer.tsx must contain zero emojis");
    assert.ok(!emojiRegex.test(playerCss), "MockMediaPlayer.module.css must contain zero emojis");
  });
});
