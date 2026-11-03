import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

test("Cubicon page: preview badges removed (user request)", async (t) => {
  const pagePath = path.join(ROOT, "app", "cubicon", "page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  await t.test("Video header status badge removed (VIDEO DEMO / PREVIEW COMPLETE)", () => {
    assert.ok(
      !content.includes("PREVIEW COMPLETE"),
      "PREVIEW COMPLETE badge must be removed"
    );
    assert.ok(
      !content.includes("VIDEO DEMO"),
      "VIDEO DEMO status badge must be removed"
    );
  });

  await t.test("NEXT STEP INSTRUCTION badge removed", () => {
    assert.ok(
      !content.includes("NEXT STEP INSTRUCTION"),
      "NEXT STEP INSTRUCTION badge must be removed"
    );
  });

  await t.test("Completion overlay still offers TRY IT YOURSELF NOW", () => {
    assert.ok(
      content.includes("TRY IT YOURSELF NOW"),
      "Completion CTA must remain"
    );
  });

  await t.test("Reload Video control still present", () => {
    assert.ok(
      content.includes("Reload Video"),
      "Reload Video control must remain"
    );
  });
});
