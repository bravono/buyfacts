import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/auth/roles";

/**
 * Who am I? Reads the role from the database on every call so a demotion or
 * deactivation takes effect immediately rather than when the token expires.
 */
export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session || !session.userId) {
      return NextResponse.json({ success: false, authenticated: false });
    }

    const userId = Number(session.userId);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ success: false, authenticated: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, authenticated: false });
    }

    const role = normalizeRole(user.role);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        twoFactorEnabled: Boolean(user.totpEnabledAt),
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Auth check error:", error);
    return NextResponse.json({ success: false, authenticated: false });
  }
}
