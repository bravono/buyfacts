import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Both email and name are required." },
        { status: 400 }
      );
    }

    // Convert inputs to lowercase/trim for more robust matching
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim().toLowerCase();

    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.name) {
      return NextResponse.json(
        { error: "Unauthorized: User not found or details incorrect." },
        { status: 401 }
      );
    }

    // Verify name matches (case-insensitive)
    if (user.name.trim().toLowerCase() !== normalizedName) {
      return NextResponse.json(
        { error: "Unauthorized: User not found or details incorrect." },
        { status: 401 }
      );
    }

    // Create session cookie for backwards compatibility
    await createAuthSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "admin",
    });

    return NextResponse.json({
      success: true,
      user: { name: user.name, email: user.email, role: user.role || "admin" },
    });
  } catch (error) {
    console.error("Error verifying uploader:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
