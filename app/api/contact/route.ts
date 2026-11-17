import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ContactInquirySchema } from "@/lib/validation/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { sendVerificationEmail } from "@/lib/resend";
import {
  SPENT_SESSION_RESULTS,
  verifyAndConsumeContactSession,
  type ContactVerificationDb,
} from "@/lib/security/contact-verification";

const contactVerificationDb: ContactVerificationDb = {
  findSession: (sessionId) =>
    prisma.cubiconSession.findUnique({
      where: { sessionId },
      select: {
        id: true,
        sequenceId: true,
        passedPuzzles: true,
        totalPuzzlesAttempted: true,
        previousResult: true,
        sequence: { select: { slug: true, passThreshold: true } },
      },
    }),
  countScoredTasks: (sequenceId) =>
    sequenceId === null
      ? Promise.resolve(0)
      : prisma.cubiconTask.count({ where: { sequenceId, isFinal: false } }),
  consumeSession: async (id) => {
    const { count } = await prisma.cubiconSession.updateMany({
      where: {
        id,
        OR: [{ previousResult: null }, { previousResult: { notIn: [...SPENT_SESSION_RESULTS] } }],
      },
      data: { previousResult: "used" },
    });
    return count === 1;
  },
};

export async function POST(request: Request) {
  try {
    // 1. IP Rate Limiting (Section 13)
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, "contact");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many submissions. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
          retryAfter: rateLimit.resetSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => ({}));

    // 2. Schema Validation & Honeypot (Section 9.1 & 13)
    const parseResult = ContactInquirySchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed.";
      return NextResponse.json(
        { error: firstError, issues: parseResult.error.issues },
        { status: 400 }
      );
    }

    // 3. Human Anti-Bot Verification via Cubicon. Always required: there is no bypass, and
    // the solved session is consumed atomically so it cannot back a second submission.
    const verification = await verifyAndConsumeContactSession(body.verificationSessionId, contactVerificationDb);
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const { name, email, company, interest, message, isEighteen } = parseResult.data;
    const cleanEmail = email.toLowerCase().trim();
    const submissionId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const payload = JSON.stringify({
      id: submissionId,
      name: name.trim(),
      email: cleanEmail,
      company: (company || "").trim(),
      interest: interest || "General Inquiry",
      message: message.trim(),
      isEighteen: !!isEighteen,
    });

    // 4. Persist ContactInquiry in SQLite database
    await prisma.contactInquiry.create({
      data: {
        id: submissionId,
        name: name.trim(),
        email: cleanEmail,
        company: (company || "").trim(),
        interest: interest || "General Inquiry",
        message: message.trim(),
        isEighteen: !!isEighteen,
      },
    }).catch((dbErr) => {
      console.warn("ContactInquiry database save warning:", dbErr);
    });

    // 5. Persist Hold State in EmailVerification (Section 9.1)
    await prisma.emailVerification.create({
      data: {
        token,
        email: cleanEmail,
        type: "contact",
        payload,
        expiresAt,
      },
    }).catch((err) => {
      console.warn("EmailVerification database save warning:", err);
    });

    console.log(`[Contact Submission] Saved inquiry ${submissionId} for ${cleanEmail}.`);

    // 6. Send Verification Link via Resend
    sendVerificationEmail({
      email: cleanEmail,
      name: name.trim(),
      token,
      type: "contact",
    }).catch((err) => {
      console.error("[Contact Submission] Error dispatching verification email:", err);
    });

    return NextResponse.json(
      {
        success: true,
        verificationRequired: true,
        message: `Your inquiry has been received and placed on hold. Please check your inbox at ${cleanEmail} to verify your email. Inquiries are valid for 24 hours.`,
        id: submissionId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in contact API route:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to process submission." },
      { status: 500 }
    );
  }
}
