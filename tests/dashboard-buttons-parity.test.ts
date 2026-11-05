import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRODUCTION_DASHBOARD_BUTTONS } from "../prisma/seed-prod";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

const byCategory = (cat: string) =>
  PRODUCTION_DASHBOARD_BUTTONS.filter((b) => b.category === cat && !b.id.endsWith("-000"));

test("Dashboard Buttons Specification Test Suite (database-driven)", async (t) => {
  await t.test("1. Seed defines 9 Products & Services and 9 Research Imperatives buttons in order", () => {
    for (const [cat, prefix] of [
      ["Products & Services", "btn-srv"],
      ["Research Imperatives", "btn-tl"],
    ]) {
      const buttons = byCategory(cat);
      assert.equal(buttons.length, 9, `${cat} must have exactly 9 buttons`);
      buttons.forEach((b, i) => {
        assert.equal(b.id, `${prefix}-${String(i + 1).padStart(3, "0")}`);
        assert.ok(b.label.length > 0, "label must not be empty");
        assert.ok(b.descriptionText.length > 0, `${b.id} must have descriptionText`);
      });
      assert.equal(new Set(buttons.map((b) => b.label)).size, 9, `${cat} labels must be unique`);
    }
  });

  await t.test("2. Each page has a welcome row (btn-*-000) with description text", () => {
    for (const id of ["btn-srv-000", "btn-tl-000"]) {
      const row = PRODUCTION_DASHBOARD_BUTTONS.find((b) => b.id === id);
      assert.ok(row, `${id} must exist`);
      assert.ok(row!.descriptionText.length > 50, `${id} must carry the welcome text`);
    }
  });

  await t.test("3. seed.ts and seed-prod.ts agree on all button ids", () => {
    const files = [read("prisma", "seed.ts"), read("prisma", "seed-prod.ts")];
    for (const b of PRODUCTION_DASHBOARD_BUTTONS) {
      for (const content of files) {
        assert.ok(content.includes(`"id": "${b.id}"`), `${b.id} must be in both seed files`);
      }
    }
  });

  await t.test("4. Pages and components contain no hardcoded button content", () => {
    for (const file of [
      ["app", "products-services", "page.tsx"],
      ["app", "research-imperatives", "page.tsx"],
    ]) {
      const c = read(...file);
      assert.ok(!c.includes("DEFAULT_SERVICES_BUTTONS") && !c.includes("DEFAULT_TL_BUTTONS"));
      assert.ok(!c.includes("defaultFallback"), `${file.join("/")} must not use fallback content`);
      assert.ok(c.includes("descriptionText"), `${file.join("/")} must read descriptionText from the DB`);
    }
    assert.ok(!read("components", "DashboardAnimation", "DashboardAnimation.tsx").includes("DEFAULT_BUTTONS"));
    assert.ok(!read("app", "api", "buttons", "route.ts").includes("DEFAULT_BUTTONS"), "API must not auto-seed defaults");
  });

  await t.test("5. No code references the removed mediaUrl column on DashboardButton", () => {
    for (const file of [
      ["app", "api", "buttons", "route.ts"],
      ["app", "api", "storage", "diagnostics", "route.ts"],
      ["app", "api", "storage", "move", "route.ts"],
      ["app", "file-upload", "page.tsx"],
      ["scripts", "export-sql.ts"],
      ["prisma", "seed.ts"],
      ["prisma", "seed-prod.ts"],
    ]) {
      assert.ok(!read(...file).includes("mediaUrl"), `${file.join("/")} must not reference mediaUrl`);
    }
  });

  await t.test("6. Zero-Emoji Compliance", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(fs.readFileSync(__filename, "utf-8")));
  });
});
