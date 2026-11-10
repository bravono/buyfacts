import "dotenv/config";
import { PrismaClient, ContentFormat } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password";
import { DEFAULT_SURVEYS } from "../app/api/narrative-data/route";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

/**
 * Production seed script. Non-destructive and idempotent: safe on a live database.
 *
 * It never calls deleteMany. Every record is upserted or inserted only if missing:
 *  - Users: created if missing; existing accounts keep their password.
 *  - DashboardButtons: created if missing; existing rows get their label/text refreshed
 *    but keep their media links and type.
 *  - Media assets, Cubicon sequences/tasks, vault topics/assets, the default
 *    ResearchLib survey: upserted or created only when absent.
 *
 * The seeding engine is exported so it can be driven by a real Prisma client in
 * `main()` or by a lightweight stub in tests.
 */

export interface SeedProdUserCreate {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

export interface SeedProdUserUpsertArgs {
  where: { email: string };
  update: { name: string; role: string };
  create: SeedProdUserCreate;
}

export interface DashboardButtonSeed {
  id: string;
  label: string;
  descriptionText: string;
  readItUrl: string;
  seeItUrl: string;
  hearItUrl: string;
  subtitle: string;
  description: string;
  category: string;
  color: string;
}

export interface SeedProdDashboardButtonUpsertArgs {
  where: { id: string };
  update: Partial<DashboardButtonSeed>;
  create: DashboardButtonSeed;
}

/** The only surface of Prisma the production seed needs. */
export interface SeedProdClient {
  user: {
    upsert: (args: SeedProdUserUpsertArgs) => Promise<unknown>;
  };
  dashboardButton: {
    upsert: (args: SeedProdDashboardButtonUpsertArgs) => Promise<unknown>;
  };
}

export interface SeedProductionResult {
  usersSeeded: number;
  buttonsSeeded: number;
}

export const PRODUCTION_USERS: ReadonlyArray<{
  email: string;
  name: string;
  role: string;
}> = [
  {
    email: "rmj@robertjohnson.com",
    name: "Robert Johnson",
    role: "admin",
  },
  {
    email: "ahbideeny@gmail.com",
    name: "Ahbideen Yusuf",
    role: "admin",
  },
];

export const PRODUCTION_DASHBOARD_BUTTONS: DashboardButtonSeed[] = [
  {
    "id": "btn-srv-000",
    "label": "Innovations That Save Time",
    "descriptionText": "Saving time in research begins with knowing where effort creates value and where it is wasted. BuyFacts innovations help marketers and researchers strengthen participant quality, understand the practical and emotional drivers behind decisions, and turn findings into knowledge that remains useful beyond a single report.\n\nCubicon, TRIAD, Research Libs, and Rule of Three each address a distinct challenge. Research planning, survey improvement, creation, fieldwork, and research-led content extend their value throughout the process. Together, these innovations combine rigor with efficiency, reducing avoidable effort and increasing the return on research through more useful findings, earlier recognition, and more time to make better choices.",
    "readItUrl": "",
    "seeItUrl": "",
    "hearItUrl": "",
    "subtitle": "",
    "description": "Saving time in research begins with knowing where effort creates value and where it is wasted. BuyFacts innovations help marketers and researchers strengthen participant quality, understand the practical and emotional drivers behind decisions, and turn findings into knowledge that remains useful beyond a single report.",
    "category": "Products & Services",
    "color": "#006398"
  },
  {
    "id": "btn-tl-000",
    "label": "Roles and Topics",
    "descriptionText": "Seeing change sooner gives people more time to make better choices. This dashboard connects nine roles and topics to practical questions about buyer behavior, research quality, and coordinated action.\n\nStart with the responsibility closest to your work: leadership, marketing, research, survey design, agency direction, or stewardship. Then ask what you need to recognize before a decision becomes urgent.\n\nBuyFacts focuses on useful evidence, not information for its own sake. Each topic helps reduce uncertainty, save time, and turn new understanding into better choices.",
    "readItUrl": "",
    "seeItUrl": "",
    "hearItUrl": "",
    "subtitle": "",
    "description": "Seeing change sooner gives people more time to make better choices. This dashboard connects nine roles and topics to practical questions about buyer behavior, research quality, and coordinated action.",
    "category": "Research Imperatives",
    "color": "#006398"
  },
  {
    "id": "btn-srv-001",
    "label": "Cubicon",
    "descriptionText": "Reliable research starts with genuine people. Cubicon helps validate that survey participants are human through engaging visual puzzle challenges that call for spatial reasoning and contextual interpretation. This additional validation layer helps protect surveys from bots and rogue respondents, increasing genuine participation that reflects the market's wants, needs, and experiences.\n\nWhen automated responses compromise a study, findings may be rejected, questioned, or collected again. By helping prevent that contamination before it reaches analysis, Cubicon reduces avoidable rework, saves research time, and supports more dependable findings that marketers and researchers can use with greater confidence.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Verify Human Engagement",
    "description": "Reliable research starts with genuine people. Cubicon helps validate that survey participants are human through engaging visual puzzle challenges that call for spatial reasoning and contextual interpretation. This additional validation layer helps protect surveys from bots and rogue respondents, increasing genuine participation that reflects the market's wants, needs, and experiences.",
    "category": "Products & Services",
    "color": "#9b5d00"
  },
  {
    "id": "btn-srv-002",
    "label": "TRIAD",
    "descriptionText": "TRIAD helps marketers recognize developing patterns sooner and understand where attention may be most valuable. It captures directional changes in the practical and emotional factors that influence buyers' affinity for particular vendors and products.\n\nKnowledgeable participants express their sentiment about the drivers shaping their perceptions and experiences, while identifying the relative importance of those drivers. Repeated measurements reveal where sentiment is strengthening, weakening, or diverging among audience groups. This continuing view moves beyond a single research snapshot to help marketers recognize changes in buyer affinity earlier, refine their priorities, and gain more time to make informed choices.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Recognize Developing Patterns Sooner",
    "description": "TRIAD helps marketers recognize developing patterns sooner and understand where attention may be most valuable. It captures directional changes in the practical and emotional factors that influence buyers' affinity for particular vendors and products.",
    "category": "Products & Services",
    "color": "#ea425f"
  },
  {
    "id": "btn-srv-003",
    "label": "Research Libs",
    "descriptionText": "Traditional surveys make answers easy to compare, but often leave the personal experience behind each choice unexplored. Research Libs addresses that gap with a dual survey method: identical response choices support structured quantitative measurement while participants use those choices to build connected stories in their own voices. Participants can also add their own words, revealing context that fixed choices may miss.\n\nThe result is comparable research evidence alongside authentic narratives that illuminate practical needs and emotional buyer drivers. For marketers, those storylines, backed by survey findings, create opportunities for educational thought leadership and other useful content without separating the facts from the people behind them.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Structured Narrative Storytelling",
    "description": "Traditional surveys make answers easy to compare, but often leave the personal experience behind each choice unexplored. Research Libs addresses that gap with a dual survey method: identical response choices support structured quantitative measurement while participants use those choices to build connected stories in their own voices. Participants can also add their own words, revealing context that fixed choices may miss.",
    "category": "Products & Services",
    "color": "#ff9900"
  },
  {
    "id": "btn-srv-004",
    "label": "Rule of Three",
    "descriptionText": "BuyFacts Rule of Three transforms research-led knowledge into targeted educational assets that bring focus and clarity to everyday decisions. An Approach Rule combines three principles that guide meaningful steps, while a Focus Rule combines three principles that illuminate complementary areas of attention. Each offers deeper understanding and practical guidance.\n\nFor vendors, Rule of Three assets offer white-label or shared-branding opportunities that reinforce the value of their go-to-market methods, tools, and distinctive positioning. By extending useful best practices into the fabric of daily decision-making, these engaging assets help vendors demonstrate continuing value while strengthening their relationships with the audiences they serve.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Three Actionable Perspectives",
    "description": "BuyFacts Rule of Three transforms research-led knowledge into targeted educational assets that bring focus and clarity to everyday decisions. An Approach Rule combines three principles that guide meaningful steps, while a Focus Rule combines three principles that illuminate complementary areas of attention. Each offers deeper understanding and practical guidance.",
    "category": "Products & Services",
    "color": "#006398"
  },
  {
    "id": "btn-srv-005",
    "label": "Research Planning",
    "descriptionText": "Promising investments often stall when stakeholders disagree about priorities, expected benefits, or the uncertainties surrounding a decision. These cross-functional differences can undermine worthwhile initiatives before they gain momentum.\n\nBuyFacts Research Planner engages key stakeholders early, bringing their concerns, experience, and expectations into a shared understanding of what the research must accomplish. By examining practical needs, emotional considerations, and individual and organizational benefits, it helps clarify the value an investment should deliver. The resulting alignment reduces uncertainty, strengthens the relevance of survey questions, and provides a sounder foundation for decisions, improving the likelihood of meaningful outcomes and a greater Return on Research.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842535-s0z06x-05_Participant_Validation_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Align Teams Around Shared Strategy",
    "description": "Promising investments often stall when stakeholders disagree about priorities, expected benefits, or the uncertainties surrounding a decision. These cross-functional differences can undermine worthwhile initiatives before they gain momentum.",
    "category": "Products & Services",
    "color": "#ffc164"
  },
  {
    "id": "btn-srv-006",
    "label": "Survey Improvement",
    "descriptionText": "A better survey creates a more engaging experience for respondents while producing answers researchers can interpret with greater clarity. Unnecessary repetition, ambiguous choices, and awkward transitions can interrupt participation and weaken the usefulness of findings.\n\nBuyFacts approaches survey improvement through careful attention to question wording, response choices, sequence, and the cadence that carries respondents naturally from one subject to the next. Each question should contribute to understanding without placing unnecessary demands on the participant. The result is stronger engagement, clearer interpretation, and more meaningful evidence, reducing wasted effort while improving research quality and the Return on Research.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Engage Respondents, Sharpen Evidence",
    "description": "A better survey creates a more engaging experience for respondents while producing answers researchers can interpret with greater clarity. Unnecessary repetition, ambiguous choices, and awkward transitions can interrupt participation and weaken the usefulness of findings.",
    "category": "Products & Services",
    "color": "#b0e843"
  },
  {
    "id": "btn-srv-007",
    "label": "Survey Creation",
    "descriptionText": "A well-created survey connects the questions people answer with the decisions the research must inform. BuyFacts approaches survey creation with careful attention to stakeholder objectives, participant understanding, and the practical and emotional factors that influence buyer behavior.\n\nThe Question Map establishes a clear relationship between what is asked, what will be learned, and how the findings will be used. Thoughtful language, response choices, and question sequencing make the survey easier to complete and its answers easier to interpret. The result is purposeful research that respects participant time and produces findings with greater usefulness and a stronger Return on Research.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844032-fg4d90-07_Content_Value_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Custom Instruments Leaders Can Trust",
    "description": "A well-created survey connects the questions people answer with the decisions the research must inform. BuyFacts approaches survey creation with careful attention to stakeholder objectives, participant understanding, and the practical and emotional factors that influence buyer behavior.",
    "category": "Products & Services",
    "color": "#42ea86"
  },
  {
    "id": "btn-srv-008",
    "label": "Survey Fieldwork",
    "descriptionText": "A thoughtfully designed survey deserves equally thoughtful execution. Survey fieldwork must balance timely participation with the quality and relevance of the people providing answers. Rushing to complete quotas can create problems that undermine otherwise sound research.\n\nBuyFacts emphasizes knowledgeable participants, human validation, respondent engagement, and careful attention to data quality throughout fieldwork. These practices help protect the integrity of the findings while reducing avoidable delays and rework. The value extends beyond completing a survey efficiently: it lies in collecting dependable evidence that reflects the market and gives marketers greater confidence in the decisions that follow.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Protect Data Quality and Speed",
    "description": "A thoughtfully designed survey deserves equally thoughtful execution. Survey fieldwork must balance timely participation with the quality and relevance of the people providing answers. Rushing to complete quotas can create problems that undermine otherwise sound research.",
    "category": "Products & Services",
    "color": "#ed40ed"
  },
  {
    "id": "btn-srv-009",
    "label": "Research-Led Content",
    "descriptionText": "Research becomes more valuable when its findings continue working long after the survey ends. BuyFacts helps transform authentic buyer experiences, practical needs, emotional drivers, and emerging patterns into educational content that audiences find useful.\n\nQuantitative evidence provides factual support, while participant stories add context, emotion, and human perspective. Together, they create opportunities for educational best-practice and thought leadership assets, social media posts, and sales force-led insights for prospects, buyers, and customers.\n\nThis gives marketing and sales valuable material throughout the customer relationship, strengthens vendor positioning, and extends the useful life of original findings, increasing both Return on Research and return on content.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Turn Evidence into Lasting Momentum",
    "description": "Research becomes more valuable when its findings continue working long after the survey ends. BuyFacts helps transform authentic buyer experiences, practical needs, emotional drivers, and emerging patterns into educational content that audiences find useful.",
    "category": "Products & Services",
    "color": "#532254"
  },
  {
    "id": "btn-tl-001",
    "label": "CxO",
    "descriptionText": "Executive decisions rarely wait for certainty. Buyer expectations, market conditions, and competitive pressures often shift before those changes appear in familiar reports. For the CxO, earlier recognition creates an advantage that speed alone cannot provide: more time to understand what is changing, explore alternatives, and choose a response with confidence.\n\nBuyFacts uses focused, directional buyer research and informed interpretation to bring emerging patterns into view while options remain open. The result is not simply more information for leadership. It is clearer direction, better choices, and the time to act before change becomes obvious.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Decision-Focused Executive Clarity",
    "description": "Executive decisions rarely wait for certainty. Buyer expectations, market conditions, and competitive pressures often shift before those changes appear in familiar reports. For the CxO, earlier recognition creates an advantage that speed alone cannot provide: more time to understand what is changing, explore alternatives, and choose a response with confidence.",
    "category": "Research Imperatives",
    "color": "#006398"
  },
  {
    "id": "btn-tl-002",
    "label": "Chief Marketing Officer",
    "descriptionText": "A Chief Marketing Officer must connect what buyers are beginning to feel and need with decisions across brand, demand generation, content, and customer relationships. Yet each function sees only part of the picture, and yesterday's research may not explain today's behavior.\n\nBuyFacts brings practical and emotional buyer drivers into a shared, evolving view through focused research repeated over time. Emerging patterns become easier to recognize, priorities easier to discuss, and marketing choices more coherent across teams. Earlier recognition helps the CMO direct resources with greater confidence and gives people more time to create meaningful market impact.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Connect Buyer Needs to Strategy",
    "description": "A Chief Marketing Officer must connect what buyers are beginning to feel and need with decisions across brand, demand generation, content, and customer relationships. Yet each function sees only part of the picture, and yesterday's research may not explain today's behavior.",
    "category": "Research Imperatives",
    "color": "#ffc164"
  },
  {
    "id": "btn-tl-003",
    "label": "Marketer",
    "descriptionText": "Good marketing begins with a genuine understanding of the people it hopes to reach. But needs, expectations, and emotions shift, and familiar messages can become less relevant long before campaign results explain why.\n\nBuyFacts uses focused, directional buyer research to reveal emerging changes in what matters to audiences, including the practical considerations and personal feelings behind their choices. Beyond improving campaign relevance, these findings provide the foundation for educational thought leadership, turning authentic buyer experiences and insights into compelling stories, fresh perspectives, and useful content that informs, engages, and helps buyers make better choices.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Turn Human Understanding into Impact",
    "description": "Good marketing begins with a genuine understanding of the people it hopes to reach. But needs, expectations, and emotions shift, and familiar messages can become less relevant long before campaign results explain why.",
    "category": "Research Imperatives",
    "color": "#42ea86"
  },
  {
    "id": "btn-tl-004",
    "label": "Researcher",
    "descriptionText": "Researchers are often expected to deliver speed, accuracy, and actionable findings, even when the most important questions have yet to be fully defined. Strong methodology matters, but so does understanding whose experience can inform a decision and how the findings will be used.\n\nBuyFacts connects sponsor and stakeholder priorities with thoughtful survey design, knowledgeable participants, and disciplined interpretation. Patterns and unusual responses become opportunities for deeper understanding rather than numbers to report and forget. The result is research that reduces uncertainty, protects the time invested, and gives researchers greater confidence that their work will make a meaningful difference.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Rigor, Integrity, and Actionable Evidence",
    "description": "Researchers are often expected to deliver speed, accuracy, and actionable findings, even when the most important questions have yet to be fully defined. Strong methodology matters, but so does understanding whose experience can inform a decision and how the findings will be used.",
    "category": "Research Imperatives",
    "color": "#532254"
  },
  {
    "id": "btn-tl-005",
    "label": "Early Recognition",
    "descriptionText": "Markets rarely change all at once. New needs may first appear in an unexpected question, a shift in sentiment, or a subtle difference between what buyers say today and what they said before. What begins as an isolated occurrence may become a repeating pattern that reveals a meaningful direction.\n\nBuyFacts combines focused, directional buyer research with knowledgeable participants and repeated observation to recognize changes while choices remain open. The advantage is not predicting the future. It is gaining time to understand what is developing, explore alternatives, and take a better first step before change becomes obvious.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Notice Developing Signals Sooner",
    "description": "Markets rarely change all at once. New needs may first appear in an unexpected question, a shift in sentiment, or a subtle difference between what buyers say today and what they said before. What begins as an isolated occurrence may become a repeating pattern that reveals a meaningful direction.",
    "category": "Research Imperatives",
    "color": "#ffc164"
  },
  {
    "id": "btn-tl-006",
    "label": "Building Great Surveys",
    "descriptionText": "A great survey begins long before the first participant responds. Its questions must reflect what sponsors and stakeholders genuinely need to understand while remaining clear, relevant, and worthwhile for the people answering them.\n\nBuyFacts uses the Question Map to connect every survey question to three essential considerations: what is being asked, what will be learned, and how that learning will be used. This disciplined connection reveals gaps, unnecessary questions, and opportunities to improve language, response choices, and flow. It also strengthens the usefulness of the findings, giving marketers and researchers more to act upon and a greater return on research.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Intentional Design for High-Yield Data",
    "description": "A great survey begins long before the first participant responds. Its questions must reflect what sponsors and stakeholders genuinely need to understand while remaining clear, relevant, and worthwhile for the people answering them.",
    "category": "Research Imperatives",
    "color": "#b0e843"
  },
  {
    "id": "btn-tl-007",
    "label": "Agency Principal",
    "descriptionText": "As AI makes content faster to produce, agency principals face a more important challenge: creating programs and positioning grounded in genuine buyer understanding. BuyFacts Research Libs uses a dual survey method, combining comparable quantitative answers with participant-authored stories that reveal practical needs and emotional drivers.\n\nThe resulting storylines are backed by research facts, creating timely opportunities for educational thought leadership. Agencies add perspective and stewardship by translating that evidence into distinctive positioning, useful programs, relevant messaging, and calls to action that resonate with buyers. Technology can accelerate production, but informed interpretation makes the work worth producing.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Strategic Substance Over Generic AI",
    "description": "As AI makes content faster to produce, agency principals face a more important challenge: creating programs and positioning grounded in genuine buyer understanding. BuyFacts Research Libs uses a dual survey method, combining comparable quantitative answers with participant-authored stories that reveal practical needs and emotional drivers.",
    "category": "Research Imperatives",
    "color": "#ff9900"
  },
  {
    "id": "btn-tl-008",
    "label": "BuyFacts Methods",
    "descriptionText": "BuyFacts methods put sound direction ahead of speed. Inclusive Agile engages cross-functional influencers through defined roles, drawing on their observations and expertise to build research momentum. Blitz Research turns that momentum into focused questions and timely evidence, while Stewardship fosters the exchange and interpretation of ideas.\n\nA variety of tools, including Cubicon, TRIAD, and Research Libs, add rigor while saving time. Together, these methods and tools illuminate the emotional triggers, practical priorities, and individual benefits behind buyer choices. Their advantage lies in reducing uncertainty and increasing the usefulness of research, creating the velocity that comes from starting in the right direction.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Sound Direction Ahead of Speed",
    "description": "BuyFacts methods put sound direction ahead of speed. Inclusive Agile engages cross-functional influencers through defined roles, drawing on their observations and expertise to build research momentum. Blitz Research turns that momentum into focused questions and timely evidence, while Stewardship fosters the exchange and interpretation of ideas.",
    "category": "Research Imperatives",
    "color": "#ea425f"
  },
  {
    "id": "btn-tl-009",
    "label": "Stewardship",
    "descriptionText": "Stewardship helps organizations turn experience and judgment into corporate knowledge while strengthening early recognition of change. BuyFacts fosters the exchange of ideas through frameworks that encourage people to explore different ways to approach the market, recognize emerging buyer needs, and identify opportunities for meaningful innovation.\n\nBy examining observations and perspectives together, organizations can identify developing patterns earlier and preserve useful knowledge for future decisions. This process encourages fresh thinking without losing sight of the core competencies and distinctive value propositions a business can demonstrate and defend. The result is clearer direction, more time to act, and the ability to adapt without losing what makes the organization valuable.",
    "readItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx",
    "seeItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    "hearItUrl": "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    "subtitle": "Experience and Judgment into Corporate Knowledge",
    "description": "Stewardship helps organizations turn experience and judgment into corporate knowledge while strengthening early recognition of change. BuyFacts fosters the exchange of ideas through frameworks that encourage people to explore different ways to approach the market, recognize emerging buyer needs, and identify opportunities for meaningful innovation.",
    "category": "Research Imperatives",
    "color": "#9b5d00"
  }
];


/**
 * Upserts the production users and dashboard buttons.
 *
 * @param client Prisma client (or a compatible stub)
 * @param rawPassword Admin password; blank/whitespace falls back to
 *   DEFAULT_ADMIN_PASSWORD (or "AdminPass123!" when that is unset).
 */
export async function seedProductionDatabase(
  client: SeedProdClient,
  rawPassword?: string
): Promise<SeedProductionResult> {
  const trimmedPassword = (rawPassword ?? "").trim();
  const password =
    trimmedPassword.length > 0
      ? trimmedPassword
      : process.env.DEFAULT_ADMIN_PASSWORD || "AdminPass123!";
  const passwordHash = await hashPassword(password);

  for (const user of PRODUCTION_USERS) {
    await client.user.upsert({
      where: { email: user.email },
      // Never reset the password of an existing account on a live database.
      update: {
        name: user.name,
        role: user.role,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
      },
    });
  }

  for (const btn of PRODUCTION_DASHBOARD_BUTTONS) {
    await client.dashboardButton.upsert({
      where: { id: btn.id },
      // On existing rows only refresh the text; keep SEE IT / HEAR IT / READ IT
      // links and media type, which may have been changed through the admin area.
      update: {
        label: btn.label,
        descriptionText: btn.descriptionText,
        subtitle: btn.subtitle,
        description: btn.description,
        category: btn.category,
        color: btn.color,
      },
      create: btn,
    });
  }

  return {
    usersSeeded: PRODUCTION_USERS.length,
    buttonsSeeded: PRODUCTION_DASHBOARD_BUTTONS.length,
  };
}


async function main() {
  console.log("Starting BuyFacts Core DB seed (non-destructive)...\n");

  // Non-destructive: every step below is an upsert or an "insert if missing",
  // so this script is safe to run repeatedly against a live database.

  // 1-2. Users and Dashboard Buttons (the only tables this script owns)
  console.log("1. Seeding Users and Dashboard Buttons...");
  const { usersSeeded, buttonsSeeded } = await seedProductionDatabase(
    prisma as unknown as SeedProdClient,
    process.env.DEFAULT_ADMIN_PASSWORD
  );
  console.log(`   Seeded ${usersSeeded} Users`);
  console.log(`   Seeded ${buttonsSeeded} Dashboard Buttons`);

  // 3. Media Assets
  console.log("3. Seeding Media Assets...");
  const mediaAssets = [
    {
      id: "asset-uuid-001",
      publicUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
      fileName: "puzzle1_hd.png",
      fileType: "image/png",
      fileSize: 1048576,
      objectKey: "cubicon/1788505108337-1zkn2t-Puzzle1.webp",
      folder: "cubicon",
    },
    {
      id: "asset-uuid-002",
      publicUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
      fileName: "intro_video.mp4",
      fileType: "video/mp4",
      fileSize: 5242880,
      objectKey: "cubicon/1788505110243-kde8r0-Puzzle2.webp",
      folder: "cubicon",
    },
    {
      id: "asset-uuid-003",
      publicUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
      fileName: "whitepaper.pdf",
      fileType: "application/pdf",
      fileSize: 2097152,
      objectKey: "cubicon/1788505110606-pcdywj-Puzzle3.webp",
      folder: "cubicon",
    },
  ];

  for (const asset of mediaAssets) {
    await prisma.mediaAsset.upsert({
      where: { id: asset.id },
      update: asset,
      create: asset,
    });
  }
  console.log(`   Seeded ${mediaAssets.length} Media Assets`);

  // 4. Cubicon 3D Sequences and Tasks
  console.log("4. Seeding Cubicon 3D Sequences and Tasks...");

  const sequences = [
    {
      id: 5,
      slug: "default",
      title: "Default Verification Challenge",
      description: "Standard anti-bot human verification puzzle sequence",
      passThreshold: 0.01,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
    {
      id: 6,
      slug: "contact_form",
      title: "Contact Form Human Verification",
      description: "Anti-bot spatial puzzle verification for contact inquiries",
      passThreshold: 0.6,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
    {
      id: 7,
      slug: "challenge_sequence_3",
      title: "Challenge Sequence 3",
      description: "Dynamic human verification puzzle sequence 3",
      passThreshold: 0.66,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
  ];

  for (const seq of sequences) {
    await prisma.cubiconSequence.upsert({
      where: { id: seq.id },
      update: seq,
      create: seq,
    });
  }

  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"CubiconSequence"', 'id'), coalesce((SELECT max(id) FROM "CubiconSequence"), 1));`
    );
  } catch {
    // Non-fatal if sequence sync is not supported in the active environment
  }

  const cubiconTasks = [
      {
          id: 17,
          "sequenceId": 5,
          "taskIndex": 0,
          "taskNumber": 1,
          "heading": "Puzzle 1 of 3  (Draw a circle)",
          description: "Who gets concerned by howling?",
          "screen": "Active_front",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Anticipation",
          "correctCoordinates": "[{\"x\":-0.042574127848625916,\"y\":0.2093228930009854,\"z\":0.5976997207441973},{\"x\":-0.01300874877727363,\"y\":0.16201828672165688,\"z\":0.5976997051073445},{\"x\":-0.07213950692678825,\"y\":0.15462694164718369,\"z\":0.5976997226763686}]",
          "startPoint": "{\"x\":-0.042574127848625916,\"y\":0.2093228930009854,\"z\":0.5976997207441973}",
          "midPoint": "{\"x\":-0.01300874877727363,\"y\":0.16201828672165688,\"z\":0.5976997051073445}",
          "endPoint": "{\"x\":-0.07213950692678825,\"y\":0.15462694164718369,\"z\":0.5976997226763686}",
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.360Z"
      },
      {
          id: 18,
          "sequenceId": 5,
          "taskIndex": 1,
          "taskNumber": 2,
          "heading": "Puzzle 2 of 3  (click to choose)",
          description: "Who's in line for a change of shirt?",
          "screen": "Active_side_l",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.18356622579331366,\"y\":-0.005166590317604896,\"z\":0.33489561080932634}]",
          "startPoint": "{\"x\":-0.18356622579331366,\"y\":-0.005166590317604896,\"z\":0.33489561080932634}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.369Z"
      },
      {
          id: 19,
          "sequenceId": 5,
          "taskIndex": 2,
          "taskNumber": 3,
          "heading": "Puzzle 3 of 3 (click to choose)",
          description: "Where does his next go? ",
          "screen": "Active_back",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.17082880041376822,\"y\":-0.05078693590343407,\"z\":0.5976999693622778}]",
          "startPoint": "{\"x\":0.17082880041376822,\"y\":-0.05078693590343407,\"z\":0.5976999693622778}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.379Z"
      },
      {
          id: 20,
          "sequenceId": 5,
          "taskIndex": 3,
          "taskNumber": 4,
          "heading": "Bonus Puzzle (enter multiple clicks)",
          description: "Who sat with time over their shoulders?",
          "screen": "Active_side_r",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082428358-lf20q4-WOW_Grand_Central_Station_Color_No_Text.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.496,\"y\":0.187,\"z\":0.502},{\"x\":0.678,\"y\":0.187,\"z\":0.502}]",
          "startPoint": "{\"x\":0.496,\"y\":0.187,\"z\":0.502}",
          "midPoint": null,
          "endPoint": "{\"x\":0.678,\"y\":0.187,\"z\":0.502}",
          "tolerance": 0.5,
          "isFinal": true,
          "createdAt": "2026-10-21T09:25:52.384Z"
      },
      {
          id: 21,
          "sequenceId": 6,
          "taskIndex": 0,
          "taskNumber": 1,
          "heading": "Puzzle 1 of 3 (click to choose)",
          description: "Who kissed the silent stone guardian?",
          "screen": "Active_front",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082435451-y5oisv-WOW_Great_Pyramids_Illustration_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.412,\"y\":0.323,\"z\":0.897}]",
          "startPoint": "{\"x\":0.412,\"y\":0.323,\"z\":0.897}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.389Z"
      },
      {
          id: 22,
          "sequenceId": 6,
          "taskIndex": 1,
          "taskNumber": 2,
          "heading": "Puzzle 2 of 3 (click to choose)",
          description: "Who stacked the pages high?",
          "screen": "Active_side_l",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082419479-0sm0h3-Benjamin_Franklin_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.192,\"y\":-0.112,\"z\":0.502}]",
          "startPoint": "{\"x\":-0.192,\"y\":-0.112,\"z\":0.502}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.396Z"
      },
      {
          id: 23,
          "sequenceId": 6,
          "taskIndex": 2,
          "taskNumber": 3,
          "heading": "Puzzle 3 of 3 (click to choose)",
          description: "Who deals in chances but takes a bite between turns? ",
          "screen": "Active_back",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082472298-9m556g-WOW_Things_BermudaTriangle_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.394,\"y\":-0.081,\"z\":0.897}]",
          "startPoint": "{\"x\":-0.394,\"y\":-0.081,\"z\":0.897}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.402Z"
      },
      {
          id: 24,
          "sequenceId": 6,
          "taskIndex": 3,
          "taskNumber": 4,
          "heading": "Bonus Puzzle (Click to choose)",
          description: "Who took the shiny slide, not a step? ",
          "screen": "Active_side_r",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082420168-v0qr3q-Beverly_Hillbillies_Colored.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.262,\"y\":0.234,\"z\":0.502}]",
          "startPoint": "{\"x\":0.262,\"y\":0.234,\"z\":0.502}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": true,
          "createdAt": "2026-10-21T09:25:52.413Z"
      },
      {
          id: 25,
          "sequenceId": 7,
          "taskIndex": 1,
          "taskNumber": 2,
          "heading": "Puzzle 2 of 3 (Click to Choose)",
          description: "Who chose the high stone seat where heroes stand?",
          "screen": "Active_side_l",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792766115000-ob5kow-WOW_Festival_of_Colors_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.351,\"y\":0.08,\"z\":0.502}]",
          "startPoint": "{\"x\":-0.351,\"y\":0.08,\"z\":0.502}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:07:51.207Z"
      },
      {
          id: 26,
          "sequenceId": 7,
          "taskIndex": 0,
          "taskNumber": 1,
          "heading": "Puzzle 1 of 3 (Click to Choose)",
          description: "Who's perfecting the face while the road rolls on?",
          "screen": "Active_front",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082447166-7ujbit-WOW_People_Alice_Cooper_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.14,\"y\":0.019,\"z\":0.897}]",
          "startPoint": "{\"x\":-0.14,\"y\":0.019,\"z\":0.897}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:20:11.041Z"
      },
      {
          id: 27,
          "sequenceId": 7,
          "taskIndex": 2,
          "taskNumber": 3,
          "heading": "Puzzle 3 of 3 (Draw a Circle)",
          description: "Who came down the twisting path one step at a time?",
          "screen": "Active_back",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082420168-v0qr3q-Beverly_Hillbillies_Colored.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Anticipation",
          "correctCoordinates": "[{\"x\":0.366,\"y\":0.14,\"z\":0.897},{\"x\":0.362,\"y\":0.14,\"z\":0.897},{\"x\":0.375,\"y\":0.171,\"z\":0.897}]",
          "startPoint": "{\"x\":0.366,\"y\":0.14,\"z\":0.897}",
          "midPoint": "{\"x\":0.362,\"y\":0.14,\"z\":0.897}",
          "endPoint": "{\"x\":0.375,\"y\":0.171,\"z\":0.897}",
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:26:09.358Z"
      },
      {
          id: 28,
          "sequenceId": 7,
          "taskIndex": 3,
          "taskNumber": 4,
          "heading": "Bonus Puzzle (Draw a Circle)",
          description: "Who receives a royal treat without leaving his throne?",
          "screen": "Active_side_r",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082419103-hp8641-Alice_In_Wonderland_Colored.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Anticipation",
          "correctCoordinates": "[{\"x\":-0.048,\"y\":0.178,\"z\":0.502},{\"x\":-0.038,\"y\":0.183,\"z\":0.502},{\"x\":-0.071,\"y\":0.15,\"z\":0.502}]",
          "startPoint": "{\"x\":-0.048,\"y\":0.178,\"z\":0.502}",
          "midPoint": "{\"x\":-0.038,\"y\":0.183,\"z\":0.502}",
          "endPoint": "{\"x\":-0.071,\"y\":0.15,\"z\":0.502}",
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:30:55.311Z"
      }
  ];

  for (const t of cubiconTasks) {
    await prisma.cubiconTask.upsert({
      where: { id: t.id },
      update: {
        ...t,
        createdAt: new Date(t.createdAt),
      },
      create: {
        ...t,
        createdAt: new Date(t.createdAt),
      },
    });
  }

  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"CubiconTask"', 'id'), coalesce((SELECT max(id) FROM "CubiconTask"), 1));`
    );
  } catch {
    // Non-fatal if sequence sync is not supported in the active environment
  }

