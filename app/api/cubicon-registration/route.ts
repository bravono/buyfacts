import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendCubiconRegistrationEmails } from "@/lib/resend";
import { FoundingClientSchema } from "@/lib/validation/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";

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
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // 3. Persist into Prisma database (cubicon_registrations table)
    try {
      await prisma.cubiconRegistration.create({
        data: {
          id: submissionId,
          name: fullName,
          email: cleanEmail,
          company: (company || "").trim(),
          role: urgency || "Medium",
          interest: "Founding Client",
          isUsBased: !!isUsBased,
          notes: JSON.stringify({
            phone: (phone || "").trim(),
            notes: (notes || "").trim(),
            selectedAreas: selectedAreas || {},
            priorityScore: priorityScore || 0,
            requestConfirmation: !!requestConfirmation,
            isEighteen: !!isEighteen,
          }),
        },
      });
    } catch (dbErr) {
      console.warn("[Cubicon Registration] DB Save warning:", dbErr);
    }

    // 4. Save to local JSON backup
    const dirPath = path.join(process.cwd(), "data");
    const filePath = path.join(dirPath, "cubicon_registrations.json");

    await fs.mkdir(dirPath, { recursive: true });

    let currentData = [];
    try {
      const fileContents = await fs.readFile(filePath, "utf-8");
      currentData = JSON.parse(fileContents);
    } catch {
      // File doesn't exist yet
    }

    const newRegistration = {
      id: submissionId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: (company || "").trim(),
      phone: (phone || "").trim(),
      email: cleanEmail,
      urgency: urgency || "Medium",
      requestConfirmation: !!requestConfirmation,
      isEighteen: true,
      isUsBased: true,
      selectedAreas: selectedAreas || {},
      priorityScore: priorityScore || 0,
      timestamp: new Date().toISOString(),
    };

    currentData.push(newRegistration);
    await fs.writeFile(filePath, JSON.stringify(currentData, null, 2), "utf-8");

    console.log(`[Cubicon Registration] Saved registration ${newRegistration.id} for ${newRegistration.email}`);

    // 5. Send confirmation emails via Resend
    if (requestConfirmation) {
      sendCubiconRegistrationEmails({
        id: newRegistration.id,
        firstName: newRegistration.firstName,
        lastName: newRegistration.lastName,
        email: newRegistration.email,
        phone: newRegistration.phone,
        urgency: newRegistration.urgency,
        selectedAreas: newRegistration.selectedAreas,
        priorityScore: newRegistration.priorityScore,
      }).catch((err) => {
        console.error("[Cubicon Registration] Failed to send email via Resend:", err);
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your Cubicon Founding Client registration has been received successfully!",
        id: newRegistration.id,
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
