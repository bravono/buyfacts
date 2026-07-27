import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, interest, message, isEighteen } = body;

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
        timestamp: new Date().toISOString()
      };

      currentData.push(newSubmission);
      await fs.writeFile(filePath, JSON.stringify(currentData, null, 2), "utf-8");
      return newSubmission;
    })();

    const [dbRecord, newSubmission] = await Promise.all([dbPromise, jsonPromise]);

    // Log the contact submission to server stdout
    console.log(`[Contact Submission] Saved submission ${newSubmission.id} from ${newSubmission.email}`);

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
