import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import {
  parseKeywords,
  serializeKeywords,
  normalizeContentFormat,
  generateYouTubeEmbed,
  extractDeterministicKeywords,
  extractAIKeywordsAndTopic,
  getVaultAssets,
  getVaultTopics,
  ContentFormat,
} from "../lib/vault";
import { GET, POST } from "../app/api/vault/syndicate/route";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Content Vault Asset Hub and Social Syndication Test Suite", async (t) => {
  const createdAssetIds: string[] = [];
  const createdTopicIds: string[] = [];

  t.after(async () => {
    if (createdAssetIds.length > 0) {
      await prisma.vaultAsset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }
    if (createdTopicIds.length > 0) {
      await prisma.topic.deleteMany({
        where: { id: { in: createdTopicIds } },
      });
    }
  });

  await t.test("1. Utility functions: parseKeywords, serializeKeywords, normalizeContentFormat", () => {
    // parseKeywords from JSON string
    const jsonKeywords = JSON.stringify(["market intelligence", "triad framework", "validation"]);
    const parsedFromJson = parseKeywords(jsonKeywords);
    assert.deepEqual(parsedFromJson, ["market intelligence", "triad framework", "validation"]);

    // parseKeywords from comma-separated string
    const csvKeywords = "b2b research, return on effort; survey design\nqualitative";
    const parsedFromCsv = parseKeywords(csvKeywords);
    assert.deepEqual(parsedFromCsv, ["b2b research", "return on effort", "survey design", "qualitative"]);

    // parseKeywords from array
    const arrKeywords = ["  first tag  ", "second tag", ""];
    const parsedFromArr = parseKeywords(arrKeywords);
    assert.deepEqual(parsedFromArr, ["first tag", "second tag"]);

    // parseKeywords from null/undefined/empty
    assert.deepEqual(parseKeywords(null), []);
    assert.deepEqual(parseKeywords(undefined), []);
    assert.deepEqual(parseKeywords("   "), []);

    // serializeKeywords
    const serialized = serializeKeywords(["one", "two"]);
    assert.equal(serialized, JSON.stringify(["one", "two"]));

    // normalizeContentFormat
    assert.equal(normalizeContentFormat("ARTICLE"), ContentFormat.ARTICLE);
    assert.equal(normalizeContentFormat("articles"), ContentFormat.ARTICLE);
    assert.equal(normalizeContentFormat("VIDEO"), ContentFormat.VIDEO);
    assert.equal(normalizeContentFormat("videos"), ContentFormat.VIDEO);
    assert.equal(normalizeContentFormat("PDF"), ContentFormat.PDF);
    assert.equal(normalizeContentFormat("docs"), ContentFormat.PDF);
    assert.equal(normalizeContentFormat("AUDIO"), ContentFormat.AUDIO);
    assert.equal(normalizeContentFormat("podcast"), ContentFormat.AUDIO);
    assert.equal(normalizeContentFormat("unknown_type"), ContentFormat.ARTICLE);
  });

  await t.test("2. YouTube Embed Code Generation", () => {
    // Standard watch URL
    const watchUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const embed1 = generateYouTubeEmbed(watchUrl, "Test Video");
    assert.ok(embed1 !== null);
    assert.ok(embed1.includes("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    assert.ok(embed1.includes('title="Test Video"'));

    // youtu.be short URL
    const shortUrl = "https://youtu.be/dQw4w9WgXcQ?t=10";
    const embed2 = generateYouTubeEmbed(shortUrl, "Short Link");
    assert.ok(embed2 !== null);
    assert.ok(embed2.includes("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"));

    // Non-YouTube URL returns null
    const nonYt = "https://vimeo.com/1234567";
    assert.equal(generateYouTubeEmbed(nonYt), null);
    assert.equal(generateYouTubeEmbed(""), null);
  });

  await t.test("3. Deterministic NLP Keyword Extractor (5 to 7 high-intent keywords)", () => {
    const sampleArticle = `
      The Rule of Three in B2B Customer Discovery reduces market uncertainty before substantial capital commitments.
      By cross-validating qualitative hypotheses across three independent executive panels, enterprise research teams
      can recognize meaningful market movement earlier and improve overall Return on Effort.
    `;

    const extracted = extractDeterministicKeywords(sampleArticle);
    assert.ok(extracted.length >= 5 && extracted.length <= 7, `Extracted count should be 5-7, got ${extracted.length}`);

    // Verify key terms extracted
    const joined = extracted.join(" ").toLowerCase();
    assert.ok(
      joined.includes("market") || joined.includes("uncertainty") || joined.includes("research") || joined.includes("return"),
      "Extracted keywords should reflect domain-relevant terms"
    );
  });

  await t.test("4. AI Keyword Extraction and Topic Classification Pipeline", async () => {
    const existingTopics = [
      { id: "top-1", name: "TRIAD Framework", slug: "triad-framework", category: "Product" },
      { id: "top-2", name: "Survey Design", slug: "survey-design", category: "Dashboard Topic" },
    ];

    const result = await extractAIKeywordsAndTopic(
      "Deep dive into questionnaire design and eliminating response bias in story-based surveys",
      "Actionable Survey Design Rules",
      existingTopics
    );

    assert.ok(result.keywords.length >= 5 && result.keywords.length <= 7);
    assert.equal(result.matchedTopicId, "top-2");
    assert.equal(result.topicSuggestion, "Survey Design");
  });

  await t.test("5. Syndicate API - GET Readiness & Status Endpoint", async () => {
    const res = await GET();
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, "ready");
    assert.equal(data.service, "BuyFacts Content Vault Syndication API");
    assert.equal(data.audience, "Guests");
    assert.ok(Array.isArray(data.supportedFormats));
    assert.ok(data.supportedFormats.includes("ARTICLE"));
    assert.ok(data.supportedFormats.includes("VIDEO"));
    assert.ok(data.supportedFormats.includes("PDF"));
    assert.ok(data.supportedFormats.includes("AUDIO"));
    assert.ok(Array.isArray(data.topics));
    assert.ok(data.topics.length > 0);
  });

  await t.test("6. Syndicate API - POST Payload Validation (Missing Title Rejected)", async () => {
    const req = new Request("http://localhost:3000/api/vault/syndicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Article missing required title field",
        format: "ARTICLE",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.ok(data.error.includes("'title' is required"));
  });

  await t.test("7. Syndicate API - POST Successful Asset Syndication and Storage", async () => {
    const testTitle = `Syndicated Video Research Guide ${Date.now()}`;
    const req = new Request("http://localhost:3000/api/vault/syndicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: testTitle,
        mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        format: "VIDEO",
        topicSlug: "cubicon-3d",
        text: "Interactive spatial survey demonstration showing coordinate analysis and participant validation.",
        isPublished: true,
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.asset.title, testTitle);
    assert.equal(data.asset.format, "VIDEO");
    assert.ok(data.asset.embedCode.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    assert.ok(Array.isArray(data.asset.keywords));
    assert.ok(data.asset.keywords.length >= 5 && data.asset.keywords.length <= 7);
    assert.equal(data.asset.topic.slug, "cubicon-3d");

    createdAssetIds.push(data.asset.id);

    // Verify database record
    const dbAsset = await prisma.vaultAsset.findUnique({
      where: { id: data.asset.id },
      include: { topic: true },
    });
    assert.ok(dbAsset !== null);
    assert.equal(dbAsset.title, testTitle);
    assert.equal(dbAsset.format, "VIDEO");
  });

  await t.test("8. Syndicate API - POST with Explicit Keywords Merging", async () => {
    const testTitle = `PDF Framework Synthesis ${Date.now()}`;
    const customKeywords = ["custom keyword 1", "custom keyword 2"];

    const req = new Request("http://localhost:3000/api/vault/syndicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: testTitle,
        sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
        format: "PDF",
        topicSlug: "value-quantification",
        keywords: customKeywords,
        description: "Formal specification on Return on Effort and fieldwork yield quantification.",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.asset.keywords.includes("custom keyword 1"));
    assert.ok(data.asset.keywords.includes("custom keyword 2"));
    assert.ok(data.asset.keywords.length >= 5);

    createdAssetIds.push(data.asset.id);
  });

  await t.test("9. Server-Side Asset Retrieval and Strict Chronological Sorting", async () => {
    // Create two test assets with different publishedAt dates
    const olderTopic = await prisma.topic.findFirst();
    assert.ok(olderTopic !== null, "At least one topic must exist");

    const olderAsset = await prisma.vaultAsset.create({
      data: {
        title: `Chronological Old Asset ${Date.now()}`,
        format: ContentFormat.ARTICLE,
        topicId: olderTopic.id,
        keywords: JSON.stringify(["chrono test", "old"]),
        isPublished: true,
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
    createdAssetIds.push(olderAsset.id);

    const newerAsset = await prisma.vaultAsset.create({
      data: {
        title: `Chronological New Asset ${Date.now()}`,
        format: ContentFormat.ARTICLE,
        topicId: olderTopic.id,
        keywords: JSON.stringify(["chrono test", "new"]),
        isPublished: true,
        publishedAt: new Date("2026-12-31T23:59:59Z"),
      },
    });
    createdAssetIds.push(newerAsset.id);

    // Fetch assets using query
    const results = await getVaultAssets({ query: "Chronological" });
    assert.ok(results.length >= 2, "Both test assets should be returned");

    // Strictly chronological sort: publishedAt DESC
    const newerIndex = results.findIndex((a) => a.id === newerAsset.id);
    const olderIndex = results.findIndex((a) => a.id === olderAsset.id);

    assert.ok(newerIndex !== -1 && olderIndex !== -1);
    assert.ok(
      newerIndex < olderIndex,
      `Newer asset (published later) must precede older asset in list. newerIndex=${newerIndex}, olderIndex=${olderIndex}`
    );

    // Verify all items are strictly chronological
    for (let i = 0; i < results.length - 1; i++) {
      const current = new Date(results[i].publishedAt).getTime();
      const next = new Date(results[i + 1].publishedAt).getTime();
      assert.ok(current >= next, "Assets must be sorted strictly chronological descending");
    }
  });

  await t.test("10. Server-Side Filtering by Format, Topic, and Keyword Query", async () => {
    // Filter by format: VIDEO
    const videoAssets = await getVaultAssets({ format: "VIDEO" });
    for (const v of videoAssets) {
      assert.equal(v.format, "VIDEO");
    }

    // Filter by format: PDF
    const pdfAssets = await getVaultAssets({ format: "PDF" });
    for (const p of pdfAssets) {
      assert.equal(p.format, "PDF");
    }

    // Filter by topic slug: cubicon-3d
    const cubiconAssets = await getVaultAssets({ topicSlug: "cubicon-3d" });
    for (const c of cubiconAssets) {
      assert.equal(c.topic.slug, "cubicon-3d");
    }

    // Filter by query
    const queryAssets = await getVaultAssets({ query: "Whitepaper" });
    for (const q of queryAssets) {
      const matchesTitle = q.title.toLowerCase().includes("whitepaper");
      const matchesDesc = (q.description || "").toLowerCase().includes("whitepaper");
      const matchesKw = q.keywords.some((k) => k.toLowerCase().includes("whitepaper"));
      assert.ok(matchesTitle || matchesDesc || matchesKw);
    }
  });

  await t.test("11. Topic Sidebar Counts and Grouping", async () => {
    const topics = await getVaultTopics();
    assert.ok(topics.length >= 9, "Should load initial seeded topics");

    const productTopics = topics.filter((t) => t.category === "Product");
    const dashboardTopics = topics.filter((t) => t.category === "Dashboard Topic");

    assert.ok(productTopics.length >= 4, "Should have at least 4 Product topics");
    assert.ok(dashboardTopics.length >= 5, "Should have at least 5 Dashboard topics");

    for (const t of topics) {
      assert.ok(typeof t.assetCount === "number", "Every topic must have an assetCount");
      assert.ok(t.slug.length > 0, "Every topic must have a slug");
      assert.ok(t.name.length > 0, "Every topic must have a name");
    }
  });

  await t.test("12. UX Terminology Compliance: 'Guest' / 'Guests' in all components and copy", () => {
    const vaultSearchPath = path.join(BUYFACTS_ROOT, "components", "vault", "VaultSearch.tsx");
    const vaultLayoutPath = path.join(BUYFACTS_ROOT, "components", "vault", "VaultLayout.tsx");
    const assetGridPath = path.join(BUYFACTS_ROOT, "components", "vault", "AssetGrid.tsx");
    const assetCardPath = path.join(BUYFACTS_ROOT, "components", "vault", "AssetCard.tsx");
    const topicSidebarPath = path.join(BUYFACTS_ROOT, "components", "vault", "TopicSidebar.tsx");
    const vaultPagePath = path.join(BUYFACTS_ROOT, "app", "vault", "page.tsx");

    const files = [
      vaultSearchPath,
      vaultLayoutPath,
      assetGridPath,
      assetCardPath,
      topicSidebarPath,
      vaultPagePath,
    ];

    for (const f of files) {
      assert.ok(fs.existsSync(f), `File must exist: ${f}`);
      const content = fs.readFileSync(f, "utf-8");
      assert.ok(
        content.includes("Guest") || content.includes("Guests"),
        `File ${path.basename(f)} must refer to site visitors as Guest/Guests`
      );
    }

    // Specific search placeholder check
    const searchContent = fs.readFileSync(vaultSearchPath, "utf-8");
    assert.ok(
      searchContent.includes("Welcome Guest! Search assets by keyword, title, or topic..."),
      "VaultSearch placeholder must greet Guest"
    );

    // Specific status greeting check
    const layoutContent = fs.readFileSync(vaultLayoutPath, "utf-8");
    assert.ok(
      layoutContent.includes("Welcome Guest! Search assets by keyword or select a topic to get started."),
      "VaultLayout status bar must include Welcome Guest greeting"
    );
  });

  await t.test("13. Zero-Emoji Compliance across all Content Vault source and test files", () => {
    const vaultFiles = [
      path.join(BUYFACTS_ROOT, "lib", "vault.ts"),
      path.join(BUYFACTS_ROOT, "app", "vault", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "page.module.css"),
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      path.join(BUYFACTS_ROOT, "app", "api", "vault", "syndicate", "route.ts"),
      path.join(BUYFACTS_ROOT, "components", "vault", "VaultLayout.tsx"),
      path.join(BUYFACTS_ROOT, "components", "vault", "TopicSidebar.tsx"),
      path.join(BUYFACTS_ROOT, "components", "vault", "AssetGrid.tsx"),
      path.join(BUYFACTS_ROOT, "components", "vault", "AssetCard.tsx"),
      path.join(BUYFACTS_ROOT, "components", "vault", "VaultSearch.tsx"),
      path.join(BUYFACTS_ROOT, "components", "vault", "Vault.module.css"),
      path.join(BUYFACTS_ROOT, "tests", "content-vault.test.ts"),
    ];

    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const filePath of vaultFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        assert.equal(
          emojiRegex.test(content),
          false,
          `File ${path.basename(filePath)} contains prohibited emoji character.`
        );
      }
    }
  });

  await t.test("14. Content Vault Entry Points (Navbar & Homepage Hero Gateway)", () => {
    const navbarPath = path.join(BUYFACTS_ROOT, "components", "Navbar.tsx");
    const homePath = path.join(BUYFACTS_ROOT, "app", "page.tsx");
    const homeCssPath = path.join(BUYFACTS_ROOT, "app", "page.module.css");

    assert.ok(fs.existsSync(navbarPath), "Navbar.tsx must exist");
    assert.ok(fs.existsSync(homePath), "app/page.tsx must exist");
    assert.ok(fs.existsSync(homeCssPath), "app/page.module.css must exist");

    const navbarContent = fs.readFileSync(navbarPath, "utf-8");
    const homeContent = fs.readFileSync(homePath, "utf-8");
    const homeCssContent = fs.readFileSync(homeCssPath, "utf-8");

    // Desktop & Mobile Navbar Links
    assert.ok(
      navbarContent.includes('id="nav-link-vault"'),
      "Navbar.tsx must contain desktop link with id nav-link-vault"
    );
    assert.ok(
      navbarContent.includes('href="/vault"'),
      "Navbar.tsx must link to /vault"
    );
    assert.ok(
      navbarContent.includes('CONTENT VAULT'),
      "Navbar.tsx must display CONTENT VAULT label"
    );
    assert.ok(
      navbarContent.includes('id="mob-link-vault"'),
      "Navbar.tsx must contain mobile link with id mob-link-vault"
    );

    // Homepage Hero Gateway Banner
    assert.ok(
      homeContent.includes('id="hero-vault-banner"'),
      "app/page.tsx must contain hero-vault-banner container"
    );
    assert.ok(
      homeContent.includes('id="hero-vault-cta-btn"'),
      "app/page.tsx must contain hero-vault-cta-btn link"
    );
    assert.ok(
      homeContent.includes('href="/vault"'),
      "app/page.tsx hero banner must link to /vault"
    );
    assert.ok(
      homeContent.includes("Welcome Guest! Explore Our Multi-Format Resource Vault"),
      "app/page.tsx hero banner must greet Guests"
    );
    assert.ok(
      homeCssContent.includes(".vaultHeroBanner"),
      "app/page.module.css must define .vaultHeroBanner styling"
    );
  });
});
