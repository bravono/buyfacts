import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const responses = await prisma.researchLibResponse.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    });

    const story = responses
      .map((r) => r.story)
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({
      userId,
      story: story.trim(),
    });
  } catch (err: any) {
    console.error("GET /api/stories/[userId] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stories", details: err.message },
      { status: 500 }
    );
  }
}
