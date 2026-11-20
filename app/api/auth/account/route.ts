import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { deleteAuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/auth/roles";
import { verifyTotp, generateTotpSecret, buildOtpAuthUri } from "@/lib/auth/totp";
import { writeAudit } from "@/lib/auth/audit";
import { getClientIp } from "@/lib/security/rate-limiter";
import { requireCapability } from "@/lib/auth/middleware";

/**
 * Self-service account endpoints for the signed-in admin.
 *  GET  /api/auth/account                 → my profile + security state
 *  POST /api/auth/account  {action:...}   → change_password | enable_2fa | confirm_2fa | disable_2fa
 */

export async function GET(request: Request) {
  const gate = await requireCapability(request, "read");
  if (!gate.ok || !gate.user) return gate.response!;

  const user = await prisma.user.findUnique({
    where: { id: Number(gate.user.userId) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      totpEnabledAt: true,
      lastLoginAt: true,
      passwordChangedAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    account: { ...user, role: normalizeRole(user.role), twoFactorEnabled: Boolean(user.totpEnabledAt) },
  });
}

export async function POST(request: Request) {
  const gate = await requireCapability(request, "read");
  if (!gate.ok || !gate.user) return gate.response!;

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const userId = Number(gate.user.userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
    }

    switch (action) {
      case "change_password": {
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");

        if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
          await writeAudit({
            action: "auth.password_change",
            status: "failure",
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            metadata: { reason: "bad_current_password" },
            ip,
            userAgent,
          });
          return NextResponse.json(
            { success: false, error: "Your current password is incorrect." },
            { status: 400 }
          );
        }

        const strength = validatePasswordStrength(newPassword);
        if (!strength.ok) {
          return NextResponse.json({ success: false, error: strength.error }, { status: 400 });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: await hashPassword(newPassword),
            passwordChangedAt: new Date(),
            resetTokenHash: null,
            resetTokenExpiresAt: null,
          },
        });

        await writeAudit({
          action: "auth.password_change",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          ip,
          userAgent,
        });

        return NextResponse.json({ success: true, message: "Password updated." });
      }

      case "enable_2fa": {
        // Step 1 of enrolment: hand back a secret + otpauth URI, not yet active.
        if (user.totpEnabledAt) {
          return NextResponse.json(
            { success: false, error: "Two-factor authentication is already enabled." },
            { status: 400 }
          );
        }
        const secret = generateTotpSecret();
        await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
        return NextResponse.json({
          success: true,
          secret,
          otpauthUri: buildOtpAuthUri({ secret, email: user.email }),
          message: "Scan the QR code, then confirm with a 6-digit code.",
        });
      }

      case "confirm_2fa": {
        const code = String(body.code || "");
        if (!user.totpSecret) {
          return NextResponse.json(
            { success: false, error: "Start the 2FA setup first." },
            { status: 400 }
          );
        }
        if (!verifyTotp(user.totpSecret, code)) {
          return NextResponse.json({ success: false, error: "That code is not valid." }, { status: 400 });
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { totpEnabledAt: new Date() },
        });
        await writeAudit({
          action: "auth.2fa_enabled",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          ip,
          userAgent,
        });
        return NextResponse.json({ success: true, message: "Two-factor authentication enabled." });
      }

      case "disable_2fa": {
        const code = String(body.code || "");
        const password = String(body.password || "");
        if (!user.totpEnabledAt) {
          return NextResponse.json(
            { success: false, error: "Two-factor authentication is not enabled." },
            { status: 400 }
          );
        }
        const passwordOk =
          Boolean(user.passwordHash) && (await verifyPassword(password, user.passwordHash!));
        if (!passwordOk || !verifyTotp(user.totpSecret, code)) {
          return NextResponse.json(
            { success: false, error: "Password and a valid 6-digit code are both required." },
            { status: 400 }
          );
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { totpSecret: null, totpEnabledAt: null },
        });
        await writeAudit({
          action: "auth.2fa_disabled",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          ip,
          userAgent,
        });
        return NextResponse.json({ success: true, message: "Two-factor authentication disabled." });
      }

      case "sign_out_everywhere": {
        await deleteAuthSession();
        await writeAudit({
          action: "auth.logout_all",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          ip,
          userAgent,
        });
        return NextResponse.json({ success: true, message: "Signed out." });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action. Use change_password, enable_2fa, confirm_2fa or disable_2fa." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[auth/account] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
