import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ALL_DASHBOARD_TOPICS,
  CDN_BASE_URL,
  DASHBOARD_TOPICS_MANIFEST,
  INNOVATIONS_DASHBOARD,
  LEGACY_CROSS_WIRED_URLS,
  ROLES_AND_TOPICS_DASHBOARD,
  resolveDashboard,
  type DashboardButtonRow,
  type DashboardManifest,
} from "../lib/dashboardTopicsManifest";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

const EXPECTED: Record<string, Array<[id: string, label: string]>> = {
  "research-imperatives": [
    ["roles-and-topics", "Roles and Topics"],
    ["cxo", "CxO"],
    ["chief-marketing-officer", "Chief Marketing Officer"],
    ["marketer", "Marketer"],
    ["researcher", "Researcher"],
    ["early-recognition", "Early Recognition"],
    ["building-great-surveys", "Building Great Surveys"],
    ["agency-principal", "Agency Principal"],
    ["buyfacts-methods", "BuyFacts Methods"],
    ["stewardship", "Stewardship"],
  ],
  "products-services": [
    ["innovations-that-save-time", "Innovations That Save Time"],
    ["cubicon", "Cubicon"],
    ["triad", "TRIAD"],
    ["research-libs", "Research Libs"],
    ["rule-of-three", "Rule of Three"],
    ["research-planner", "Research Planner"],
    ["survey-improvement", "Survey Improvement"],
    ["survey-creation", "Survey Creation"],
    ["survey-fieldwork", "Survey Fieldwork"],
    ["research-led-content", "Research-Led Content"],
  ],
};

const PREFIX: Record<string, string> = { "research-imperatives": "btn-tl", "products-services": "btn-srv" };

/** id -> label pairs declared in a seed file (parsed as text: importing seeds runs main()). */
function seedLabels(file: string): Map<string, string> {
  const pairs = new Map<string, string>();
  for (const m of read("prisma", file).matchAll(/"id": "(btn-(?:tl|srv)-\d{3})",\s*"label": "([^"]+)"/g)) {
    pairs.set(m[1], m[2]);
  }
  return pairs;
}

/** The SEE IT / READ IT / HEAR IT links a seed file declares for one row. */
function seedUrls(file: string, rowId: string): { seeItUrl: string; readItUrl: string; hearItUrl: string } {
  const src = read("prisma", file);
  const start = src.indexOf(`"id": "${rowId}"`);
  assert.ok(start >= 0, `${file}: ${rowId} must exist`);
  const block = src.slice(start, src.indexOf("}", start));
  const field = (name: string) => {
    const m = block.match(new RegExp(`"${name}": "([^"]*)"`));
    assert.ok(m, `${file}: ${rowId} must declare ${name}`);
    return m[1];
  };
  return { seeItUrl: field("seeItUrl"), readItUrl: field("readItUrl"), hearItUrl: field("hearItUrl") };
}

