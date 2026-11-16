import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

describe("TRIAD Tool Embedding Integration Test Suite", () => {
  it("should verify public/triad-app directory and essential entry points exist", () => {
    const triadAppDir = path.join(BUYFACTS_ROOT, "public", "triad-app");
    assert.ok(fs.existsSync(triadAppDir), "public/triad-app directory must exist");

    const indexHtmlPath = path.join(triadAppDir, "index.html");
    assert.ok(fs.existsSync(indexHtmlPath), "public/triad-app/index.html must exist");

    const htmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
    assert.ok(htmlContent.length > 0, "index.html must not be empty");
    assert.ok(
      htmlContent.includes("./assets/"),
      "index.html must use normalized relative asset paths (./assets/)"
    );
  });

  it("should verify core TRIAD datasets are packaged inside public/triad-app", () => {
    const datasets = ["KYM_TRIAD_DATA.json", "MAJORS_DATA.json", "TRIAD_DATA.json"];
    for (const dataset of datasets) {
      const filePath = path.join(BUYFACTS_ROOT, "public", "triad-app", dataset);
      assert.ok(fs.existsSync(filePath), `public/triad-app/${dataset} must exist`);
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      assert.ok(Array.isArray(parsed) && parsed.length > 0, `${dataset} must contain an array of records`);
    }
  });

  it("should verify TriadInteractiveViewer component implements full embedded capabilities", () => {
    const componentPath = path.join(
      BUYFACTS_ROOT,
      "components",
      "triad",
      "TriadInteractiveViewer.tsx"
    );
    assert.ok(fs.existsSync(componentPath), "TriadInteractiveViewer.tsx must exist");

    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(content.includes('"use client"'), "Must be a client component");
    assert.ok(content.includes("/triad-app/index.html"), "Must target /triad-app/index.html");
    assert.ok(content.includes("isIframeLoaded"), "Must track iframe loading state");
    assert.ok(content.includes("isFullscreen"), "Must support fullscreen toggling");
    assert.ok(content.includes("RotateCcw"), "Must provide session reload/reset control");
    assert.ok(content.includes("ExternalLink"), "Must provide open in tab control");
    assert.ok(content.includes("Maximize2"), "Must provide fullscreen toggle control");
    assert.ok(content.includes("ROUTE_TABS"), "Must provide navigation route tabs");
  });

  it("should verify TriadInteractiveViewer CSS module exists with required styles", () => {
    const cssPath = path.join(
      BUYFACTS_ROOT,
      "components",
      "triad",
      "TriadInteractiveViewer.module.css"
    );
    assert.ok(fs.existsSync(cssPath), "TriadInteractiveViewer.module.css must exist");

    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(cssContent.includes(".iframeWrapper"), "Must define iframeWrapper style");
    assert.ok(cssContent.includes(".preloader"), "Must define preloader overlay style");
    assert.ok(cssContent.includes(".spinner"), "Must define loading spinner animation");
    assert.ok(cssContent.includes(".fullscreenOverlay"), "Must define fullscreen overlay style");
  });

  it("should verify app/triad/page.tsx embeds TriadInteractiveViewer and preserves metadata", () => {
    const pagePath = path.join(BUYFACTS_ROOT, "app", "triad", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/triad/page.tsx must exist");

    const content = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      content.includes("import TriadInteractiveViewer from"),
      "page.tsx must import TriadInteractiveViewer"
    );
    assert.ok(
      content.includes("<TriadInteractiveViewer />"),
      "page.tsx must render TriadInteractiveViewer"
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

  it("should verify next.config.ts contains the rewrite rule for /triad-app", () => {
    const configPath = path.join(BUYFACTS_ROOT, "next.config.ts");
    assert.ok(fs.existsSync(configPath), "next.config.ts must exist");

    const content = fs.readFileSync(configPath, "utf-8");
    assert.ok(
      content.includes('source: "/triad-app"'),
      "next.config.ts must configure source: /triad-app"
    );
    assert.ok(
      content.includes('destination: "/triad-app/index.html"'),
      "next.config.ts must configure destination: /triad-app/index.html"
    );
  });

  it("should verify package.json scripts and bundler automation for embed-triad", () => {
    const pkgPath = path.join(BUYFACTS_ROOT, "package.json");
    assert.ok(fs.existsSync(pkgPath), "package.json must exist");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    assert.equal(
      pkg.scripts["embed-triad"],
      "node scripts/bundle-triad.js",
      "package.json must declare embed-triad script"
    );
    assert.ok(
      pkg.scripts["embed-tools"].includes("embed-triad"),
      "embed-tools script must include embed-triad"
    );

    const scriptPath = path.join(BUYFACTS_ROOT, "scripts", "bundle-triad.js");
    assert.ok(fs.existsSync(scriptPath), "scripts/bundle-triad.js must exist");
  });

  it("should enforce strict zero-emoji compliance across all created and modified files", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "components", "triad", "TriadInteractiveViewer.tsx"),
      path.join(BUYFACTS_ROOT, "components", "triad", "TriadInteractiveViewer.module.css"),
      path.join(BUYFACTS_ROOT, "app", "triad", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "triad", "triad.module.css"),
      path.join(BUYFACTS_ROOT, "next.config.ts"),
      path.join(BUYFACTS_ROOT, "package.json"),
      path.join(BUYFACTS_ROOT, "scripts", "bundle-triad.js"),
      path.join(BUYFACTS_ROOT, "tests", "triad-embed-integration.test.ts"),
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
