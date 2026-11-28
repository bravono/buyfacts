import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { normalizeRole, ROLES, isRole } from "@/lib/auth/roles";
import { countActiveSuperAdmins, writeAudit } from "@/lib/auth/audit";
import { requireCapability } from "@/lib/auth/middleware";
import { getClientIp } from "@/lib/security/rate-limiter";

/**
 * Administrator account management.
 *
 *  GET  /api/admin/users        → list admin accounts (super_admin only)
 *  POST /api/admin/users        → create an account (super_admin only)
 *
 * Only a super admin can create accounts or hand out the super_admin role.
 * Nobody can delete an account through this API: accounts are deactivated,
 * and the last active super admin can never be demoted or deactivated.
 */

export async function GET(request: Request) {
  const gate = await requireCapability(request, "manage_super_admins");
  if (!gate.ok) return gate.response!;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      totpEnabledAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    users: users.map((u) => ({
      ...u,
      role: normalizeRole(u.role),
      twoFactorEnabled: Boolean(u.totpEnabledAt),
      totpEnabledAt: undefined,
    })),
    activeSuperAdmins: await countActiveSuperAdmins(),
  });
}

export async function POST(request: Request) {
  const gate = await requireCapability(request, "manage_super_admins");
  if (!gate.ok || !gate.user) return gate.response!;

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const roleInput = String(body.role || "admin");
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, error: "A full name is required." }, { status: 400 });
    }
    if (!isRole(roleInput)) {
      return NextResponse.json(
        { success: false, error: `Role must be one of: ${ROLES.join(", ")}.` },
        { status: 400 }
      );
    }
    const role = normalizeRole(roleInput);

    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      return NextResponse.json({ success: false, error: strength.error }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const created = await prisma.user.create({
      data: {
        email,
        name,
        role,
        passwordHash: await hashPassword(password),
        passwordChangedAt: new Date(),
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await writeAudit({
      action: "user.create",
      actorId: gate.user.userId,
      actorEmail: gate.user.email,
      actorRole: gate.user.role,
      target: "user",
      targetId: created.id,
      metadata: { email, role },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `${role === "super_admin" ? "Super admin" : "Admin"} account created. Share the password with them over a secure channel and ask them to change it on first sign-in.`,
      user: created,
    });
  } catch (error) {
    console.error("[admin/users] create error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
