import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default seed buttons for initial load
const DEFAULT_BUTTONS = [
  // Services
  { label: "Define It", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", mediaType: "video", subtitle: "Interactive pipeline routing validation demonstration.", category: "Services" },
  { label: "Host", mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80", mediaType: "image", subtitle: "High-performance hosting platform architecture layout.", category: "Services" },
  { label: "Respondent Validation", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", mediaType: "audio", subtitle: "Executive briefing explaining respondent validation procedures.", category: "Services" },
  { label: "Refine It", mediaUrl: "https://pdfobject.com/pdf/sample.pdf", mediaType: "pdf", subtitle: "Technical documentation covering the data refinement process.", category: "Services" },
  { label: "Analyze It", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", mediaType: "video", subtitle: "Detailed overview demonstrating deep data analytics capabilities.", category: "Services" },
  { label: "Story Based", mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80", mediaType: "image", subtitle: "Mock design demonstrating user flow logic in story-based surveys.", category: "Services" },
  { label: "Build It", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", mediaType: "audio", subtitle: "Briefing call explaining custom project builder patterns.", category: "Services" },
  { label: "Apply It", mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", mediaType: "pdf", subtitle: "A practical guide and reference PDF document on data application.", category: "Services" },
  { label: "Buyer Drivers", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", mediaType: "video", subtitle: "Study showing how primary buying indicators are identified.", category: "Services" },
  
  // Thought Leadership
  { label: "Survey Respondent Engagement", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", mediaType: "audio", subtitle: "Audio analysis of factors driving high respondent retention rates.", category: "Thought Leadership" },
  { label: "Content Creation", mediaUrl: "https://www.orimi.com/pdf-test.pdf", mediaType: "pdf", subtitle: "Whitepaper guide outlining effective content syndication methods.", category: "Thought Leadership" },
  { label: "Research Methods", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", mediaType: "video", subtitle: "Video overview of quantitative research methodologies.", category: "Thought Leadership" },
  { label: "Research Speed", mediaUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80", mediaType: "image", subtitle: "Infographic visual mapping speed of execution against sample size.", category: "Thought Leadership" },
  { label: "Hybrid Marketing", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", mediaType: "video", subtitle: "A video presentation on unifying digital and traditional channels.", category: "Thought Leadership" },
  { label: "Marketing Influence", mediaUrl: "https://pdfobject.com/pdf/sample.pdf", mediaType: "pdf", subtitle: "Academic reference PDF discussing target audience buying psychology.", category: "Thought Leadership" },
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
