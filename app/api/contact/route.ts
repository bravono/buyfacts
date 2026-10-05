import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendContactEmails } from "@/lib/resend";
import { evaluateSequencePass } from "@/app/api/cubicon-data/route";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, interest, message, isEighteen, verificationSessionId } = body;

    // Server-side validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Validation error: Name, Email, and Message are required fields." },
        { status: 400 }
      );
    }

    if (!isEighteen) {
      return NextResponse.json(
        { error: "Validation error: You must certify that you are 18 years of age or older." },
        { status: 400 }
      );
    }

    // Simple email pattern check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Validation error: Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Human verification check via Cubicon
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

    const submissionId = crypto.randomUUID();

    // Save to SQLite database using Prisma
    const dbPromise = prisma.contactInquiry.create({
      data: {
        id: submissionId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: (company || "").trim(),
        interest: interest || "General Inquiry",
        message: message.trim(),
        isEighteen: !!isEighteen,
      },
    }).catch(dbErr => {
      console.warn("Database save warning (proceeding with JSON fallback):", dbErr);
      return null;
    });

    // Save submission to a local JSON file in the project workspace
    const jsonPromise = (async () => {
      const dirPath = path.join(process.cwd(), "data");
      const filePath = path.join(dirPath, "contact_inquiries.json");

      // Ensure the data directory exists
      await fs.mkdir(dirPath, { recursive: true });

      let currentData = [];
      try {
        const fileContents = await fs.readFile(filePath, "utf-8");
        currentData = JSON.parse(fileContents);
      } catch (err) {
        // File doesn't exist yet, proceed with empty array
      }

      const newSubmission = {
        id: submissionId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: (company || "").trim(),
        interest: interest || "General Inquiry",
        message: message.trim(),
        isEighteen: !!isEighteen,
        verificationSessionId: verificationSessionId.trim(),
        timestamp: new Date().toISOString()
      };

      currentData.push(newSubmission);
      await fs.writeFile(filePath, JSON.stringify(currentData, null, 2), "utf-8");
      return newSubmission;
    })();

    const [dbRecord, newSubmission] = await Promise.all([dbPromise, jsonPromise]);

    // Log the contact submission to server stdout
    console.log(`[Contact Submission] Saved submission ${newSubmission.id} from ${newSubmission.email}`);

    // Send transactional confirmation email via Resend
    sendContactEmails({
      id: newSubmission.id,
      name: newSubmission.name,
      email: newSubmission.email,
      company: newSubmission.company,
      interest: newSubmission.interest,
      message: newSubmission.message,
    }).catch(err => {
      console.error("[Contact Submission] Failed to send email via Resend:", err);
    });

    return NextResponse.json(
      { success: true, message: "Inquiry saved successfully.", id: newSubmission.id },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error in contact API route:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to process and save submission." },
      { status: 500 }
    );
  }
}
