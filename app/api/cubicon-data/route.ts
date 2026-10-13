import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  evaluateScoringDecision,
  sanitizePublicPayload,
  TaskAttemptRecord,
} from "@/lib/cubicon/scoring-engine";

// ---------------------------------------------------------------------------
// Cubicon 3D Task Definitions & Database Integration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export const COMPLETION_MESSAGES = {
  success: {
    heading: "Congratulations! You are human.",
    description:
      "Next we offer you a number of choices below. Please make a selection and we thank you for considering Cubicon and BuyFacts.",
  },
  rejection: {
    heading: "Thank you for participating",
    description:
      "Sorry our survey has exceeded the number of desired respondents. We hope to see you again when we reach out again. Please select from the choices below.",
  },
};

export function evaluateSequencePass(
  passedCount: number,
  total: number,
  threshold: number = 0.66
): boolean {
  if (total <= 0) return true;
  if (threshold > 1) {
    return passedCount >= threshold;
  }
  const ratio = passedCount / total;
  return ratio >= threshold - 0.0001;
}

const DEFAULT_TASKS = [
  {
    taskIndex: 0,
    taskNumber: 1,
    heading: "Puzzle 1 of 3",
    description: "Who gets concerned by howling? (Draw a circle)",
    screen: "Active_front",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
    rotation: "left",
    rotationInterval: 15,
    questionType: "drag",
    correctCoordinates: JSON.stringify([{ x: 0.15, y: 0.45, z: 1.0 }]),
    startPoint: JSON.stringify({ x: 0.15, y: 0.45, z: 1.0 }),
    midPoint: "",
    endPoint: "",
    tolerance: 0.5,
    isFinal: false,
  },
  {
    taskIndex: 1,
    taskNumber: 2,
    description: "Who's in line for a change of shirt? (click to choose)",
    heading: "Puzzle 2 of 3",
    screen: "Active_side_l",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
    rotation: "left",
    rotationInterval: 15,
    questionType: "click",
    correctCoordinates: JSON.stringify([{ x: -0.25, y: 0.30, z: 1.0 }]),
    startPoint: JSON.stringify({ x: -0.25, y: 0.30, z: 1.0 }),
    midPoint: "",
    endPoint: "",
    tolerance: 0.5,
    isFinal: false,
  },
  {
    taskIndex: 2,
    taskNumber: 3,
    heading: "Puzzle 3 of 3",
    description: "Where does his next go? (click to choose)",
    screen: "Active_back",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
    rotation: "left",
    rotationInterval: 15,
    questionType: "drag",
    correctCoordinates: JSON.stringify([
      { x: -0.60, y: 0.10, z: 1.0 },
      { x: 0.0, y: 0.35, z: 1.0 },
      { x: 0.60, y: 0.10, z: 1.0 },
    ]),
    startPoint: JSON.stringify({ x: -0.60, y: 0.10, z: 1.0 }),
    midPoint: JSON.stringify({ x: 0.0, y: 0.35, z: 1.0 }),
    endPoint: JSON.stringify({ x: 0.60, y: 0.10, z: 1.0 }),
    tolerance: 0.5,
    isFinal: false,
  },
  {
    taskIndex: 3,
    taskNumber: 4,
    heading: "Verification Challenge",
    description: "Final verification task to complete validation (click to choose)",
    screen: "Active_side_r",
    image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
    rotation: "left",
    rotationInterval: 15,
    questionType: "click",
    correctCoordinates: JSON.stringify([{ x: -0.25, y: 0.30, z: 1.0 }]),
    startPoint: JSON.stringify({ x: -0.25, y: 0.30, z: 1.0 }),
    midPoint: "",
    endPoint: "",
    tolerance: 0.5,
    isFinal: true,
  },
];

