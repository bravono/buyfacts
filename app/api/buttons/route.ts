import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

// Default seed buttons for initial load
const DEFAULT_BUTTONS = [
  // Products / Services
  {
    id: "btn-srv-001",
    label: "Research Planning",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    mediaType: "video",
    subtitle: "Inclusive Research Definition",
    category: "Products & Services",
    color: "#9b5d00",
  },
  {
    id: "btn-srv-002",
    label: "Survey Design",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    mediaType: "audio",
    subtitle: "Make Each Question Actionable",
    category: "Products & Services",
    color: "#ea425f",
  },
  {
    id: "btn-srv-003",
    label: "Story-Based Surveys",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
    mediaType: "image",
    subtitle: "Execute a Dual-Based Survey Model",
    category: "Products & Services",
    color: "#ff9900",
  },
  {
    id: "btn-srv-004",
    label: "Improve Surveys",
    mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
    mediaType: "pdf",
    subtitle: "Increase the Return on Research",
    category: "Products & Services",
    color: "#006398",
  },
  {
    id: "btn-srv-005",
    label: "Participant Validation",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    mediaType: "audio",
    subtitle: "Play Cubicon Puzzle Games",
    category: "Products & Services",
    color: "#ffc164",
  },
  {
    id: "btn-srv-006",
    label: "Survey Fieldwork",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    mediaType: "image",
    subtitle: "Quality-Centric Survey Execution",
    category: "Products & Services",
    color: "#b0e843",
  },
  {
    id: "btn-srv-007",
    label: "Content Value",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    mediaType: "video",
    subtitle: "Maximize the Return on Content",
    category: "Products & Services",
    color: "#42ea86",
  },
  {
    id: "btn-srv-008",
    label: "Pattern Insights",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    mediaType: "video",
    subtitle: "Active Pattern Analytics",
    category: "Products & Services",
    color: "#ed40ed",
  },
  {
    id: "btn-srv-009",
    label: "Audience Validation",
    mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    mediaType: "pdf",
    subtitle: "Opportunity Validation",
    category: "Products & Services",
    color: "#532254",
  },

  // Thought Leadership
  {
    id: "btn-tl-001",
    label: "Research Methods",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    mediaType: "video",
    subtitle: "Exceed Stakeholder Wants and Needs",
    category: "Research Imperatives",
    color: "#006398",
  },
  {
    id: "btn-tl-002",
    label: "Cohort Research",
    mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
    mediaType: "pdf",
    subtitle: "Smaller Groups that Know the Topic",
    category: "Research Imperatives",
    color: "#ffc164",
  },
  {
    id: "btn-tl-003",
    label: "Survey Engagement",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    mediaType: "audio",
    subtitle: "Optimize Question Value",
    category: "Research Imperatives",
    color: "#42ea86",
  },
  {
    id: "btn-tl-004",
    label: "Hybrid Marketing",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    mediaType: "video",
    subtitle: "Digital Reach and a Human Touch",
    category: "Research Imperatives",
    color: "#532254",
  },
  {
    id: "btn-tl-005",
    label: "Content Creation",
    mediaUrl: "https://www.orimi.com/pdf-test.pdf",
    mediaType: "pdf",
    subtitle: "Assets that Engage with Thought Leadership",
    category: "Research Imperatives",
    color: "#ffc164",
  },
  {
    id: "btn-tl-006",
    label: "Marketing Leadership",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    mediaType: "audio",
    subtitle: "Best Practices by Marketing Area",
    category: "Research Imperatives",
    color: "#b0e843",
  },
  {
    id: "btn-tl-007",
    label: "Research Leadership",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    mediaType: "video",
    subtitle: "Return on Primary Research",
    category: "Research Imperatives",
    color: "#ff9900",
  },
  {
    id: "btn-tl-008",
    label: "Early Recognition",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    mediaType: "video",
    subtitle: "Earlier Recognition for Your Time Advantage",
    category: "Research Imperatives",
    color: "#ea425f",
  },
  {
    id: "btn-tl-009",
    label: "Wisdom Gap",
    mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    mediaType: "pdf",
    subtitle: "Research Becomes Intellectual Currency",
    category: "Research Imperatives",
    color: "#9b5d00",
  },
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

      // Since SQLite adapter doesn't always support createMany depending on configuration, we insert sequentially
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

    const { id, mediaUrl, mediaType, subtitle } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Button ID is required" }, { status: 400 });
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "Media URL is required" }, { status: 400 });
    }

    const updatedButton = await prisma.dashboardButton.update({
      where: { id },
      data: {
        mediaUrl,
        ...(mediaType && { mediaType }),
        ...(subtitle && { subtitle }),
      },
    });

    return NextResponse.json({ success: true, button: updatedButton });
  } catch (error: any) {
    console.error("Failed to update button:", error);
    return NextResponse.json({ error: error.message || "Failed to update button" }, { status: 500 });
  }
}
