import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Decoupled Cubicon Task Definitions & Fallbacks (Tool DB Boundary)
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

interface SessionData {
  taskIndex: number;
  startTime: number;
  userEmail?: string;
  passedPuzzles: number;
  totalPuzzlesAttempted: number;
}

const sessions: Record<string, SessionData> = {};

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

const DEFAULT_FALLBACK_TASKS = [
  {
    taskIndex: 0,
    heading: "Puzzle 1 of 3",
    description: "Who gets concerned by howling? (Draw a circle)",
    screen: "Active_front",
    image: "/cubicon-app/arts/Puzzle1.png",
    rotation: "left",
    rotationInterval: 15,
    isFinal: false,
  },
  {
    taskIndex: 1,
    heading: "Puzzle 2 of 3",
    description: "Who's in line for a change of shirt? (click to choose)",
    screen: "Active_side_l",
    image: "/cubicon-app/arts/Puzzle2.png",
    rotation: "left",
    rotationInterval: 15,
    isFinal: false,
  },
  {
    taskIndex: 2,
    heading: "Puzzle 3 of 3",
    description: "Who gets concerned by howling? (Draw a circle)",
    screen: "Active_back",
    image: "/cubicon-app/arts/Puzzle3.png",
    rotation: "left",
    rotationInterval: 15,
    isFinal: true,
  },
];

export async function POST(request: Request) {
  try {
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
    const providedUserEmail = parsed.userEmail ? String(parsed.userEmail).trim() : undefined;
    const allTasks = DEFAULT_FALLBACK_TASKS;

    if (isInit) {
      const sessionId = generateSessionId();
      sessions[sessionId] = {
        taskIndex: -1,
        startTime: Date.now(),
        userEmail: providedUserEmail,
        passedPuzzles: 0,
        totalPuzzlesAttempted: 0,
      };

      return NextResponse.json(
        {
          sessionId,
          ofTasks: allTasks.length,
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
    let session = sessions[sessionId];

    if (!session) {
      const newSessionId = generateSessionId();
      session = {
        taskIndex: 0,
        startTime: Date.now(),
        userEmail: providedUserEmail,
        passedPuzzles: 0,
        totalPuzzlesAttempted: 0,
      };
      sessions[newSessionId] = session;
      const puzzle = allTasks[0];
      return NextResponse.json({
        sessionId: newSessionId,
        ofTasks: allTasks.length,
        task: puzzle.taskIndex + 1,
        heading: puzzle.heading,
        description: puzzle.description,
        screen: puzzle.screen,
        image: formatImageUrl(puzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: puzzle.rotationInterval,
        rotationDirection: mapRotationDirection(puzzle.rotation),
        isFinal: puzzle.isFinal,
        redirectUrl: "",
        result: null,
      }, corsHeaders());
    }

    session.taskIndex += 1;
    const nextIndex = session.taskIndex;

    if (nextIndex >= allTasks.length) {
      const lastPuzzle = allTasks[allTasks.length - 1];
      const overallPassed = true;

      return NextResponse.json({
        sessionId,
        ofTasks: allTasks.length,
        task: allTasks.length,
        heading: "Congratulations You're Human!",
        description: "Verification completed successfully.",
        screen: lastPuzzle.screen,
        image: formatImageUrl(lastPuzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: 0.1,
        rotationDirection: mapRotationDirection(lastPuzzle.rotation),
        isFinal: true,
        completed: true,
        score: 1.0,
        passed: overallPassed,
        redirectUrl: "",
        result: "p",
      }, corsHeaders());
    }

    const puzzle = allTasks[nextIndex];
    return NextResponse.json({
      sessionId,
      ofTasks: allTasks.length,
      task: puzzle.taskIndex + 1,
      heading: puzzle.heading,
      description: puzzle.description,
      screen: puzzle.screen,
      image: formatImageUrl(puzzle.image),
      rotation: [0, 0, 0],
      rotationInterval: puzzle.isFinal ? 0 : puzzle.rotationInterval,
      rotationDirection: mapRotationDirection(puzzle.rotation),
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
}