test("Dashboard Topics Manifest Suite", async (t) => {
  await t.test("1. Each dashboard has exactly the 10 specified topics, ids and labels, in order", () => {
    for (const [key, expected] of Object.entries(EXPECTED)) {
      const manifest = DASHBOARD_TOPICS_MANIFEST[key as keyof typeof DASHBOARD_TOPICS_MANIFEST];
      assert.deepEqual(
        manifest.topics.map((topic) => [topic.id, topic.label]),
        expected,
        `${key} topics must match the specification exactly`
      );
      assert.equal(manifest.title, expected[0][1], `${key} title must equal its overview topic label`);
    }
    assert.equal(ALL_DASHBOARD_TOPICS.length, 20, "20 topics in total");
    assert.equal(new Set(ALL_DASHBOARD_TOPICS.map((topic) => topic.id)).size, 20, "topic ids must be unique");
  });

  await t.test("2. Positions and DashboardButton row ids are sequential (000 = overview)", () => {
    for (const manifest of [ROLES_AND_TOPICS_DASHBOARD, INNOVATIONS_DASHBOARD]) {
      manifest.topics.forEach((topic, index) => {
        assert.equal(topic.position, index + 1);
        assert.equal(topic.buttonId, `${PREFIX[manifest.key]}-${String(index).padStart(3, "0")}`);
      });
    }
  });

  await t.test("3. Both seed files label and link every row exactly as the manifest does", () => {
    for (const file of ["seed.ts", "seed-prod.ts"]) {
      const labels = seedLabels(file);
      for (const topic of ALL_DASHBOARD_TOPICS) {
        assert.equal(labels.get(topic.buttonId), topic.label, `${file}: ${topic.buttonId} must be "${topic.label}"`);
        assert.deepEqual(
          seedUrls(file, topic.buttonId),
          { seeItUrl: topic.videoUrl ?? "", readItUrl: topic.inDepthArticleUrl ?? "", hearItUrl: topic.audioUrl ?? "" },
          `${file}: ${topic.buttonId} links must equal the manifest's verified assets`
        );
      }
    }
  });

  await t.test("4. Assets are external CDN URLs and no asset is shared between topics", () => {
    const owners = new Map<string, string>();
    for (const topic of ALL_DASHBOARD_TOPICS) {
      for (const [slot, url, ext] of [
        ["video", topic.videoUrl, /\.mp4$/],
        ["inDepthArticle", topic.inDepthArticleUrl, /\.(docx|pdf)$/],
        ["audio", topic.audioUrl, /\.mp3$/],
      ] as const) {
        if (url === null) continue;
        assert.ok(url.startsWith(`${CDN_BASE_URL}/`), `${topic.id} ${slot} must be on the CDN: ${url}`);
        assert.match(url, ext, `${topic.id} ${slot} has an unexpected file type: ${url}`);
        assert.ok(!owners.has(url), `${url} is assigned to both ${owners.get(url)} and ${topic.id}`);
        owners.set(url, topic.id);
      }
    }
  });

  await t.test("5. resolveDashboard matches rows strictly by buttonId (no category or index wiring)", () => {
    const check = (manifest: DashboardManifest) => {
      const rows: DashboardButtonRow[] = manifest.topics.map((topic) => ({
        id: topic.buttonId,
        subtitle: `subtitle:${topic.id}`,
        descriptionText: `text:${topic.id}\nsecond:${topic.id}`,
        hearItUrl: `${CDN_BASE_URL}/audio/${topic.id}.mp3`,
      }));
      // Decoys that a category- or position-based lookup would have picked up.
      const decoys: DashboardButtonRow[] = [
        { id: "decoy-1", subtitle: "decoy", descriptionText: "decoy" },
        { id: `${PREFIX[manifest.key]}-010`, subtitle: "decoy", descriptionText: "decoy" },
      ];
      const shuffled = [...decoys, ...rows].reverse();

      const { overview, buttons } = resolveDashboard(manifest, shuffled);
      assert.equal(buttons.length, 9);
      for (const [resolved, topic] of [overview, ...buttons].map((r, i) => [r, manifest.topics[i]] as const)) {
        assert.equal(resolved.id, topic.id);
        assert.equal(resolved.label, topic.label);
        assert.equal(resolved.tagline, `subtitle:${topic.id}`);
        assert.equal(resolved.description, `text:${topic.id}\nsecond:${topic.id}`);
        assert.deepEqual(resolved.paragraphs, [`text:${topic.id}`, `second:${topic.id}`]);
        assert.equal(resolved.hearItUrl, `${CDN_BASE_URL}/audio/${topic.id}.mp3`);
        assert.equal(resolved.seeItUrl, topic.videoUrl ?? "");
        assert.equal(resolved.readItUrl, topic.inDepthArticleUrl ?? "");
      }
    };
    check(ROLES_AND_TOPICS_DASHBOARD);
    check(INNOVATIONS_DASHBOARD);
  });

  await t.test("6. Without rows, labels and assets still render and no text is invented", () => {
    const { overview, buttons } = resolveDashboard(INNOVATIONS_DASHBOARD);
    assert.equal(overview.label, "Innovations That Save Time");
    assert.deepEqual(
      buttons.map((b) => b.label),
      INNOVATIONS_DASHBOARD.topics.slice(1).map((topic) => topic.label)
    );
    for (const resolved of [overview, ...buttons]) {
      assert.equal(resolved.description, "");
      assert.equal(resolved.tagline, "");
      assert.equal(resolved.hearItUrl, INNOVATIONS_DASHBOARD.topics.find((t) => t.id === resolved.id)!.audioUrl ?? "");
    }
  });

  await t.test("7. Each page renders its own dashboard from the manifest", () => {
    const pages: Array<[string[], string, string]> = [
      [["app", "research-imperatives", "page.tsx"], "ROLES_AND_TOPICS_DASHBOARD", "INNOVATIONS_DASHBOARD"],
      [["app", "products-services", "page.tsx"], "INNOVATIONS_DASHBOARD", "ROLES_AND_TOPICS_DASHBOARD"],
    ];
    for (const [file, own, other] of pages) {
      const content = read(...file);
      assert.ok(content.includes(`${own} as DASHBOARD`), `${file.join("/")} must use ${own}`);
      assert.ok(!content.includes(other), `${file.join("/")} must not reference ${other}`);
      assert.ok(content.includes("@/lib/dashboardTopicsManifest"), `${file.join("/")} must import the manifest`);
    }
  });

  await t.test("8. Admin links on a row override the manifest; legacy cross-wired links do not", () => {
    const topics = ALL_DASHBOARD_TOPICS.filter((topic) => topic.position > 1);
    // Every legacy link that was ever seeded on any row, applied to every row.
    const everyLegacy = [...new Set(Object.values(LEGACY_CROSS_WIRED_URLS).flat())];
    for (const manifest of [ROLES_AND_TOPICS_DASHBOARD, INNOVATIONS_DASHBOARD]) {
      // a) The old seeded (cross-wired) links fall back to the manifest default.
      const legacyRows: DashboardButtonRow[] = manifest.topics.map((topic) => {
        const legacy = LEGACY_CROSS_WIRED_URLS[topic.buttonId] ?? [];
        return {
          id: topic.buttonId,
          seeItUrl: legacy.find((u) => u.endsWith(".mp4")),
          hearItUrl: legacy.find((u) => u.endsWith(".mp3")),
          readItUrl: legacy.find((u) => u.endsWith(".docx")),
        };
      });
      const fromLegacy = resolveDashboard(manifest, legacyRows);
      [fromLegacy.overview, ...fromLegacy.buttons].forEach((resolved, i) => {
        const topic = manifest.topics[i];
        assert.equal(resolved.seeItUrl, topic.videoUrl ?? "", `${topic.id}: legacy video must not override`);
        assert.equal(resolved.readItUrl, topic.inDepthArticleUrl ?? "", `${topic.id}: legacy article must not override`);
        assert.equal(resolved.hearItUrl, topic.audioUrl ?? "", `${topic.id}: legacy audio must not override`);
      });

      // b) New links set through /admin win over the manifest; empty links do not.
      const adminRows: DashboardButtonRow[] = manifest.topics.map((topic, i) => ({
        id: topic.buttonId,
        seeItUrl: `${CDN_BASE_URL}/uploads/${topic.id}.mp4`,
        readItUrl: i % 2 ? `${CDN_BASE_URL}/uploads/${topic.id}.pdf` : "  ",
        hearItUrl: null,
      }));
      const fromAdmin = resolveDashboard(manifest, adminRows);
      [fromAdmin.overview, ...fromAdmin.buttons].forEach((resolved, i) => {
        const topic = manifest.topics[i];
        assert.equal(resolved.seeItUrl, `${CDN_BASE_URL}/uploads/${topic.id}.mp4`);
        assert.equal(resolved.readItUrl, i % 2 ? `${CDN_BASE_URL}/uploads/${topic.id}.pdf` : topic.inDepthArticleUrl ?? "");
        assert.equal(resolved.hearItUrl, topic.audioUrl ?? "");
      });
    }
    // c) A legacy doc that was on a different row is a legitimate admin choice for this row.
    const cmo = topics.find((topic) => topic.id === "chief-marketing-officer")!;
    const marketingLeadership = LEGACY_CROSS_WIRED_URLS["btn-tl-006"].find((u) => u.endsWith(".docx"))!;
    const { buttons } = resolveDashboard(ROLES_AND_TOPICS_DASHBOARD, [{ id: cmo.buttonId, readItUrl: marketingLeadership }]);
    assert.equal(buttons[cmo.position - 2].readItUrl, marketingLeadership);
    assert.ok(everyLegacy.length >= 20, "legacy list covers the 18 old documents plus the shared video and audio");
  });

  await t.test("9. Zero-Emoji Compliance", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(fs.readFileSync(__filename, "utf-8")));
    assert.ok(!emojiRegex.test(read("lib", "dashboardTopicsManifest.ts")));
  });
});
