import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import {
  deliverVerifiedInquiry,
  sendVerificationEmail,
  sendVerificationReminderEmail,
  sendCubiconRegistrationEmails,
} from "@/lib/resend";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();
    const action = searchParams.get("action")?.trim();

    // Support administrative / cron check for reminder emails
    if (action === "check-reminders") {
      return await handleCheckReminders(request);
    }

    if (!token) {
      return renderResponse(
        request,
        false,
        "Missing Verification Token",
        "No verification token was provided in your request. Please click the link received in your email or submit a new inquiry.",
        400
      );
    }

    // Lookup token in email_verifications table
    const record = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!record) {
      return renderResponse(
        request,
        false,
        "Invalid Verification Link",
        "This verification link is invalid or has already been removed. If you need assistance, please submit a new inquiry.",
        404
      );
    }

    // Check if already verified
    if (record.verifiedAt) {
      return renderResponse(
        request,
        true,
        "Email Already Verified",
        "Your email address has already been verified and your submission has been received. You will hear back within 48 hours.",
        200
      );
    }

    // Check 24-hour expiration
    const now = new Date();
    if (record.expiresAt < now) {
      return renderResponse(
        request,
        false,
        "Verification Link Expired",
        "This verification link has expired. Verification links are active for 24 hours. You can request a new verification email below.",
        410,
        { expired: true, email: record.email, type: record.type }
      );
    }

    // Mark as verified
    const verifiedAt = now;
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { verifiedAt },
    });

    // Parse payload and dispatch held submission
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(record.payload);
    } catch {
      payload = {};
    }

    if (record.type === "founding_client") {
      // Founding Client Inquiry
      try {
        const submissionId = payload.id || crypto.randomUUID();
        await prisma.cubiconRegistration.create({
          data: {
            id: submissionId,
            name: `${payload.firstName || ""} ${payload.lastName || ""}`.trim(),
            email: record.email.toLowerCase(),
            company: payload.company || "",
            role: payload.urgency || "Medium",
            interest: "Founding Client",
            isUsBased: payload.isUsBased ?? true,
            notes: JSON.stringify({
              phone: payload.phone || "",
              selectedAreas: payload.selectedAreas || {},
              priorityScore: payload.priorityScore || 0,
              requestConfirmation: !!payload.requestConfirmation,
              verifiedAt: verifiedAt.toISOString(),
            }),
          },
        });

        // Update JSON backup
        await appendToJsonBackup("cubicon_registrations.json", {
          id: submissionId,
          ...payload,
          verifiedAt: verifiedAt.toISOString(),
        });

        // Dispatch founding client confirmation emails
        await sendCubiconRegistrationEmails({
          id: submissionId,
          firstName: payload.firstName || "Client",
          lastName: payload.lastName || "",
          email: record.email,
          phone: payload.phone,
          urgency: payload.urgency,
          selectedAreas: payload.selectedAreas,
          priorityScore: payload.priorityScore,
        });
      } catch (clientErr) {
        console.error("[verify-email] Error completing founding client registration:", clientErr);
      }
    } else {
      // General Contact Inquiry
      const submissionId = payload.id || crypto.randomUUID();
      try {
        await prisma.contactInquiry.create({
          data: {
            id: submissionId,
            name: payload.name || "Inquirer",
            email: record.email.toLowerCase(),
            company: payload.company || "",
            interest: payload.interest || "General Inquiry",
            message: payload.message || "",
            isEighteen: payload.isEighteen ?? true,
          },
        });

        // Update JSON backup
        await appendToJsonBackup("contact_inquiries.json", {
          id: submissionId,
          ...payload,
          verifiedAt: verifiedAt.toISOString(),
        });
      } catch (inquiryErr) {
        console.warn("[verify-email] DB record creation warning:", inquiryErr);
      }

      // Deliver verified inquiry to staff mailbox (inquiry@buyfacts.com)
      await deliverVerifiedInquiry({
        id: submissionId,
        name: payload.name || "Inquirer",
        email: record.email,
        company: payload.company,
        interest: payload.interest,
        message: payload.message || "",
        verifiedAt,
      });
    }

    return renderResponse(
      request,
      true,
      "Verification Successful",
      "Your message has been sent. You will hear back within 48 hours.",
      200
    );
  } catch (error: any) {
    console.error("[verify-email] Verification error:", error);
    return renderResponse(
      request,
      false,
      "Server Error",
      "An unexpected error occurred while processing your email verification. Please try again later.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limitResult = checkRateLimit(ip, "verify_resend");

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification requests. Please wait ${limitResult.resetSeconds} seconds before trying again.`,
          retryAfter: limitResult.resetSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limitResult.resetSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    const token = body.token ? String(body.token).trim() : "";

    if (!email && !token) {
      return NextResponse.json(
        { error: "Please provide your email address or original verification token to request a new link." },
        { status: 400 }
      );
    }

    // Find the latest pending verification
    const whereClause: any = {};
    if (token) {
      whereClause.token = token;
    } else {
      whereClause.email = email;
    }

    const existing = await prisma.emailVerification.findFirst({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "No pending inquiry was found for the provided information." },
        { status: 404 }
      );
    }

    if (existing.verifiedAt) {
      return NextResponse.json(
        {
          success: true,
          message: "Your email has already been verified. Your message has been sent and you will hear back within 48 hours.",
          alreadyVerified: true,
        },
        { status: 200 }
      );
    }

    // Generate fresh token and extend 24-hour window
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerification.update({
      where: { id: existing.id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        reminderSentAt: null,
      },
    });

    // Extract inquirer's name from payload
    let recipientName = "Valued Customer";
    try {
      const parsed = JSON.parse(existing.payload);
      if (parsed.name) recipientName = parsed.name;
      else if (parsed.firstName) recipientName = parsed.firstName;
    } catch {
      // Keep default
    }

    await sendVerificationEmail({
      email: existing.email,
      name: recipientName,
      token: newToken,
      type: existing.type,
    });

    return NextResponse.json({
      success: true,
      message: "A new verification email has been sent. Please check your inbox and verify within 24 hours.",
    });
  } catch (error: any) {
    console.error("[verify-email] Resend error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification link. Please try again later." },
      { status: 500 }
    );
  }
}

async function handleCheckReminders(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.CRON_SECRET || "buyfacts_internal_cron_secret";
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const pendingReminders = await prisma.emailVerification.findMany({
      where: {
        verifiedAt: null,
        reminderSentAt: null,
        createdAt: { lte: twelveHoursAgo },
        expiresAt: { gt: now },
      },
    });

    let sentCount = 0;
    for (const record of pendingReminders) {
      let recipientName = "Valued Customer";
      try {
        const parsed = JSON.parse(record.payload);
        if (parsed.name) recipientName = parsed.name;
        else if (parsed.firstName) recipientName = parsed.firstName;
      } catch {
        // Keep default
      }

      const hoursRemaining = Math.max(1, Math.round((record.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
      await sendVerificationReminderEmail({
        email: record.email,
        name: recipientName,
        token: record.token,
        hoursRemaining,
      });

      await prisma.emailVerification.update({
        where: { id: record.id },
        data: { reminderSentAt: now },
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      remindersSent: sentCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[verify-email] Error sending reminders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function appendToJsonBackup(fileName: string, record: any) {
  try {
    const dirPath = path.join(process.cwd(), "data");
    const filePath = path.join(dirPath, fileName);
    await fs.mkdir(dirPath, { recursive: true });

    let currentData = [];
    try {
      const contents = await fs.readFile(filePath, "utf-8");
      currentData = JSON.parse(contents);
    } catch {
      currentData = [];
    }
    currentData.push(record);
    await fs.writeFile(filePath, JSON.stringify(currentData, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[verify-email] Could not update backup ${fileName}:`, err);
  }
}

