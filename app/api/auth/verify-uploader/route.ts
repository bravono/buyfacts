import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createAuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/auth/roles";
import { writeAudit } from "@/lib/auth/audit";
import { getClientIp } from "@/lib/security/rate-limiter";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Name-based sign-in kept only for backwards compatibility with older clients.
 *
 * It no longer issues a session on its own: knowing a name is not proof of
 * identity. The password is now required, so this is equivalent to a normal
 * login and every attempt is audited.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || null;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.name || user.name.trim().toLowerCase() !== name.toLowerCase()) {
      await writeAudit({
        action: "auth.verify_uploader",
        status: "failure",
        actorEmail: email,
        metadata: { reason: "name_mismatch" },
        ip,
        userAgent,
      });
      return NextResponse.json(
        { error: "Unauthorized: User not found or details incorrect." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "This account has been deactivated." }, { status: 403 });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Account temporarily locked after failed sign-in attempts." },
        { status: 429 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error:
            "A password is required to sign in. Use the admin login form, or 'Forgot password' to set one.",
        },
        { status: 400 }
      );
    }

    const valid = Boolean(user.passwordHash) && (await verifyPassword(password, user.passwordHash!));

    if (!valid) {
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
        action: "auth.verify_uploader",
        status: "failure",
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        metadata: { reason: "bad_password", attempts, locked: shouldLock },
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
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
      action: "auth.verify_uploader",
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      user: { name: user.name, email: user.email, role },
    });
  } catch (error) {
    console.error("Error verifying uploader:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
