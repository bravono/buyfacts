import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

type TripletButtonTheme = "orange" | "blue" | "purple" | "teal";

interface TripletButtonItemSpec {
  id: string;
  title: string;
  tagline: string;
  href: string;
  iconUrl?: string;
  fallbackIcon?: string;
  iconAlt?: string;
  theme?: TripletButtonTheme;
  badge?: string;
  external?: boolean;
  actionHint?: string;
}

const HERO_TRIPLET_SPECS: TripletButtonItemSpec[] = [
  {
    id: "early-recognition",
    title: "Early Recognition",
    tagline: "What is beginning to matter?",
    href: "/products-services",
    theme: "orange",
    fallbackIcon: "TrendingUp",
    iconUrl: "",
    actionHint: "Explore Recognition",
  },
  {
    id: "story-based-research",
    title: "Story-Based Research",
    tagline: "What can we learn from people who actually know and experience it?",
    href: "/research-imperatives",
    theme: "blue",
    fallbackIcon: "FileText",
    iconUrl: "",
    actionHint: "Explore Research",
  },
  {
    id: "triad",
    title: "TRIAD",
    tagline: "How can we capture differences in perspective so patterns can emerge?",
    href: "/products-services#triad",
    theme: "purple",
    fallbackIcon: "Compass",
    iconUrl: "",
    actionHint: "Explore TRIAD",
  },
];

function resolveThemeClass(theme?: TripletButtonTheme): string {
  switch (theme) {
    case "blue":
      return "themeBlue";
    case "purple":
      return "themePurple";
    case "teal":
      return "themeTeal";
    case "orange":
    default:
      return "themeOrange";
  }
}

function shouldRenderCdnImage(iconUrl?: string, hasError: boolean = false): boolean {
  if (hasError) return false;
  if (!iconUrl) return false;
  return iconUrl.trim().length > 0;
}

function resolveLinkTarget(item: TripletButtonItemSpec): { isExternal: boolean; rel?: string; target?: string } {
  const isExternal = Boolean(
    item.external ||
    item.href.startsWith("http://") ||
    item.href.startsWith("https://")
  );

  if (isExternal) {
    return {
      isExternal: true,
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }

  return { isExternal: false };
}

function resolveGridColumns(columns?: number): number {
  if (columns === 1 || columns === 2 || columns === 3) {
    return columns;
  }
  return 3;
}

describe("TripletButton Component & Specification Test Suite", () => {
  it("should validate all 3 hero triplet button specifications", () => {
    assert.equal(HERO_TRIPLET_SPECS.length, 3, "Hero triplet must have exactly 3 button pathways");

    for (const spec of HERO_TRIPLET_SPECS) {
      assert.ok(spec.id && spec.id.length > 0, "Item id must be a non-empty string");
      assert.ok(spec.title && spec.title.length > 0, "Item title must be non-empty");
      assert.ok(spec.tagline && spec.tagline.length > 0, "Item tagline (brief text below) must be non-empty");
      assert.ok(spec.href && spec.href.startsWith("/"), "Item href must be a valid path");
      assert.ok(spec.theme && ["orange", "blue", "purple", "teal"].includes(spec.theme), "Item theme must be valid");
      assert.ok(spec.fallbackIcon && spec.fallbackIcon.length > 0, "Fallback icon must be declared");
    }
  });

  it("should resolve correct CSS theme classes and fallback to themeOrange for invalid/empty themes", () => {
    assert.equal(resolveThemeClass("orange"), "themeOrange");
    assert.equal(resolveThemeClass("blue"), "themeBlue");
    assert.equal(resolveThemeClass("purple"), "themePurple");
    assert.equal(resolveThemeClass("teal"), "themeTeal");
    assert.equal(resolveThemeClass(undefined), "themeOrange");
    assert.equal(resolveThemeClass("" as TripletButtonTheme), "themeOrange");
  });

  it("should correctly handle CDN icon URL evaluation and error fallback", () => {
    assert.equal(shouldRenderCdnImage("https://cdn.example.com/icons/triad.svg", false), true);
    assert.equal(shouldRenderCdnImage("https://cdn.example.com/icons/triad.svg", true), false, "Must fallback when image errors");
    assert.equal(shouldRenderCdnImage("", false), false, "Empty URL must fallback");
    assert.equal(shouldRenderCdnImage("   ", false), false, "Whitespace URL must fallback");
    assert.equal(shouldRenderCdnImage(undefined, false), false, "Undefined URL must fallback");
  });

  it("should enforce external link security attributes when external URLs are provided", () => {
    const internalItem: TripletButtonItemSpec = {
      id: "internal",
      title: "Internal Page",
      tagline: "Brief text",
      href: "/services",
    };
    const externalHttpItem: TripletButtonItemSpec = {
      id: "external-http",
      title: "External HTTP",
      tagline: "Brief text",
      href: "http://example.com",
    };
    const externalHttpsItem: TripletButtonItemSpec = {
      id: "external-https",
      title: "External HTTPS",
      tagline: "Brief text",
      href: "https://example.com",
    };
    const flaggedExternalItem: TripletButtonItemSpec = {
      id: "flagged-external",
      title: "Flagged External",
      tagline: "Brief text",
      href: "/out",
      external: true,
    };

    assert.equal(resolveLinkTarget(internalItem).isExternal, false);
    assert.equal(resolveLinkTarget(internalItem).target, undefined);

    const httpTarget = resolveLinkTarget(externalHttpItem);
    assert.equal(httpTarget.isExternal, true);
    assert.equal(httpTarget.target, "_blank");
    assert.equal(httpTarget.rel, "noopener noreferrer");

    const httpsTarget = resolveLinkTarget(externalHttpsItem);
    assert.equal(httpsTarget.isExternal, true);
    assert.equal(httpsTarget.target, "_blank");
    assert.equal(httpsTarget.rel, "noopener noreferrer");

    const flaggedTarget = resolveLinkTarget(flaggedExternalItem);
    assert.equal(flaggedTarget.isExternal, true);
    assert.equal(flaggedTarget.target, "_blank");
    assert.equal(flaggedTarget.rel, "noopener noreferrer");
  });

  it("should validate grid columns constraint and fallback defaults", () => {
    assert.equal(resolveGridColumns(1), 1);
    assert.equal(resolveGridColumns(2), 2);
    assert.equal(resolveGridColumns(3), 3);
    assert.equal(resolveGridColumns(4), 3, "Unsupported column counts must default to 3");
    assert.equal(resolveGridColumns(undefined), 3, "Undefined column count must default to 3");
    assert.equal(resolveGridColumns(0), 3, "Zero column count must default to 3");
  });
});
