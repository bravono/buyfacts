import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { columnEdge, isExternalHref } from "../lib/tripletLayout";
import {
  GUIDED_DEMO_HREF,
  KNOW_YOUR_MAJOR_DEMO,
  RULE_OF_THREE_DEMO,
  TRIAD_DEMONSTRATION_HREF,
  TRIAD_STUDIO_DEMO,
  demoLink,
  normaliseAppUrl,
} from "../lib/demoLinks";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

/** Every .tsx/.ts source file under the given folders (generated/test doubles excluded). */
function sourceFiles(...dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.startsWith("MockMediaPlayer")) out.push(full);
    }
  };
  for (const dir of dirs) walk(path.join(ROOT, dir));
  return out;
}

/** Route patterns for every app/**\/page.tsx, e.g. "/cubicon/analytics" or "/stories/[userId]". */
function appRoutes(): string[] {
  const routes: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === "api") continue;
        // Route groups "(name)" do not add a path segment.
        const segment = /^\(.*\)$/.test(entry.name) ? "" : `/${entry.name}`;
        walk(path.join(dir, entry.name), prefix + segment);
      } else if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        routes.push(prefix || "/");
      }
    }
  };
  walk(path.join(ROOT, "app"), "");
  return routes;
}

function routeExists(pathname: string, routes: string[]): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (routes.includes(clean)) return true;
  // Dynamic segments
  const parts = clean.split("/");
  return routes.some((route) => {
    const rparts = route.split("/");
    return rparts.length === parts.length && rparts.every((r, i) => /^\[.+\]$/.test(r) || r === parts[i]);
  });
}

/** The page source that renders a route, for anchor (id) lookups. */
function pageSource(pathname: string): string {
  const file = pathname === "/" ? ["app", "page.tsx"] : ["app", ...pathname.slice(1).split("/"), "page.tsx"];
  return read(...file);
}