function renderResponse(
  request: Request,
  success: boolean,
  title: string,
  message: string,
  statusCode: number,
  extra: Record<string, any> = {}
) {
  const acceptHeader = request.headers.get("accept") || "";
  if (acceptHeader.includes("application/json") && !acceptHeader.includes("text/html")) {
    return NextResponse.json(
      {
        success,
        title,
        message,
        ...extra,
      },
      { status: statusCode }
    );
  }

  const primaryColor = success ? "#10b981" : "#ef4444";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - BuyFacts</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0d1117;
      color: #e6edf3;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background-color: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      max-width: 540px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 16px 32px rgba(0,0,0,0.4);
    }
    .card-header {
      padding: 24px 32px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-bottom: 2px solid ${primaryColor};
    }
    .brand { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .tagline { font-size: 13px; color: #94a3b8; margin-top: 2px; }
    .card-body { padding: 32px; }
    .title { font-size: 22px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; }
    .message { font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #2563eb; }
    .btn-secondary {
      background: transparent;
      border: 1px solid #30363d;
      color: #cbd5e1;
      margin-left: 10px;
    }
    .btn-secondary:hover { background: #21262d; }
    .footer {
      padding: 16px 32px;
      background-color: #0d1117;
      border-top: 1px solid #30363d;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
    .resend-box {
      margin-top: 20px;
      padding: 16px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
    }
    .resend-box input {
      width: 100%;
      padding: 10px 12px;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 4px;
      color: #ffffff;
      margin: 8px 0 12px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="brand">BuyFacts</div>
      <div class="tagline">The Early Recognition Company</div>
    </div>
    <div class="card-body">
      <h1 class="title">${escapeHtml(title)}</h1>
      <p class="message">${escapeHtml(message)}</p>

      ${
        extra.expired
          ? `
        <div class="resend-box">
          <p style="font-size: 13px; color: #94a3b8;">Enter your email to receive a new 24-hour verification link:</p>
          <input type="email" id="resendEmail" value="${escapeHtml(extra.email || "")}" placeholder="name@company.com" />
          <button type="button" class="btn" onclick="resendVerification()">Send New Verification Email</button>
          <p id="resendStatus" style="font-size: 13px; margin-top: 8px;"></p>
        </div>
        <script>
          async function resendVerification() {
            const email = document.getElementById('resendEmail').value.trim();
            const status = document.getElementById('resendStatus');
            if (!email) { status.style.color = '#ef4444'; status.innerText = 'Please enter your email.'; return; }
            status.style.color = '#94a3b8'; status.innerText = 'Sending...';
            try {
              const res = await fetch('/api/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              const json = await res.json();
              if (res.ok) {
                status.style.color = '#10b981';
                status.innerText = json.message || 'New verification email sent.';
              } else {
                status.style.color = '#ef4444';
                status.innerText = json.error || 'Failed to resend link.';
              }
            } catch (err) {
              status.style.color = '#ef4444';
              status.innerText = 'Network error. Please try again.';
            }
          }
        </script>
      `
          : `
        <div>
          <a href="/" class="btn">Return to Home</a>
          <a href="/cubicon" class="btn btn-secondary">Explore Cubicon</a>
        </div>
      `
      }
    </div>
    <div class="footer">
      BuyFacts, Inc. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
