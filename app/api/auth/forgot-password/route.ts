import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/auth/reset-token";
import { sendPasswordResetEmail } from "@/lib/resend";
import { writeAudit } from "@/lib/auth/audit";
import { checkRateLimitAsync, getClientIp } from "@/lib/security/rate-limiter";

/**
 * Always answers the same way, whether or not the address belongs to an account,
 * so this endpoint cannot be used to enumerate administrators.
 */
const GENERIC_RESPONSE = {
  success: true,
  message:
    "If that address belongs to an administrator account, a reset link is on its way. Check your inbox.",
};

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const limit = await checkRateLimitAsync(ip, "password_reset");
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many reset requests. Try again in ${Math.ceil(limit.resetSeconds / 60)} minute(s).`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      await writeAudit({
        action: "auth.password_reset.request",
        status: "failure",
        actorEmail: email,
        metadata: { reason: user ? "inactive_account" : "unknown_account" },
        ip,
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { token } = await issueResetToken(user.id);

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        token,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (mailErr) {
      console.error("[password reset] Failed to send reset email:", mailErr);
      return NextResponse.json(
        {
          success: false,
          error: "We could not send the reset email right now. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    await writeAudit({
      action: "auth.password_reset.request",
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[password reset] request error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
