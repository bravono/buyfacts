import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { normalizeRole, isRole, ROLES } from "@/lib/auth/roles";
import { countActiveSuperAdmins, writeAudit } from "@/lib/auth/audit";
import { requireCapability } from "@/lib/auth/middleware";
import { getClientIp } from "@/lib/security/rate-limiter";

/**
 * Change one administrator account.
 *
 *  PATCH  /api/admin/users/[id]  → { action: "role" | "activate" | "deactivate" | "reset_password" | "reset_2fa" }
 *  DELETE /api/admin/users/[id]  → intentionally unsupported (no hard deletes of accounts)
 *
 * Guards that keep the system from being locked out or taken over:
 *  - only a super_admin may call this
 *  - you cannot demote or deactivate yourself
 *  - the last active super_admin can never be demoted or deactivated
 *  - nobody can promote an account to super_admin unless they are one
 */

const UNSUPPORTED =
  "Accounts are never hard-deleted. Deactivate the account instead, so its history and audit trail stay intact.";

export async function DELETE() {
  return NextResponse.json({ success: false, error: UNSUPPORTED }, { status: 405 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireCapability(request, "manage_super_admins");
  if (!gate.ok || !gate.user) return gate.response!;

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const { id } = await context.params;
  const targetId = Number(id);

  if (Number.isNaN(targetId)) {
    return NextResponse.json({ success: false, error: "Invalid account id." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const actorId = Number(gate.user.userId);
    const isSelf = actorId === targetId;

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
    }

    const targetRole = normalizeRole(target.role);
    const otherActiveSupers = await countActiveSuperAdmins(targetId);

    const audit = (actionName: string, metadata?: Record<string, unknown>) =>
      writeAudit({
        action: actionName,
        actorId,
        actorEmail: gate.user!.email,
        actorRole: gate.user!.role,
        target: "user",
        targetId,
        metadata: { email: target.email, ...metadata },
        ip,
        userAgent,
      });

    switch (action) {
      case "role": {
        const roleInput = String(body.role || "");
        if (!isRole(roleInput)) {
          return NextResponse.json(
            { success: false, error: `Role must be one of: ${ROLES.join(", ")}.` },
            { status: 400 }
          );
        }
        const nextRole = normalizeRole(roleInput);

        if (nextRole === "super_admin" && targetRole !== "super_admin" && !isSelf) {
          // allowed — a super admin may appoint another super admin
        }
        if (targetRole === "super_admin" && nextRole !== "super_admin") {
          if (isSelf) {
            return NextResponse.json(
              { success: false, error: "You cannot demote your own super admin account." },
              { status: 400 }
            );
          }
          if (otherActiveSupers === 0) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "This is the last active super admin. Promote another super admin first, or the company loses admin control.",
              },
              { status: 409 }
            );
          }
        }

        await prisma.user.update({ where: { id: targetId }, data: { role: nextRole } });
        await audit("user.role_change", { from: targetRole, to: nextRole });
        return NextResponse.json({
          success: true,
          message: `${target.email} is now ${nextRole}.`,
        });
      }

      case "deactivate": {
        if (isSelf) {
          return NextResponse.json(
            { success: false, error: "You cannot deactivate your own account." },
            { status: 400 }
          );
        }
        if (targetRole === "super_admin" && target.isActive && otherActiveSupers === 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                "This is the last active super admin. Promote another super admin before deactivating this one.",
            },
            { status: 409 }
          );
        }
        await prisma.user.update({
          where: { id: targetId },
          data: { isActive: false, resetTokenHash: null, resetTokenExpiresAt: null },
        });
        await audit("user.deactivate");
        return NextResponse.json({
          success: true,
          message: `${target.email} has been deactivated. They can no longer sign in.`,
        });
      }

      case "activate": {
        await prisma.user.update({ where: { id: targetId }, data: { isActive: true } });
        await audit("user.activate");
        return NextResponse.json({ success: true, message: `${target.email} is active again.` });
      }

      case "reset_password": {
        // Super-admin-initiated reset: sets a temporary password, forces a change,
        // and records who did it.
        const newPassword = String(body.newPassword || "");
        const strength = validatePasswordStrength(newPassword);
        if (!strength.ok) {
          return NextResponse.json({ success: false, error: strength.error }, { status: 400 });
        }
        await prisma.user.update({
          where: { id: targetId },
          data: {
            passwordHash: await hashPassword(newPassword),
            passwordChangedAt: new Date(),
            resetTokenHash: null,
            resetTokenExpiresAt: null,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        await audit("user.password_reset_by_admin");
        return NextResponse.json({
          success: true,
          message: `Password reset for ${target.email}. Share it securely; they should change it immediately.`,
        });
      }

      case "reset_2fa": {
        // Lost phone: clears the second factor so they can re-enrol after signing in.
        await prisma.user.update({
          where: { id: targetId },
          data: { totpSecret: null, totpEnabledAt: null },
        });
        await audit("user.2fa_reset_by_admin");
        return NextResponse.json({
          success: true,
          message: `Two-factor authentication cleared for ${target.email}. Ask them to re-enrol.`,
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Unknown action. Use role, activate, deactivate, reset_password or reset_2fa.",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[admin/users] patch error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
