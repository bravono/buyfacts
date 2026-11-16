import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

describe("Rule of Three (R3) Tool Embedding Integration Test Suite", () => {
  it("should verify public/rule-of-three-app directory and essential entry points exist", () => {
    const r3AppDir = path.join(BUYFACTS_ROOT, "public", "rule-of-three-app");
    assert.ok(fs.existsSync(r3AppDir), "public/rule-of-three-app directory must exist");

    const indexHtmlPath = path.join(r3AppDir, "index.html");
    assert.ok(fs.existsSync(indexHtmlPath), "public/rule-of-three-app/index.html must exist");

    const htmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
    assert.ok(htmlContent.length > 0, "index.html must not be empty");
    assert.ok(
      htmlContent.includes("/rule-of-three-app/assets/"),
      "index.html must use /rule-of-three-app/assets/ base path"
    );
  });

  it("should verify RuleOfThreeViewer component implements full embedded capabilities", () => {
    const componentPath = path.join(
      BUYFACTS_ROOT,
      "components",
      "r3",
      "RuleOfThreeViewer.tsx"
    );
    assert.ok(fs.existsSync(componentPath), "RuleOfThreeViewer.tsx must exist");

    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(content.includes('"use client"'), "Must be a client component");
    assert.ok(content.includes("/rule-of-three-app/"), "Must target /rule-of-three-app/ subpath");
    assert.ok(content.includes("isIframeLoaded"), "Must track iframe loading state");
    assert.ok(content.includes("isFullscreen"), "Must support fullscreen toggling");
    assert.ok(content.includes("RotateCcw"), "Must provide session reload/reset control");
    assert.ok(content.includes("ExternalLink"), "Must provide open in tab control");
    assert.ok(content.includes("Maximize2"), "Must provide fullscreen toggle control");
    assert.ok(content.includes("ROUTE_TABS"), "Must provide navigation route tabs");
  });

  it("should verify RuleOfThreeViewer CSS module exists with required styles", () => {
    const cssPath = path.join(
      BUYFACTS_ROOT,
      "components",
      "r3",
      "RuleOfThreeViewer.module.css"
    );
    assert.ok(fs.existsSync(cssPath), "RuleOfThreeViewer.module.css must exist");

    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(cssContent.includes(".iframeWrapper"), "Must define iframeWrapper style");
    assert.ok(cssContent.includes(".preloader"), "Must define preloader overlay style");
    assert.ok(cssContent.includes(".spinner"), "Must define loading spinner animation");
    assert.ok(cssContent.includes(".fullscreenOverlay"), "Must define fullscreen overlay style");
  });

  it("should verify app/rule-of-three/page.tsx embeds RuleOfThreeViewer and preserves metadata", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "rule-of-three", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/rule-of-three/page.tsx must exist");

    const content = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      content.includes("import RuleOfThreeViewer from"),
      "page.tsx must import RuleOfThreeViewer"
    );
    assert.ok(
      content.includes("<RuleOfThreeViewer />"),
      "page.tsx must render RuleOfThreeViewer"
    );
    assert.ok(
      content.includes("export const metadata"),
      "page.tsx must preserve Next.js metadata export"
    );
    assert.ok(
      content.includes("interactiveSection"),
      "page.tsx must wrap viewer in interactiveSection"
    );
  });

  it("should verify next.config.ts contains the rewrite rules for Rule of Three", () => {
    const configPath = path.join(BUYFACTS_ROOT, "next.config.ts");
    assert.ok(fs.existsSync(configPath), "next.config.ts must exist");

    const content = fs.readFileSync(configPath, "utf-8");
    assert.ok(
      content.includes('source: "/rule-of-three-app/:path*"'),
      "next.config.ts must configure catch-all rewrite for /rule-of-three-app/:path*"
    );
    assert.ok(
      content.includes('source: "/rule-of-three-app"'),
      "next.config.ts must configure source: /rule-of-three-app"
    );
    assert.ok(
      content.includes('destination: "/rule-of-three-app/index.html"'),
      "next.config.ts must configure destination: /rule-of-three-app/index.html"
    );
    assert.ok(
      content.includes('source: "/r3"'),
      "next.config.ts must configure alias /r3"
    );
  });

  it("should verify package.json scripts and bundler automation for embed-r3", () => {
    const pkgPath = path.join(BUYFACTS_ROOT, "package.json");
    assert.ok(fs.existsSync(pkgPath), "package.json must exist");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    assert.equal(
      pkg.scripts["embed-r3"],
      "node scripts/bundle-r3.js",
      "package.json must declare embed-r3 script"
    );
    assert.ok(
      pkg.scripts["embed-tools"].includes("embed-r3"),
      "embed-tools script must include embed-r3"
    );

    const scriptPath = path.join(BUYFACTS_ROOT, "scripts", "bundle-r3.js");
    assert.ok(fs.existsSync(scriptPath), "scripts/bundle-r3.js must exist");
  });

  it("should enforce strict zero-emoji compliance across all created and modified files", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "components", "r3", "RuleOfThreeViewer.tsx"),
      path.join(BUYFACTS_ROOT, "components", "r3", "RuleOfThreeViewer.module.css"),
      path.join(BUYFACTS_ROOT, "app", "rule-of-three", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "rule-of-three", "rule-of-three.module.css"),
      path.join(BUYFACTS_ROOT, "next.config.ts"),
      path.join(BUYFACTS_ROOT, "package.json"),
      path.join(BUYFACTS_ROOT, "scripts", "bundle-r3.js"),
      path.join(BUYFACTS_ROOT, "tests", "rule-of-three-embed-integration.test.ts"),
    ];

    for (const filePath of filesToCheck) {
      assert.ok(fs.existsSync(filePath), `Target file ${filePath} must exist`);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const hasEmoji = emojiRegex.test(fileContent);
      assert.equal(
        hasEmoji,
        false,
        `File ${path.basename(filePath)} must contain zero emojis`
      );
    }
  });
});
