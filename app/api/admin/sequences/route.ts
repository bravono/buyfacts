import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";

export async function GET(request: Request) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const sequences = await prisma.cubiconSequence.findMany({
      include: {
        tasks: {
          orderBy: { taskIndex: "asc" },
        },
        _count: {
          select: { attempts: true, sessions: true },
        },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ success: true, sequences });
  } catch (err: any) {
    console.error("[admin/sequences GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch sequences", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || "Authentication required." },
        { status: 401 }
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

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Sequence title is required." },
        { status: 400 }
      );
    }

    const cleanSlug = (
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    ).trim();

    const existing = await prisma.cubiconSequence.findUnique({
      where: { slug: cleanSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A sequence with slug '${cleanSlug}' already exists.` },
        { status: 409 }
      );
    }

    const rawIsActive = isActive !== undefined ? isActive : is_active;
    if (rawIsActive) {
      await prisma.cubiconSequence.updateMany({
        data: { isActive: false },
      });
    }

    const rawThreshold = passThreshold !== undefined ? passThreshold : pass_threshold;
    const parsedThreshold =
      rawThreshold !== undefined && rawThreshold !== null
        ? parseFloat(rawThreshold)
        : 0.66;

    const rawRotDir = rotationDirection !== undefined ? rotationDirection : rotation_direction;
    const rotDir =
      (rawRotDir || "left").toLowerCase() === "right"
        ? "right"
        : "left";

    const rawInterval = defaultRotationInterval !== undefined ? defaultRotationInterval : default_rotation_interval;
    const rotInterval =
      rawInterval !== undefined &&
      rawInterval !== null
        ? parseInt(rawInterval, 10)
        : 15;

    const newSequence = await prisma.cubiconSequence.create({
      data: {
        title: title.trim(),
        slug: cleanSlug,
        description: description ? description.trim() : "",
        passThreshold: isNaN(parsedThreshold) ? 0.66 : parsedThreshold,
        rotationDirection: rotDir,
        defaultRotationInterval: isNaN(rotInterval) ? 15 : rotInterval,
        isActive: Boolean(rawIsActive),
        createdBy: auth.user?.email || auth.user?.userId || "admin",
      },
    });

    if (Array.isArray(tasks) && tasks.length > 0) {
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
            sequenceId: newSequence.id,
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

    const created = await prisma.cubiconSequence.findUnique({
      where: { id: newSequence.id },
      include: { tasks: { orderBy: { taskIndex: "asc" } } },
    });

    return NextResponse.json({ success: true, sequence: created }, { status: 201 });
  } catch (err: any) {
    console.error("[admin/sequences POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to create sequence", details: err.message },
      { status: 500 }
    );
  }
}

