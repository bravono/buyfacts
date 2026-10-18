import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const seqId = parseInt(id, 10);
    if (isNaN(seqId)) {
      return NextResponse.json(
        { error: "Invalid sequence ID." },
        { status: 400 }
      );
    }

    const sequence = await prisma.cubiconSequence.findUnique({
      where: { id: seqId },
    });
    if (!sequence) {
      return NextResponse.json(
        { error: "Sequence not found." },
        { status: 404 }
      );
    }

    let targetActive = true;
    try {
      const body = await request.json();
      if (typeof body.isActive === "boolean") {
        targetActive = body.isActive;
      }
    } catch {}

    // Activate or update selected sequence in the active pool
    const activated = await prisma.cubiconSequence.update({
      where: { id: seqId },
      data: { isActive: targetActive },
      include: { tasks: { orderBy: { taskIndex: "asc" } } },
    });

    return NextResponse.json({
      success: true,
      message: `Sequence '${activated.title}' ${targetActive ? "activated" : "deactivated"} in random selection pool.`,
      sequence: activated,
    });
  } catch (err: any) {
    console.error("[admin/sequences/:id/activate POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to activate sequence", details: err.message },
      { status: 500 }
    );
  }
}

