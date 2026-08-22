import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default seed buttons for initial load
const DEFAULT_BUTTONS = [
  // Products / Services
  { label: "Survey Define IT", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", mediaType: "video", subtitle: "Inclusive Research Definition", category: "Products & Services" },
  { label: "Survey Refine IT", mediaUrl: "https://pdfobject.com/pdf/sample.pdf", mediaType: "pdf", subtitle: "Increase the Return on Research", category: "Products & Services" },
  { label: "Survey Build IT", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", mediaType: "audio", subtitle: "Make Each Question Actionable", category: "Products & Services" },
  { label: "Survey Field IT", mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80", mediaType: "image", subtitle: "Quality-Centric Survey Execution", category: "Products & Services" },
  { label: "Recognize IT", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", mediaType: "video", subtitle: "Active Pattern Analytics", category: "Products & Services" },
  { label: "Validate IT", mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", mediaType: "pdf", subtitle: "Opportunity Validation", category: "Products & Services" },
  { label: "Respondent Validation", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", mediaType: "audio", subtitle: "Play Cubicon Puzzle Games", category: "Products & Services" },
  { label: "Story-Based Surveys", mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80", mediaType: "image", subtitle: "Execute a Dual-Based Survey Model", category: "Products & Services" },
  { label: "Content Assessment", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", mediaType: "video", subtitle: "Maximize the Return on Content", category: "Products & Services" },
  
  // Thought Leadership
  { label: "Research Leadership", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", mediaType: "video", subtitle: "Return on Primary Research", category: "Research Imperatives" },
  { label: "Marketing Leadership", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", mediaType: "audio", subtitle: "Best Practices by Marketing Area", category: "Research Imperatives" },
  { label: "Cohort Research", mediaUrl: "https://pdfobject.com/pdf/sample.pdf", mediaType: "pdf", subtitle: "Smaller Groups that Know the Topic", category: "Research Imperatives" },
  { label: "Hybrid Marketing", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", mediaType: "video", subtitle: "Digital Reach and a Human Touch", category: "Research Imperatives" },
  { label: "Early Recognition", mediaUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80", mediaType: "image", subtitle: "Earlier Recognition for Your Time Advantage", category: "Research Imperatives" },
  { label: "Survey Engagement", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", mediaType: "audio", subtitle: "Optimize Question Value", category: "Research Imperatives" },
  { label: "Content Creation", mediaUrl: "https://www.orimi.com/pdf-test.pdf", mediaType: "pdf", subtitle: "Assets that Engage with Thought Leadership", category: "Research Imperatives" },
  { label: "Research Methods", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", mediaType: "video", subtitle: "Exceed Stakeholder Wants and Needs", category: "Research Imperatives" },
  { label: "Wisdom Gap", mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", mediaType: "pdf", subtitle: "Research Becomes Intellectual Currency", category: "Research Imperatives" },
];

/**
 * GET Handler: Returns list of all interactive buttons from database.
 * If empty, automatically seeds database with initial defaults.
 */
export async function GET() {
  try {
    let buttons = await prisma.dashboardButton.findMany({
      orderBy: { label: "asc" },
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
        orderBy: { label: "asc" },
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
