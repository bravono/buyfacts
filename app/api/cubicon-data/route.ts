import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Puzzle task definitions – one per face of the cubicon.
// The `image` URLs resolve to /cubicon-app/arts/PuzzleN.png which are
// served as static public assets by Next.js.
// The `screen` field corresponds to the GLB material name for each face of the
// cubicon, mapping each puzzle to a different side.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

const PUZZLES = [
  {
    screen: "Active_front",
    image: `${BASE_URL}/cubicon-app/arts/Puzzle1.png`,
    heading: "Puzzle 1 of 4",
    description: "Tap the highlighted area on the cube to continue.",
  },
  {
    screen: "Active_side_r",
    image: `${BASE_URL}/cubicon-app/arts/Puzzle2.png`,
    heading: "Puzzle 2 of 4",
    description: "Tap the highlighted area on the cube to continue.",
  },
  {
    screen: "Active_back",
    image: `${BASE_URL}/cubicon-app/arts/Puzzle3.png`,
    heading: "Puzzle 3 of 4",
    description: "Tap the highlighted area on the cube to continue.",
  },
  {
    screen: "Active_side_l",
    image: `${BASE_URL}/cubicon-app/arts/Puzzle4.png`,
    heading: "Puzzle 4 of 4",
    description: "Well done! You have completed all four puzzles.",
  },
];

// In-memory session store (per-process). For production use a shared store /
// database – but this is sufficient for the iframe-embedded use-case where
// the session lives within a single page load.
const sessions: Record<string, { taskIndex: number; startTime: number }> = {};

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// POST /api/cubicon-data
//
// The cubicon app sends two types of requests (both as POST with a
// `data=JSON.stringify({...})` body):
//
//   1. Init:  { sessionId: undefined, task: "init", ... }
//      Returns the first puzzle and a new sessionId.
//
//   2. Task:  { sessionId: "sess_...", start: <ISO>, clicks: {...} }
//      Returns the next puzzle in the cycle (or a completion payload).
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const text = await request.text();

    // The cubicon app encodes the body as `data=<JSON>` (URLSearchParams style)
    let parsed: Record<string, unknown> = {};
    if (text.startsWith("data=")) {
      const jsonStr = decodeURIComponent(text.slice("data=".length));
      parsed = JSON.parse(jsonStr);
    } else {
      parsed = JSON.parse(text);
    }

    const isInit =
      parsed.task === "init" || !parsed.sessionId;

    // ── Init request ─────────────────────────────────────────────────────────
    if (isInit) {
      const sessionId = generateSessionId();
      sessions[sessionId] = { taskIndex: 0, startTime: Date.now() };

      const puzzle = PUZZLES[0];
      return NextResponse.json(
        {
          sessionId,
          ofTasks: PUZZLES.length,
          heading: puzzle.heading,
          description: puzzle.description,
          screen: puzzle.screen,
          image: puzzle.image,
          rotation: [0, 0, 0],
          rotationInterval: 10,
          rotationDirection: "left",
          redirectUrl: "",
          result: null,
        },
        corsHeaders()
      );
    }

    // ── Task submission ───────────────────────────────────────────────────────
    const sessionId = String(parsed.sessionId ?? "");
    const session = sessions[sessionId];

    if (!session) {
      // Unknown / expired session – restart from puzzle 1
      const newSessionId = generateSessionId();
      sessions[newSessionId] = { taskIndex: 1, startTime: Date.now() };
      const puzzle = PUZZLES[0];
      return NextResponse.json(
        {
          sessionId: newSessionId,
          heading: puzzle.heading,
          description: puzzle.description,
          screen: puzzle.screen,
          image: puzzle.image,
          rotation: [0, 0, 0],
          rotationInterval: 10,
          rotationDirection: "left",
          redirectUrl: "",
          result: null,
        },
        corsHeaders()
      );
    }

    // Advance to next puzzle
    session.taskIndex += 1;
    const nextIndex = session.taskIndex;

    if (nextIndex >= PUZZLES.length) {
      // All puzzles completed – send a "passed" result
      return NextResponse.json(
        {
          sessionId,
          heading: "Congratulations!",
          description: "You have successfully completed all four Cubicon puzzles.",
          screen: PUZZLES[PUZZLES.length - 1].screen,
          image: PUZZLES[PUZZLES.length - 1].image,
          rotation: [0, 0, 0],
          rotationInterval: 0,
          rotationDirection: "left",
          redirectUrl: "",
          result: "p",
        },
        corsHeaders()
      );
    }

    const puzzle = PUZZLES[nextIndex];
    return NextResponse.json(
      {
        sessionId,
        heading: puzzle.heading,
        description: puzzle.description,
        screen: puzzle.screen,
        image: puzzle.image,
        rotation: [0, 0, 0],
        rotationInterval: 10,
        rotationDirection: nextIndex % 2 === 0 ? "left" : "right",
        redirectUrl: "",
        result: null,
      },
      corsHeaders()
    );
  } catch (err) {
    console.error("[cubicon-data] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, ...corsHeaders() });
  }
}

// Allow the iframe-embedded cubicon app to reach this route cross-origin
// during local development (the iframe is same-origin in production via /cubicon-app/).
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
