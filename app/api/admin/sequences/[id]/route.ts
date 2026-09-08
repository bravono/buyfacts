import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

export async function GET(
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
      include: {
        tasks: {
          orderBy: { taskIndex: "asc" },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: "Sequence not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, sequence });
  } catch (err: any) {
    console.error("[admin/sequences/:id GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch sequence", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const existing = await prisma.cubiconSequence.findUnique({
      where: { id: seqId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Sequence not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      pass_threshold,
      rotation_direction,
      default_rotation_interval,
      is_active,
      tasks,
    } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (slug !== undefined) updateData.slug = slug.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (pass_threshold !== undefined) {
      const parsed = parseFloat(pass_threshold);
      if (!isNaN(parsed)) updateData.pass_threshold = parsed;
    }
    if (rotation_direction !== undefined) {
      updateData.rotation_direction =
        (rotation_direction || "left").toLowerCase() === "right"
          ? "right"
          : "left";
    }
    if (default_rotation_interval !== undefined) {
      const parsed = parseInt(default_rotation_interval, 10);
      if (!isNaN(parsed)) updateData.default_rotation_interval = parsed;
    }

    if (is_active) {
      await prisma.cubiconSequence.updateMany({
        where: { id: { not: seqId } },
        data: { is_active: false },
      });
      updateData.is_active = true;
    } else if (is_active === false) {
      updateData.is_active = false;
    }

    await prisma.cubiconSequence.update({
      where: { id: seqId },
      data: updateData,
    });

    if (Array.isArray(tasks)) {
      await prisma.cubiconTask.deleteMany({
        where: { sequence_id: seqId },
      });

      const rotDir = updateData.rotation_direction || existing.rotation_direction || "left";
      const rotInterval = updateData.default_rotation_interval || existing.default_rotation_interval || 15;

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        await prisma.cubiconTask.create({
          data: {
            sequence_id: seqId,
            taskIndex: i,
            task_number: i + 1,
            heading: t.heading || `Task ${i + 1}`,
            description: t.description || "Solve the puzzle",
            screen: t.screen || "Active_front",
            image: t.image || "",
            rotation: t.rotation || rotDir,
            rotation_interval: t.rotation_interval || rotInterval,
            rotationInterval: t.rotationInterval || rotInterval,
            question_type: t.question_type || "Selection",
            correct_coordinates:
              typeof t.correct_coordinates === "string"
                ? t.correct_coordinates
                : JSON.stringify(t.correct_coordinates || ""),
            start_point:
              typeof t.start_point === "string"
                ? t.start_point
                : JSON.stringify(t.start_point || ""),
            mid_point:
              typeof t.mid_point === "string"
                ? t.mid_point
                : JSON.stringify(t.mid_point || ""),
            end_point:
              typeof t.end_point === "string"
                ? t.end_point
                : JSON.stringify(t.end_point || ""),
            tolerance:
              t.tolerance !== undefined && t.tolerance !== null
                ? parseFloat(t.tolerance)
                : 0.5,
            isFinal: i === tasks.length - 1,
          },
        });
      }
    }

    const updated = await prisma.cubiconSequence.findUnique({
      where: { id: seqId },
      include: { tasks: { orderBy: { taskIndex: "asc" } } },
    });

    return NextResponse.json({ success: true, sequence: updated });
  } catch (err: any) {
    console.error("[admin/sequences/:id PUT] Error:", err);
    return NextResponse.json(
      { error: "Failed to update sequence", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (sequence.slug === "default") {
      return NextResponse.json(
        { error: "Cannot delete default sequence." },
        { status: 400 }
      );
    }

    await prisma.cubiconTask.deleteMany({
      where: { sequence_id: seqId },
    });

    await prisma.cubiconSequence.delete({
      where: { id: seqId },
    });

    return NextResponse.json({
      success: true,
      message: "Sequence deleted successfully.",
    });
  } catch (err: any) {
    console.error("[admin/sequences/:id DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete sequence", details: err.message },
      { status: 500 }
    );
  }
}

