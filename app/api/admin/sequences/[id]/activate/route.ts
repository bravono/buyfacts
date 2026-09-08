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

    // Set all sequences is_active to false
    await prisma.cubiconSequence.updateMany({
      data: { is_active: false },
    });

    // Activate selected sequence
    const activated = await prisma.cubiconSequence.update({
      where: { id: seqId },
      data: { is_active: true },
      include: { tasks: { orderBy: { taskIndex: "asc" } } },
    });

    return NextResponse.json({
      success: true,
      message: `Sequence '${activated.title}' activated as default challenge.`,
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

