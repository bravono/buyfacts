import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const feedback = await prisma.feedbackSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ feedback }, corsHeaders());
  } catch (error: any) {
    console.error("[cubicon-feedback] Error fetching feedback:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch feedback." },
      { status: 500, headers: corsHeaders().headers }
    );
  }
}

export async function POST(request: Request) {
  try {
    const text = await request.text();
    let parsed: Record<string, any> = {};

    if (text) {
      try {
        if (text.startsWith("data=")) {
          let raw = text.slice(5);
          const ampIdx = raw.indexOf("&");
          if (ampIdx !== -1) {
            raw = raw.substring(0, ampIdx);
          }
          const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
          parsed = JSON.parse(decoded);
        } else {
          parsed = JSON.parse(text);
        }
      } catch {
        try {
          const params = new URLSearchParams(text);
          const dataVal = params.get("data");
          if (dataVal) {
            parsed = JSON.parse(dataVal);
          }
        } catch {
          parsed = {};
        }
      }
    }

    const { userId, userEmail, sessionId, feedbackText, rating } = parsed;

    if (!feedbackText?.trim()) {
      return NextResponse.json(
        { error: "Feedback text is required." },
        { status: 400, headers: corsHeaders().headers }
      );
    }

    const created = await prisma.feedbackSubmission.create({
      data: {
        userId: (userId || "").trim(),
        userEmail: (userEmail || "").trim().toLowerCase(),
        sessionId: (sessionId || "").trim(),
        feedbackText: feedbackText.trim(),
        rating: typeof rating === "number" ? Math.max(0, Math.min(5, rating)) : 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for your feedback.",
        feedback: created,
      },
      corsHeaders()
    );
  } catch (error: any) {
    console.error("[cubicon-feedback] Error saving feedback:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save feedback." },
      { status: 500, headers: corsHeaders().headers }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders().headers });
}

function corsHeaders() {
  return {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
}
