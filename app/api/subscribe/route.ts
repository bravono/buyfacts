import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email presence
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Validation error: Email address is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Email regex format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Validation error: Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Database persistence directory & file path
    const dirPath = path.join(process.cwd(), "data");
    const filePath = path.join(dirPath, "subscribers.json");

    // Ensure data directory exists
    await fs.mkdir(dirPath, { recursive: true });

    let subscribers: Array<{
      id: string;
      email: string;
      subscribedAt: string;
      status: string;
    }> = [];

    try {
      const fileContents = await fs.readFile(filePath, "utf-8");
      subscribers = JSON.parse(fileContents);
    } catch (err) {
      // File does not exist yet; initialize empty array
    }

    // Check if email already subscribed
    const existingIndex = subscribers.findIndex(
      (sub) => sub.email === trimmedEmail
    );

    if (existingIndex !== -1) {
      // Email is already in the database
      return NextResponse.json(
        {
          success: true,
          message: "You are already subscribed to our launch notifications!",
          alreadySubscribed: true,
        },
        { status: 200 }
      );
    }

    // Create subscriber record
    const newSubscriber = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      email: trimmedEmail,
      subscribedAt: new Date().toISOString(),
      status: "active",
    };

    subscribers.push(newSubscriber);

    // Save to database file
    await fs.writeFile(
      filePath,
      JSON.stringify(subscribers, null, 2),
      "utf-8"
    );

    console.log(
      `[Subscriber API] Successfully persisted subscriber: ${trimmedEmail} (ID: ${newSubscriber.id})`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for subscribing! We'll keep you updated.",
        id: newSubscriber.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in subscriber persistence endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to save subscriber." },
      { status: 500 }
    );
  }
}
