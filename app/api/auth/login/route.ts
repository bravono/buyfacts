import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuthSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user in the database
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // If user exists but has no password set yet, securely initialize it
    if (!user.passwordHash) {
      const hashedPassword = await hashPassword(password);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          ...(name ? { name: name.trim() } : {}),
        },
      });
    } else {
      // Verify existing password hash
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid credentials." },
          { status: 401 }
        );
      }
    }

    // Create secure httpOnly session cookie
    await createAuthSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "admin",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || "admin",
      },
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}
