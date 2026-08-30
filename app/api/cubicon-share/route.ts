import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCubiconShareEmail } from "@/lib/resend";

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

    const {
      senderName,
      senderEmail,
      receiverName,
      receiverEmail,
      sharePlatform,
      shareUrl,
      sessionId,
    } = parsed;

    if (!senderName?.trim() || !receiverName?.trim() || !receiverEmail?.trim()) {
      return NextResponse.json(
        { error: "Sender Name, Receiver Name, and Receiver Email are required." },
        { status: 400, headers: corsHeaders().headers }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(receiverEmail.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid receiver email address." },
        { status: 400, headers: corsHeaders().headers }
      );
    }

    const cleanSenderName = senderName.trim();
    const cleanSenderEmail = senderEmail ? senderEmail.trim().toLowerCase() : "";
    const cleanReceiverName = receiverName.trim();
    const cleanReceiverEmail = receiverEmail.trim().toLowerCase();
    const cleanPlatform = sharePlatform?.trim() || "email";
    const cleanUrl = shareUrl?.trim() || "";
    const cleanSessionId = sessionId?.trim() || "";

    let emailResult = null;
    try {
      emailResult = await sendCubiconShareEmail({
        senderName: cleanSenderName,
        receiverName: cleanReceiverName,
        receiverEmail: cleanReceiverEmail,
      });
    } catch (mailErr: any) {
      console.warn("[cubicon-share] Resend email delivery skipped or encountered error:", mailErr.message);
    }

    const createdShare = await prisma.cubiconShare.create({
      data: {
        senderName: cleanSenderName,
        senderEmail: cleanSenderEmail,
        receiverName: cleanReceiverName,
        receiverEmail: cleanReceiverEmail,
        sharePlatform: cleanPlatform,
        shareUrl: cleanUrl,
        sessionId: cleanSessionId,
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

