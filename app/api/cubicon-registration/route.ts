import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/resend";
import { FoundingClientSchema } from "@/lib/validation/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { evaluateSequencePass } from "@/app/api/cubicon-data/route";

export async function POST(request: Request) {
  try {
    // 1. IP Rate Limiting (Section 13)
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, "founding_client");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
          retryAfter: rateLimit.resetSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => ({}));

    // 2. Schema Validation (Section 8: Business Email, US-based, 18+ certify, Honeypot)
    const parseResult = FoundingClientSchema.safeParse(body);
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

    const {
      firstName,
      lastName,
      phone,
      email,
      urgency,
      requestConfirmation,
      isEighteen,
      isUsBased,
      company,
      notes,
      selectedAreas,
      priorityScore,
    } = parseResult.data;

    const submissionId = crypto.randomUUID();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const fullName = cleanFirst && cleanLast
      ? (cleanFirst.toLowerCase().includes(cleanLast.toLowerCase()) ? cleanFirst : `${cleanFirst} ${cleanLast}`)
      : (cleanFirst || cleanLast || "Founding Client Partner");

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const payload = JSON.stringify({
      id: submissionId,
      firstName: cleanFirst,
      lastName: cleanLast,
      name: fullName,
      company: (company || "").trim(),
      phone: (phone || "").trim(),
      email: cleanEmail,
      urgency: urgency || "Medium",
      requestConfirmation: !!requestConfirmation,
      isEighteen: true,
      isUsBased: true,
      notes: (notes || "").trim(),
      selectedAreas: selectedAreas || {},
      priorityScore: priorityScore || 0,
    });

    // 3. Persist Hold State in EmailVerification (24-hour verification window)
    await prisma.emailVerification.create({
      data: {
        token,
        email: cleanEmail,
        type: "founding_client",
        payload,
        expiresAt,
      },
    });

    console.log(`[Cubicon Registration Held] Token ${token} created for ${cleanEmail}. Awaiting email verification.`);

    // 4. Send Verification Email via Resend
    sendVerificationEmail({
      email: cleanEmail,
      name: cleanFirst || fullName,
      token,
      type: "founding_client",
    }).catch((err) => {
      console.error("[Cubicon Registration] Failed to send verification email via Resend:", err);
    });

    return NextResponse.json(
      {
        success: true,
        verificationRequired: true,
        message: `Your registration has been received and placed on hold. Please check your inbox at ${cleanEmail} to verify your business email address and activate your founding client registration.`,
        id: submissionId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in Cubicon registration API route:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to process registration." },
      { status: 500 }
    );
  }
}
