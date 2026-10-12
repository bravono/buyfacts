import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/cubicon-data/route";
import { prisma } from "../lib/prisma";

test("Cubicon Data Route Initialization Test Suite", async (t) => {
  const createdSessionIds: string[] = [];

  t.after(async () => {
    if (createdSessionIds.length > 0) {
      await prisma.cubiconAttempt.deleteMany({
        where: { session_id: { in: createdSessionIds } },
      });
      await prisma.cubiconSession.deleteMany({
        where: { session_id: { in: createdSessionIds } },
      });
    }
  });

  await t.test("1. task: 'init' creates session at taskIndex 0 and serves first puzzle immediately", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "init",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.sessionId, "Must return generated sessionId");
    createdSessionIds.push(data.sessionId);

    // Verify session persistence in database
    const sessionRecord = await prisma.cubiconSession.findUnique({
      where: { session_id: data.sessionId },
    });
    assert.ok(sessionRecord, "Session record must exist in database");
    assert.equal(sessionRecord.taskIndex, 0, "Initial session taskIndex must be 0 for first puzzle");
    assert.equal(sessionRecord.passedPuzzles, 0);
    assert.equal(sessionRecord.totalPuzzlesAttempted, 0);

    // Verify payload returns the first puzzle, not the Welcome screen
    assert.equal(data.task, 1, "Must return task number 1");
    assert.notEqual(data.heading, "Welcome to Cubicon", "Heading must not be Welcome to Cubicon");
    assert.ok(data.heading.includes("Puzzle 1"), "Heading must identify first puzzle");
    assert.notEqual(data.description, "Press Start to begin your puzzle.", "Must not display Press Start description");
    assert.ok(data.description.length > 0, "Must contain puzzle description");
    assert.notEqual(data.image, "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "Image must not be empty transparent GIF");
    assert.ok(data.image.includes("Puzzle1"), "Image must reference Puzzle 1");
    assert.equal(data.completed, false, "Must not be completed");
    assert.equal(data.passed, false, "Must not be passed");
    assert.equal(data.isFinal, false, "First puzzle must not be final in multi-task sequence");
    assert.ok(data.rotationInterval > 0, "Rotation interval must be greater than 0 to spin the 3D model");
    assert.ok(data.question_type, "First puzzle must have question_type");
    assert.ok(data.questionType, "First puzzle must have questionType property");
  });

  await t.test("2. Default dummy client sessionId '12345' with task: 'init' generates unique sessionId", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "12345",
        task: "init",
        deviceOS: "Windows",
        deviceSize: "1920x1080",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.notEqual(data.sessionId, "12345", "Dummy '12345' must be replaced with unique session ID");
    assert.ok(data.sessionId.startsWith("sess_"), "Session ID must start with sess_ prefix");
    createdSessionIds.push(data.sessionId);

    assert.equal(data.task, 1);
    assert.ok(data.heading.includes("Puzzle 1"));
  });

  await t.test("3. Missing sessionId and missing task defaults to initialization and returns first puzzle", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.sessionId);
    createdSessionIds.push(data.sessionId);

    assert.equal(data.task, 1);
    assert.ok(data.heading.includes("Puzzle 1"));
    assert.equal(data.completed, false);
  });

  await t.test("4. task: 'init' with sequence parameter loads specific sequence first puzzle", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-data?sequence=contact_form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "init",
        sequence: "contact_form",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.sessionId);
    createdSessionIds.push(data.sessionId);

    const session = await prisma.cubiconSession.findUnique({
      where: { session_id: data.sessionId },
      include: { sequence: true },
    });
    assert.ok(session);
    assert.equal(session.sequence?.slug, "contact_form");
    assert.equal(session.taskIndex, 0);

    assert.equal(data.task, 1);
    assert.ok(data.heading.includes("Verification Puzzle 1") || data.heading.includes("Puzzle 1"));
    assert.equal(data.completed, false);
  });

  await t.test("5. task: 'init' with existing custom sessionId updates and resets session state", async () => {
    const customSessionId = `sess_custom_reset_${Date.now()}`;
    createdSessionIds.push(customSessionId);

    // Pre-create session at taskIndex 2 with prior results
    await prisma.cubiconSession.create({
      data: {
        session_id: customSessionId,
        taskIndex: 2,
        passedPuzzles: 1,
        totalPuzzlesAttempted: 2,
        previous_result: "in_progress_task_2",
      },
    });

    const req = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: customSessionId,
        task: "init",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.sessionId, customSessionId);
    assert.equal(data.task, 1);
    assert.ok(data.heading.includes("Puzzle 1"));

    const updated = await prisma.cubiconSession.findUnique({
      where: { session_id: customSessionId },
    });
    assert.equal(updated?.taskIndex, 0, "Must reset taskIndex to 0");
    assert.equal(updated?.passedPuzzles, 0, "Must reset passed count to 0");
    assert.equal(updated?.totalPuzzlesAttempted, 0, "Must reset attempted count to 0");
    assert.equal(updated?.previous_result, null, "Must clear previous_result");
  });

  await t.test("6. URL-encoded form data data={...} initialization format is supported", async () => {
    const payload = JSON.stringify({ task: "init" });
    const encodedBody = `data=${encodeURIComponent(payload)}`;

    const req = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodedBody,
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.sessionId);
    createdSessionIds.push(data.sessionId);

    assert.equal(data.task, 1);
    assert.ok(data.heading.includes("Puzzle 1"));
  });

  await t.test("7. Full sequence flow: Initialized session accepts task 1 submission and advances to task 2", async () => {
    // Step 1: Initialize session
    const initReq = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "init" }),
    });

    const initRes = await POST(initReq);
    const initData = await initRes.json();
    const sessionId = initData.sessionId;
    createdSessionIds.push(sessionId);

    assert.equal(initData.task, 1);

    // Step 2: Submit clicks on task 1
    // Default task 1 has correct_coordinates: [{ x: 0.15, y: 0.45, z: 1.0 }] with drag type
    const submitReq = new Request("http://localhost:3000/api/cubicon-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clicks: [
          { x: 0.15, y: 0.45, z: 1.0, t: 100 },
        ],
      }),
    });

    const submitRes = await POST(submitReq);
    assert.equal(submitRes.status, 200);

    const submitData = await submitRes.json();
    assert.equal(submitData.completed, false, "Sequence should not be completed after task 1");
    assert.equal(submitData.task, 2, "Must advance to task 2");
    assert.ok(submitData.heading.includes("Puzzle 2"), "Heading must indicate Puzzle 2");
    assert.equal(submitData.score, 1, "Must record 1 passed puzzle");

    const sessionInDb = await prisma.cubiconSession.findUnique({
      where: { session_id: sessionId },
    });
    assert.equal(sessionInDb?.taskIndex, 1, "Session taskIndex must advance to 1 in database");
    assert.equal(sessionInDb?.passedPuzzles, 1);
  });
});
