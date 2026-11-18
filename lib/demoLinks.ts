/**
 * Where the live demonstrations are hosted.
 *
 * The interactive TRIAD tools (the B2B TRIAD Studio and Know Your Major) and the Rule of
 * Three app ship as static bundles inside this site (public/triad-app, public/rule-of-three-app).
 * To point the links at a separate deployment instead, set its public base URL at build time:
 *
 *   NEXT_PUBLIC_TRIAD_APP_URL=https://<triad deployment>   (serves /affinity-effect-app/index.html, /index.html)
 *   NEXT_PUBLIC_R3_APP_URL=https://<rule of three deployment>
 */

/** Normalises a configured base URL: https (or http) only, no trailing slash. */
export function normaliseAppUrl(value: string | undefined | null): string | null {
  const url = (value ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+/i.test(url) ? url : null;
}

/** On-site homes of the embedded bundles, used when no deployment URL is configured. */
export const EMBEDDED_TRIAD_BASE = "/triad-app";
export const EMBEDDED_R3_BASE = "/rule-of-three-app";

const TRIAD_APP_URL = normaliseAppUrl(process.env.NEXT_PUBLIC_TRIAD_APP_URL) ?? EMBEDDED_TRIAD_BASE;
const R3_APP_URL = normaliseAppUrl(process.env.NEXT_PUBLIC_R3_APP_URL) ?? EMBEDDED_R3_BASE;

export interface DemoLink {
  href: string;
  /** True when the link opens a standalone demo app (plain anchor, new tab), not a Next page. */
  external: boolean;
}

/** Builds a demo link into an app; the bundles are static HTML, so it is always a plain new-tab link. */
export function demoLink(baseUrl: string, path: string): DemoLink {
  return { href: `${baseUrl}${path}`, external: true };
}

/** The B2B TRIAD Studio demonstration (The Affinity Effect). */
export const TRIAD_STUDIO_DEMO = demoLink(TRIAD_APP_URL, "/affinity-effect-app/index.html");

/** The Know Your Major TRIAD demonstration; the TRIAD bundle uses a hash router. */
export const KNOW_YOUR_MAJOR_DEMO = demoLink(TRIAD_APP_URL, "/index.html#/know-your-major");

/** The Rule of Three app. */
export const RULE_OF_THREE_DEMO = demoLink(R3_APP_URL, "/");

/** The TRIAD page's demonstrations section (target of "Explore TRIAD"). */
export const TRIAD_DEMONSTRATION_HREF = "/triad#demonstration";
