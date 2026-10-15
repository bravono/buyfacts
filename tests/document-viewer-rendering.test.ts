import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isPdfUrl,
  isDocxUrl,
  isDocumentUrl,
  getOfficeViewerUrl,
  getGoogleDocsViewerUrl,
  convertDocxBufferToHtml,
} from "../lib/document-parser";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Document Viewer In-Browser Inline Rendering Test Suite", async (t) => {
  await t.test("1. Document URL and Extension Detection", () => {
    // PDF detection
    assert.equal(isPdfUrl("https://example.com/brief.pdf"), true);
    assert.equal(isPdfUrl("https://example.com/brief.PDF"), true);
    assert.equal(isPdfUrl("https://example.com/doc.pdf?download=1&auth=xyz"), true);
    assert.equal(isPdfUrl("https://example.com/doc.pdf#page=2"), true);
    assert.equal(isPdfUrl("/sample-details.pdf"), true);
    assert.equal(isPdfUrl("data:application/pdf;base64,JVBERi0xLjQK"), true);
    assert.equal(isPdfUrl("https://example.com/video.mp4"), false);
    assert.equal(isPdfUrl("https://example.com/audio.mp3"), false);
    assert.equal(isPdfUrl("https://example.com/doc.docx"), false);
    assert.equal(isPdfUrl(null), false);
    assert.equal(isPdfUrl(undefined), false);

    // DOCX detection
    assert.equal(isDocxUrl("https://example.com/brief.docx"), true);
    assert.equal(isDocxUrl("https://example.com/brief.DOCX"), true);
    assert.equal(isDocxUrl("https://example.com/brief.doc"), true);
    assert.equal(isDocxUrl("https://example.com/doc.docx?key=val"), true);
    assert.equal(isDocxUrl("/sample-document.docx"), true);
    assert.equal(
      isDocxUrl("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQA"),
      true
    );
    assert.equal(isDocxUrl("https://example.com/brief.pdf"), false);
    assert.equal(isDocxUrl("https://example.com/video.mp4"), false);
    assert.equal(isDocxUrl(null), false);
    assert.equal(isDocxUrl(undefined), false);

    // General document detection
    assert.equal(isDocumentUrl("https://example.com/brief.pdf"), true);
    assert.equal(isDocumentUrl("https://example.com/brief.docx"), true);
    assert.equal(isDocumentUrl("https://example.com/video.mp4"), false);
    assert.equal(isDocumentUrl("https://example.com/image.png"), false);
    assert.equal(isDocumentUrl(null), false);
  });

  await t.test("2. Office and Google Docs Viewer Embed URL Formatter", () => {
    const rawUrl = "https://s3.buyfacts.com/assets/annual report (2026).docx";
    const officeUrl = getOfficeViewerUrl(rawUrl);
    assert.ok(officeUrl.startsWith("https://view.officeapps.live.com/op/embed.aspx?src="));
    assert.ok(officeUrl.includes(encodeURIComponent(rawUrl)));

    const googleUrl = getGoogleDocsViewerUrl(rawUrl);
    assert.ok(googleUrl.startsWith("https://docs.google.com/viewer?url="));
    assert.ok(googleUrl.endsWith("&embedded=true"));
    assert.ok(googleUrl.includes(encodeURIComponent(rawUrl)));
  });

  await t.test("3. Mammoth DOCX Parsing to Semantic HTML", async () => {
    const sampleDocxPath = path.join(BUYFACTS_ROOT, "public", "sample-document.docx");
    assert.ok(fs.existsSync(sampleDocxPath), "public/sample-document.docx must exist");

    const fileBuffer = fs.readFileSync(sampleDocxPath);
    const { html, warnings } = await convertDocxBufferToHtml(fileBuffer);

    assert.ok(typeof html === "string");
    assert.ok(html.length > 0, "Converted HTML output should not be empty");
    assert.ok(html.includes("<h1>BuyFacts Strategic Research Brief</h1>"));
    assert.ok(html.includes("<strong>Executive Summary</strong>"));
    assert.ok(html.includes("verified B2B methodology"));
    assert.ok(html.includes("3D Cubicon survey validation"));
    assert.ok(Array.isArray(warnings));
  });

  await t.test("4. Error Handling for Corrupted or Empty Document Buffers", async () => {
    const emptyBuffer = Buffer.from("");
    await assert.rejects(
      async () => {
        await convertDocxBufferToHtml(emptyBuffer);
      },
      (err: Error) => {
        assert.ok(err.message.length > 0);
        return true;
      }
    );
  });

  await t.test("5. Public Document Asset Presence", () => {
    const samplePdfPath = path.join(BUYFACTS_ROOT, "public", "sample-details.pdf");
    const sampleDocxPath = path.join(BUYFACTS_ROOT, "public", "sample-document.docx");

    assert.ok(fs.existsSync(samplePdfPath), "public/sample-details.pdf must exist");
    assert.ok(fs.existsSync(sampleDocxPath), "public/sample-document.docx must exist");

    const pdfContent = fs.readFileSync(samplePdfPath, "utf-8");
    assert.ok(pdfContent.startsWith("%PDF-1.4"));
  });

  await t.test("6. MockMediaPlayer Component Specification & Architecture", () => {
    const componentPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.tsx");
    const content = fs.readFileSync(componentPath, "utf-8");

    // Must support docx in MockMediaPlayerProps
    assert.ok(content.includes('"video" | "audio" | "image" | "pdf" | "docx"'));

    // Must import document-parser helpers
    assert.ok(content.includes("isPdfUrl"));
    assert.ok(content.includes("isDocxUrl"));
    assert.ok(content.includes("fetchAndConvertDocx"));
    assert.ok(content.includes("getOfficeViewerUrl"));

    // Must implement inline document viewers
    assert.ok(content.includes("styles.inlineDocViewer"));
    assert.ok(content.includes("styles.inlineDocIframe"));
    assert.ok(content.includes("styles.inlineDocxScroll"));
    assert.ok(content.includes("styles.inlineDocxContent"));
    assert.ok(content.includes("styles.docSpinnerIcon"));

    // Must embed document reader directly in modal without requiring download
    assert.ok(content.includes("styles.modalViewerContainer"));
    assert.ok(content.includes("styles.modalDocIframe"));
    assert.ok(content.includes("styles.modalDocxScroll"));
    assert.ok(content.includes("styles.modalDocMetaRow"));
    assert.ok(content.includes("In-browser live reader. You do not need to download this file to review its contents."));

    // Must provide convenient actions (Expand, Open in New Tab, Download Copy)
    assert.ok(content.includes("Expand"));
    assert.ok(content.includes("Open in New Tab"));
    assert.ok(content.includes("Download Copy"));
  });

  await t.test("7. MockMediaPlayer CSS Module Class Definitions", () => {
    const cssPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.module.css");
    const css = fs.readFileSync(cssPath, "utf-8");

    const requiredClasses = [
      ".inlineDocViewer",
      ".inlineDocHeader",
      ".inlineDocBadge",
      ".inlineDocActions",
      ".inlineDocActionBtn",
      ".inlineDocBody",
      ".inlineDocIframe",
      ".inlineDocLoading",
      ".docSpinnerIcon",
      ".inlineDocFallback",
      ".inlineDocxScroll",
      ".inlineDocxContent",
      ".modalDocMetaRow",
      ".modalDocBadge",
      ".modalDocPrompt",
      ".modalViewerContainer",
      ".modalDocIframe",
      ".modalDocxScroll",
      ".btnOpenExternal",
    ];

    for (const className of requiredClasses) {
      assert.ok(
        css.includes(className),
        `MockMediaPlayer.module.css must define class ${className}`
      );
    }

    // Modal sizing must accommodate comfortable document reading
    assert.ok(css.includes("max-width: min(92vw, 900px);"));
  });

  await t.test("8. FilePreview Component Support for DOCX", () => {
    const filePreviewPath = path.join(BUYFACTS_ROOT, "components", "FilePreview.tsx");
    const content = fs.readFileSync(filePreviewPath, "utf-8");

    assert.ok(content.includes("isDocxUrl"));
    assert.ok(content.includes("fetchAndConvertDocx"));
    assert.ok(content.includes("isDocx"));
    assert.ok(content.includes("Converting Word document for viewing..."));
  });

  await t.test("9. Products & Services and Research Imperatives Types", () => {
    const psPage = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "products-services", "page.tsx"),
      "utf-8"
    );
    assert.ok(psPage.includes('"video" | "image" | "audio" | "pdf" | "docx"'));

    const riPage = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "app", "research-imperatives", "page.tsx"),
      "utf-8"
    );
    assert.ok(riPage.includes('"video" | "image" | "audio" | "pdf" | "docx"'));
  });

  await t.test("11. Fit-to-Width and Horizontal Scrolling Elimination Specifications", () => {
    const cssPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.module.css");
    const css = fs.readFileSync(cssPath, "utf-8");

    // Must prevent horizontal scroll on preview and modal containers
    assert.ok(css.includes("overflow-x: hidden !important;"));
    assert.ok(css.includes("table-layout: fixed;"));
    assert.ok(css.includes("word-break: break-word;"));

    const componentPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.tsx");
    const content = fs.readFileSync(componentPath, "utf-8");

    // PDF iframes must specify FitH (fit horizontal width)
    assert.ok(content.includes("#view=FitH"));

    // Inline toolbar must have Expand button without ambiguous inline download/open link
    assert.ok(content.includes('title="Expand to Full Reader"'));
    assert.ok(content.includes("createPortal"));
  });

  await t.test("12. Dedicated Standalone /document-viewer Route Specification", () => {
    const viewerPagePath = path.join(BUYFACTS_ROOT, "app", "document-viewer", "page.tsx");
    const viewerCssPath = path.join(BUYFACTS_ROOT, "app", "document-viewer", "viewer.module.css");

    assert.ok(fs.existsSync(viewerPagePath), "app/document-viewer/page.tsx must exist");
    assert.ok(fs.existsSync(viewerCssPath), "app/document-viewer/viewer.module.css must exist");

    const content = fs.readFileSync(viewerPagePath, "utf-8");
    assert.ok(content.includes("fetchAndConvertDocx"));
    assert.ok(content.includes("Download Copy"));
    assert.ok(content.includes("#view=FitH&toolbar=1"));

    const modalContent = fs.readFileSync(
      path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.tsx"),
      "utf-8"
    );
    // Modal Open in New Tab must target /document-viewer
    assert.ok(modalContent.includes("/document-viewer?url="));
  });

  await t.test("13. Navigation Bar Hide State on Document Reader Open", () => {
    const navbarPath = path.join(BUYFACTS_ROOT, "components", "Navbar.tsx");
    const navbarContent = fs.readFileSync(navbarPath, "utf-8");

    assert.ok(navbarContent.includes("isReaderModalOpen"));
    assert.ok(navbarContent.includes("document-reader-toggle"));

    const cssPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.module.css");
    const css = fs.readFileSync(cssPath, "utf-8");
    assert.ok(css.includes("body.document-reader-open"));
  });

  await t.test("14. Zero-Emoji Compliance across All Modified and Created Files", () => {
    const filesToCheck = [
      "lib/document-parser.ts",
      "types/mammoth.d.ts",
      "components/MockMediaPlayer.tsx",
      "components/MockMediaPlayer.module.css",
      "components/FilePreview.tsx",
      "components/Navbar.tsx",
      "app/document-viewer/page.tsx",
      "app/document-viewer/viewer.module.css",
      "app/products-services/page.tsx",
      "app/research-imperatives/page.tsx",
      "tests/document-viewer-rendering.test.ts",
      "scripts/create-sample-docx.js",
    ];

    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

    for (const relPath of filesToCheck) {
      const fullPath = path.join(BUYFACTS_ROOT, relPath);
      assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
      const fileContent = fs.readFileSync(fullPath, "utf-8");
      assert.equal(
        emojiRegex.test(fileContent),
        false,
        `File ${relPath} contains prohibited emojis`
      );
    }
  });
});