  console.log(`   Seeded ${cubiconTasks.length} Cubicon Tasks across ${sequences.length} Sequences`);


  // 8. Content Vault Topics and Multi-Format Assets
  console.log("8. Seeding Content Vault Topics and Assets for Guests...");

  const vaultTopics = [
    // Products
    { name: "Cubicon 3D", slug: "cubicon-3d", category: "Product" },
    { name: "ResearchLib", slug: "research-lib", category: "Product" },
    { name: "TRIAD Framework", slug: "triad-framework", category: "Product" },
    {
      name: "Value Quantification",
      slug: "value-quantification",
      category: "Product",
    },
    // Dashboard Topics
    {
      name: "Research Planning",
      slug: "research-planning",
      category: "Dashboard Topic",
    },
    {
      name: "Survey Design",
      slug: "survey-design",
      category: "Dashboard Topic",
    },
    {
      name: "Story-Based Surveys",
      slug: "story-based-surveys",
      category: "Dashboard Topic",
    },
    {
      name: "Participant Validation",
      slug: "participant-validation",
      category: "Dashboard Topic",
    },
    {
      name: "Pattern Insights",
      slug: "pattern-insights",
      category: "Dashboard Topic",
    },
  ];

  const createdTopics: Record<string, string> = {};
  for (const t of vaultTopics) {
    const topicRecord = await prisma.topic.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
    createdTopics[t.slug] = topicRecord.id;
  }
  console.log(
    `   Seeded ${vaultTopics.length} Topics (Products and Dashboard Topics)`,
  );

