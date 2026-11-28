import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createAuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/auth/roles";
import { verifyTotp } from "@/lib/auth/totp";
import { writeAudit } from "@/lib/auth/audit";
import { getClientIp } from "@/lib/security/rate-limiter";

/** Generic message for every credential failure, so accounts cannot be enumerated. */
const INVALID_CREDENTIALS = "Invalid email or password.";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function describeIp(request: Request): string {
  return getClientIp(request);
}

export async function POST(request: Request) {
  const ip = describeIp(request);
  const userAgent = request.headers.get("user-agent") || null;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const totp = typeof body.totp === "string" ? body.totp : undefined;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      await writeAudit({
        action: "auth.login",
        status: "failure",
        actorEmail: normalizedEmail,
        metadata: { reason: "unknown_account" },
        ip,
        userAgent,
      });
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS }, { status: 401 });
    }

    if (!user.isActive) {
      await writeAudit({
        action: "auth.login",
        status: "failure",
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        metadata: { reason: "inactive_account" },
        ip,
        userAgent,
      });
      return NextResponse.json(
        { success: false, error: "This account has been deactivated. Contact a super admin." },
        { status: 403 }
      );
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        },
        { status: 429 }
      );
    }

    // Accounts without a password can no longer be "claimed" by whoever types first:
    // they must go through the emailed reset link.
    if (!user.passwordHash) {
      await writeAudit({
        action: "auth.login",
        status: "failure",
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        metadata: { reason: "no_password_set" },
        ip,
        userAgent,
      });
      return NextResponse.json(
        {
          success: false,
          error: "This account has no password yet. Use 'Forgot password' to set one from your email.",
        },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null,
        },
      });

      await writeAudit({
        action: "auth.login",
        status: "failure",
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        metadata: { reason: "bad_password", attempts, locked: shouldLock },
        ip,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: shouldLock
            ? `Too many failed attempts. This account is locked for ${LOCKOUT_MINUTES} minutes.`
            : INVALID_CREDENTIALS,
        },
        { status: shouldLock ? 429 : 401 }
      );
    }

    // Second factor: required whenever the account has it enabled.
    if (user.totpEnabledAt) {
      if (!totp) {
        return NextResponse.json(
          {
            success: false,
            requires2fa: true,
            error: "Enter the 6-digit code from your authenticator app.",
          },
          { status: 401 }
        );
      }
      if (!verifyTotp(user.totpSecret, totp)) {
        await writeAudit({
          action: "auth.login.2fa",
          status: "failure",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          metadata: { reason: "bad_totp" },
          ip,
          userAgent,
        });
        return NextResponse.json(
          { success: false, requires2fa: true, error: "Invalid or expired 2FA code." },
          { status: 401 }
        );
      }
    }

    const role = normalizeRole(user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await createAuthSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    await writeAudit({
      action: "auth.login",
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      metadata: { twoFactor: Boolean(user.totpEnabledAt) },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        twoFactorEnabled: Boolean(user.totpEnabledAt),
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
