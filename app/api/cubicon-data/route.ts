import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Puzzle task definitions – fetched from the database.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

// In-memory session store (per-process).
const sessions: Record<string, { taskIndex: number; startTime: number }> = {};

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// POST /api/cubicon-data
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const text = await request.text();

    // The cubicon app encodes the body as `data=<JSON>` (URLSearchParams style)
    let parsed: Record<string, any> = {};
    if (text.startsWith("data=")) {
      const jsonStr = decodeURIComponent(text.slice("data=".length));
      parsed = JSON.parse(jsonStr);
    } else {
      parsed = JSON.parse(text);
    }

    console.log("[cubicon-data] Received task payload from client:", parsed);

    const isInit = parsed.task === "init" || !parsed.sessionId;
    const allTasks = await prisma.cubiconTask.findMany({ orderBy: { taskIndex: 'asc' } });
    
    if (allTasks.length === 0) {
      return NextResponse.json({ error: "No tasks configured in database" }, { status: 500, ...corsHeaders() });
    }

    // ── Init request ─────────────────────────────────────────────────────────
    if (isInit) {
      const sessionId = generateSessionId();
      sessions[sessionId] = { taskIndex: 0, startTime: Date.now() };

      const puzzle = allTasks[0];
      const responseData = {
        sessionId,
        ofTasks: allTasks.length,
        task: puzzle.taskIndex + 1,
        heading: puzzle.heading,
        description: puzzle.description,
        screen: puzzle.screen,
        image: puzzle.image.startsWith("http") ? puzzle.image : `${BASE_URL}${puzzle.image}`,
        rotation: [0, 0, 0],
        rotationInterval: puzzle.rotationInterval,
        rotationDirection: puzzle.rotation,
        isFinal: puzzle.isFinal,
        redirectUrl: "",
        result: null,
      };
      console.log("[cubicon-data] Returning init task:", responseData);
      return NextResponse.json(responseData, corsHeaders());
    }

    // ── Task submission ───────────────────────────────────────────────────────
    const sessionId = String(parsed.sessionId ?? "");
    const session = sessions[sessionId];

    if (!session) {
      // Unknown / expired session – restart from puzzle 1
      const newSessionId = generateSessionId();
      sessions[newSessionId] = { taskIndex: 1, startTime: Date.now() };
      const puzzle = allTasks[0];
      const responseData = {
        sessionId: newSessionId,
        ofTasks: allTasks.length,
        task: puzzle.taskIndex + 1,
        heading: puzzle.heading,
        description: puzzle.description,
        screen: puzzle.screen,
        image: puzzle.image.startsWith("http") ? puzzle.image : `${BASE_URL}${puzzle.image}`,
        rotation: [0, 0, 0],
        rotationInterval: puzzle.rotationInterval,
        rotationDirection: puzzle.rotation,
        isFinal: puzzle.isFinal,
        redirectUrl: "",
        result: null,
      };
      console.log("[cubicon-data] Session reset. Returning task 1:", responseData);
      return NextResponse.json(responseData, corsHeaders());
    }

    // Validate the coordinates against single target or multi-point checkpoint array (e.g. start, mid, end)
    const currentPuzzle = allTasks.find(t => t.taskIndex === session.taskIndex);
    let passed = false;

    if (currentPuzzle) {
      const clicksObj = parsed.clicks || {};
      const clicks: Array<{ x: number; y: number; z: number }> = Object.values(clicksObj);

      let targetPointsArray: Array<{ x: number; y: number; z: number }> = [];
      if (currentPuzzle.targetPoints) {
        try {
          targetPointsArray = JSON.parse(currentPuzzle.targetPoints);
        } catch {
          targetPointsArray = [];
        }
      }

      const tol = currentPuzzle.tolerance ?? 0.5;

      if (targetPointsArray.length > 0) {
        let matchedCheckpoints = 0;
        for (const tp of targetPointsArray) {
          const hit = clicks.some(c => {
            if (c && c.x !== undefined) {
              const dx = c.x - tp.x;
              const dy = c.y - tp.y;
              const dz = c.z - tp.z;
              return Math.sqrt(dx * dx + dy * dy + dz * dz) <= tol;
            }
            return false;
          });
          if (hit) matchedCheckpoints++;
        }
        passed = matchedCheckpoints >= Math.ceil(targetPointsArray.length * 0.8);
      } else if (
        currentPuzzle.targetX !== null &&
        currentPuzzle.targetY !== null &&
        currentPuzzle.targetZ !== null
      ) {
        const tx = currentPuzzle.targetX;
        const ty = currentPuzzle.targetY;
        const tz = currentPuzzle.targetZ;
        passed = clicks.some(c => {
          if (c && c.x !== undefined) {
            const dx = c.x - tx;
            const dy = c.y - ty;
            const dz = c.z - tz;
            return Math.sqrt(dx * dx + dy * dy + dz * dz) <= tol;
          }
          return false;
        });
      } else {
        passed = true;
      }
    }

    // Advance to next puzzle unconditionally
    session.taskIndex += 1;
    const nextIndex = session.taskIndex;

    if (nextIndex >= allTasks.length) {
      // All puzzles completed – constant rotation with no waiting gap
      const lastPuzzle = allTasks[allTasks.length - 1];
      const constantInterval = 1;

      const responseData = {
        sessionId,
        ofTasks: allTasks.length,
        task: allTasks.length,
        heading: "Congratulations!",
        description: "You have successfully completed all four Cubicon puzzles.",
        screen: lastPuzzle.screen,
        image: lastPuzzle.image.startsWith("http") ? lastPuzzle.image : `${BASE_URL}${lastPuzzle.image}`,
        rotation: [0, 0, 0],
        rotationInterval: constantInterval,
        rotationDirection: lastPuzzle.rotation,
        isFinal: true,
        redirectUrl: "",
        result: passed ? "p" : "f",
      };
      console.log("[cubicon-data] All tasks completed. Returning final result:", responseData);
      return NextResponse.json(responseData, corsHeaders());
    }

    const puzzle = allTasks[nextIndex];
    const responseData = {
      sessionId,
      ofTasks: allTasks.length,
      task: puzzle.taskIndex + 1,
      heading: puzzle.heading,
      description: puzzle.description,
      screen: puzzle.screen,
      image: puzzle.image.startsWith("http") ? puzzle.image : `${BASE_URL}${puzzle.image}`,
      rotation: [0, 0, 0],
      rotationInterval: puzzle.rotationInterval,
      rotationDirection: puzzle.rotation,
      isFinal: puzzle.isFinal,
      redirectUrl: "",
      result: passed ? "p" : "f",
    };
    console.log("[cubicon-data] Returning next task:", responseData);
    return NextResponse.json(responseData, corsHeaders());
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
