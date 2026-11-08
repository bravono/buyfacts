import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

export interface GreatEightData {
  id: number;
  orderIndex: number;
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  seeItUrl?: string | null;
  hearItUrl?: string | null;
  readItUrl?: string | null;
  iconUrl?: string | null;
  iconColor?: string | null;
  bgColor?: string | null;
  isActive?: boolean;
}

export const DEFAULT_GREAT_EIGHT: GreatEightData[] = [
  {
    id: 1,
    orderIndex: 1,
    slug: "targeting-your-survey",
    title: "Targeting Your Survey",
    tagline: "Reach the right participants to generate accurate, actionable insights.",
    description:
      "Effective survey research begins with precision targeting. When questions reach qualified, genuine participants rather than unvetted panels, research findings accurately reflect your true market dynamics and prevent expensive misdirection.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315274750-bri2xa-BuyFacts_Survey_Hosting.svg",
    iconColor: "#14a38b",
    bgColor: "rgba(20, 163, 139, 0.08)",
    isActive: true,
  },
  {
    id: 2,
    orderIndex: 2,
    slug: "the-allure-of-too-many-choices",
    title: "The Allure of Too Many Choices",
    tagline: "Focus participant decision frameworks to avoid choice overload.",
    description:
      "Giving respondents excessive choices distorts feedback and lowers completion quality. Structuring decisions into focused, meaningful alternatives uncovers genuine preferences while keeping engagement high.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315259736-v7irdo-BuyFacts_Early_Recognition.svg",
    iconColor: "#e6a100",
    bgColor: "rgba(230, 161, 0, 0.08)",
    isActive: true,
  },
  {
    id: 3,
    orderIndex: 3,
    slug: "stories-supported-by-facts",
    title: "Stories Supported by Facts",
    tagline: "Combine quantitative rigor with narrative recall that moves stakeholders.",
    description:
      "Data alone seldom convinces skeptics, while stories without evidence invite doubt. Blending verified statistics with human narratives creates memorable, defensible business cases.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315269875-46dt5y-BuyFacts_Research_Tools_Concept.svg",
    iconColor: "#6d6d6d",
    bgColor: "rgba(109, 109, 109, 0.08)",
    isActive: true,
  },
  {
    id: 4,
    orderIndex: 4,
    slug: "the-top-ten-market-research-best-practices",
    title: "The Top Ten Market Research Best Practices",
    tagline: "Essential principles for reliable, high-yield research design.",
    description:
      "Proven standards from survey architecture to data validation that ensure your findings withstand executive scrutiny and deliver enduring competitive advantage.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315259493-khokty-BuyFacts_Best_Practices_Keystone.svg",
    iconColor: "#0089d2",
    bgColor: "rgba(0, 137, 210, 0.08)",
    isActive: true,
  },
  {
    id: 5,
    orderIndex: 5,
    slug: "the-art-of-asking-great-survey-questions",
    title: "The Art of Asking Great Survey Questions",
    tagline: "Every question must directly map to a strategic decision purpose.",
    description:
      "Crafting unbiased, unambiguous questions ensures respondents share authentic perceptions. Eliminating filler questions respects participant time and sharpens decision clarity.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315269426-66lkh2-BuyFacts_Question_Design.svg",
    iconColor: "#7cb342",
    bgColor: "rgba(124, 179, 66, 0.08)",
    isActive: true,
  },
  {
    id: 6,
    orderIndex: 6,
    slug: "executives-want-insight-not-coffee-cards",
    title: "Executives Want Insight, Not Coffee Cards",
    tagline: "Peer comparisons and market benchmarks that command attention.",
    description:
      "Executive respondents are motivated by peer benchmark insights, not trivial gift card incentives. Offering high-value market context attracts genuine leaders and drives meaningful data.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315281029-irb8ll-BuyFacts_Value_Quantification.svg",
    iconColor: "#e57a45",
    bgColor: "rgba(229, 122, 69, 0.08)",
    isActive: true,
  },
  {
    id: 7,
    orderIndex: 7,
    slug: "build-content-fast-from-survey-findings",
    title: "Build Content Fast from Survey Findings",
    tagline: "Accelerate digital asset creation directly from verified research data.",
    description:
      "Transform survey results into thought leadership articles, graphics, and campaign copy in record time, multiplying the marketing return on every research initiative.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315275105-urqpqf-BuyFacts_Thought_Leadership_TL1.svg",
    iconColor: "#14a38b",
    bgColor: "rgba(20, 163, 139, 0.08)",
    isActive: true,
  },
  {
    id: 8,
    orderIndex: 8,
    slug: "avoid-death-from-doubt",
    title: "Avoid Death from Doubt",
    tagline: "Eliminate skepticism with verifiable, bot-protected research rigor.",
    description:
      "When leadership doubts data integrity, research recommendations stall. Rigorous anti-bot verification and robust methodology provide the confidence required to act decisively.",
    seeItUrl: "",
    hearItUrl: "",
    readItUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    iconUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315259585-6u4ucb-BuyFacts_Bot_Detection.svg",
    iconColor: "#ffb039",
    bgColor: "rgba(255, 176, 57, 0.08)",
    isActive: true,
  },
];

/**
 * GET Handler: Returns list of Great Eight items from database with fallback.
 */
export async function GET() {
  try {
    const db = prisma as any;
    const items = await db.greatEightItem.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    if (items && items.length > 0) {
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ success: true, items: DEFAULT_GREAT_EIGHT });
  } catch {
    // Return fallback items cleanly if database connection is offline or unmigrated
    return NextResponse.json({ success: true, items: DEFAULT_GREAT_EIGHT });
  }
}

/**
 * POST / PUT Handler: Updates or creates a Great Eight item (Admin authenticated).
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

    const payload = await req.json();
    const {
      id,
      slug,
      orderIndex,
      title,
      tagline,
      description,
      readItUrl,
      seeItUrl,
      hearItUrl,
      iconUrl,
      iconColor,
      bgColor,
      isActive,
    } = payload;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const targetSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const updateData: Record<string, any> = {
      title,
      slug: targetSlug,
    };
    if (orderIndex !== undefined) updateData.orderIndex = Number(orderIndex);
    if (tagline !== undefined) updateData.tagline = tagline;
    if (description !== undefined) updateData.description = description;
    if (readItUrl !== undefined) updateData.readItUrl = readItUrl;
    if (seeItUrl !== undefined) updateData.seeItUrl = seeItUrl;
    if (hearItUrl !== undefined) updateData.hearItUrl = hearItUrl;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (iconColor !== undefined) updateData.iconColor = iconColor;
    if (bgColor !== undefined) updateData.bgColor = bgColor;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    let savedItem;
    if (id) {
      const db = prisma as any;
      savedItem = await db.greatEightItem.update({
        where: { id: Number(id) },
        data: updateData,
      });
    } else {
      const db = prisma as any;
      savedItem = await db.greatEightItem.upsert({
        where: { slug: targetSlug },
        update: updateData,
        create: {
          title,
          slug: targetSlug,
          orderIndex: Number(orderIndex ?? 1),
          tagline: tagline ?? "",
          description: description ?? "",
          readItUrl: readItUrl ?? "",
          seeItUrl: seeItUrl ?? "",
          hearItUrl: hearItUrl ?? "",
          iconUrl: iconUrl ?? "",
          iconColor: iconColor ?? "#14a38b",
          bgColor: bgColor ?? "rgba(20, 163, 139, 0.08)",
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    }

    return NextResponse.json({ success: true, item: savedItem });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save Great Eight item" },
      { status: 500 }
    );
  }
}
