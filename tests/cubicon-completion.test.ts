import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPLETION_MESSAGES,
  evaluateSequencePass,
  POST,
} from "../app/api/cubicon-data/route";
import { prisma } from "../lib/prisma";

test("Cubicon Completion Messages and Pass Evaluation Test Suite", async (t) => {
  await t.test("1. COMPLETION_MESSAGES Constant Structure and Exact Copy", () => {
    // Verify success copy
    assert.equal(
      COMPLETION_MESSAGES.success.heading,
      "Congratulations! You are human."
    );
    assert.equal(
      COMPLETION_MESSAGES.success.description,
      "Next we offer you a number of choices below. Please make a selection and we thank you for considering Cubicon and BuyFacts."
    );

    // Verify rejection copy
    assert.equal(
      COMPLETION_MESSAGES.rejection.heading,
      "Thank you for participating"
    );
    assert.equal(
      COMPLETION_MESSAGES.rejection.description,
      "Sorry our survey has exceeded the number of desired respondents. We hope to see you again when we reach out again. Please select from the choices below."
    );
  });

  await t.test("2. evaluateSequencePass logic: happy paths, edge cases, boundary values", () => {
    // Default threshold (0.66)
    // 3 tasks: 2 passes -> 2/3 = 0.6667 >= 0.66 -> pass
    assert.equal(evaluateSequencePass(2, 3, 0.66), true);
    // 3 tasks: 1 pass -> 1/3 = 0.3333 < 0.66 -> fail
    assert.equal(evaluateSequencePass(1, 3, 0.66), false);
    // 3 tasks: 3 passes -> 1.0 >= 0.66 -> pass
    assert.equal(evaluateSequencePass(3, 3, 0.66), true);
    // 3 tasks: 0 passes -> 0.0 < 0.66 -> fail
    assert.equal(evaluateSequencePass(0, 3, 0.66), false);

    // Boundary at exact threshold (e.g. 2 out of 4 with 0.50 threshold)
    assert.equal(evaluateSequencePass(2, 4, 0.5), true);
    assert.equal(evaluateSequencePass(1, 4, 0.5), false);

    // Floating-point edge tolerance (threshold - 0.0001)
    assert.equal(evaluateSequencePass(2, 3, 2 / 3), true);

    // Absolute count threshold (> 1)
    assert.equal(evaluateSequencePass(3, 5, 3), true);
    assert.equal(evaluateSequencePass(2, 5, 3), false);

    // Edge cases: total tasks <= 0
    assert.equal(evaluateSequencePass(0, 0, 0.66), true);
    assert.equal(evaluateSequencePass(1, -1, 0.66), true);
  });

  await t.test("3. API Integration: Successful sequence completion returns success messages", async () => {
    // Create an isolated sequence with 1 task
    const seqSlug = `test-seq-pass-${Date.now()}`;
    const seq = await prisma.cubiconSequence.create({
      data: {
        slug: seqSlug,
        title: "Pass Test Sequence",
        pass_threshold: 0.5,
        is_active: false,
      },
    });

    const task = await prisma.cubiconTask.create({
      data: {
        sequence_id: seq.id,
        taskIndex: 0,
        heading: "Task 1",
        description: "Task 1 Description",
        screen: "Active_front",
        image: "https://example.com/art1.webp",
        question_type: "Selection",
        start_point: JSON.stringify({ x: 0.0, y: 0.0, z: 1.0 }),
        tolerance: 0.5,
        isFinal: true,
      },
    });

    try {
      // 1. Initialize session and set to taskIndex 0 (active task 0)
      const sessionId = `test_sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await prisma.cubiconSession.create({
        data: {
          session_id: sessionId,
          sequence_id: seq.id,
          taskIndex: 0,
          user_email: "tester@example.com",
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      // 2. Submit click to complete the 1-task sequence
      const submitReq = new Request("http://localhost:3000/api/cubicon-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sequenceId: seq.id,
          clicks: {
            "1": { x: 0.0, y: 0.0, z: 1.0, t: 100 },
          },
        }),
      });
      const submitRes = await POST(submitReq);
      const submitData = await submitRes.json();

      assert.equal(submitData.completed, true);
      assert.equal(submitData.passed, true);
      assert.equal(submitData.heading, COMPLETION_MESSAGES.success.heading);
      assert.equal(
        submitData.description,
        COMPLETION_MESSAGES.success.description
      );
    } finally {
      // Cleanup
      await prisma.cubiconAttempt.deleteMany({
        where: { sequence_id: seq.id },
      });
      await prisma.cubiconSession.deleteMany({
        where: { sequence_id: seq.id },
      });
      await prisma.cubiconTask.deleteMany({
        where: { sequence_id: seq.id },
      });
      await prisma.cubiconSequence.delete({
        where: { id: seq.id },
      });
    }
  });

  await t.test("4. API Integration: Failed sequence completion returns rejection messages", async () => {
    // Create an isolated sequence with 1 task
    const seqSlug = `test-seq-fail-${Date.now()}`;
    const seq = await prisma.cubiconSequence.create({
      data: {
        slug: seqSlug,
        title: "Fail Test Sequence",
        pass_threshold: 0.5,
        is_active: false,
      },
    });

    const task = await prisma.cubiconTask.create({
      data: {
        sequence_id: seq.id,
        taskIndex: 0,
        heading: "Task 1",
        description: "Task 1 Description",
        screen: "Active_front",
        image: "https://example.com/art1.webp",
        question_type: "Selection",
        start_point: JSON.stringify({ x: 0.0, y: 0.0, z: 1.0 }),
        tolerance: 0.2,
        isFinal: true,
      },
    });

    try {
      // 1. Initialize session and set to taskIndex 0 (active task 0)
      const sessionId = `test_sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await prisma.cubiconSession.create({
        data: {
          session_id: sessionId,
          sequence_id: seq.id,
          taskIndex: 0,
          user_email: "tester-fail@example.com",
          passedPuzzles: 0,
          totalPuzzlesAttempted: 0,
        },
      });

      // 2. Submit wrong/failing click to complete the 1-task sequence with failure
      const submitReq = new Request("http://localhost:3000/api/cubicon-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sequenceId: seq.id,
          clicks: {
            "1": { x: 5.0, y: 5.0, z: 1.0, t: 100 },
          },
        }),
      });
      const submitRes = await POST(submitReq);
      const submitData = await submitRes.json();

      assert.equal(submitData.completed, true);
      assert.equal(submitData.passed, false);
      assert.equal(submitData.heading, COMPLETION_MESSAGES.rejection.heading);
      assert.equal(
        submitData.description,
        COMPLETION_MESSAGES.rejection.description
      );
    } finally {
      // Cleanup
      await prisma.cubiconAttempt.deleteMany({
        where: { sequence_id: seq.id },
      });
      await prisma.cubiconSession.deleteMany({
        where: { sequence_id: seq.id },
      });
      await prisma.cubiconTask.deleteMany({
        where: { sequence_id: seq.id },
      });
      await prisma.cubiconSequence.delete({
        where: { id: seq.id },
      });
    }
  });
});
