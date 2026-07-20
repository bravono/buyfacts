import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

    // Save submission to a local JSON file in data/cubicon_registrations.json
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
      id: `cubicon_reg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

    console.log(`[Cubicon Registration] Saved registration ${newRegistration.id} for ${newRegistration.email}`);

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
