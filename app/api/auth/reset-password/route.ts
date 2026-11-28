import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { consumeResetToken, findUserByResetToken } from "@/lib/auth/reset-token";
import { writeAudit } from "@/lib/auth/audit";
import { getClientIp } from "@/lib/security/rate-limiter";

/** Validate a reset link without consuming it (used by the reset form on load). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const match = await findUserByResetToken(token);

  if (!match) {
    return NextResponse.json(
      { success: false, error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, email: match.email });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ success: false, error: "Reset token is required." }, { status: 400 });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      return NextResponse.json({ success: false, error: strength.error }, { status: 400 });
    }

    const match = await findUserByResetToken(token);
    if (!match) {
      await writeAudit({
        action: "auth.password_reset.complete",
        status: "failure",
        metadata: { reason: "invalid_or_expired_token" },
        ip,
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json(
        { success: false, error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: match.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        // A successful reset also clears any lockout and ends the reset token.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await consumeResetToken(match.id);

    await writeAudit({
      action: "auth.password_reset.complete",
      actorId: match.id,
      actorEmail: match.email,
      actorRole: match.role,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been updated. You can sign in now.",
      email: match.email,
    });
  } catch (error) {
    console.error("[password reset] complete error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
