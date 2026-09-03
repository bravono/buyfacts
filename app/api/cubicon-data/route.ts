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
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447281907-vjuvjj-Puzzle1.png",
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
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447293717-oyaqga-Puzzle2.png",
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
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447294428-ijvkcq-Puzzle3.png",
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
  const count = await prisma.cubiconTask.count();
  if (count === 0) {
    for (const item of DEFAULT_TASKS) {
      await prisma.cubiconTask.create({ data: item });
    }
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

export async function GET() {
  try {
    await ensureSeedTasks();
    const tasks = await prisma.cubiconTask.findMany({
      orderBy: { taskIndex: "asc" },
    });
    return NextResponse.json({ tasks }, corsHeaders());
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

    const isInit = parsed.task === "init" || !parsed.sessionId;
    const providedUserEmail = parsed.userEmail ? String(parsed.userEmail).trim() : "";
    const allTasks = await prisma.cubiconTask.findMany({
      orderBy: { taskIndex: "asc" },
    });

    const fallbackTasks = allTasks.length > 0 ? allTasks : DEFAULT_TASKS;

    if (isInit) {
      const sessionId = generateSessionId();
      await prisma.cubiconSession.create({
        data: {
          session_id: sessionId,
          taskIndex: -1,
          user_email: providedUserEmail,
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      return NextResponse.json(
        {
          sessionId,
          ofTasks: fallbackTasks.length,
          heading: "Welcome to Cubicon",
          description: "Press Start to begin your puzzle.",
          screen: "Active_front",
          image: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
          rotation: [0, 0, 0],
          rotationInterval: 0,
          rotationDirection: "left",
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
          taskIndex: 0,
          user_email: providedUserEmail,
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      const puzzle = fallbackTasks[0];
      return NextResponse.json({
        sessionId: newSessionId,
        ofTasks: fallbackTasks.length,
        task: puzzle.taskIndex + 1,
        heading: puzzle.heading,
        description: puzzle.description,
        screen: puzzle.screen || "Active_front",
        image: formatImageUrl(puzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: puzzle.rotationInterval || 15,
        rotationDirection: mapRotationDirection(puzzle.rotation || "left"),
        isFinal: puzzle.isFinal,
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
    await prisma.cubiconSession.update({
      where: { id: session.id },
      data: {
        taskIndex: nextIndex,
        totalPuzzlesAttempted: session.totalPuzzlesAttempted + 1,
        passedPuzzles: session.passedPuzzles + (isPassed ? 1 : 0),
        previous_result: attemptResult,
      },
    });

    if (nextIndex >= fallbackTasks.length) {
      const lastPuzzle = fallbackTasks[fallbackTasks.length - 1];
      const overallPassed = isPassed;

      return NextResponse.json({
        sessionId,
        ofTasks: fallbackTasks.length,
        task: fallbackTasks.length,
        heading: isPassed ? "Congratulations You're Human!" : "Verification Incomplete",
        description: isPassed ? "Verification completed successfully." : "Some points were missed. Please try again.",
        screen: lastPuzzle.screen || "Active_back",
        image: formatImageUrl(lastPuzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: 0.1,
        rotationDirection: mapRotationDirection(lastPuzzle.rotation || "left"),
        isFinal: true,
        completed: true,
        score: isPassed ? 1.0 : 0.0,
        passed: overallPassed,
        redirectUrl: "",
        result: attemptResult,
      }, corsHeaders());
    }

    const puzzle = fallbackTasks[nextIndex];
    return NextResponse.json({
      sessionId,
      ofTasks: fallbackTasks.length,
      task: puzzle.taskIndex + 1,
      heading: puzzle.heading,
      description: puzzle.description,
      screen: puzzle.screen || "Active_front",
      image: formatImageUrl(puzzle.image),
      rotation: [0, 0, 0],
      rotationInterval: puzzle.isFinal ? 0 : (puzzle.rotationInterval || 15),
      rotationDirection: mapRotationDirection(puzzle.rotation || "left"),
      isFinal: puzzle.isFinal,
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

