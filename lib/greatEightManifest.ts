/**
 * The Great Eight: single source of truth for the homepage section (app/page.tsx),
 * its viewpoint article modal, and the /api/great-eight fallback rows.
 *
 * Copy (heading, subtitle, byline, pills, banner, the eight titles) is verbatim from
 * Robert's "Great Eight Title and Topic Names" document and Phase 2 of the BuyFacts
 * Website Master Task List.
 *
 * Content slots per card, per the Master Task List ("Research Doc #N + Dropbox Graphic NN"):
 * - articleUrl  Robert's viewpoint article (Research Doc #N), a CDN .docx or .pdf
 * - graphicUrl  the card's custom graphic (Dropbox Graphic NN), a CDN image
 * - audioUrl    Robert's audio performance of the viewpoint, a CDN audio file
 * None of these has been delivered yet: the Dropbox archive is not on the CDN, and none of
 * the 18 documents already on the CDN is a Great Eight article (they describe the two
 * dashboards' topics). So every slot is empty until Robert's files are uploaded. Fill a
 * slot here, or set the row's READ IT / HEAR IT link in /admin (GreatEightItem).
 *
 * `summary` and `viewpoint` are the interim text already shown on staging. Replace them
 * with Robert's text when Research Doc #N arrives.
 *
 * No media is committed to this repository: every URL is an external CDN URL.
 */

export const GREAT_EIGHT_CDN_BASE_URL = "https://s3.buyfacts.com/buyfacts-public-assets";

const cdn = (objectKey: string): string => `${GREAT_EIGHT_CDN_BASE_URL}/${objectKey}`;

/** Section header copy, verbatim from Robert's spec. */
export const GREAT_EIGHT_SECTION = {
  heading: "The Great Eight",
  subtitle: "Better Surveys, Smarter Research, and Putting the Findings to Work",
  byline: "From the Research Minds at BuyFacts",
  pills: [
    "Better Questions, Better Research",
    "Fresh Thinking, Practical Ideas",
    "More Value from Your Findings",
  ],
  banner:
    "Eight perspectives on making research more useful, from designing the survey to putting what you learn to work.",
} as const;

export type GreatEightSlug =
  | "targeting-your-survey"
  | "the-allure-of-too-many-choices"
  | "stories-supported-by-facts"
  | "the-top-ten-market-research-best-practices"
  | "the-art-of-asking-great-survey-questions"
  | "executives-want-insight-not-coffee-cards"
  | "build-content-fast-from-survey-findings"
  | "avoid-death-from-doubt";

export interface GreatEightCard {
  /** Display number, "01" to "08". */
  number: string;
  /** 1-based order (also the GreatEightItem.orderIndex). */
  orderIndex: number;
  /** Stable id; matches GreatEightItem.slug in the database. */
  slug: GreatEightSlug;
  /** Exact card and modal title. */
  title: string;
  /** Title this card replaced on the homepage (kept for traceability). */
  legacyTitle: string;
  /** One-line summary shown under the modal title. */
  summary: string;
  /** Viewpoint text, one string per paragraph. */
  viewpoint: readonly string[];
  /** Robert's viewpoint article (Research Doc #N). */
  articleUrl?: string;
  /** Custom card graphic (Dropbox Graphic NN). */
  graphicUrl?: string;
  /** Robert's audio performance. */
  audioUrl?: string;
  /** Card icon (CDN SVG) and accent colors: the existing card design. */
  iconUrl: string;
  iconColor: string;
  bgColor: string;
}

type CardSpec = Omit<GreatEightCard, "number" | "orderIndex">;