export function parseCoordinate(coord: unknown): { x: number; y: number; z: number } | null {
  if (!coord) return null;
  if (typeof coord === "object" && coord !== null) {
    const obj = coord as Record<string, unknown>;
    if (typeof obj.x === "number" && typeof obj.y === "number") {
      return { x: Number(obj.x), y: Number(obj.y), z: Number(obj.z || 0) };
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

export function parseClicksList(clicks: unknown): Array<{ x: number; y: number; z: number; t?: number }> {
  if (!clicks) return [];
  if (Array.isArray(clicks)) {
    return clicks
      .map((item) => {
        const pt = parseCoordinate(item);
        if (!pt) return null;
        const itemObj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        return { ...pt, t: typeof itemObj.t === "number" ? itemObj.t : 0 };
      })
      .filter(Boolean) as Array<{ x: number; y: number; z: number; t?: number }>;
  }
  if (typeof clicks === "object" && clicks !== null) {
    const clicksObj = clicks as Record<string, unknown>;
    const keys = Object.keys(clicksObj).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      const tA = (clicksObj[a] as Record<string, unknown> | undefined)?.t;
      const tB = (clicksObj[b] as Record<string, unknown> | undefined)?.t;
      return (typeof tA === "number" ? tA : 0) - (typeof tB === "number" ? tB : 0);
    });
    return keys
      .map((k) => {
        const item = clicksObj[k];
        const pt = parseCoordinate(item);
        if (!pt) return null;
        const itemObj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        return { ...pt, t: typeof itemObj.t === "number" ? itemObj.t : 0 };
      })
      .filter(Boolean) as Array<{ x: number; y: number; z: number; t?: number }>;
  }
  return [];
}

export function normalizePuzzleType(type: unknown): "click" | "drag" | "double_click" {
  if (!type) return "click";
  const normalized = String(type).trim().toLowerCase();
  if (["drag", "anticipation", "drawing", "sequence"].includes(normalized)) {
    return "drag";
  }
  if (["double_click", "doubleclick", "double-click"].includes(normalized)) {
    return "double_click";
  }
  return "click";
}

export function evaluateTaskAttempt(task: Record<string, unknown> | null | undefined, clicks: unknown): "p" | "f" {
  if (!task) return "p";

  const tolerance = typeof task.tolerance === "number" ? task.tolerance : 0.5;
  const clicksList = parseClicksList(clicks);

  // Parse correctCoordinates (or legacy correct_coordinates) as primary array of target points
  let targetPoints: Array<{ x: number; y: number; z: number }> = [];
  const rawCoords = task.correctCoordinates !== undefined ? task.correctCoordinates : task.correct_coordinates;
  if (rawCoords) {
    try {
      const parsed = typeof rawCoords === "string"
        ? JSON.parse(rawCoords)
        : rawCoords;
      if (Array.isArray(parsed)) {
        targetPoints = parsed.map(parseCoordinate).filter((p): p is { x: number; y: number; z: number } => p !== null);
      } else if (typeof parsed === "object" && parsed !== null) {
        // Fallback for legacy nested object { start, mid, end }
        const parsedObj = parsed as Record<string, unknown>;
        ["start", "mid", "end"].forEach((key) => {
          if (parsedObj[key]) {
            const pt = parseCoordinate(parsedObj[key]);
            if (pt) targetPoints.push(pt);
          }
        });
      }
    } catch {}
  }

  // Fallback to startPoint, midPoint, endPoint columns if targetPoints had no points
  if (targetPoints.length === 0) {
    const rawStart = task.startPoint !== undefined ? task.startPoint : task.start_point;
    const rawMid = task.midPoint !== undefined ? task.midPoint : task.mid_point;
    const rawEnd = task.endPoint !== undefined ? task.endPoint : task.end_point;
    const startPt = parseCoordinate(rawStart);
    const midPt = parseCoordinate(rawMid);
    const endPt = parseCoordinate(rawEnd);
    if (startPt) targetPoints.push(startPt);
    if (midPt) targetPoints.push(midPt);
    if (endPt) targetPoints.push(endPt);
  }

  // If no target coordinates are defined on task, default to pass
  if (targetPoints.length === 0) {
    return "p";
  }

  // Empty clicks always fail
  if (clicksList.length === 0) {
    return "f";
  }

  const rawQuestionType = task.questionType || task.question_type;
  const puzzleType = normalizePuzzleType(rawQuestionType);

  // Drag puzzles require at least 2 clicks (start and end). Fewer than 2 clicks is an instant failure.
  if (puzzleType === "drag" && clicksList.length < 2) {
    return "f";
  }

  // Single-click puzzles: user is expected to click once. Multiple clicks fail immediately.
  if (puzzleType === "click") {
    if (clicksList.length !== 1) {
      return "f";
    }
    const hasMatch = targetPoints.some((target) => distance3D(clicksList[0], target) <= tolerance);
    return hasMatch ? "p" : "f";
  }

  // Double-click puzzles (future extension): expects exactly 2 clicks
  if (puzzleType === "double_click") {
    if (clicksList.length !== 2) {
      return "f";
    }
    const allClicksMatched = clicksList.every((click) =>
      targetPoints.some((target) => distance3D(click, target) <= tolerance)
    );
    return allClicksMatched ? "p" : "f";
  }

  // Drag / Drawing puzzles (up to 3 points in correctCoordinates):
  // All target points in the array must be matched within tolerance.
  // Traversal order does not matter since users may start drawing from any point.
  if (puzzleType === "drag") {
    const allMatched = targetPoints.every((target) =>
      clicksList.some((click) => distance3D(click, target) <= tolerance)
    );
    return allMatched ? "p" : "f";
  }

  return "f";
}

export async function ensureSeedTasks() {
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
        passThreshold: 0.66,
        rotationDirection: "left",
        defaultRotationInterval: 15,
        isActive: true,
        createdBy: "system",
      },
    });
  }

  const count = await prisma.cubiconTask.count({
    where: { sequenceId: defaultSeq.id },
  });
  if (count === 0) {
    for (const item of DEFAULT_TASKS) {
      await prisma.cubiconTask.create({
        data: {
          ...item,
          sequenceId: defaultSeq.id,
        },
      });
    }
  } else {
    // Ensure existing tasks are attached to default sequence
    await prisma.cubiconTask.updateMany({
      where: { sequenceId: null },
      data: { sequenceId: defaultSeq.id },
    });
  }

  // 2. Ensure contact_form sequence exists
  let contactSeq = await prisma.cubiconSequence.findFirst({
    where: { slug: "contact_form" },
  });

  if (!contactSeq) {
    contactSeq = await prisma.cubiconSequence.create({
      data: {
        slug: "contact_form",
        title: "Contact Form Human Verification",
        description: "Anti-bot spatial puzzle verification for contact inquiries",
        passThreshold: 0.6,
        rotationDirection: "left",
        defaultRotationInterval: 15,
        isActive: true,
        createdBy: "system",
      },
    });
  }

  const contactTasksCount = await prisma.cubiconTask.count({
    where: { sequenceId: contactSeq.id },
  });

  if (contactTasksCount === 0) {
    for (const item of DEFAULT_TASKS) {
      await prisma.cubiconTask.create({
        data: {
          ...item,
          heading: item.heading.replace("Puzzle", "Verification Puzzle"),
          sequenceId: contactSeq.id,
        },
      });
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
  if (imagePath.includes("s3.buyfacts.com")) {
    if (imagePath.includes("Puzzle1") || imagePath.includes("1zkn2t")) return "/cubicon-app/arts/Puzzle1.webp";
    if (imagePath.includes("Puzzle2") || imagePath.includes("kde8r0")) return "/cubicon-app/arts/Puzzle2.webp";
    if (imagePath.includes("Puzzle3") || imagePath.includes("pcdywj")) return "/cubicon-app/arts/Puzzle3.webp";
    if (imagePath.includes("ballon") || imagePath.includes("kc35s8")) return "/cubicon-app/arts/ballon.webp";
  }
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
        where: { isActive: true },
        include: { tasks: { orderBy: { taskIndex: "asc" } } },
      });
    }

    const tasks = sequence?.tasks?.length
      ? sequence.tasks
      : await prisma.cubiconTask.findMany({ orderBy: { taskIndex: "asc" } });

    return NextResponse.json({ sequence, tasks }, corsHeaders());
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[cubicon-data] GET Error:", err);
    return NextResponse.json({ error: "Failed to fetch tasks", details: errorMessage }, { status: 500, ...corsHeaders() });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeedTasks();

    const text = await request.text();
    let parsed: Record<string, unknown> = {};
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

    const url = new URL(request.url);
    const querySeq = url.searchParams.get("sequence") || url.searchParams.get("seq");
    const querySeqId = url.searchParams.get("sequenceId");
    const referer = request.headers.get("referer");
    let refererSeq: string | null = null;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        refererSeq = refUrl.searchParams.get("sequence") || refUrl.searchParams.get("seq");
      } catch {}
    }

    const rawSeqSlug = parsed.sequence || parsed.sequenceSlug || querySeq || refererSeq || null;
    const requestedSequenceSlug: string | null = rawSeqSlug ? String(rawSeqSlug) : null;
    const requestedSequenceId: number | null = parsed.sequenceId
      ? Number(parsed.sequenceId)
      : (querySeqId ? Number(querySeqId) : null);

    // 1. Resolve requested or active default sequence
    let currentSequence = null;

    // If an existing session exists, inherit its assigned sequence
    if (parsed.sessionId) {
      const existingSession = await prisma.cubiconSession.findUnique({
        where: { sessionId: String(parsed.sessionId) },
        include: { sequence: true },
      });
      if (existingSession?.sequence) {
        currentSequence = existingSession.sequence;
      }
    }

    if (!currentSequence && requestedSequenceId) {
      currentSequence = await prisma.cubiconSequence.findUnique({
        where: { id: requestedSequenceId },
      });
    } else if (!currentSequence && requestedSequenceSlug) {
      currentSequence = await prisma.cubiconSequence.findUnique({
        where: { slug: requestedSequenceSlug },
      });
    }

    if (!currentSequence) {
      currentSequence = await prisma.cubiconSequence.findFirst({
        where: { isActive: true },
      });
    }

    if (!currentSequence) {
      currentSequence = await prisma.cubiconSequence.findFirst();
    }

    const seqId = currentSequence?.id || null;
    const seqRotationDir = currentSequence?.rotationDirection || "left";
    const seqDefaultInterval = currentSequence?.defaultRotationInterval || 15;

    // Fetch tasks for this sequence (or fallback)
    let sequenceTasks = seqId
      ? await prisma.cubiconTask.findMany({
          where: { sequenceId: seqId },
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

    const isInit = parsed.task === "init" || !parsed.sessionId;
    const providedUserEmail = parsed.userEmail ? String(parsed.userEmail).trim() : "";

    if (isInit) {
      const sessionId = (parsed.sessionId && parsed.sessionId !== "12345")
        ? String(parsed.sessionId)
        : generateSessionId();

      const existingSession = await prisma.cubiconSession.findUnique({
        where: { sessionId: sessionId },
      });

      if (existingSession) {
        await prisma.cubiconSession.update({
          where: { id: existingSession.id },
          data: {
            sequenceId: seqId,
            taskIndex: 0,
            userEmail: providedUserEmail || existingSession.userEmail,
            passedPuzzles: 0,
            totalPuzzlesAttempted: 0,
            previousResult: null,
          },
        });
      } else {
        await prisma.cubiconSession.create({
          data: {
            sessionId: sessionId,
            sequenceId: seqId,
            taskIndex: 0,
            userEmail: providedUserEmail,
            passedPuzzles: 0,
            totalPuzzlesAttempted: 0,
          },
        });
      }

      const firstPuzzle = fallbackTasks[0];
      const firstPuzzle = fallbackTasks[0];
      return NextResponse.json(
        sanitizePublicPayload({
          sessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Cubicon Challenge",
          ofTasks: Math.min(3, totalTasks),
          task: 1,
          heading: firstPuzzle.heading,
          description: firstPuzzle.description,
          screen: firstPuzzle.screen || "Active_front",
          image: formatImageUrl(firstPuzzle.image),
          rotation: [0, 0, 0],
          rotationInterval: firstPuzzle.rotationInterval || seqDefaultInterval,
          rotationDirection: mapRotationDirection(firstPuzzle.rotation || seqRotationDir),
          isFinal: totalTasks === 1,
          completed: false,
          passed: false,
          redirectUrl: "",
          result: null,
          question_type: firstPuzzle.questionType || "drag",
          questionType: firstPuzzle.questionType || "drag",
        }),
        corsHeaders()
      );
    }

    const sessionId = String(parsed.sessionId ?? "");
    let session = await prisma.cubiconSession.findUnique({
      where: { sessionId: sessionId },
    });

    // 1. Unlimited Retries Handler (Section 7.4)
    if (parsed.action === "retry" || parsed.task === "retry") {
      if (session) {
        await prisma.cubiconSession.update({
          where: { id: session.id },
          data: {
            taskIndex: 0,
            passedPuzzles: 0,
            totalPuzzlesAttempted: 0,
            previousResult: "retry",
          },
        });
      }
      const firstPuzzle = fallbackTasks[0];
      return NextResponse.json(
        sanitizePublicPayload({
          sessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Cubicon Challenge",
          ofTasks: Math.min(3, totalTasks),
          task: 1,
          heading: firstPuzzle.heading,
          description: firstPuzzle.description,
          screen: firstPuzzle.screen || "Active_front",
          image: formatImageUrl(firstPuzzle.image),
          rotation: [0, 0, 0],
          rotationInterval: firstPuzzle.rotationInterval || seqDefaultInterval,
          rotationDirection: mapRotationDirection(firstPuzzle.rotation || seqRotationDir),
          isFinal: false,
          completed: false,
          passed: false,
          result: null,
          redirectUrl: "",
          question_type: firstPuzzle.questionType || "drag",
          questionType: firstPuzzle.questionType || "drag",
        }),
        corsHeaders()
      );
    }

    if (!session) {
      const newSessionId = generateSessionId();
      session = await prisma.cubiconSession.create({
        data: {
          sessionId: newSessionId,
          sequenceId: seqId,
          taskIndex: 0,
          userEmail: providedUserEmail,
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      const puzzle = fallbackTasks[0];
      return NextResponse.json(
        sanitizePublicPayload({
          sessionId: newSessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Cubicon Challenge",
          ofTasks: Math.min(3, totalTasks),
          task: puzzle.taskIndex + 1,
          heading: puzzle.heading,
          description: puzzle.description,
          screen: puzzle.screen || "Active_front",
          image: formatImageUrl(puzzle.image),
          rotation: [0, 0, 0],
          rotationInterval: puzzle.rotationInterval || seqDefaultInterval,
          rotationDirection: mapRotationDirection(puzzle.rotation || seqRotationDir),
          isFinal: totalTasks === 1,
          completed: false,
          passed: false,
          redirectUrl: "",
          result: null,
          question_type: puzzle.questionType || "drag",
          questionType: puzzle.questionType || "drag",
        }),
        corsHeaders()
      );
    }

    // 2. Terminal State Lockdown: Prevent browser Back or page refresh from altering results
    const isAlreadyCompleted =
      session.previousResult?.startsWith("passed_") ||
      session.previousResult?.startsWith("failed_") ||
      session.previousResult?.startsWith("early_") ||
      session.previousResult?.startsWith("two_incorrect_");

    if (isAlreadyCompleted) {
      const alreadyPassed = session.previousResult?.startsWith("passed_") || false;
      const lastPuzzle = fallbackTasks[Math.min(session.taskIndex, totalTasks - 1)] || fallbackTasks[0];
      return NextResponse.json(
        sanitizePublicPayload({
          sessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Cubicon Challenge",
          ofTasks: session.totalPuzzlesAttempted || totalTasks,
          task: session.totalPuzzlesAttempted || totalTasks,
          heading: alreadyPassed
            ? COMPLETION_MESSAGES.success.heading
            : COMPLETION_MESSAGES.rejection.heading,
          description: alreadyPassed
            ? COMPLETION_MESSAGES.success.description
            : COMPLETION_MESSAGES.rejection.description,
          screen: lastPuzzle.screen || "Active_back",
          image: formatImageUrl(lastPuzzle.image),
          rotation: [0, 0, 0],
          rotationInterval: 0.1,
          rotationDirection: mapRotationDirection(lastPuzzle.rotation || seqRotationDir),
          isFinal: true,
          completed: true,
          passed: alreadyPassed,
          fireworks: alreadyPassed,
          score: session.passedPuzzles,
          result: alreadyPassed ? "p" : "f",
          redirectUrl: "",
        }),
        corsHeaders()
      );
    }

    // 3. Duplicate click protection (idempotency guard)
    const submittedTaskIndex = typeof parsed.taskIndex === "number"
      ? parsed.taskIndex
      : (parsed.taskIndex !== undefined ? Number(parsed.taskIndex) : undefined);

    if (
      submittedTaskIndex !== undefined &&
      !isNaN(submittedTaskIndex) &&
      submittedTaskIndex < session.taskIndex &&
      session.taskIndex >= 0
    ) {
      const activePuzzle = fallbackTasks[session.taskIndex] || fallbackTasks[0];
      return NextResponse.json(
        sanitizePublicPayload({
          sessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Cubicon Challenge",
          ofTasks: Math.min(3, totalTasks),
          task: session.taskIndex + 1,
          heading: activePuzzle.heading,
          description: activePuzzle.description,
          screen: activePuzzle.screen || "Active_front",
          image: formatImageUrl(activePuzzle.image),
          rotation: [0, 0, 0],
          rotationInterval: activePuzzle.rotationInterval || seqDefaultInterval,
          rotationDirection: mapRotationDirection(activePuzzle.rotation || seqRotationDir),
          isFinal: session.taskIndex >= 2,
          completed: false,
          passed: false,
          score: session.passedPuzzles,
          result: session.previousResult === "p" || session.previousResult === "f" ? session.previousResult : null,
          redirectUrl: "",
          question_type: activePuzzle.questionType || "drag",
          questionType: activePuzzle.questionType || "drag",
        }),
        corsHeaders()
      );
    }

    // 4. Evaluate current task attempt against correct coordinates
    const currentTaskIndex = session.taskIndex >= 0 ? session.taskIndex : 0;
    const currentTask = fallbackTasks[currentTaskIndex] || fallbackTasks[0];
    const rawClicks = parsed.clicks || parsed.clickData || {};
    const attemptResult: "p" | "f" = evaluateTaskAttempt(currentTask, rawClicks);

    // Record attempt log in cubicon_attempts table for internal diagnostics
    try {
      await prisma.cubiconAttempt.create({
        data: {
          sessionId: sessionId,
          sequenceId: seqId || session.sequenceId || undefined,
          taskIndex: currentTaskIndex,
          userEmail: session.userEmail || providedUserEmail,
          clicksData: JSON.stringify(rawClicks),
          startTime: parsed.startTime ? String(parsed.startTime) : null,
          result: attemptResult,
        },
      });
    } catch (attemptErr) {
      console.warn("[cubicon-data] Failed to log attempt:", attemptErr);
    }

    // 5. Gather session attempt history and evaluate 4-path scoring state machine
    const sessionAttempts = await prisma.cubiconAttempt.findMany({
      where: { sessionId: sessionId },
      orderBy: { submittedAt: "asc" },
      select: { taskIndex: true, result: true },
    });

    const attemptRecords: TaskAttemptRecord[] = sessionAttempts.map((a) => ({
      taskIndex: a.taskIndex,
      result: (a.result === "p" ? "p" : "f") as "p" | "f",
    }));

    if (
      attemptRecords.length === 0 ||
      attemptRecords[attemptRecords.length - 1].taskIndex !== currentTaskIndex
    ) {
      attemptRecords.push({ taskIndex: currentTaskIndex, result: attemptResult });
    }

    const hasFourth = fallbackTasks.length >= 4 || totalTasks >= 4;
    const baseTaskCount = Math.min(3, totalTasks);
    const scoringDecision = evaluateScoringDecision(attemptRecords, baseTaskCount, hasFourth);

    const isPassed = attemptResult === "p";
    const newPassedCount = session.passedPuzzles + (isPassed ? 1 : 0);
    const newAttemptedCount = session.totalPuzzlesAttempted + 1;

    // Update session state with internal diagnostic stage
    await prisma.cubiconSession.update({
      where: { id: session.id },
      data: {
        taskIndex: scoringDecision.isCompleted ? session.taskIndex : scoringDecision.nextTaskIndex,
        totalPuzzlesAttempted: newAttemptedCount,
        passedPuzzles: newPassedCount,
        previousResult: scoringDecision.internalStage,
      },
    });

    // 6. Return sanitized public response
    if (scoringDecision.isCompleted) {
      const lastPuzzle = fallbackTasks[Math.min(session.taskIndex, fallbackTasks.length - 1)] || fallbackTasks[0];
      return NextResponse.json(
        sanitizePublicPayload({
          sessionId,
          sequenceId: seqId,
          sequenceTitle: currentSequence?.title || "Cubicon Challenge",
          ofTasks: scoringDecision.expectedTotalTasks,
          task: scoringDecision.expectedTotalTasks,
          heading: scoringDecision.passed
            ? COMPLETION_MESSAGES.success.heading
            : COMPLETION_MESSAGES.rejection.heading,
          description: scoringDecision.passed
            ? COMPLETION_MESSAGES.success.description
            : COMPLETION_MESSAGES.rejection.description,
          screen: lastPuzzle.screen || "Active_back",
          image: formatImageUrl(lastPuzzle.image),
          rotation: [0, 0, 0],
          rotationInterval: 0.1,
          rotationDirection: mapRotationDirection(lastPuzzle.rotation || seqRotationDir),
          isFinal: true,
          completed: true,
          score: newPassedCount,
          passed: scoringDecision.passed,
          fireworks: scoringDecision.fireworks,
          redirectUrl: "",
          result: attemptResult,
        }),
        corsHeaders()
      );
    }

    const nextPuzzleIndex = scoringDecision.nextTaskIndex;
    const nextPuzzle = fallbackTasks[nextPuzzleIndex] || DEFAULT_TASKS[3];
    return NextResponse.json(
      sanitizePublicPayload({
        sessionId,
        sequenceId: seqId,
        sequenceTitle: currentSequence?.title || "Cubicon Challenge",
        ofTasks: scoringDecision.expectedTotalTasks,
        task: nextPuzzleIndex + 1,
        heading: nextPuzzle.heading,
        description: nextPuzzle.description,
        screen: nextPuzzle.screen || "Active_front",
        image: formatImageUrl(nextPuzzle.image),
        rotation: [0, 0, 0],
        rotationInterval: scoringDecision.isFinalTask ? 0 : (nextPuzzle.rotationInterval || seqDefaultInterval),
        rotationDirection: mapRotationDirection(nextPuzzle.rotation || seqRotationDir),
        isFinal: scoringDecision.isFinalTask,
        completed: false,
        passed: false,
        score: newPassedCount,
        redirectUrl: "",
        result: attemptResult,
        question_type: nextPuzzle.questionType || "drag",
        questionType: nextPuzzle.questionType || "drag",
      }),
      corsHeaders()
    );
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

