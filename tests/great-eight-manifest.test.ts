import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GREAT_EIGHT_CARDS,
  GREAT_EIGHT_CDN_BASE_URL,
  GREAT_EIGHT_SECTION,
  LEGACY_GREAT_EIGHT_URLS,
  resolveGreatEight,
  type GreatEightRow,
} from "../lib/greatEightManifest";
import { DEFAULT_GREAT_EIGHT } from "../app/api/great-eight/route";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

const EXPECTED_TITLES = [
  "Targeting Your Survey",
  "The Allure of Too Many Choices",
  "Stories Supported by Facts",
  "The Top Ten Market Research Best Practices",
  "The Art of Asking Great Survey Questions",
  "Executives Want Insight, Not Coffee Cards",
  "Build Content Fast from Survey Findings",
  "Avoid Death from Doubt",
];

test("The Great Eight Manifest Suite", async (t) => {
  await t.test("1. Section copy matches Robert's spec verbatim", () => {
    assert.equal(GREAT_EIGHT_SECTION.heading, "The Great Eight");
    assert.equal(GREAT_EIGHT_SECTION.subtitle, "Better Surveys, Smarter Research, and Putting the Findings to Work");
    assert.equal(GREAT_EIGHT_SECTION.byline, "From the Research Minds at BuyFacts");
    assert.deepEqual(GREAT_EIGHT_SECTION.pills, [
      "Better Questions, Better Research",
      "Fresh Thinking, Practical Ideas",
      "More Value from Your Findings",
    ]);
    assert.equal(
      GREAT_EIGHT_SECTION.banner,
      "Eight perspectives on making research more useful, from designing the survey to putting what you learn to work."
    );
  });

  await t.test("2. Eight cards numbered 01-08 with the exact titles and unique slugs", () => {
    assert.deepEqual(GREAT_EIGHT_CARDS.map((card) => card.title), EXPECTED_TITLES);
    GREAT_EIGHT_CARDS.forEach((card, index) => {
      assert.equal(card.number, String(index + 1).padStart(2, "0"));
      assert.equal(card.orderIndex, index + 1);
      assert.ok(card.summary.length > 0 && card.viewpoint.length > 0, `${card.slug} must have text`);
    });
    assert.equal(new Set(GREAT_EIGHT_CARDS.map((card) => card.slug)).size, 8);
  });

  await t.test("3. Media slots hold only CDN URLs, never shared and never a legacy placeholder", () => {
    const owners = new Map<string, string>();
    for (const card of GREAT_EIGHT_CARDS) {
      for (const url of [card.articleUrl, card.graphicUrl, card.audioUrl, card.iconUrl]) {
        if (!url) continue;
        assert.ok(url.startsWith(`${GREAT_EIGHT_CDN_BASE_URL}/`), `${card.slug}: ${url} must be on the CDN`);
        assert.ok(!LEGACY_GREAT_EIGHT_URLS.includes(url), `${card.slug} must not use a legacy placeholder`);
        if (url !== card.iconUrl) {
          assert.ok(!owners.has(url), `${url} is used by both ${owners.get(url)} and ${card.slug}`);
          owners.set(url, card.slug);
        }
      }
    }
  });

  await t.test("4. /api/great-eight fallback rows are derived from the manifest", () => {
    assert.deepEqual(
      DEFAULT_GREAT_EIGHT.map((item) => [item.orderIndex, item.slug, item.title, item.readItUrl, item.hearItUrl]),
      GREAT_EIGHT_CARDS.map((card) => [card.orderIndex, card.slug, card.title, card.articleUrl ?? "", card.audioUrl ?? ""])
    );
  });

  await t.test("5. resolveGreatEight matches rows by slug only and keeps manifest titles", () => {
    const rows: GreatEightRow[] = GREAT_EIGHT_CARDS.map((card) => ({
      slug: card.slug,
      tagline: `summary:${card.slug}`,
      description: `p1:${card.slug}\n\np2:${card.slug}`,
      readItUrl: `${GREAT_EIGHT_CDN_BASE_URL}/great-eight/${card.slug}.docx`,
      hearItUrl: `${GREAT_EIGHT_CDN_BASE_URL}/great-eight/${card.slug}.mp3`,
    }));
    // A row with a foreign slug in first position must not attach to card 01.
    const decoy = { slug: "decoy", tagline: "DECOY", readItUrl: "https://decoy/a.docx" } as GreatEightRow;
    const resolved = resolveGreatEight([decoy, ...rows].reverse());
    resolved.forEach((card, index) => {
      assert.equal(card.title, EXPECTED_TITLES[index]);
      assert.equal(card.summary, `summary:${card.slug}`);
      assert.deepEqual(card.viewpoint, [`p1:${card.slug}`, `p2:${card.slug}`]);
      assert.equal(card.articleUrl, `${GREAT_EIGHT_CDN_BASE_URL}/great-eight/${card.slug}.docx`);
      assert.equal(card.audioUrl, `${GREAT_EIGHT_CDN_BASE_URL}/great-eight/${card.slug}.mp3`);
    });
    assert.ok(!JSON.stringify(resolved).includes("DECOY"));
  });

  await t.test("6. The legacy placeholder document and empty links never override the manifest", () => {
    const resolved = resolveGreatEight(
      GREAT_EIGHT_CARDS.map((card, index) => ({
        slug: card.slug,
        readItUrl: LEGACY_GREAT_EIGHT_URLS[0],
        hearItUrl: index % 2 ? "   " : null,
        tagline: "",
        description: "",
      }))
    );
    resolved.forEach((card, index) => {
      const manifest = GREAT_EIGHT_CARDS[index];
      assert.equal(card.articleUrl, manifest.articleUrl);
      assert.equal(card.audioUrl, manifest.audioUrl);
      assert.equal(card.summary, manifest.summary);
      assert.deepEqual(card.viewpoint, manifest.viewpoint);
    });
  });

  await t.test("7. Homepage renders the section and cards from the manifest", () => {
    const page = read("app", "page.tsx");
    assert.ok(page.includes("@/lib/greatEightManifest"), "page must import the manifest");
    for (const field of ["heading", "subtitle", "byline", "pills", "banner"]) {
      assert.ok(page.includes(`GREAT_EIGHT_SECTION.${field}`), `page must render GREAT_EIGHT_SECTION.${field}`);
    }
    assert.ok(page.includes('fetch("/api/great-eight")') && page.includes("resolveGreatEight("));
    assert.ok(page.includes('role="button"') && page.includes("tabIndex={0}"), "cards must be keyboard accessible");
    assert.ok(page.includes("<GreatEightViewpointModal"), "cards must open the viewpoint modal");
    for (const legacy of ["Peer Share for Real People", "No Cash Incentive Stigma", "Robert&apos;s Research"]) {
      assert.ok(!page.includes(legacy), `legacy copy "${legacy}" must be gone`);
    }
  });

  await t.test("8. Viewpoint modal: header, audio slot, article reader, no !important", () => {
    const modal = read("components", "GreatEightViewpointModal.tsx");
    const css = read("components", "GreatEightViewpointModal.module.css");
    assert.ok(modal.includes('role="dialog"') && modal.includes('aria-modal="true"'));
    assert.ok(modal.includes("card.number") && modal.includes("card.title") && modal.includes("GREAT_EIGHT_SECTION.byline"));
    assert.ok(modal.includes("card.audioUrl") && modal.includes("<audio"), "modal must have the audio performance slot");
    assert.ok(modal.includes("card.articleUrl") && modal.includes("card.graphicUrl"), "modal must read article and graphic");
    assert.ok(!css.includes("!important"), "modal CSS must not use !important");
  });

  await t.test("9. Zero-Emoji Compliance", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const file of [
      ["lib", "greatEightManifest.ts"],
      ["components", "GreatEightViewpointModal.tsx"],
      ["tests", "great-eight-manifest.test.ts"],
    ]) {
      assert.ok(!emojiRegex.test(read(...file)), `${file.join("/")} must contain no emoji`);
    }
  });
});
