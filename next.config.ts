import type { NextConfig } from "next";

/** Only requests made by a page inside that bundle (images, fetch, CSS url()) carry its Referer. */
// Next anchors `value` (^...$); also match the bare /triad-app and /r3-app entry URLs.
const fromBundle = (dir: string) => [{ type: "header" as const, key: "referer", value: `.*/(?:${dir})(?:[/?#].*)?` }];

/**
 * The TRIAD and Rule of Three bundles were built for a site root, so they request
 * /assets/..., /Introduction.html, /LogoGold.svg and so on. Both use some of the same root
 * paths, so each is routed by the Referer of the requesting page. There is no public/assets
 * in BuyFacts, and afterFiles rewrites never shadow a real file or page.
 * shortcut: relies on same-origin Referer (no Referrer-Policy: no-referrer); upgrade by rebuilding the bundles with Vite `base`.
 */
const embeddedBundleRewrites = [
  // TRIAD Studio's iframe (relative links inside it then resolve under this prefix too).
  { source: "/affinity-effect-app/:path*", destination: "/triad-app/affinity-effect-app/:path*" },
  { source: "/assets/:path*", has: fromBundle("triad-app"), destination: "/triad-app/assets/:path*" },
  {
    source: "/:file(Introduction\\.html|Logo\\.svg|LogoGold\\.svg|flash\\.png|TRIAD_DATA\\.json|KYM_TRIAD_DATA\\.json|MAJORS_DATA\\.json)",
    has: fromBundle("triad-app"),
    destination: "/triad-app/:file",
  },
  // The R3 bundle asks for lowercase names of these two files; production file systems are case-sensitive.
  { source: "/assets/bottom_boomerang.svg", has: fromBundle("rule-of-three-app|r3-app"), destination: "/rule-of-three-app/assets/Bottom_Boomerang.svg" },
  { source: "/assets/left_boomerang.svg", has: fromBundle("rule-of-three-app|r3-app"), destination: "/rule-of-three-app/assets/Left_Boomerang.svg" },
  { source: "/assets/:path*", has: fromBundle("rule-of-three-app|r3-app"), destination: "/rule-of-three-app/assets/:path*" },
  { source: "/:file([A-Za-z-]+\\.html)", has: fromBundle("rule-of-three-app|r3-app"), destination: "/rule-of-three-app/:file" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    // Both bundles fetch this same URL for different files, so a cached copy must not cross over.
    return [{ source: "/Introduction.html", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
  async rewrites() {
    return [
      {
        source: "/arts/:path*",
        destination: "/cubicon-app/arts/:path*",
      },
      {
        source: "/cubion",
        destination: "/cubicon",
      },
      {
        source: "/triad-app",
        destination: "/triad-app/index.html",
      },
      {
        source: "/rule-of-three-app/:path*",
        destination: "/rule-of-three-app/index.html",
      },
      {
        source: "/rule-of-three-app",
        destination: "/rule-of-three-app/index.html",
      },
      {
        source: "/r3-app",
        destination: "/rule-of-three-app/index.html",
      },
      {
        source: "/r3",
        destination: "/rule-of-three",
      },
      ...embeddedBundleRewrites,
    ];
  },
};

export default nextConfig;
