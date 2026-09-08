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
      rotation_direction,
      default_rotation_interval,
      is_active,
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

    if (is_active) {
      await prisma.cubiconSequence.updateMany({
        data: { is_active: false },
      });
    }

    const parsedThreshold =
      pass_threshold !== undefined && pass_threshold !== null
        ? parseFloat(pass_threshold)
        : 0.66;

    const rotDir =
      (rotation_direction || "left").toLowerCase() === "right"
        ? "right"
        : "left";

    const rotInterval =
      default_rotation_interval !== undefined &&
      default_rotation_interval !== null
        ? parseInt(default_rotation_interval, 10)
        : 15;

    const newSequence = await prisma.cubiconSequence.create({
      data: {
        title: title.trim(),
        slug: cleanSlug,
        description: description ? description.trim() : "",
        pass_threshold: isNaN(parsedThreshold) ? 0.66 : parsedThreshold,
        rotation_direction: rotDir,
        default_rotation_interval: isNaN(rotInterval) ? 15 : rotInterval,
        is_active: Boolean(is_active),
        created_by: auth.user?.email || auth.user?.userId || "admin",
      },
    });

    if (Array.isArray(tasks) && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        await prisma.cubiconTask.create({
          data: {
            sequence_id: newSequence.id,
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

