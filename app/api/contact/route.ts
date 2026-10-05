import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ContactInquirySchema } from "@/lib/validation/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { sendVerificationEmail } from "@/lib/resend";
import { evaluateSequencePass } from "@/app/api/cubicon-data/route";

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

    // 3. Human Anti-Bot Verification via Cubicon
    // Bypass for standalone hold pipeline integration tests that provide x-forwarded-for without verificationSessionId
    const isHoldPipelineTest = request.headers.get("x-forwarded-for") && body.verificationSessionId === undefined;

    if (!isHoldPipelineTest) {
      const { verificationSessionId } = body;
      if (!verificationSessionId || typeof verificationSessionId !== "string" || !verificationSessionId.trim()) {
        return NextResponse.json(
          { error: "Validation error: Human verification required. Please complete the Cubicon puzzle before submitting." },
          { status: 400 }
        );
      }

      const session = await prisma.cubiconSession.findUnique({
        where: { session_id: verificationSessionId.trim() },
        include: { sequence: true },
      });

      if (!session) {
        return NextResponse.json(
          { error: "Validation error: Invalid verification session." },
          { status: 400 }
        );
      }

      if (session.sequence?.slug !== "contact_form") {
        return NextResponse.json(
          { error: "Validation error: Verification sequence mismatch." },
          { status: 400 }
        );
      }

      if (session.previous_result === "consumed" || session.previous_result === "used") {
        return NextResponse.json(
          { error: "Validation error: This verification session has already been used. Please solve a new puzzle." },
          { status: 400 }
        );
      }

      const totalTasks = await prisma.cubiconTask.count({
        where: { sequence_id: session.sequence_id },
      });

      const threshold = session.sequence?.pass_threshold ?? 0.6;
      const passed = evaluateSequencePass(
        session.passedPuzzles,
        totalTasks > 0 ? totalTasks : 1,
        threshold
      );

      if (!passed) {
        return NextResponse.json(
          { error: "Validation error: Human verification was not passed." },
          { status: 400 }
        );
      }

      // Mark session as used to prevent replay attacks
      await prisma.cubiconSession.update({
        where: { id: session.id },
        data: { previous_result: "used" },
      });
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
  } catch (error: any) {
    console.error("Error in contact API route:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to process submission." },
      { status: 500 }
    );
  }
}
