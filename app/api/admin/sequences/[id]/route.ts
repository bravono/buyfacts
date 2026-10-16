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
      passThreshold,
      rotation_direction,
      rotationDirection,
      default_rotation_interval,
      defaultRotationInterval,
      is_active,
      isActive,
      tasks,
    } = body;

    const rawThreshold = passThreshold !== undefined ? passThreshold : pass_threshold;
    const rawRotDir = rotationDirection !== undefined ? rotationDirection : rotation_direction;
    const rawInterval = defaultRotationInterval !== undefined ? defaultRotationInterval : default_rotation_interval;
    const rawIsActive = isActive !== undefined ? isActive : is_active;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (slug !== undefined) updateData.slug = slug.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (rawThreshold !== undefined) {
      const parsed = parseFloat(rawThreshold);
      if (!isNaN(parsed)) updateData.passThreshold = parsed;
    }
    if (rawRotDir !== undefined) {
      updateData.rotationDirection =
        (rawRotDir || "left").toLowerCase() === "right"
          ? "right"
          : "left";
    }
    if (rawInterval !== undefined) {
      const parsed = parseInt(rawInterval, 10);
      if (!isNaN(parsed)) updateData.defaultRotationInterval = parsed;
    }

    if (rawIsActive === true) {
      await prisma.cubiconSequence.updateMany({
        where: { id: { not: seqId } },
        data: { isActive: false },
      });
      updateData.isActive = true;
    } else if (rawIsActive === false) {
      updateData.isActive = false;
    }

    await prisma.cubiconSequence.update({
      where: { id: seqId },
      data: updateData,
    });

    if (Array.isArray(tasks)) {
      await prisma.cubiconTask.deleteMany({
        where: { sequenceId: seqId },
      });

      const rotDir = updateData.rotationDirection || existing.rotationDirection || "left";
      const rotInterval = updateData.defaultRotationInterval || existing.defaultRotationInterval || 15;

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const taskCoords = t.correctCoordinates !== undefined ? t.correctCoordinates : t.correct_coordinates;
        const taskStart = t.startPoint !== undefined ? t.startPoint : t.start_point;
        const taskMid = t.midPoint !== undefined ? t.midPoint : t.mid_point;
        const taskEnd = t.endPoint !== undefined ? t.endPoint : t.end_point;
        const taskRotInterval = t.rotationInterval || t.rotation_interval || rotInterval;
        const taskQuestionType = t.questionType || t.question_type || "Selection";
        const taskNum = t.taskNumber || t.task_number || i + 1;

        await prisma.cubiconTask.create({
          data: {
            sequenceId: seqId,
            taskIndex: i,
            taskNumber: taskNum,
            heading: t.heading || `Task ${i + 1}`,
            description: t.description || "Solve the puzzle",
            screen: t.screen || "Active_front",
            image: t.image || "",
            rotation: t.rotation || rotDir,
            rotationInterval: taskRotInterval,
            questionType: taskQuestionType,
            correctCoordinates:
              typeof taskCoords === "string"
                ? taskCoords
                : JSON.stringify(taskCoords || ""),
            startPoint:
              typeof taskStart === "string"
                ? taskStart
                : JSON.stringify(taskStart || ""),
            midPoint:
              typeof taskMid === "string"
                ? taskMid
                : JSON.stringify(taskMid || ""),
            endPoint:
              typeof taskEnd === "string"
                ? taskEnd
                : JSON.stringify(taskEnd || ""),
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
      where: { sequenceId: seqId },
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

