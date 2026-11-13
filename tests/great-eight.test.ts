import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_GREAT_EIGHT, GET } from "../app/api/great-eight/route";
import { ADMIN_MODEL_REGISTRY } from "../lib/admin/schemaRegistry";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("The Great Eight Model, API, and Media Component Test Suite", async (t) => {
  await t.test("1. DEFAULT_GREAT_EIGHT data integrity and title matching", () => {
    assert.equal(DEFAULT_GREAT_EIGHT.length, 8, "Must contain exactly 8 items");

    const expectedTitles = [
      "Targeting Your Survey",
      "The Allure of Too Many Choices",
      "Stories Supported by Facts",
      "The Top Ten Market Research Best Practices",
      "The Art of Asking Great Survey Questions",
      "Executives Want Insight, Not Coffee Cards",
      "Build Content Fast from Survey Findings",
      "Avoid Death from Doubt",
    ];

    for (let i = 0; i < expectedTitles.length; i++) {
      const item = DEFAULT_GREAT_EIGHT[i];
      assert.equal(item.orderIndex, i + 1, `Item ${i + 1} must have orderIndex ${i + 1}`);
      assert.equal(item.title, expectedTitles[i], `Item ${i + 1} title must match`);
      assert.ok(item.slug && item.slug.length > 0, `Item ${i + 1} must have slug`);
      // READ IT stays empty until Robert's viewpoint article for this card is on the CDN;
      // when set it must be a CDN DOCX or PDF.
      if (item.readItUrl) {
        assert.ok(
          item.readItUrl.startsWith("https://s3.buyfacts.com/") &&
            (item.readItUrl.endsWith(".docx") || item.readItUrl.endsWith(".pdf")),
          `Item ${i + 1} readItUrl must point to a CDN DOCX or PDF document`
        );
      }
    }
    const links = DEFAULT_GREAT_EIGHT.map((item) => item.readItUrl).filter(Boolean);
    assert.equal(new Set(links).size, links.length, "No two cards may share one article");
  });

  await t.test("2. GET /api/great-eight route returns valid payload", async () => {
    const res = await GET();
    assert.equal(res.status, 200, "GET /api/great-eight must respond with status 200");

    const data = await res.json();
    assert.equal(data.success, true, "Response payload must indicate success");
    assert.ok(Array.isArray(data.items), "Response must return an array of items");
    assert.equal(data.items.length, 8, "Must return 8 Great Eight items");

    const first = data.items[0];
    assert.equal(first.orderIndex, 1);
    assert.equal(first.title, "Targeting Your Survey");
  });

  await t.test("3. Admin Model Registry GreatEightItem definition", () => {
    const meta = ADMIN_MODEL_REGISTRY.greatEightItem;
    assert.ok(meta, "ADMIN_MODEL_REGISTRY must register greatEightItem");
    assert.equal(meta.category, "Content & Media", "Category must be Content & Media");
    assert.equal(meta.idField, "id", "ID field must be id");
    assert.equal(meta.defaultSortField, "orderIndex", "Sort field must be orderIndex");

    const fieldNames = meta.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("title"), "Must include title field");
    assert.ok(fieldNames.includes("slug"), "Must include slug field");
    assert.ok(fieldNames.includes("orderIndex"), "Must include orderIndex field");
    assert.ok(fieldNames.includes("readItUrl"), "Must include readItUrl field");
    assert.ok(fieldNames.includes("seeItUrl"), "Must include seeItUrl field");
    assert.ok(fieldNames.includes("hearItUrl"), "Must include hearItUrl field");
  });

  await t.test("4. MediaPlayer component specification without Mock in name", () => {
    const playerPath = path.join(BUYFACTS_ROOT, "components", "MediaPlayer.tsx");
    const playerCssPath = path.join(BUYFACTS_ROOT, "components", "MediaPlayer.module.css");

    assert.ok(fs.existsSync(playerPath), "components/MediaPlayer.tsx must exist");
    assert.ok(fs.existsSync(playerCssPath), "components/MediaPlayer.module.css must exist");

    const playerContent = fs.readFileSync(playerPath, "utf-8");

    // Must export MediaPlayer as default
    assert.ok(
      playerContent.includes("export default function MediaPlayer"),
      "Must export function MediaPlayer as default"
    );

    // Must define MediaPlayerProps
    assert.ok(
      playerContent.includes("export interface MediaPlayerProps"),
      "Must export interface MediaPlayerProps"
    );

    // Must support the four actions
    const actionLabels = ["SEE IT", "HEAR IT", "READ IT", "CONTACT US"];
    for (const label of actionLabels) {
      assert.ok(
        playerContent.includes(`<span>${label}</span>`),
        `MediaPlayer must support action button ${label}`
      );
    }
  });

  await t.test("5. Zero-Emoji Compliance across Great Eight and MediaPlayer files", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const files = [
      path.join(BUYFACTS_ROOT, "components", "MediaPlayer.tsx"),
      path.join(BUYFACTS_ROOT, "components", "MediaPlayer.module.css"),
      path.join(BUYFACTS_ROOT, "app", "api", "great-eight", "route.ts"),
      path.join(BUYFACTS_ROOT, "tests", "great-eight.test.ts"),
    ];

    for (const file of files) {
      assert.ok(fs.existsSync(file), `File ${file} must exist`);
      const content = fs.readFileSync(file, "utf-8");
      assert.equal(
        emojiRegex.test(content),
        false,
        `File ${path.basename(file)} must not contain any emojis.`
      );
    }
  });
});
