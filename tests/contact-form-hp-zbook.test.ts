import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ContactInquirySchema } from "../lib/validation/forms";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("HP ZBook Contact Form Integration Test Suite", async (t) => {
  const pagePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
  const cssPath = path.join(BUYFACTS_ROOT, "app", "page.module.css");
  const validationPath = path.join(BUYFACTS_ROOT, "lib", "validation", "forms.ts");

  assert.ok(fs.existsSync(pagePath), "app/page.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "app/page.module.css must exist");
  assert.ok(fs.existsSync(validationPath), "lib/validation/forms.ts must exist");

  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const validationContent = fs.readFileSync(validationPath, "utf-8");

  await t.test("1. Separate First Name and Last Name Inputs and Validation", () => {
    assert.ok(
      pageContent.includes('id="firstName"') && pageContent.includes('name="firstName"'),
      "Contact form must render a distinct firstName input"
    );
    assert.ok(
      pageContent.includes('id="lastName"') && pageContent.includes('name="lastName"'),
      "Contact form must render a distinct lastName input"
    );
    assert.ok(
      pageContent.includes("First Name") && pageContent.includes("Last Name"),
      "Contact form must render labels for First Name and Last Name"
    );

    assert.ok(
      pageContent.includes('firstName: ""') && pageContent.includes('lastName: ""'),
      "Form state must track firstName and lastName independently"
    );

    assert.ok(
      pageContent.includes("!formState.firstName.trim()") &&
      pageContent.includes("!formState.lastName.trim()"),
      "validateForm must verify both firstName and lastName are present"
    );

    const separateResult = ContactInquirySchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@analytical.org",
      company: "Babbage Engines",
      interest: "General Inquiry",
      message: "Exploring analytical survey frameworks.",
      isEighteen: true,
      hp_website: "",
    });
    assert.strictEqual(separateResult.success, true);
    if (separateResult.success) {
      assert.strictEqual(separateResult.data.name, "Ada Lovelace");
      assert.strictEqual(separateResult.data.firstName, "Ada");
      assert.strictEqual(separateResult.data.lastName, "Lovelace");
    }

    const directResult = ContactInquirySchema.safeParse({
      name: "Charles Babbage",
      email: "charles@analytical.org",
      company: "Babbage Engines",
      interest: "General Inquiry",
      message: "Difference engine specifications inquiry.",
      isEighteen: true,
      hp_website: "",
    });
    assert.strictEqual(directResult.success, true);
    if (directResult.success) {
      assert.strictEqual(directResult.data.name, "Charles Babbage");
    }

    const emptyResult = ContactInquirySchema.safeParse({
      firstName: "",
      lastName: "",
      email: "nobody@analytical.org",
      message: "Missing name inquiry.",
      isEighteen: true,
    });
    assert.strictEqual(emptyResult.success, false);
  });

  await t.test("2. Removal of All Contact Form Input Placeholders", () => {
    const formStart = pageContent.indexOf('id="contact-form"');
    assert.ok(formStart !== -1, "Contact form element must exist");
    const formEnd = pageContent.indexOf("</form>", formStart);
    assert.ok(formEnd !== -1, "Contact form closing tag must exist");
    const formSlice = pageContent.slice(formStart, formEnd);

    const placeholderMatches = formSlice.match(/placeholder\s*=\s*["'][^"']*["']/g);
    assert.strictEqual(
      placeholderMatches,
      null,
      `Contact form must not contain any placeholder attributes, but found: ${placeholderMatches?.join(", ")}`
    );
  });

  await t.test("3. Small Subscript Registered Trademark for BuyFacts", () => {
    const subRegisteredPattern = /BuyFacts\s*<sub\s+className=\{styles\.subRegistered\}>\s*®\s*<\/sub>/;
    assert.ok(
      subRegisteredPattern.test(pageContent),
      "BuyFacts must include small subscript registered trademark symbol with styles.subRegistered"
    );

    assert.ok(
      cssContent.includes(".subRegistered"),
      "page.module.css must define .subRegistered class"
    );
    assert.ok(
      cssContent.includes("vertical-align: sub;"),
      ".subRegistered must align to sub"
    );
    assert.ok(
      cssContent.includes("font-size: 0.55em;"),
      ".subRegistered must set a small font-size (0.55em)"
    );
  });

  await t.test("4. Corporate Email Validation Notice Outright Requirement", () => {
    const noticeText = "Email confirmation is required to validate a corporate email address.";
    
    assert.ok(
      pageContent.includes(noticeText),
      "Page must state outright: 'Email confirmation is required to validate a corporate email address.'"
    );

    assert.ok(
      cssContent.includes(".corporateNoticeBanner"),
      "page.module.css must define .corporateNoticeBanner class"
    );
    assert.ok(
      cssContent.includes(".emailRequirementNote"),
      "page.module.css must define .emailRequirementNote class"
    );
  });

  await t.test("5. HP ZBook and Workstation Viewport Height Compactness", () => {
    assert.ok(
      cssContent.includes(".contactSection"),
      "page.module.css must define .contactSection"
    );
    assert.ok(
      /\.contactSection\s*\{[^}]*padding:\s*3rem 0;/.test(cssContent),
      ".contactSection must use compact 3rem vertical padding"
    );

    assert.ok(
      /\.contactCard\s*\{[^}]*padding:\s*1\.6rem 2rem;/.test(cssContent),
      ".contactCard must use compact 1.6rem 2rem padding"
    );

    assert.ok(
      cssContent.includes(".formRowDouble"),
      "page.module.css must define .formRowDouble"
    );
    assert.ok(
      /grid-template-columns:\s*1fr 1fr/.test(cssContent),
      ".formRowDouble must arrange fields in 2 columns"
    );

    assert.ok(
      cssContent.includes(".textareaCompact"),
      "page.module.css must define .textareaCompact"
    );
    assert.ok(
      /min-height:\s*65px;/.test(cssContent),
      ".textareaCompact must have compact min-height (65px)"
    );

    assert.ok(
      cssContent.includes("@media (max-width: 768px)"),
      "page.module.css must include mobile media queries"
    );
    const mediaQueryIndex = cssContent.indexOf("@media (max-width: 768px)");
    const mediaQuerySlice = cssContent.slice(mediaQueryIndex);
    assert.ok(
      mediaQuerySlice.includes(".formRowDouble"),
      "Mobile media query must adapt .formRowDouble to single column"
    );
  });

  await t.test("6. Zero-Emoji Compliance across Modified Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const filesToCheck = [
      { name: "app/page.tsx", content: pageContent },
      { name: "app/page.module.css", content: cssContent },
      { name: "lib/validation/forms.ts", content: validationContent },
    ];

    for (const file of filesToCheck) {
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        assert.ok(
          !emojiRegex.test(line),
          `Emoji found in ${file.name} at line ${i + 1}: ${line}`
        );
      }
    }
  });
});
