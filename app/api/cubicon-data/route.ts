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
    image: "/cubicon-app/arts/Puzzle1.png",
    rotation: "left",
    rotationInterval: 15,
    question_type: "Selection",
    isFinal: false,
  },
  {
    taskIndex: 1,
    task_number: 2,
    heading: "Puzzle 2 of 3",
    description: "Who's in line for a change of shirt? (click to choose)",
    screen: "Active_side_l",
    image: "/cubicon-app/arts/Puzzle2.png",
    rotation: "left",
    rotationInterval: 15,
    question_type: "Selection",
    isFinal: false,
  },
  {
    taskIndex: 2,
    task_number: 3,
    heading: "Puzzle 3 of 3",
    description: "Who gets concerned by howling? (Draw a circle)",
    screen: "Active_back",
    image: "/cubicon-app/arts/Puzzle3.png",
    rotation: "left",
    rotationInterval: 15,
    question_type: "Selection",
    isFinal: true,
  },
];

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

    // Record attempt log in cubicon_attempts table
    try {
      await prisma.cubiconAttempt.create({
        data: {
          session_id: sessionId,
          taskIndex: session.taskIndex >= 0 ? session.taskIndex : 0,
          user_email: session.user_email || providedUserEmail,
          clicks_data: JSON.stringify(parsed.clicks || parsed.clickData || {}),
          start_time: parsed.startTime ? String(parsed.startTime) : null,
          result: parsed.result ? String(parsed.result) : "p",
        },
      });
    } catch (attemptErr) {
      console.warn("[cubicon-data] Failed to log attempt:", attemptErr);
    }

    const nextIndex = session.taskIndex + 1;
    await prisma.cubiconSession.update({
      where: { id: session.id },
      data: {
        taskIndex: nextIndex,
        totalPuzzlesAttempted: session.totalPuzzlesAttempted + 1,
        passedPuzzles: session.passedPuzzles + 1,
      },
    });

    if (nextIndex >= fallbackTasks.length) {
      const lastPuzzle = fallbackTasks[fallbackTasks.length - 1];
      const overallPassed = true;

      return NextResponse.json({
        sessionId,
        ofTasks: fallbackTasks.length,
        task: fallbackTasks.length,
        heading: "Congratulations You're Human!",
        description: "Verification completed successfully.",
        screen: lastPuzzle.screen || "Active_back",
        image: formatImageUrl(lastPuzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: 0.1,
        rotationDirection: mapRotationDirection(lastPuzzle.rotation || "left"),
        isFinal: true,
        completed: true,
        score: 1.0,
        passed: overallPassed,
        redirectUrl: "",
        result: "p",
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
      result: "p",
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

