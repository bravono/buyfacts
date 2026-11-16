/**
 * Where the live demonstrations are hosted.
 *
 * The interactive TRIAD tools (the B2B TRIAD Studio and Know Your Major) and the Rule of
 * Three app are separate deployments (github.com/MaestroDev-H/TRIAD and .../R3), not pages
 * of this site. Set their public base URLs at build time:
 *
 *   NEXT_PUBLIC_TRIAD_APP_URL=https://<triad deployment>   (serves /affinity-effect, /know-your-major)
 *   NEXT_PUBLIC_R3_APP_URL=https://<rule of three deployment>
 *
 * Until a URL is set, each demonstration falls back to an on-site page, so no link is dead.
 */

/** Normalises a configured base URL: https (or http) only, no trailing slash. */
export function normaliseAppUrl(value: string | undefined | null): string | null {
  const url = (value ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+/i.test(url) ? url : null;
}

const TRIAD_APP_URL = normaliseAppUrl(process.env.NEXT_PUBLIC_TRIAD_APP_URL);
const R3_APP_URL = normaliseAppUrl(process.env.NEXT_PUBLIC_R3_APP_URL);

/** Contact section on the home page: where visitors can book a guided demonstration. */
export const GUIDED_DEMO_HREF = "/#contact";

export interface DemoLink {
  href: string;
  /** True when the link opens the hosted demonstration (a different site, new tab). */
  external: boolean;
}

/** Builds a demo link: the hosted app path when configured, otherwise the fallback. */
export function demoLink(baseUrl: string | null, path: string, fallback: string): DemoLink {
  return baseUrl ? { href: `${baseUrl}${path}`, external: true } : { href: fallback, external: false };
}

/** The B2B TRIAD Studio demonstration. */
export const TRIAD_STUDIO_DEMO = demoLink(TRIAD_APP_URL, "/affinity-effect", GUIDED_DEMO_HREF);

/** The Know Your Major TRIAD demonstration. */
export const KNOW_YOUR_MAJOR_DEMO = demoLink(TRIAD_APP_URL, "/know-your-major", GUIDED_DEMO_HREF);

/** The Rule of Three app; falls back to its topic on the Innovations dashboard. */
export const RULE_OF_THREE_DEMO = demoLink(R3_APP_URL, "/", "/products-services");

/** The TRIAD page's demonstrations section (target of "Explore TRIAD"). */
export const TRIAD_DEMONSTRATION_HREF = "/triad#demonstration";
