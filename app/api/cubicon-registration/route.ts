import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendCubiconRegistrationEmails } from "@/lib/resend";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      emailConfirm,
      urgency,
      requestConfirmation,
      isEighteen,
      selectedAreas,
      priorityScore,
    } = body;

    // Server-side validation
    if (!firstName || !lastName || !email || !emailConfirm) {
      return NextResponse.json(
        { error: "Validation error: First Name, Last Name, and Email are required." },
        { status: 400 }
      );
    }

    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Validation error: Email addresses do not match." },
        { status: 400 }
      );
    }

    if (!isEighteen) {
      return NextResponse.json(
        { error: "Validation error: You must certify that you are 18 years of age or older." },
        { status: 400 }
      );
    }

    const submissionId = crypto.randomUUID();

    // Save to SQLite database using Prisma
    const dbPromise = prisma.cubiconRegistration.create({
      data: {
        id: submissionId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: (phone || "").trim(),
        email: email.trim().toLowerCase(),
        urgency: urgency || "Medium",
        requestConfirmation: !!requestConfirmation,
        isEighteen: true,
        priorityScore: Number(priorityScore) || 0,
        selectedAreas: JSON.stringify(selectedAreas || {}),
      },
    }).catch(dbErr => {
      console.warn("Database save warning (proceeding with JSON fallback):", dbErr);
      return null;
    });

    // Save submission to a local JSON file in data/cubicon_registrations.json
    const jsonPromise = (async () => {
      const dirPath = path.join(process.cwd(), "data");
      const filePath = path.join(dirPath, "cubicon_registrations.json");

      await fs.mkdir(dirPath, { recursive: true });

      let currentData = [];
      try {
        const fileContents = await fs.readFile(filePath, "utf-8");
        currentData = JSON.parse(fileContents);
      } catch (err) {
        // File doesn't exist yet
      }

      const newRegistration = {
        id: submissionId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: (phone || "").trim(),
        email: email.trim().toLowerCase(),
        urgency: urgency || "Medium",
        requestConfirmation: !!requestConfirmation,
        isEighteen: true,
        selectedAreas: selectedAreas || {},
        priorityScore: priorityScore || 0,
        timestamp: new Date().toISOString(),
      };

      currentData.push(newRegistration);
      await fs.writeFile(filePath, JSON.stringify(currentData, null, 2), "utf-8");
      return newRegistration;
    })();

    const [dbRecord, newRegistration] = await Promise.all([dbPromise, jsonPromise]);

    console.log(`[Cubicon Registration] Saved registration ${newRegistration.id} for ${newRegistration.email}`);

    // Send transactional confirmation email via Resend
    sendCubiconRegistrationEmails({
      id: newRegistration.id,
      firstName: newRegistration.firstName,
      lastName: newRegistration.lastName,
      email: newRegistration.email,
      phone: newRegistration.phone,
      urgency: newRegistration.urgency,
      selectedAreas: newRegistration.selectedAreas,
      priorityScore: newRegistration.priorityScore,
    }).catch(err => {
      console.error("[Cubicon Registration] Failed to send email via Resend:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your Cubicon Founding Client registration has been received successfully!",
        id: newRegistration.id,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error in Cubicon registration API route:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to process registration." },
      { status: 500 }
    );
  }
}
