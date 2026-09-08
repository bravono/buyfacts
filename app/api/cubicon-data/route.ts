import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Cubicon 3D Task Definitions & Database Integration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

const DEFAULT_TASKS = [
  {
    taskIndex: 0,
    task_number: 1,
    heading: "Puzzle 1 of 3",
    description: "Who gets concerned by howling? (Draw a circle)",
    screen: "Active_front",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
    rotation: "left",
    rotationInterval: 15,
    question_type: "Selection",
    correct_coordinates: JSON.stringify([{ x: 0.15, y: 0.45, z: 1.0 }]),
    start_point: JSON.stringify({ x: 0.15, y: 0.45, z: 1.0 }),
    mid_point: "",
    end_point: "",
    tolerance: 0.5,
    isFinal: false,
  },
  {
    taskIndex: 1,
    task_number: 2,
    description: "Who's in line for a change of shirt? (click to choose)",
    heading: "Puzzle 2 of 3",
    screen: "Active_side_l",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
    rotation: "left",
    rotationInterval: 15,
    question_type: "Selection",
    correct_coordinates: JSON.stringify([{ x: -0.25, y: 0.30, z: 1.0 }]),
    start_point: JSON.stringify({ x: -0.25, y: 0.30, z: 1.0 }),
    mid_point: "",
    end_point: "",
    tolerance: 0.5,
    isFinal: false,
  },
  {
    taskIndex: 2,
    task_number: 3,
    heading: "Puzzle 3 of 3",
    description: "Where does his next go? (click to choose)",
    screen: "Active_back",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
    rotation: "left",
    rotationInterval: 15,
    question_type: "Anticipation",
    correct_coordinates: JSON.stringify({
      start: { x: -0.60, y: 0.10, z: 1.0 },
      mid: { x: 0.0, y: 0.35, z: 1.0 },
      end: { x: 0.60, y: 0.10, z: 1.0 },
    }),
    start_point: JSON.stringify({ x: -0.60, y: 0.10, z: 1.0 }),
    mid_point: JSON.stringify({ x: 0.0, y: 0.35, z: 1.0 }),
    end_point: JSON.stringify({ x: 0.60, y: 0.10, z: 1.0 }),
    tolerance: 0.5,
    isFinal: true,
  },
];

export function parseCoordinate(coord: any): { x: number; y: number; z: number } | null {
  if (!coord) return null;
  if (typeof coord === "object") {
    if (typeof coord.x === "number" && typeof coord.y === "number") {
      return { x: Number(coord.x), y: Number(coord.y), z: Number(coord.z || 0) };
    }
    if (Array.isArray(coord) && coord.length >= 2) {
      return { x: Number(coord[0]), y: Number(coord[1]), z: Number(coord[2] || 0) };
    }
  }
  if (typeof coord === "string") {
    const trimmed = coord.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return parseCoordinate(parsed);
    } catch {
      const parts = trimmed.split(",").map((p) => Number(p.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { x: parts[0], y: parts[1], z: parts[2] || 0 };
      }
    }
  }
  return null;
}

export function distance3D(p1: { x: number; y: number; z: number } | null, p2: { x: number; y: number; z: number } | null): number {
  if (!p1 || !p2) return Infinity;
  const dx = (p1.x || 0) - (p2.x || 0);
  const dy = (p1.y || 0) - (p2.y || 0);
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function parseClicksList(clicks: any): Array<{ x: number; y: number; z: number; t?: number }> {
  if (!clicks) return [];
  if (Array.isArray(clicks)) {
    return clicks
      .map((item) => {
        const pt = parseCoordinate(item);
        if (!pt) return null;
        return { ...pt, t: item.t || 0 };
      })
      .filter(Boolean) as Array<{ x: number; y: number; z: number; t?: number }>;
  }
  if (typeof clicks === "object") {
    const keys = Object.keys(clicks).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (clicks[a]?.t || 0) - (clicks[b]?.t || 0);
    });
    return keys
      .map((k) => {
        const item = clicks[k];
        const pt = parseCoordinate(item);
        if (!pt) return null;
        return { ...pt, t: item?.t || 0 };
      })
      .filter(Boolean) as Array<{ x: number; y: number; z: number; t?: number }>;
  }
  return [];
}

