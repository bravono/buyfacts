import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import nextConfig from "../next.config";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Cubicon Arts Path Resolution and Rewrite Suite", async (t) => {
  await t.test("1. Next.js Rewrites configuration maps /arts/:path* to /cubicon-app/arts/:path*", async () => {
    assert.ok(typeof nextConfig.rewrites === "function", "nextConfig must define rewrites function");
    const rewritesResult = await nextConfig.rewrites();

    let rewritesList: Array<{ source: string; destination: string }> = [];
    if (Array.isArray(rewritesResult)) {
      rewritesList = rewritesResult;
    } else if (rewritesResult && typeof rewritesResult === "object" && "beforeFiles" in rewritesResult) {
      rewritesList = [
        ...(rewritesResult.beforeFiles || []),
        ...(rewritesResult.afterFiles || []),
        ...(rewritesResult.fallback || []),
      ];
    }

    const artsRewrite = rewritesList.find((r) => r.source === "/arts/:path*");
    assert.ok(artsRewrite, "Must contain rewrite rule for '/arts/:path*'");
    assert.equal(
      artsRewrite.destination,
      "/cubicon-app/arts/:path*",
      "Must rewrite '/arts/:path*' to '/cubicon-app/arts/:path*'"
    );
  });

  await t.test("2. Cubicon fallback assets exist in public/cubicon-app/arts/", () => {
    const artsDir = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "arts");
    assert.ok(fs.existsSync(artsDir), "Directory public/cubicon-app/arts must exist");

    const requiredAssets = [
      "Puzzle1.webp",
      "Puzzle2.webp",
      "Puzzle3.webp",
      "ballon.webp",
      "Puzzle1_explainer.webp",
      "Puzzle2_explainer.webp",
      "Puzzle3_explainer.webp",
    ];

    for (const assetName of requiredAssets) {
      const assetPath = path.join(artsDir, assetName);
      assert.ok(
        fs.existsSync(assetPath),
        `Asset ${assetName} must exist in public/cubicon-app/arts/`
      );
      const stat = fs.statSync(assetPath);
      assert.ok(stat.size > 0, `Asset ${assetName} must have positive byte size`);
    }
  });

  await t.test("3. Embedded public/cubicon-app/index.html links to valid active JS bundle", () => {
    const htmlPath = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "index.html");
    assert.ok(fs.existsSync(htmlPath), "public/cubicon-app/index.html must exist");

    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    const match = htmlContent.match(/src=["']\.\/assets\/(index-[^"']+\.js)["']/);
    assert.ok(match, "index.html must contain active ./assets/index-[hash].js script tag");

    const jsFilename = match[1];
    const jsPath = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "assets", jsFilename);
    assert.ok(fs.existsSync(jsPath), `Active bundle file must exist: ${jsFilename}`);
  });

  await t.test("4. Active Cubicon production JS bundle does not use root-relative /arts/Puzzle1.webp", () => {
    const htmlPath = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "index.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    const match = htmlContent.match(/src=["']\.\/assets\/(index-[^"']+\.js)["']/);
    assert.ok(match, "index.html must reference active bundle");

    const jsPath = path.join(BUYFACTS_ROOT, "public", "cubicon-app", "assets", match[1]);
    const bundleContent = fs.readFileSync(jsPath, "utf-8");

    assert.equal(
      bundleContent.includes('"/arts/Puzzle1.webp"'),
      false,
      "Active JS bundle must not contain hardcoded root-relative '/arts/Puzzle1.webp'"
    );
    assert.ok(
      bundleContent.includes('arts/Puzzle1.webp'),
      "Active JS bundle must use relative 'arts/Puzzle1.webp'"
    );
  });
});
