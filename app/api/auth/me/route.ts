import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session || !session.userId) {
      return NextResponse.json({
        success: false,
        authenticated: false,
      });
    }

    const userId = Number(session.userId);
    let user = null;

    if (!isNaN(userId)) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: user || {
        id: session.userId,
        email: session.email,
        name: session.name || null,
        role: session.role || "admin",
      },
    });
  } catch (error: unknown) {
    console.error("Auth check error:", error);
    return NextResponse.json({
      success: false,
      authenticated: false,
    });
  }
}
