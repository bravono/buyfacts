import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

/**
 * GET Handler: Returns list of all interactive buttons from database.
 */
export async function GET() {
  try {
    // The database is the single source of truth (populated by `npm run seed:prod`).
    const buttons = await prisma.dashboardButton.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ success: true, buttons });
  } catch (error: any) {
    console.error("Failed to fetch buttons:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch buttons" }, { status: 500 });
  }
}

/**
 * POST Handler: Updates description text, links and other configuration details to a specific button
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

    const { id, descriptionText, seeItUrl, hearItUrl, readItUrl, subtitle, description } =
      await req.json();

    if (!id) {
      return NextResponse.json({ error: "Button ID is required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (descriptionText !== undefined) updateData.descriptionText = descriptionText;
    if (seeItUrl !== undefined) updateData.seeItUrl = seeItUrl;
    if (hearItUrl !== undefined) updateData.hearItUrl = hearItUrl;
    if (readItUrl !== undefined) updateData.readItUrl = readItUrl;
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
