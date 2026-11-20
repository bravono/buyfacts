import { NextResponse } from "next/server";
import { signJWT } from "@/lib/auth/jwt";
import { requireCapability } from "@/lib/auth/middleware";
import { normalizeRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/auth/audit";

/**
 * Issues a short-lived bearer token for the signed-in admin.
 *
 * This endpoint used to mint tokens for anyone who asked (including guests),
 * which bypassed login entirely. It now requires a valid session, and the
 * token carries the account's real role read from the database.
 */
export async function POST(request: Request) {
  const gate = await requireCapability(request, "read");
  if (!gate.ok || !gate.user) return gate.response!;

  try {
    const userId = Number(gate.user.userId);
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!account || !account.isActive) {
      return NextResponse.json({ success: false, error: "Account not available." }, { status: 401 });
    }

    const role = normalizeRole(account.role);
    const token = await signJWT(
      { userId: String(account.id), email: account.email, role },
      undefined,
      60 * 60 // 1 hour
    );

    await writeAudit({
      action: "auth.token.issue",
      actorId: account.id,
      actorEmail: account.email,
      actorRole: role,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      token,
      user: { userId: String(account.id), email: account.email, role },
      expiresInSeconds: 3600,
    });
  } catch (error: unknown) {
    console.error("[auth/token] error:", error);
    return NextResponse.json({ success: false, error: "Failed to issue token" }, { status: 500 });
  }
}
