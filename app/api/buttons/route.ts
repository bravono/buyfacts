import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

// Default seed buttons for initial load
const DEFAULT_BUTTONS = [
  {
    id: "btn-srv-001",
    label: "Research Planning",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Inclusive Research Definition",
    description: "Collaborative scoping and question architecture ensuring comprehensive coverage of core business objectives and target demographics.",
    category: "Products & Services",
    color: "#9b5d00"
  },
  {
    id: "btn-srv-002",
    label: "Survey Design",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Make Each Question Actionable",
    description: "Constructing streamlined survey workflows with zero ambiguity, ensuring every collected response informs direct business decisions.",
    category: "Products & Services",
    color: "#ea425f"
  },
  {
    id: "btn-srv-003",
    label: "Story-Based Surveys",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Execute a Dual-Based Survey Model",
    description: "Narrative-driven interactive inquiry combining quantitative polling with qualitative scenario-based storytelling.",
    category: "Products & Services",
    color: "#ff9900"
  },
  {
    id: "btn-srv-004",
    label: "Improve Surveys",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Increase the Return on Research",
    description: "Iterative prompt refinement and telemetry tuning to amplify insight yield and maximize return on research investment.",
    category: "Products & Services",
    color: "#006398"
  },
  {
    id: "btn-srv-005",
    label: "Participant Validation",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842535-s0z06x-05_Participant_Validation_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Play Cubicon Puzzle Games",
    description: "Interactive verification mechanics using engaging 3D Cubicon spatial puzzles to verify genuine human participant engagement.",
    category: "Products & Services",
    color: "#ffc164"
  },
  {
    id: "btn-srv-006",
    label: "Survey Fieldwork",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Quality-Centric Survey Execution",
    description: "High-fidelity deployment across verified B2B panels with real-time fraud mitigation and strict data integrity enforcement.",
    category: "Products & Services",
    color: "#b0e843"
  },
  {
    id: "btn-srv-007",
    label: "Content Value",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844032-fg4d90-07_Content_Value_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Maximize the Return on Content",
    description: "Diagnostic evaluation of collateral effectiveness, optimizing messaging resonance and content syndication impact.",
    category: "Products & Services",
    color: "#42ea86"
  },
  {
    id: "btn-srv-008",
    label: "Pattern Insights",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Active Pattern Analytics",
    description: "Automated pattern detection and anomaly recognition uncovering non-obvious correlations in real-time response streams.",
    category: "Products & Services",
    color: "#ed40ed"
  },
  {
    id: "btn-srv-009",
    label: "Audience Validation",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Opportunity Validation",
    description: "Empirical validation frameworks to confirm market demand, assess willingness-to-pay, and de-risk new product initiatives.",
    category: "Products & Services",
    color: "#532254"
  },
  {
    id: "btn-tl-001",
    label: "Research Methods",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Exceed Stakeholder Wants and Needs",
    description: "Rigorous multi-channel research protocols designed to consistently surpass stakeholder expectations with bulletproof empirical validation.",
    category: "Research Imperatives",
    color: "#006398"
  },
  {
    id: "btn-tl-002",
    label: "Cohort Research",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Smaller Groups that Know the Topic",
    description: "Targeted cohort intelligence focusing on niche practitioner panels and specialist groups who possess deep, authoritative domain expertise.",
    category: "Research Imperatives",
    color: "#ffc164"
  },
  {
    id: "btn-tl-003",
    label: "Survey Engagement",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Optimize Question Value",
    description: "Structuring engaging, high-yield survey instruments that maximize participant completion rates while extracting deep, high-value data.",
    category: "Research Imperatives",
    color: "#42ea86"
  },
  {
    id: "btn-tl-004",
    label: "Hybrid Marketing",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Digital Reach and a Human Touch",
    description: "Harmonizing high-scale digital reach with consultative human engagement to cultivate authentic relationships and sustained audience loyalty.",
    category: "Research Imperatives",
    color: "#532254"
  },
  {
    id: "btn-tl-005",
    label: "Content Creation",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Assets that Engage with Thought Leadership",
    description: "Transforming empirical data points into compelling thought leadership whitepapers, interactive infographics, and high-impact digital narratives.",
    category: "Research Imperatives",
    color: "#ffc164"
  },
  {
    id: "btn-tl-006",
    label: "Marketing Leadership",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Best Practices by Marketing Area",
    description: "Curated best practices across enterprise marketing divisions, aligning narrative precision with measurable campaign outcomes and growth metrics.",
    category: "Research Imperatives",
    color: "#b0e843"
  },
  {
    id: "btn-tl-007",
    label: "Research Leadership",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Return on Primary Research",
    description: "High-fidelity primary research methodologies delivering strategic insights, benchmark telemetry, and quantitative clarity to guide executive leadership.",
    category: "Research Imperatives",
    color: "#ff9900"
  },
  {
    id: "btn-tl-008",
    label: "Early Recognition",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Earlier Recognition for Your Time Advantage",
    description: "Detecting nascent market signals and emerging customer sentiment early to secure a definitive first-mover advantage.",
    category: "Research Imperatives",
    color: "#ea425f"
  },
  {
    id: "btn-tl-009",
    label: "Wisdom Gap",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx",
    mediaType: "video",
    hearItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1793176951274-bgene0-P01_Cubicon_Audio_Record_Existing_QA_Pending.mp3",
    seeItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    subtitle: "Research Becomes Intellectual Currency",
    description: "Bridging the gap between raw data collection and actionable organizational wisdom, converting research findings into proprietary intellectual currency.",
    category: "Research Imperatives",
    color: "#9b5d00"
  }
];

/**
 * GET Handler: Returns list of all interactive buttons from database.
 * If empty, automatically seeds database with initial defaults.
 */
export async function GET() {
  try {
    let buttons = await prisma.dashboardButton.findMany({
      orderBy: { id: "asc" },
    });

    // Auto-seed if database contains no buttons
    if (buttons.length === 0) {
      console.log("No buttons found in database. Seeding defaults...");

      for (const btn of DEFAULT_BUTTONS) {
        await prisma.dashboardButton.create({
          data: btn,
        });
      }

      buttons = await prisma.dashboardButton.findMany({
        orderBy: { id: "asc" },
      });
    }

    return NextResponse.json({ success: true, buttons });
  } catch (error: any) {
    console.error("Failed to fetch buttons:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch buttons" }, { status: 500 });
  }
}

/**
 * POST Handler: Updates/assigns a new mediaUrl and other configuration details to a specific button
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Admin access required." },
        { status: 401 }
      );
    }

    const { id, mediaUrl, seeItUrl, hearItUrl, readItUrl, mediaType, subtitle, description } =
      await req.json();

    if (!id) {
      return NextResponse.json({ error: "Button ID is required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (seeItUrl !== undefined) updateData.seeItUrl = seeItUrl;
    if (hearItUrl !== undefined) updateData.hearItUrl = hearItUrl;
    if (readItUrl !== undefined) updateData.readItUrl = readItUrl;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    const updatedButton = await prisma.dashboardButton.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, button: updatedButton });
  } catch (error: any) {
    console.error("Failed to update button:", error);
    return NextResponse.json({ error: error.message || "Failed to update button" }, { status: 500 });
  }
}