export function evaluateTaskAttempt(task: any, clicks: any): "p" | "f" {
  if (!task) return "p";

  const tolerance = typeof task.tolerance === "number" ? task.tolerance : 0.5;
  const clicksList = parseClicksList(clicks);

  let startPt = parseCoordinate(task.start_point);
  let midPt = parseCoordinate(task.mid_point);
  let endPt = parseCoordinate(task.end_point);

  let correctCoords: Array<{ x: number; y: number; z: number }> = [];
  if (task.correct_coordinates) {
    try {
      const parsed = typeof task.correct_coordinates === "string"
        ? JSON.parse(task.correct_coordinates)
        : task.correct_coordinates;
      if (Array.isArray(parsed)) {
        correctCoords = parsed.map(parseCoordinate).filter(Boolean) as any;
      } else if (typeof parsed === "object" && parsed !== null) {
        if (parsed.start && !startPt) startPt = parseCoordinate(parsed.start);
        if (parsed.mid && !midPt) midPt = parseCoordinate(parsed.mid);
        if (parsed.end && !endPt) endPt = parseCoordinate(parsed.end);
      }
    } catch {}
  }

  const isDragOrSequence = Boolean(
    (startPt && (midPt || endPt)) ||
    (task.question_type && ["anticipation", "drag"].includes(task.question_type.toLowerCase()))
  );

  if (isDragOrSequence && (startPt || midPt || endPt)) {
    if (clicksList.length === 0) return "f";

    const requiredWaypoints: Array<{ x: number; y: number; z: number }> = [];
    if (startPt) requiredWaypoints.push(startPt);
    if (midPt) requiredWaypoints.push(midPt);
    if (endPt) requiredWaypoints.push(endPt);

    let currentIndex = 0;
    for (const waypoint of requiredWaypoints) {
      let matchedIndex = -1;
      for (let i = currentIndex; i < clicksList.length; i++) {
        if (distance3D(clicksList[i], waypoint) <= tolerance) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex === -1) {
        return "f";
      }
      currentIndex = matchedIndex + 1;
    }
    return "p";
  }

  const targetPoints: Array<{ x: number; y: number; z: number }> = [];
  if (startPt) targetPoints.push(startPt);
  if (correctCoords.length > 0) targetPoints.push(...correctCoords);

  if (targetPoints.length > 0) {
    if (clicksList.length === 0) return "f";
    const hasMatch = clicksList.some((click) =>
      targetPoints.some((target) => distance3D(click, target) <= tolerance)
    );
    return hasMatch ? "p" : "f";
  }

  return "p";
}

