import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCubiconShareEmail } from "@/lib/resend";
import { ShareSchema } from "@/lib/validation/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";

export async function GET() {
  try {
    const shares = await prisma.cubiconShare.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ shares }, corsHeaders());
  } catch (error: any) {
    console.error("[cubicon-share] Error fetching shares:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch shares." },
      { status: 500, headers: corsHeaders().headers }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. IP Rate Limiting (Section 13)
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, "share");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many share requests. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
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

    // 2. Schema Validation (Section 9.3 & 13)
    const parseResult = ShareSchema.safeParse(parsed);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed.";
      return NextResponse.json(
        { error: firstError, issues: parseResult.error.issues },
        { status: 400, headers: corsHeaders().headers }
      );
    }

    const {
      senderName,
      senderEmail,
      receiverName,
      receiverEmail,
      sharePlatform,
      shareUrl,
      sessionId,
    } = parseResult.data;

    let emailResult = null;
    try {
      emailResult = await sendCubiconShareEmail({
        senderName,
        receiverName,
        receiverEmail,
      });
    } catch (mailErr: any) {
      console.warn("[cubicon-share] Resend email delivery skipped or encountered error:", mailErr.message);
    }

    const createdShare = await prisma.cubiconShare.create({
      data: {
        senderName,
        senderEmail,
        receiverName,
        receiverEmail,
        sharePlatform: sharePlatform || "email",
        shareUrl: shareUrl || "",
        sessionId: sessionId || "",
        status: "invited",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Personalized Cubicon invitation recorded and dispatched successfully.",
        share: createdShare,
        emailResult,
      },
      corsHeaders()
    );
  } catch (error: any) {
    console.error("[cubicon-share] Error processing share request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process share invitation." },
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