/** Internal link targets written literally in source: hrefs, hover/destination hrefs, router pushes. */
function internalTargets(): Array<{ target: string; file: string }> {
  const found: Array<{ target: string; file: string }> = [];
  const patterns = [
    /\b(?:href|actionHref|destinationHref)\s*(?:=|:)\s*\{?\s*["'`]((?:\/|#)[^"'`]*)["'`]/g,
    /\b(?:router\.(?:push|replace)|redirect)\(\s*["'`](\/[^"'`]*)["'`]/g,
    /\b[A-Z_]+_HREF\s*=\s*["'`](\/[^"'`]*)["'`]/g,
  ];
  for (const file of sourceFiles("app", "components", "lib")) {
    const src = fs.readFileSync(file, "utf-8");
    for (const pattern of patterns) {
      for (const m of src.matchAll(pattern)) found.push({ target: m[1], file: path.relative(ROOT, file) });
    }
  }
  return found;
}

test("Navigation, TRIAD Routing and Route Validity Suite", async (t) => {
  await t.test("1. Every internal link resolves to an existing page (no 404s)", () => {
    const routes = appRoutes();
    const publicFiles = new Set(fs.readdirSync(path.join(ROOT, "public")));
    const targets = internalTargets();
    assert.ok(targets.length > 30, `expected to find the site's links, found ${targets.length}`);
    const dead: string[] = [];
    for (const { target, file } of targets) {
      if (target.startsWith("#")) continue; // same-page anchors are checked in test 2
      const pathname = target.split(/[?#$]/)[0];
      const firstSegment = pathname.split("/")[1] ?? "";
      if (pathname.startsWith("/api/") || publicFiles.has(firstSegment)) continue;
      if (!routeExists(pathname, routes)) dead.push(`${target} (in ${file})`);
    }
    assert.deepEqual(dead, [], `dead internal links:\n${dead.join("\n")}`);
  });

  await t.test("2. Every /page#anchor link points at an element id on that page", () => {
    const missing: string[] = [];
    for (const { target, file } of internalTargets()) {
      const hash = target.match(/^(\/[^?#]*)?(?:\?[^#]*)?#([A-Za-z][\w-]*)$/);
      if (!hash) continue;
      const pagePath = hash[1] ?? null;
      const id = hash[2];
      const src = pagePath ? pageSource(pagePath) : fs.readFileSync(path.join(ROOT, file), "utf-8");
      if (!src.includes(`id="${id}"`) && !src.includes(`id: "${id}"`)) missing.push(`${target} (in ${file})`);
    }
    assert.deepEqual(missing, [], `anchors with no matching id:\n${missing.join("\n")}`);
  });

  await t.test("3. No dead buttons: no empty handlers and no href=\"#\" fallbacks", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles("app", "components")) {
      const src = fs.readFileSync(file, "utf-8");
      const rel = path.relative(ROOT, file);
      if (/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(src)) offenders.push(`${rel}: empty onClick`);
      if (/onClick=\{\s*\(\)\s*=>\s*(null|undefined)\s*\}/.test(src)) offenders.push(`${rel}: no-op onClick`);
      if (/href=\{?\s*["']#["']/.test(src) || /\|\|\s*["']#["']/.test(src)) offenders.push(`${rel}: href="#"`);
    }
    assert.deepEqual(offenders, []);
  });

  await t.test('4. "Explore TRIAD" closes the modal and goes to the TRIAD demonstrations', () => {
    const home = read("app", "page.tsx");
    assert.equal(TRIAD_DEMONSTRATION_HREF, "/triad#demonstration");
    const triadModal = home.slice(home.indexOf('title: "Market Changes in Real Time With TRIAD"'));
    assert.ok(
      /destinationHref:\s*TRIAD_DEMONSTRATION_HREF,\s*destinationLabel:\s*"Explore TRIAD"/.test(triadModal),
      "the TRIAD modal's Explore TRIAD button must target the demonstrations"
    );
    const footer = home.slice(home.indexOf('id="video-modal-destination-link"') - 400);
    assert.ok(
      /href=\{activeVideoModal\.destinationHref\}[\s\S]{0,200}onClick=\{\(\) => setActiveVideoModal\(null\)\}/.test(footer),
      "clicking it must close the modal"
    );

    const triad = read("app", "triad", "page.tsx");
    assert.ok(triad.includes('id="demonstration"'), "/triad has the #demonstration section");
    for (const id of ["triad-studio", "know-your-major"]) {
      assert.ok(triad.includes(`id: "${id}"`), `/triad lists the ${id} demonstration`);
    }
    assert.ok(triad.includes("TRIAD_STUDIO_DEMO") && triad.includes("KNOW_YOUR_MAJOR_DEMO"));
    assert.ok(
      triad.indexOf('id="demonstration"') < triad.indexOf('id="overview-video"'),
      "demonstrations come before the overview video the modal already played"
    );
    assert.ok(read("components", "Footer.tsx").includes('href="/triad#know-your-major"'), "Footer links Know Your Major");
  });

  await t.test("5. Demo links: hosted app when configured, a working on-site page otherwise", () => {
    assert.equal(normaliseAppUrl("https://triad.example.com/"), "https://triad.example.com");
    assert.equal(normaliseAppUrl("  http://localhost:5173  "), "http://localhost:5173");
    for (const bad of [undefined, "", "   ", "triad.example.com", "javascript:alert(1)", "https://"]) {
      assert.equal(normaliseAppUrl(bad), null, `rejects ${String(bad)}`);
    }
    assert.deepEqual(demoLink("https://triad.example.com", "/know-your-major", GUIDED_DEMO_HREF), {
      href: "https://triad.example.com/know-your-major",
      external: true,
    });
    assert.deepEqual(demoLink(null, "/know-your-major", GUIDED_DEMO_HREF), { href: "/#contact", external: false });

    // This test run has no NEXT_PUBLIC_*_APP_URL: every demo falls back to a real page.
    const routes = appRoutes();
    for (const link of [TRIAD_STUDIO_DEMO, KNOW_YOUR_MAJOR_DEMO, RULE_OF_THREE_DEMO]) {
      if (link.external) continue;
      assert.ok(routeExists(link.href.split("#")[0], routes), `${link.href} must exist`);
    }
  });

  await t.test("6. TripletButton supports 4 columns with correct hover-card edges", () => {
    assert.equal(columnEdge(1, 4), "start");
    assert.equal(columnEdge(2, 4), "middle");
    assert.equal(columnEdge(3, 4), "middle");
    assert.equal(columnEdge(4, 4), "end");
    assert.equal(columnEdge(5, 4), "start", "a fifth card starts a new row");
    assert.equal(columnEdge(1, 3), "start");
    assert.equal(columnEdge(3, 3), "end");
    assert.equal(columnEdge(1, 1), "middle");
    assert.equal(columnEdge(undefined, 3), "middle");
    assert.equal(isExternalHref("https://r3.example.com"), true);
    assert.equal(isExternalHref("/triad"), false);
    assert.equal(isExternalHref(undefined), false);

    const tsx = read("components", "TripletButton.tsx");
    assert.ok(read("lib", "tripletLayout.ts").includes("export type TripletColumns = 1 | 2 | 3 | 4;"));
    assert.ok(tsx.includes("columns?: TripletColumns;"), "TripletButtonProps and the group accept columns");
    assert.ok(tsx.includes("data-edge={columnEdge(column, columns)}"));

    const css = read("components", "TripletButton.module.css");
    assert.match(css, /\.tripletGrid\[data-columns="4"\]\s*\{\s*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/);
    assert.match(css, /@media \(min-width: 681px\) and \(max-width: 1240px\)\s*\{\s*\.tripletGrid\[data-columns="4"\]\s*\{\s*grid-template-columns:\s*repeat\(2,/);
    assert.ok(css.includes('.tripletGrid[data-columns="4"] {\n    display: flex;') || /\[data-columns="3"\],\s*\.tripletGrid\[data-columns="4"\]\s*\{\s*display: flex;/.test(css), "phones get the carousel");
    assert.ok(!css.includes('[data-column="3"]'), "edges no longer assume a 3-column grid");
    assert.ok(!css.includes("!important"), "no !important");
  });

  await t.test("7. Homepage hero has four working pathways: Cubicon, Research Libs, TRIAD, Rule of Three", () => {
    const home = read("app", "page.tsx");
    assert.ok(/<TripletButtonGroup\s+items=\{heroTripletButtons\}\s+columns=\{4\}/.test(home));
    const ids = [...home.matchAll(/^ {6}id: "([a-z-]+)",$/gm)].map((m) => m[1]);
    for (const id of ["validate-survey-participants", "faster-digital-asset-creation", "market-changes-in-real-time", "rule-of-three"]) {
      assert.ok(ids.includes(id), `hero pathway ${id}`);
    }
    assert.ok(home.includes("href: RULE_OF_THREE_DEMO.href") && home.includes("external: RULE_OF_THREE_DEMO.external"));
  });

  await t.test("8. Zero-Emoji Compliance", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const file of [
      ["lib", "demoLinks.ts"],
      ["lib", "security", "contact-verification.ts"],
      ["tests", "navigation-and-routes.test.ts"],
      ["tests", "contact-security.test.ts"],
    ]) {
      assert.ok(!emojiRegex.test(read(...file)), `${file.join("/")} must contain no emoji`);
    }
  });
});