async function ensureSeedTasks() {
  // 1. Ensure default sequence exists
  let defaultSeq = await prisma.cubiconSequence.findFirst({
    where: { slug: "default" },
  });

  if (!defaultSeq) {
    defaultSeq = await prisma.cubiconSequence.create({
      data: {
        slug: "default",
        title: "Default Verification Challenge",
        description: "Standard anti-bot human verification puzzle sequence",
        pass_threshold: 0.66,
        rotation_direction: "left",
        default_rotation_interval: 15,
        is_active: true,
        created_by: "system",
      },
    });
  }

  const count = await prisma.cubiconTask.count();
  if (count === 0) {
    for (const item of DEFAULT_TASKS) {
      await prisma.cubiconTask.create({
        data: {
          ...item,
          sequence_id: defaultSeq.id,
        },
      });
    }
  } else {
    // Ensure existing tasks are attached to default sequence
    await prisma.cubiconTask.updateMany({
      where: { sequence_id: null },
      data: { sequence_id: defaultSeq.id },
    });
  }
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapRotationDirection(dir: string): string {
  const norm = (dir || "left").toLowerCase();
  if (norm === "left") return "right";
  if (norm === "right") return "left";
  return dir;
}

function formatImageUrl(imagePath: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  if (cleanPath.startsWith("/arts/")) {
    return `/cubicon-app${cleanPath}`;
  }
  return `${BASE_URL}${cleanPath}`;
}

export async function GET(request: Request) {
  try {
    await ensureSeedTasks();
    const url = new URL(request.url);
    const seqSlug = url.searchParams.get("sequence") || url.searchParams.get("seq");
    const seqIdParam = url.searchParams.get("sequenceId");

    let sequence = null;
    if (seqIdParam) {
      sequence = await prisma.cubiconSequence.findUnique({
        where: { id: Number(seqIdParam) },
        include: { tasks: { orderBy: { taskIndex: "asc" } } },
      });
    } else if (seqSlug) {
      sequence = await prisma.cubiconSequence.findUnique({
        where: { slug: seqSlug },
        include: { tasks: { orderBy: { taskIndex: "asc" } } },
      });
    }

    if (!sequence) {
      sequence = await prisma.cubiconSequence.findFirst({
        where: { is_active: true },
        include: { tasks: { orderBy: { taskIndex: "asc" } } },
      });
    }

    const tasks = sequence?.tasks?.length
      ? sequence.tasks
      : await prisma.cubiconTask.findMany({ orderBy: { taskIndex: "asc" } });

    return NextResponse.json({ sequence, tasks }, corsHeaders());
  } catch (err: any) {
    console.error("[cubicon-data] GET Error:", err);
    return NextResponse.json({ error: "Failed to fetch tasks", details: err.message }, { status: 500, ...corsHeaders() });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeedTasks();

    const text = await request.text();
    let parsed: Record<string, any> = {};
    if (text) {
      try {
        if (text.startsWith("data=")) {
          let raw = text.slice(5);
          const ampIdx = raw.indexOf("&");
          if (ampIdx !== -1) {
            raw = raw.substring(0, ampIdx);
          }
          const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
          parsed = JSON.parse(decoded);
        } else {
          parsed = JSON.parse(text);
        }
      } catch {
        try {
          const params = new URLSearchParams(text);
          const dataVal = params.get("data");
          if (dataVal) {
            parsed = JSON.parse(dataVal);
          }
        } catch {
          console.warn("[cubicon-data] Could not parse request body:", text);
        }
      }
    }

    const requestedSequenceSlug = parsed.sequence || parsed.sequenceSlug || null;
    const requestedSequenceId = parsed.sequenceId ? Number(parsed.sequenceId) : null;

    // 1. Resolve requested or active default sequence
    let currentSequence = null;
    if (requestedSequenceId) {
      currentSequence = await prisma.cubiconSequence.findUnique({
        where: { id: requestedSequenceId },
      });
    } else if (requestedSequenceSlug) {
      currentSequence = await prisma.cubiconSequence.findUnique({
        where: { slug: requestedSequenceSlug },
      });
    }

    if (!currentSequence) {
      currentSequence = await prisma.cubiconSequence.findFirst({
        where: { is_active: true },
      });
    }

    if (!currentSequence) {
      currentSequence = await prisma.cubiconSequence.findFirst();
    }

    const seqId = currentSequence?.id || null;
    const seqRotationDir = currentSequence?.rotation_direction || "left";
    const seqDefaultInterval = currentSequence?.default_rotation_interval || 15;
    const seqThreshold = currentSequence?.pass_threshold !== null && currentSequence?.pass_threshold !== undefined
      ? currentSequence.pass_threshold
      : 0.66;

    // Fetch tasks for this sequence (or fallback)
    let sequenceTasks = seqId
      ? await prisma.cubiconTask.findMany({
          where: { sequence_id: seqId },
          orderBy: { taskIndex: "asc" },
        })
      : [];

    if (sequenceTasks.length === 0) {
      sequenceTasks = await prisma.cubiconTask.findMany({
        orderBy: { taskIndex: "asc" },
      });
    }

    const fallbackTasks = sequenceTasks.length > 0 ? sequenceTasks : DEFAULT_TASKS;
    const totalTasks = fallbackTasks.length;

    // Helper for evaluating whether sequence passed threshold
    const evaluateSequencePass = (passedCount: number, total: number): boolean => {
      if (total <= 0) return true;
      if (seqThreshold > 1) {
        return passedCount >= seqThreshold;
      }
      const ratio = passedCount / total;
      return ratio >= (seqThreshold - 0.0001);
    };

    const isInit = parsed.task === "init" || !parsed.sessionId;
    const providedUserEmail = parsed.userEmail ? String(parsed.userEmail).trim() : "";

    if (isInit) {
      const sessionId = generateSessionId();
      await prisma.cubiconSession.create({
        data: {
          session_id: sessionId,
          sequence_id: seqId,
          taskIndex: -1,
          user_email: providedUserEmail,
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      return NextResponse.json(
        {
          sessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Welcome to Cubicon",
          ofTasks: totalTasks,
          heading: "Welcome to Cubicon",
          description: "Press Start to begin your puzzle.",
          screen: "Active_front",
          image: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
          rotation: [0, 0, 0],
          rotationInterval: 0,
          rotationDirection: mapRotationDirection(seqRotationDir),
          redirectUrl: "",
          result: null,
        },
        corsHeaders()
      );
    }

    const sessionId = String(parsed.sessionId ?? "");
    let session = await prisma.cubiconSession.findUnique({
      where: { session_id: sessionId },
    });

    if (!session) {
      const newSessionId = generateSessionId();
      session = await prisma.cubiconSession.create({
        data: {
          session_id: newSessionId,
          sequence_id: seqId,
          taskIndex: 0,
          user_email: providedUserEmail,
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      const puzzle = fallbackTasks[0];
      return NextResponse.json({
        sessionId: newSessionId,
        sequenceId: seqId,
        sequenceTitle: currentSequence?.title || "Cubicon Challenge",
        ofTasks: totalTasks,
        task: puzzle.taskIndex + 1,
        heading: puzzle.heading,
        description: puzzle.description,
        screen: puzzle.screen || "Active_front",
        image: formatImageUrl(puzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: puzzle.rotationInterval || seqDefaultInterval,
        rotationDirection: mapRotationDirection(puzzle.rotation || seqRotationDir),
        isFinal: totalTasks === 1,
        redirectUrl: "",
        result: null,
      }, corsHeaders());
    }

    // Evaluate current task attempt against correct coordinates
    const currentTaskIndex = session.taskIndex >= 0 ? session.taskIndex : 0;
    const currentTask = fallbackTasks[currentTaskIndex] || fallbackTasks[0];
    const rawClicks = parsed.clicks || parsed.clickData || {};
    const attemptResult: "p" | "f" = evaluateTaskAttempt(currentTask, rawClicks);

    // Record attempt log in cubicon_attempts table
    try {
      await prisma.cubiconAttempt.create({
        data: {
          session_id: sessionId,
          sequence_id: seqId || session.sequence_id || undefined,
          taskIndex: currentTaskIndex,
          user_email: session.user_email || providedUserEmail,
          clicks_data: JSON.stringify(rawClicks),
          start_time: parsed.startTime ? String(parsed.startTime) : null,
          result: attemptResult,
        },
      });
    } catch (attemptErr) {
      console.warn("[cubicon-data] Failed to log attempt:", attemptErr);
    }

    const nextIndex = session.taskIndex + 1;
    const isPassed = attemptResult === "p";
    const newPassedCount = session.passedPuzzles + (isPassed ? 1 : 0);

    await prisma.cubiconSession.update({
      where: { id: session.id },
      data: {
        taskIndex: nextIndex,
        totalPuzzlesAttempted: session.totalPuzzlesAttempted + 1,
        passedPuzzles: newPassedCount,
        previous_result: attemptResult,
      },
    });

    if (nextIndex >= totalTasks) {
      const lastPuzzle = fallbackTasks[totalTasks - 1];
      const overallPassed = evaluateSequencePass(newPassedCount, totalTasks);

      return NextResponse.json({
        sessionId,
        sequenceId: seqId,
        sequenceTitle: currentSequence?.title || "Cubicon Challenge",
        ofTasks: totalTasks,
        task: totalTasks,
        heading: overallPassed ? "Congratulations You're Human!" : "Verification Incomplete",
        description: overallPassed
          ? "You have completed all tasks successfully."
          : "Verification completed with review required.",
        screen: lastPuzzle.screen || "Active_back",
        image: formatImageUrl(lastPuzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: 0.1,
        rotationDirection: mapRotationDirection(lastPuzzle.rotation || seqRotationDir),
        isFinal: true,
        completed: true,
        score: newPassedCount,
        threshold: seqThreshold,
        passed: overallPassed,
        redirectUrl: "",
        result: attemptResult,
      }, corsHeaders());
    }

    const puzzle = fallbackTasks[nextIndex];
    return NextResponse.json({
      sessionId,
      sequenceId: seqId,
      sequenceTitle: currentSequence?.title || "Cubicon Challenge",
      ofTasks: totalTasks,
      task: puzzle.taskIndex + 1,
      heading: puzzle.heading,
      description: puzzle.description,
      screen: puzzle.screen || "Active_front",
      image: formatImageUrl(puzzle.image),
      rotation: [0, 0, 0],
      rotationInterval: puzzle.isFinal ? 0 : (puzzle.rotationInterval || seqDefaultInterval),
      rotationDirection: mapRotationDirection(puzzle.rotation || seqRotationDir),
      isFinal: nextIndex === totalTasks - 1,
      redirectUrl: "",
      result: attemptResult,
    }, corsHeaders());
  } catch (err) {
    console.error("[cubicon-data] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, ...corsHeaders() });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders().headers });
}

function corsHeaders() {
  return {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
}