  const vaultAssets: Array<{
    title: string;
    description: string;
    format: ContentFormat;
    sourceUrl: string;
    embedCode?: string;
    topicId: string;
    keywords: string;
    isPublished: boolean;
    publishedAt: Date;
  }> = [
    {
      title: "The Rule of Three in B2B Customer Discovery",
      description:
        "How triangulating qualitative responses through three distinct validation layers reduces market uncertainty before full-scale investments.",
      format: ContentFormat.ARTICLE,
      sourceUrl:
        "https://www.linkedin.com/pulse/rule-of-three-b2b-customer-discovery-buyfacts",
      topicId: createdTopics["triad-framework"],
      keywords: JSON.stringify([
        "rule of three",
        "customer discovery",
        "b2b research",
        "validation layers",
        "market uncertainty",
        "decision making",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-09-15T10:00:00Z"),
    },
    {
      title: "Cubicon 3D Spatial Survey Architecture Walkthrough",
      description:
        "Complete guided walkthrough of spatial 3D puzzle validation and drag-and-drop coordinate evaluation.",
      format: ContentFormat.VIDEO,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedCode:
        '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Cubicon 3D Spatial Survey Architecture Walkthrough" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
      topicId: createdTopics["cubicon-3d"],
      keywords: JSON.stringify([
        "cubicon 3d",
        "spatial survey",
        "puzzle validation",
        "interactive coordinate",
        "participant engagement",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-09-20T14:30:00Z"),
    },
    {
      title: "Return on Effort (ROE) Framework Whitepaper",
      description:
        "Comprehensive architectural whitepaper detailing mathematical models for maximizing researcher yield per fieldwork hour.",
      format: ContentFormat.PDF,
      sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
      topicId: createdTopics["value-quantification"],
      keywords: JSON.stringify([
        "return on effort",
        "roe framework",
        "research yield",
        "fieldwork economics",
        "b2b metrics",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-09-28T09:00:00Z"),
    },
    {
      title: "Early Market Movement Recognition Audio Briefing",
      description:
        "Executive audio briefing on detecting subtle behavioral shifts in enterprise buyer panels before quarterly churn signals appear.",
      format: ContentFormat.AUDIO,
      sourceUrl:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      topicId: createdTopics["pattern-insights"],
      keywords: JSON.stringify([
        "early signals",
        "market movement",
        "buyer patterns",
        "executive briefing",
        "b2b intelligence",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-02T16:00:00Z"),
    },
    {
      title: "Survey Design Imperatives: Eliminating Acquiescence Bias",
      description:
        "Empirical strategies for framing dual-choice prompts and story-based exercises that force deliberate cognitive engagement.",
      format: ContentFormat.ARTICLE,
      sourceUrl: "https://buyfacts.com/research-imperatives",
      topicId: createdTopics["survey-design"],
      keywords: JSON.stringify([
        "survey design",
        "bias elimination",
        "story-based surveys",
        "cognitive engagement",
        "question framing",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-08T11:15:00Z"),
    },
    {
      title: "ResearchLib Narrative Survey Demo",
      description:
        "Demonstration of dynamic fill-in-the-blank narrative survey interfaces that dramatically improve completion fidelity.",
      format: ContentFormat.VIDEO,
      sourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      embedCode:
        '<video controls preload="metadata" style="width:100%;aspect-ratio:16/9;border-radius:12px;background:#000;"><source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4"></video>',
      topicId: createdTopics["research-lib"],
      keywords: JSON.stringify([
        "researchlib",
        "narrative survey",
        "fill in the blanks",
        "completion fidelity",
        "storytelling",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-12T13:45:00Z"),
    },
    {
      title: "Participant Validation Protocol Reference",
      description:
        "Standard operating procedures for establishing verified identity and domain authority during high-stakes survey intake.",
      format: ContentFormat.PDF,
      sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
      topicId: createdTopics["participant-validation"],
      keywords: JSON.stringify([
        "participant validation",
        "identity verification",
        "high stakes research",
        "data fidelity",
        "panel management",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-13T10:00:00Z"),
    },
    {
      title: "Story-Based Survey Methodology Deep Dive",
      description:
        "In-depth audio masterclass on turning standard survey friction into engaging narrative exploration.",
      format: ContentFormat.AUDIO,
      sourceUrl:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      topicId: createdTopics["story-based-surveys"],
      keywords: JSON.stringify([
        "story based surveys",
        "narrative friction",
        "audio masterclass",
        "qualitative depth",
        "engagement",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-14T08:30:00Z"),
    },
  ];

  for (const a of vaultAssets) {
    // No natural unique key: match on topic + title so re-runs update in place.
    const existingAsset = await prisma.vaultAsset.findFirst({
      where: { topicId: a.topicId, title: a.title },
      select: { id: true },
    });
    if (existingAsset) {
      await prisma.vaultAsset.update({ where: { id: existingAsset.id }, data: a });
    } else {
      await prisma.vaultAsset.create({ data: a });
    }
  }
  console.log(
    `   Seeded ${vaultAssets.length} Vault Assets across all formats for Guests\n`,
  );

  console.log("6. Seeding ResearchLib Narrative Surveys & Tasks...");
  const SURVEY_TITLE = "AI Marketing Directional Measurement";
  const existingSurvey = await prisma.researchLibSurvey.findFirst({
    where: { userId: "system_default", title: SURVEY_TITLE },
    select: { id: true },
  });

  if (existingSurvey) {
    console.log("   Default survey already exists, leaving it and its tasks untouched.");
  } else {
    const topSurvey = await prisma.researchLibSurvey.create({
      data: {
        userId: "system_default",
        title: "AI Marketing Directional Measurement",
        timeCounter: "down",
        pauseDuration: "3",
        durationInMin: "30",
        combo: "narWid",
      },
    });

    for (let idx = 0; idx < DEFAULT_SURVEYS.length; idx++) {
      const task = DEFAULT_SURVEYS[idx];
      const isFinal = idx === DEFAULT_SURVEYS.length - 1;
      await prisma.researchLibTask.create({
        data: {
          surveyId: topSurvey.id,
          taskIndex: idx,
          heading: task.heading,
          instruction: task.instruction,
          widget: task.widget,
          question: task.story,
          story: task.story,
          blanks: task.blanks,
          isFollowup: isFinal ? 0 : 1,
        },
      });
    }
  }
  console.log("   ResearchLib survey step complete\n");

  console.log("\nBuyFacts Core DB seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
