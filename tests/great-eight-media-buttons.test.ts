import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GREAT_EIGHT_CARDS,
  LEGACY_GREAT_EIGHT_SUMMARIES,
  LEGACY_GREAT_EIGHT_URLS,
  resolveGreatEight,
} from "../lib/greatEightManifest";
import { isPdfUrl } from "../lib/document-parser";
import { DEFAULT_GREAT_EIGHT } from "../app/api/great-eight/route";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

test("Great Eight SEE IT / HEAR IT / READ IT buttons", async (t) => {
  const page = read("app", "page.tsx");
  const modal = read("components", "GreatEightViewpointModal.tsx");
  const css = read("app", "page.module.css");
  const player = read("components", "MediaPlayer.tsx");

  await t.test("1. /admin SEE IT, HEAR IT and READ IT links override the manifest by slug", () => {
    const [first, second] = GREAT_EIGHT_CARDS;
    const resolved = resolveGreatEight([
      {
        slug: second.slug,
        seeItUrl: " https://cdn.example/v.mp4 ",
        hearItUrl: "https://cdn.example/a.mp3",
        readItUrl: "https://cdn.example/r.pdf",
      },
    ]);
    assert.equal(resolved[1].videoUrl, "https://cdn.example/v.mp4");
    assert.equal(resolved[1].audioUrl, "https://cdn.example/a.mp3");
    assert.equal(resolved[1].articleUrl, "https://cdn.example/r.pdf");
    assert.equal(resolved[0].videoUrl, first.videoUrl, "other cards keep their manifest media");
  });

  await t.test("2. Blank or legacy-placeholder /admin video links fall back to the manifest", () => {
    const resolved = resolveGreatEight(
      GREAT_EIGHT_CARDS.map((card, index) => ({
        slug: card.slug,
        seeItUrl: index % 2 ? "  " : LEGACY_GREAT_EIGHT_URLS[0],
      }))
    );
    resolved.forEach((card, index) => assert.equal(card.videoUrl, GREAT_EIGHT_CARDS[index].videoUrl));
  });

  await t.test("3. API fallback rows carry the manifest video as seeItUrl", () => {
    DEFAULT_GREAT_EIGHT.forEach((row, index) => assert.equal(row.seeItUrl, GREAT_EIGHT_CARDS[index].videoUrl ?? ""));
  });

  await t.test("4. Cards open the shared dashboard MediaPlayer, not their own buttons", () => {
    assert.ok(!page.includes('label: "SEE IT"') && !page.includes("styles.cardMediaBtn"), "no duplicate pill buttons on the cards");
    assert.ok(!css.includes(".cardMediaBtn"), "the pill button CSS is gone");
    assert.ok(page.includes('role="button"') && page.includes("tabIndex={0}") && page.includes('e.key === "Enter"'), "cards are keyboard-reachable");
    assert.ok(page.includes("setActiveGreatEightSlug(card.slug)"), "a card opens its own viewpoint");
    assert.ok(modal.includes('import MediaPlayer from "./MediaPlayer"') && modal.includes("<MediaPlayer"));
    for (const prop of ["seeItUrl={card.videoUrl}", "hearItUrl={card.audioUrl}", "readItUrl={card.articleUrl}"]) {
      assert.ok(modal.includes(prop), `modal must pass ${prop}`);
    }
  });

  await t.test("5. Missing media is flagged by the player, never a broken link", () => {
    assert.ok(player.includes("styles.btnEmpty") && player.includes("No video is attached to"));
    assert.ok(!/href=\{card\.(videoUrl|audioUrl)/.test(page + modal), "nothing links straight to a missing file");
  });

  await t.test("7. Revised hooks win over taglines written by earlier seeds", () => {
    const resolved = resolveGreatEight(
      GREAT_EIGHT_CARDS.map((card, index) => ({ slug: card.slug, tagline: LEGACY_GREAT_EIGHT_SUMMARIES[index] }))
    );
    resolved.forEach((card, index) => assert.equal(card.summary, GREAT_EIGHT_CARDS[index].summary));
    assert.equal(GREAT_EIGHT_CARDS[0].summary, "Nobody's figured out how to build a coffee break into a survey.");
    const edited = resolveGreatEight([{ slug: GREAT_EIGHT_CARDS[0].slug, tagline: "Admin hook" }]);
    assert.equal(edited[0].summary, "Admin hook", "a real /admin tagline still overrides");
  });

  await t.test("8. READ IT shows CDN PDFs inline, with an open/download fallback", () => {
    for (const url of [
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/01-Target.pdf",
      "https://s3.buyfacts.com/x/Great%20Eight%2001.PDF?X-Amz-Expires=3600&sig=abc",
      "https://s3.buyfacts.com/x/a.pdf#page=2",
    ]) {
      assert.ok(isPdfUrl(url), `${url} must be detected as a PDF`);
    }
    assert.ok(!isPdfUrl("https://s3.buyfacts.com/x/a.pdf.docx") && !isPdfUrl("https://s3.buyfacts.com/x/pdf"));
    assert.ok(player.includes("<iframe") && player.includes("getDocumentProxyUrl(screenMediaUrl)"), "PDF renders inline via the proxy");
    assert.ok(player.includes("handleDownloadDocument") && player.includes("link.download"), "download fallback");
    assert.ok(player.includes("sanitizeDocxHtml(result.html)"), "Word articles are sanitized before injection");
  });

  await t.test("6. Modal opens on the article and keeps Open in Reader", () => {
    assert.ok(modal.includes('initialScreenMode={card.articleUrl ? "document" : "auto"}'));
    assert.ok(modal.includes("Open in Reader") && modal.includes("/document-viewer?url="));
    assert.ok(modal.includes("onContactClick={onClose}"), "CONTACT US closes the modal on the way to #contact");
  });
});
