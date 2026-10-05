import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

/**
 * Simulates the client-side hash navigation handler in app/cubicon/page.tsx
 */
function simulateHashNavigation(
  hash: string,
  state: {
    showForm: boolean;
    scrolledTargetId: string | null;
  }
) {
  const validHashes = [
    "#founding-client",
    "#founding-client-form",
    "#register-form",
    "#cubicon-registration-form",
  ];

  if (validHashes.includes(hash)) {
    state.showForm = true;
    const targetId =
      hash === "#cubicon-registration-form"
        ? "cubicon-registration-form"
        : hash === "#founding-client"
        ? "founding-client"
        : hash === "#founding-client-form"
        ? "founding-client-form"
        : "register-form";
    state.scrolledTargetId = targetId;
    return true;
  }

  return false;
}

test("Founding Client Form and Anchor Navigation Test Suite", async (t) => {
  const cubiconPagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
  const homePagePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");

  assert.ok(fs.existsSync(cubiconPagePath), "app/cubicon/page.tsx must exist");
  assert.ok(fs.existsSync(homePagePath), "app/page.tsx must exist");

  const cubiconContent = fs.readFileSync(cubiconPagePath, "utf-8");
  const homeContent = fs.readFileSync(homePagePath, "utf-8");

  await t.test("1. Required Element IDs and Anchors in app/cubicon/page.tsx", () => {
    // Primary anchor for http://localhost:3000/cubicon#founding-client
    assert.ok(
      cubiconContent.includes('id="founding-client"'),
      "Registration section must have id='founding-client'"
    );

    // Backward compatibility alias for existing links
    assert.ok(
      cubiconContent.includes('id="register-form"'),
      "Registration section must provide id='register-form' anchor"
    );

    // Explicit alias for founding-client-form
    assert.ok(
      cubiconContent.includes('id="founding-client-form"'),
      "Registration section must provide id='founding-client-form' anchor"
    );

    // Form element identifier
    assert.ok(
      cubiconContent.includes('id="cubicon-registration-form"'),
      "Form must have id='cubicon-registration-form'"
    );

    // Benefits section anchor preservation
    assert.ok(
      cubiconContent.includes('id="founding-client-benefits"'),
      "Benefits section id='founding-client-benefits' must remain intact"
    );
  });

  await t.test("2. Immediate Form Visibility by Default", () => {
    // showForm must default to true so users navigating to #founding-client immediately see the form
    assert.ok(
      cubiconContent.includes("useState(true)") &&
        cubiconContent.includes("const [showForm, setShowForm] = useState(true);"),
      "showForm state must be initialized to true by default"
    );

    // Contact information inputs must be present in the component markup
    assert.ok(cubiconContent.includes('id="firstName"'), "Must include firstName input");
    assert.ok(cubiconContent.includes('id="lastName"'), "Must include lastName input");
    assert.ok(cubiconContent.includes('id="email"'), "Must include email input");
    assert.ok(cubiconContent.includes('id="emailConfirm"'), "Must include emailConfirm input");
    assert.ok(cubiconContent.includes('id="submit-cubicon-form"'), "Must include submit button");

    // Urgency field must be removed from the form markup
    assert.ok(!cubiconContent.includes('id="urgency"'), "Must not include urgency input");

    // Cubicon human verification modal must be present
    assert.ok(
      cubiconContent.includes("/cubicon-app/index.html?sequence=contact_form"),
      "Must include Cubicon verification modal"
    );
  });

  await t.test("3. Hash Navigation Simulator: Happy Paths and Edge Cases", () => {
    const navState = {
      showForm: false,
      scrolledTargetId: null as string | null,
    };

    // Happy Path: #founding-client
    const res1 = simulateHashNavigation("#founding-client", navState);
    assert.equal(res1, true);
    assert.equal(navState.showForm, true);
    assert.equal(navState.scrolledTargetId, "founding-client");

    // Happy Path: #register-form
    navState.showForm = false;
    navState.scrolledTargetId = null;
    const res2 = simulateHashNavigation("#register-form", navState);
    assert.equal(res2, true);
    assert.equal(navState.showForm, true);
    assert.equal(navState.scrolledTargetId, "register-form");

    // Happy Path: #cubicon-registration-form
    navState.showForm = false;
    navState.scrolledTargetId = null;
    const res3 = simulateHashNavigation("#cubicon-registration-form", navState);
    assert.equal(res3, true);
    assert.equal(navState.showForm, true);
    assert.equal(navState.scrolledTargetId, "cubicon-registration-form");

    // Edge Cases: Unrelated hashes should not activate registration handler
    navState.showForm = false;
    navState.scrolledTargetId = null;
    const res4 = simulateHashNavigation("#unrelated-section", navState);
    assert.equal(res4, false);
    assert.equal(navState.showForm, false);
    assert.equal(navState.scrolledTargetId, null);

    const res5 = simulateHashNavigation("", navState);
    assert.equal(res5, false);
    assert.equal(navState.showForm, false);
    assert.equal(navState.scrolledTargetId, null);
  });

  await t.test("4. Homepage Banner CTA Link Integration", () => {
    assert.ok(
      homeContent.includes('href="/cubicon#founding-client"'),
      "Home page founding client banner button must link directly to /cubicon#founding-client"
    );
  });

  await t.test("5. Zero-Emoji Compliance across Modified Source Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

    const files = [
      cubiconPagePath,
      homePagePath,
      path.join(BUYFACTS_ROOT, "tests", "founding-client-form.test.ts"),
    ];

    for (const filePath of files) {
      const fileText = fs.readFileSync(filePath, "utf-8");
      assert.equal(
        fileText.match(emojiRegex),
        null,
        `File ${path.basename(filePath)} must not contain any emojis`
      );
    }
  });
});