const CARD_SPECS: readonly CardSpec[] = [
  {
    slug: "targeting-your-survey",
    title: "Targeting Your Survey",
    legacyTitle: "Survey Design",
    summary: "Reach the right participants to generate accurate, actionable insights.",
    viewpoint: [
      "Effective survey research begins with precision targeting. When questions reach qualified, genuine participants rather than unvetted panels, research findings accurately reflect your true market dynamics and prevent expensive misdirection.",
    ],
    iconUrl: cdn("uploads/1791315274750-bri2xa-BuyFacts_Survey_Hosting.svg"),
    iconColor: "#14a38b",
    bgColor: "rgba(20, 163, 139, 0.08)",
  },
  {
    slug: "the-allure-of-too-many-choices",
    title: "The Allure of Too Many Choices",
    legacyTitle: "Participant Insight Choices",
    summary: "Focus participant decision frameworks to avoid choice overload.",
    viewpoint: [
      "Giving respondents excessive choices distorts feedback and lowers completion quality. Structuring decisions into focused, meaningful alternatives uncovers genuine preferences while keeping engagement high.",
    ],
    iconUrl: cdn("uploads/1791315259736-v7irdo-BuyFacts_Early_Recognition.svg"),
    iconColor: "#e6a100",
    bgColor: "rgba(230, 161, 0, 0.08)",
  },
  {
    slug: "stories-supported-by-facts",
    title: "Stories Supported by Facts",
    legacyTitle: "Traditional and Story-based Instruments",
    summary: "Combine quantitative rigor with narrative recall that moves stakeholders.",
    viewpoint: [
      "Data alone seldom convinces skeptics, while stories without evidence invite doubt. Blending verified statistics with human narratives creates memorable, defensible business cases.",
    ],
    iconUrl: cdn("uploads/1791315269875-46dt5y-BuyFacts_Research_Tools_Concept.svg"),
    iconColor: "#6d6d6d",
    bgColor: "rgba(109, 109, 109, 0.08)",
  },
  {
    slug: "the-top-ten-market-research-best-practices",
    title: "The Top Ten Market Research Best Practices",
    legacyTitle: "Best Practices",
    summary: "Essential principles for reliable, high-yield research design.",
    viewpoint: [
      "Proven standards from survey architecture to data validation that ensure your findings withstand executive scrutiny and deliver enduring competitive advantage.",
    ],
    iconUrl: cdn("uploads/1791315259493-khokty-BuyFacts_Best_Practices_Keystone.svg"),
    iconColor: "#0089d2",
    bgColor: "rgba(0, 137, 210, 0.08)",
  },
  {
    slug: "the-art-of-asking-great-survey-questions",
    title: "The Art of Asking Great Survey Questions",
    legacyTitle: "Every Question Maps to Its Purpose",
    summary: "Every question must directly map to a strategic decision purpose.",
    viewpoint: [
      "Crafting unbiased, unambiguous questions ensures respondents share authentic perceptions. Eliminating filler questions respects participant time and sharpens decision clarity.",
    ],
    iconUrl: cdn("uploads/1791315269426-66lkh2-BuyFacts_Question_Design.svg"),
    iconColor: "#7cb342",
    bgColor: "rgba(124, 179, 66, 0.08)",
  },
  {
    slug: "executives-want-insight-not-coffee-cards",
    title: "Executives Want Insight, Not Coffee Cards",
    legacyTitle: "Executives Get Peer Comparison Not Coffee Cards",
    summary: "Peer comparisons and market benchmarks that command attention.",
    viewpoint: [
      "Executive respondents are motivated by peer benchmark insights, not trivial gift card incentives. Offering high-value market context attracts genuine leaders and drives meaningful data.",
    ],
    iconUrl: cdn("uploads/1791315281029-irb8ll-BuyFacts_Value_Quantification.svg"),
    iconColor: "#e57a45",
    bgColor: "rgba(229, 122, 69, 0.08)",
  },
  {
    slug: "build-content-fast-from-survey-findings",
    title: "Build Content Fast from Survey Findings",
    legacyTitle: "A Dual Approach Delivers Stories Backed by Facts",
    summary: "Accelerate digital asset creation directly from verified research data.",
    viewpoint: [
      "Transform survey results into thought leadership articles, graphics, and campaign copy in record time, multiplying the marketing return on every research initiative.",
    ],
    iconUrl: cdn("uploads/1791315275105-urqpqf-BuyFacts_Thought_Leadership_TL1.svg"),
    iconColor: "#14a38b",
    bgColor: "rgba(20, 163, 139, 0.08)",
  },
  {
    slug: "avoid-death-from-doubt",
    title: "Avoid Death from Doubt",
    legacyTitle: "Inclusive Stakeholder Engagement Reduces Malicious Compliance",
    summary: "Eliminate skepticism with verifiable, bot-protected research rigor.",
    viewpoint: [
      "When leadership doubts data integrity, research recommendations stall. Rigorous anti-bot verification and robust methodology provide the confidence required to act decisively.",
    ],
    iconUrl: cdn("uploads/1791315259585-6u4ucb-BuyFacts_Bot_Detection.svg"),
    iconColor: "#ffb039",
    bgColor: "rgba(255, 176, 57, 0.08)",
  },
];

/** The eight cards in display order, numbered "01" to "08". */
export const GREAT_EIGHT_CARDS: readonly GreatEightCard[] = CARD_SPECS.map((spec, index) => ({
  ...spec,
  number: String(index + 1).padStart(2, "0"),
  orderIndex: index + 1,
}));

/**
 * Links earlier seeds wrote onto every GreatEightItem row: one dashboard document
 * ("Survey Define IT") used as a placeholder for all eight cards. Databases seeded before
 * this manifest still hold it, so it never overrides a card.
 */
export const LEGACY_GREAT_EIGHT_URLS: readonly string[] = [
  cdn("products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx"),
];

/** Subset of a GreatEightItem row (/api/great-eight) that this module reads. */
export interface GreatEightRow {
  slug: string;
  tagline?: string | null;
  description?: string | null;
  readItUrl?: string | null;
  hearItUrl?: string | null;
}

const clean = (value: string | null | undefined): string => (value ?? "").trim();

/** A row's link wins when set and not a legacy placeholder; otherwise the manifest's. */
const pickUrl = (rowUrl: string | null | undefined, manifestUrl: string | undefined): string | undefined => {
  const url = clean(rowUrl);
  return url && !LEGACY_GREAT_EIGHT_URLS.includes(url) ? url : manifestUrl;
};

/**
 * Merges the manifest with /api/great-eight rows, matched strictly by slug (never by
 * position). Number, title and card design always come from the manifest; a row can
 * supply the summary, viewpoint text, article and audio set through /admin.
 */
export function resolveGreatEight(rows: readonly GreatEightRow[] = []): GreatEightCard[] {
  const rowsBySlug = new Map(rows.map((row) => [row.slug, row]));
  return GREAT_EIGHT_CARDS.map((card) => {
    const row = rowsBySlug.get(card.slug);
    if (!row) return card;
    const description = clean(row.description);
    return {
      ...card,
      summary: clean(row.tagline) || card.summary,
      viewpoint: description
        ? description.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean)
        : card.viewpoint,
      articleUrl: pickUrl(row.readItUrl, card.articleUrl),
      audioUrl: pickUrl(row.hearItUrl, card.audioUrl),
    };
  });
}
