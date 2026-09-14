import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FeedbackSchema } from "@/lib/validation/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get("export")?.toLowerCase();

    const feedback = await prisma.feedbackSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (exportFormat === "csv") {
      // Export as CSV (Section 9.4)
      const csvHeader = "ID,Name,Email,Session ID,Rating,Feedback,Date\n";
      const csvRows = feedback.map((f) => {
        const cleanName = `"${(f.userId || "").replace(/"/g, '""')}"`;
        const cleanEmail = `"${(f.userEmail || "").replace(/"/g, '""')}"`;
        const cleanSession = `"${(f.sessionId || "").replace(/"/g, '""')}"`;
        const cleanRating = f.rating ?? 0;
        const cleanText = `"${(f.feedbackText || "").replace(/"/g, '""')}"`;
        const cleanDate = `"${f.createdAt ? f.createdAt.toISOString() : ""}"`;
        return `${f.id},${cleanName},${cleanEmail},${cleanSession},${cleanRating},${cleanText},${cleanDate}`;
      });

      const csvContent = csvHeader + csvRows.join("\n");
      return new Response(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders().headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cubicon_feedback_${Date.now()}.csv"`,
        },
      });
    }

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
    // 1. Rate Limiting (Section 13)
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, "feedback");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many feedback submissions. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
          retryAfter: rateLimit.resetSeconds,
        },
        {
          status: 429,
          headers: {
            ...corsHeaders().headers,
            "Retry-After": String(rateLimit.resetSeconds),
          },
        }
      );
    }

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

    // Map input fields to FeedbackSchema requirements
    const normalizedInput = {
      name: parsed.name || parsed.userId || "",
      email: parsed.email || parsed.userEmail || "",
      comment: parsed.comment || parsed.feedbackText || "",
      rating: typeof parsed.rating === "number" ? parsed.rating : 0,
      sessionId: parsed.sessionId || "",
      hp_website: parsed.hp_website || "",
    };

    // 2. Schema Validation (Section 9.4: Non-anonymous, Name, Email, Comment, Honeypot)
    const parseResult = FeedbackSchema.safeParse(normalizedInput);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed.";
      return NextResponse.json(
        { error: firstError, issues: parseResult.error.issues },
        { status: 400, headers: corsHeaders().headers }
      );
    }

    const { name, email, comment, rating, sessionId } = parseResult.data;

    const created = await prisma.feedbackSubmission.create({
      data: {
        userId: name.trim(),
        userEmail: email.trim().toLowerCase(),
        sessionId: sessionId?.trim() || "",
        feedbackText: comment.trim(),
        rating: Math.max(0, Math.min(5, rating)),
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const purge = searchParams.get("purge");

    if (purge === "30d") {
      // Retention Policy: Purge feedback submissions older than 30 days (Section 9.4)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await prisma.feedbackSubmission.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Purged ${result.count} feedback record(s) older than 30 days.`,
          purgedCount: result.count,
        },
        corsHeaders()
      );
    }

    return NextResponse.json(
      { error: "Unsupported purge parameter. Use ?purge=30d" },
      { status: 400, headers: corsHeaders().headers }
    );
  } catch (error: any) {
    console.error("[cubicon-feedback] Error purging feedback:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to purge feedback." },
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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
}
