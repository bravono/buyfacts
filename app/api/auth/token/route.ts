import { NextResponse } from "next/server";
import { signJWT } from "@/lib/auth/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const email = body.email || "guest@buyfacts.local";

    const token = await signJWT({
      userId,
      email,
      role: body.role || "user",
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId,
        email,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to issue token";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
