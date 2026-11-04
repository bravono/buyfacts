import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

test("Dashboard Button Description and Media Fallback Suite", async (t) => {
  await t.test("1. Database DashboardButton model includes description column populated for all buttons", async () => {
    const buttons = await prisma.dashboardButton.findMany({
      orderBy: { id: "asc" },
    });

    assert.equal(buttons.length, 18, "Database should contain exactly 18 dashboard buttons");

    for (const btn of buttons) {
      assert.ok(btn.description, `Button ${btn.id} (${btn.label}) must have a non-empty description`);
      assert.ok(btn.description.length > 20, `Button ${btn.id} description must have meaningful content`);
      assert.ok(btn.mediaUrl, `Button ${btn.id} must have a primary mediaUrl defined in the database`);
      assert.ok(btn.readItUrl, `Button ${btn.id} must have an in-depth readItUrl defined in the database`);
      assert.ok(
        btn.readItUrl.startsWith("https://s3.buyfacts.com/"),
        `Button ${btn.id} readItUrl must point to S3 assets, got: ${btn.readItUrl}`
      );
      assert.ok(
        btn.readItUrl.endsWith(".docx"),
        `Button ${btn.id} readItUrl must point to a detailed DOCX asset, got: ${btn.readItUrl}`
      );
      assert.notEqual(
        btn.mediaUrl,
        btn.readItUrl,
        `Button ${btn.id} primary mediaUrl must be different from in-depth readItUrl`
      );
    }
  });

  await t.test("2. Default fallback buttons in pages have empty mediaUrl and no external placeholder URLs", () => {
    const psPath = path.join(__dirname, "..", "app", "products-services", "page.tsx");
    const riPath = path.join(__dirname, "..", "app", "research-imperatives", "page.tsx");

    const psContent = fs.readFileSync(psPath, "utf-8");
    const riContent = fs.readFileSync(riPath, "utf-8");

    const prohibitedDomains = [
      "commondatastorage.googleapis.com",
      "soundhelix.com",
      "images.unsplash.com",
      "pdfobject.com",
    ];

    for (const domain of prohibitedDomains) {
      assert.ok(
        !psContent.includes(domain),
        `products-services/page.tsx must not contain placeholder domain ${domain}`
      );
      assert.ok(
        !riContent.includes(domain),
        `research-imperatives/page.tsx must not contain placeholder domain ${domain}`
      );
    }

    assert.ok(
      psContent.includes('mediaUrl: ""'),
      "products-services/page.tsx must use empty mediaUrl in DEFAULT_SERVICES_BUTTONS"
    );
    assert.ok(
      riContent.includes('mediaUrl: ""'),
      "research-imperatives/page.tsx must use empty mediaUrl in DEFAULT_TL_BUTTONS"
    );
  });

  await t.test("3. MockMediaPlayer renders No Media Found state when mediaUrl is empty", () => {
    const playerPath = path.join(__dirname, "..", "components", "MockMediaPlayer.tsx");
    const playerCssPath = path.join(__dirname, "..", "components", "MockMediaPlayer.module.css");

    const playerContent = fs.readFileSync(playerPath, "utf-8");
    const playerCss = fs.readFileSync(playerCssPath, "utf-8");

    assert.ok(
      playerContent.includes("No Media Found"),
      "MockMediaPlayer must render 'No Media Found' text when mediaUrl is absent"
    );
    assert.ok(
      playerContent.includes("noMediaContainer"),
      "MockMediaPlayer must use noMediaContainer class"
    );
    assert.ok(
      playerCss.includes(".noMediaContainer"),
      "MockMediaPlayer.module.css must define .noMediaContainer styles"
    );
  });

  await t.test("4. Zero-Emoji Compliance across all modified files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const filesToCheck = [
      path.join(__dirname, "..", "prisma", "schema.prisma"),
      path.join(__dirname, "..", "prisma", "seed.ts"),
      path.join(__dirname, "..", "prisma", "seed-prod.ts"),
      path.join(__dirname, "..", "app", "api", "buttons", "route.ts"),
      path.join(__dirname, "..", "app", "products-services", "page.tsx"),
      path.join(__dirname, "..", "app", "research-imperatives", "page.tsx"),
      path.join(__dirname, "..", "components", "MockMediaPlayer.tsx"),
      path.join(__dirname, "..", "components", "MockMediaPlayer.module.css"),
      __filename,
    ];

    for (const file of filesToCheck) {
      assert.ok(fs.existsSync(file), `${file} must exist`);
      const text = fs.readFileSync(file, "utf-8");
      assert.ok(!emojiRegex.test(text), `${file} must contain zero emojis`);
    }
  });
});
