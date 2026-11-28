/**
 * Dashboard Topics Manifest: the single source of truth for the two 10-topic dashboards.
 *
 *   Dashboard 1 "Roles and Topics"           -> app/research-imperatives/page.tsx
 *   Dashboard 2 "Innovations That Save Time" -> app/products-services/page.tsx
 *
 * Each dashboard has 10 topics: position 1 is the dashboard overview (its welcome row),
 * positions 2-10 are the nine grid buttons in DashboardAnimation's 3x3 order. That is
 * 20 topics in total, each with one In-Depth article slot and one video slot.
 *
 * What lives where:
 * - This manifest owns topic identity (id, label, order), the DashboardButton row each
 *   topic reads its text from (`buttonId`), and the topic's default In-Depth article,
 *   video and audio (external CDN URLs; no media is committed to this repository).
 * - The database row (via /api/buttons) owns the editable text: subtitle, description,
 *   descriptionText. A row's SEE IT / READ IT / HEAR IT link overrides the manifest
 *   default when it is non-empty and is not one of the legacy cross-wired links that
 *   earlier seeds wrote (LEGACY_CROSS_WIRED_URLS), so links set through /admin still work.
 *
 * Asset slots are only filled with an asset verified to belong to that topic. A `null`
 * slot means no topic-specific asset exists yet: the player then shows its
 * "No Media Found" state instead of borrowing another topic's media.
 *
 * Unassigned legacy READ IT documents (they belong to an earlier topic set, so they are
 * deliberately not attached here). Candidates awaiting an editorial decision:
 *   products-services/1791986844032-fg4d90-07_Content_Value_Description.docx       "Content Assessment"
 *   products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx    "Recognize IT"
 *   products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx "Validate IT"
 *   research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx   "Research Methods"
 *   research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx    "Cohort Research"
 *   research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx  "Survey Engagement"
 *   research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx   "Hybrid Marketing"
 *   research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx   "Content Creation"
 *   research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx "Marketing Leadership"
 *   research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx  "Research Leadership"
 *   research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx         "Wisdom Gap"
 */

export const CDN_BASE_URL = "https://s3.buyfacts.com/buyfacts-public-assets";

/** Builds an absolute CDN URL from a bucket object key. */
const cdn = (objectKey: string): string => `${CDN_BASE_URL}/${objectKey}`;

export type DashboardKey = "research-imperatives" | "products-services";

export interface DashboardTopic {
  /** Stable slug used in code and URLs. */
  id: string;
  /** Exact label shown on the dashboard. */
  label: string;
  /** 1-based position: 1 = dashboard overview, 2-10 = grid buttons in order. */
  position: number;
  /** DashboardButton row (/api/buttons) that supplies this topic's editable text. */
  buttonId: string;
  /** In-Depth article (READ IT / "A Deeper Preview"), or null when none is assigned yet. */
  inDepthArticleUrl: string | null;
  /** Topic video (SEE IT), or null when none is assigned yet. */
  videoUrl: string | null;
  /** Topic audio (HEAR IT), or null when none is assigned yet. */
  audioUrl: string | null;
}

export interface DashboardManifest {
  key: DashboardKey;
  /** Dashboard name (also the overview topic's label). */
  title: string;
  /** Arc title rendered by DashboardAnimation. */
  arcTitle: string;
  /** Route that renders this dashboard. */
  route: string;
  /** Exactly 10 topics, position 1 first. */
  topics: readonly DashboardTopic[];
}

const VIDEO = {
  triad: cdn("uploads/1792570971365-1vco29-Market_Changes_in_Real_Time_Triad.mp4"),
  researchLibs: cdn(
    "uploads/1792572243537-m08z4w-BuyFacts_Research_Libs_Website_Preview_Cloned_Voice_Layout_Corrected_2026-10-16.mp4"
  ),
  earlyRecognition: cdn(
    "products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4"
  ),
} as const;

const AUDIO = {
  cubicon: cdn("products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3"),
} as const;

// Each document was matched to its topic by its content (title and subject), not by filename.
const ARTICLE = {
  cubicon: cdn("products-services/1791986842535-s0z06x-05_Participant_Validation_Description.docx"), // "Respondent Validation: Play Cubicon Puzzle Games"
  researchLibs: cdn("products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx"), // "Story-Based Surveys: Dual-Based Survey Model"
  researchPlanner: cdn("products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx"), // "Survey Define IT: Inclusive Research Definition"
  surveyImprovement: cdn("products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx"), // "Survey Refine IT"
  surveyCreation: cdn("products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx"), // "Survey Build IT"
  surveyFieldwork: cdn("products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx"), // "Survey Field IT"
  earlyRecognition: cdn("research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx"), // "Early Recognition"
} as const;

type TopicSpec = Omit<DashboardTopic, "position" | "buttonId">;

/** Assigns 1-based positions and the matching `<prefix>-000` ... `<prefix>-009` row ids. */
const withPositions = (prefix: "btn-tl" | "btn-srv", specs: TopicSpec[]): DashboardTopic[] =>
  specs.map((spec, index) => ({
    ...spec,
    position: index + 1,
    buttonId: `${prefix}-${String(index).padStart(3, "0")}`,
  }));

export const ROLES_AND_TOPICS_DASHBOARD: DashboardManifest = {
  key: "research-imperatives",
  title: "Roles and Topics",
  arcTitle: "RESEARCH IMPERATIVES",
  route: "/research-imperatives",
  topics: withPositions("btn-tl", [
    { id: "roles-and-topics", label: "Roles and Topics", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "cxo", label: "CxO", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "chief-marketing-officer", label: "Chief Marketing Officer", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "marketer", label: "Marketer", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "researcher", label: "Researcher", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    {
      id: "early-recognition",
      label: "Early Recognition",
      inDepthArticleUrl: ARTICLE.earlyRecognition,
      videoUrl: VIDEO.earlyRecognition,
      audioUrl: null,
    },
    { id: "building-great-surveys", label: "Building Great Surveys", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "agency-principal", label: "Agency Principal", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "buyfacts-methods", label: "BuyFacts Methods", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "stewardship", label: "Stewardship", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
  ]),
};

export const INNOVATIONS_DASHBOARD: DashboardManifest = {
  key: "products-services",
  title: "Innovations That Save Time",
  arcTitle: "INNOVATIONS THAT SAVE TIME",
  route: "/products-services",
  topics: withPositions("btn-srv", [
    { id: "innovations-that-save-time", label: "Innovations That Save Time", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "cubicon", label: "Cubicon", inDepthArticleUrl: ARTICLE.cubicon, videoUrl: null, audioUrl: AUDIO.cubicon },
    { id: "triad", label: "TRIAD", inDepthArticleUrl: null, videoUrl: VIDEO.triad, audioUrl: null },
    {
      id: "research-libs",
      label: "Research Libs",
      inDepthArticleUrl: ARTICLE.researchLibs,
      videoUrl: VIDEO.researchLibs,
      audioUrl: null,
    },
    { id: "rule-of-three", label: "Rule of Three", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
    { id: "research-planner", label: "Research Planner", inDepthArticleUrl: ARTICLE.researchPlanner, videoUrl: null, audioUrl: null },
    { id: "survey-improvement", label: "Survey Improvement", inDepthArticleUrl: ARTICLE.surveyImprovement, videoUrl: null, audioUrl: null },
    { id: "survey-creation", label: "Survey Creation", inDepthArticleUrl: ARTICLE.surveyCreation, videoUrl: null, audioUrl: null },
    { id: "survey-fieldwork", label: "Survey Fieldwork", inDepthArticleUrl: ARTICLE.surveyFieldwork, videoUrl: null, audioUrl: null },
    { id: "research-led-content", label: "Research-Led Content", inDepthArticleUrl: null, videoUrl: null, audioUrl: null },
  ]),
};

export const DASHBOARD_TOPICS_MANIFEST: Readonly<Record<DashboardKey, DashboardManifest>> = {
  "research-imperatives": ROLES_AND_TOPICS_DASHBOARD,
  "products-services": INNOVATIONS_DASHBOARD,
};

/** All 20 topics across both dashboards. */
export const ALL_DASHBOARD_TOPICS: readonly DashboardTopic[] = [
  ...ROLES_AND_TOPICS_DASHBOARD.topics,
  ...INNOVATIONS_DASHBOARD.topics,
];

/** Shape of a /api/buttons row this module reads (a subset of the DashboardButton model). */
export interface DashboardButtonRow {
  id: string;
  label?: string | null;
  subtitle?: string | null;
  description?: string | null;
  descriptionText?: string | null;
  seeItUrl?: string | null;
  readItUrl?: string | null;
  hearItUrl?: string | null;
}

/**
 * Links that seeds before this manifest wrote onto dashboard rows, where they belonged to a
 * different topic (or were one placeholder shared by every row). Existing databases still
 * hold them because seed:prod never overwrites media links, so they must not override the
 * manifest. Keyed by row id; LEGACY_SHARED applied to every row.
 */
const LEGACY_SHARED: readonly string[] = [VIDEO.earlyRecognition, AUDIO.cubicon];
const legacyDoc = (objectKey: string) => cdn(objectKey);
export const LEGACY_CROSS_WIRED_URLS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries({
    "btn-srv-001": "products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    "btn-srv-002": "products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx",
    "btn-srv-003": "products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx",
    "btn-srv-004": "products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx",
    "btn-srv-005": "products-services/1791986842535-s0z06x-05_Participant_Validation_Description.docx",
    "btn-srv-006": "products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx",
    "btn-srv-007": "products-services/1791986844032-fg4d90-07_Content_Value_Description.docx",
    "btn-srv-008": "products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx",
    "btn-srv-009": "products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx",
    "btn-tl-001": "research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx",
    "btn-tl-002": "research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx",
    "btn-tl-003": "research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx",
    "btn-tl-004": "research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx",
    "btn-tl-005": "research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx",
    "btn-tl-006": "research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx",
    "btn-tl-007": "research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx",
    "btn-tl-008": "research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx",
    "btn-tl-009": "research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx",
  }).map(([rowId, docKey]) => [rowId, [...LEGACY_SHARED, legacyDoc(docKey)]])
);

/** True when `url` is a legacy cross-wired link previously seeded onto row `rowId`. */
export function isLegacyCrossWiredUrl(rowId: string, url: string): boolean {
  return (LEGACY_CROSS_WIRED_URLS[rowId] ?? LEGACY_SHARED).includes(url);
}

/** A topic merged with its database text, ready for DashboardAnimation and MediaPlayer. */
export interface ResolvedDashboardTopic {
  id: string;
  label: string;
  tagline: string;
  description: string;
  /** descriptionText split into paragraphs (used by the overview/welcome panel). */
  paragraphs: string[];
  seeItUrl: string;
  hearItUrl: string;
  readItUrl: string;
}

export interface ResolvedDashboard {
  /** Position 1: the dashboard overview shown in the welcome panel. */
  overview: ResolvedDashboardTopic;
  /** Positions 2-10, in grid order. */
  buttons: ResolvedDashboardTopic[];
}

const text = (value: string | null | undefined): string => (value ?? "").trim();

/** A row's link wins when set and not legacy cross-wired; otherwise the manifest default. */
function pickUrl(topic: DashboardTopic, rowUrl: string | null | undefined, manifestUrl: string | null): string {
  const url = text(rowUrl);
  return url && !isLegacyCrossWiredUrl(topic.buttonId, url) ? url : manifestUrl ?? "";
}

function resolveTopic(topic: DashboardTopic, row: DashboardButtonRow | undefined): ResolvedDashboardTopic {
  // descriptionText is the full text; description is the shorter legacy summary.
  const descriptionText = text(row?.descriptionText) || text(row?.description);
  return {
    id: topic.id,
    label: topic.label,
    tagline: text(row?.subtitle),
    description: descriptionText,
    paragraphs: descriptionText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean),
    seeItUrl: pickUrl(topic, row?.seeItUrl, topic.videoUrl),
    hearItUrl: pickUrl(topic, row?.hearItUrl, topic.audioUrl),
    readItUrl: pickUrl(topic, row?.readItUrl, topic.inDepthArticleUrl),
  };
}

/**
 * Merges a dashboard's manifest with /api/buttons rows. Rows are matched strictly by
 * `buttonId`, never by category or array position, so a topic can only ever show its
 * own text and links. Pass no rows to render the manifest alone (labels and default
 * assets, no text).
 */
export function resolveDashboard(
  manifest: DashboardManifest,
  rows: readonly DashboardButtonRow[] = []
): ResolvedDashboard {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const [overviewTopic, ...buttonTopics] = manifest.topics;
  return {
    overview: resolveTopic(overviewTopic, rowsById.get(overviewTopic.buttonId)),
    buttons: buttonTopics.map((topic) => resolveTopic(topic, rowsById.get(topic.buttonId))),
  };
}
