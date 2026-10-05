import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateScoringDecision,
  sanitizePublicPayload,
  CUBICON_MESSAGES,
} from "../lib/cubicon/scoring-engine";

test("Cubicon Scoring Engine - Section 7.4 Test Suite", async (t) => {
  await t.test("1. Path 1: Three correct out of three passes immediately with fireworks", () => {
    const attempts = [
      { taskIndex: 0, result: "p" as const },
      { taskIndex: 1, result: "p" as const },
      { taskIndex: 2, result: "p" as const },
    ];

    const decision = evaluateScoringDecision(attempts, 3, true);

    assert.equal(decision.decision, "pass");
    assert.equal(decision.isCompleted, true);
    assert.equal(decision.passed, true);
    assert.equal(decision.fireworks, true);
    assert.equal(decision.internalStage, "passed_clean_3_of_3");
    assert.equal(decision.publicHeading, CUBICON_MESSAGES.success.heading);
    assert.equal(decision.publicDescription, CUBICON_MESSAGES.success.description);
  });

  await t.test("2. Path 2a: Two correct after three presents fourth task; fourth correct passes", () => {
    // 2 correct, 1 fail out of first 3
    const firstThreeAttempts = [
      { taskIndex: 0, result: "p" as const },
      { taskIndex: 1, result: "f" as const },
      { taskIndex: 2, result: "p" as const },
    ];

    const stage3Decision = evaluateScoringDecision(firstThreeAttempts, 3, true);
    assert.equal(stage3Decision.decision, "retest_fourth");
    assert.equal(stage3Decision.isCompleted, false);
    assert.equal(stage3Decision.nextTaskIndex, 3);
    assert.equal(stage3Decision.expectedTotalTasks, 4);
    assert.equal(stage3Decision.isFinalTask, true);
    assert.equal(stage3Decision.internalStage, "retest_triggered_after_task_3");

    // Fourth task answered correctly
    const allFourAttempts = [
      ...firstThreeAttempts,
      { taskIndex: 3, result: "p" as const },
    ];
    const finalDecision = evaluateScoringDecision(allFourAttempts, 3, true);

    assert.equal(finalDecision.decision, "pass");
    assert.equal(finalDecision.isCompleted, true);
    assert.equal(finalDecision.passed, true);
    assert.equal(finalDecision.fireworks, true);
    assert.equal(finalDecision.internalStage, "passed_after_retest_fourth_task");
    assert.equal(finalDecision.publicHeading, CUBICON_MESSAGES.success.heading);
  });

  await t.test("3. Path 2b: Two correct after three presents fourth task; fourth incorrect fails", () => {
    // 2 correct, 1 fail out of first 3 (fail on task 1)
    const firstThreeAttempts = [
      { taskIndex: 0, result: "f" as const },
      { taskIndex: 1, result: "p" as const },
      { taskIndex: 2, result: "p" as const },
    ];

    const stage3Decision = evaluateScoringDecision(firstThreeAttempts, 3, true);
    assert.equal(stage3Decision.decision, "retest_fourth");

    // Fourth task answered incorrectly
    const allFourAttempts = [
      ...firstThreeAttempts,
      { taskIndex: 3, result: "f" as const },
    ];
    const finalDecision = evaluateScoringDecision(allFourAttempts, 3, true);

    assert.equal(finalDecision.decision, "fail");
    assert.equal(finalDecision.isCompleted, true);
    assert.equal(finalDecision.passed, false);
    assert.equal(finalDecision.fireworks, false);
    assert.equal(finalDecision.internalStage, "failed_after_fourth_task");
    assert.equal(finalDecision.publicHeading, CUBICON_MESSAGES.rejection.heading);
    assert.equal(finalDecision.publicDescription, CUBICON_MESSAGES.rejection.description);
  });

  await t.test("4. Path 3a: Two incorrect among the first two fails immediately at task 2", () => {
    // Fails task 1 and task 2
    const attempts = [
      { taskIndex: 0, result: "f" as const },
      { taskIndex: 1, result: "f" as const },
    ];

    const decision = evaluateScoringDecision(attempts, 3, true);

    assert.equal(decision.decision, "fail");
    assert.equal(decision.isCompleted, true);
    assert.equal(decision.passed, false);
    assert.equal(decision.fireworks, false);
    assert.equal(decision.internalStage, "early_two_incorrect_at_task_2");
    assert.equal(decision.publicHeading, CUBICON_MESSAGES.rejection.heading);
  });

  await t.test("5. Path 3b: Two incorrect among first three (pass 1, fail 2 and 3) fails at task 3", () => {
    const attempts = [
      { taskIndex: 0, result: "p" as const },
      { taskIndex: 1, result: "f" as const },
      { taskIndex: 2, result: "f" as const },
    ];

    const decision = evaluateScoringDecision(attempts, 3, true);

    assert.equal(decision.decision, "fail");
    assert.equal(decision.isCompleted, true);
    assert.equal(decision.passed, false);
    assert.equal(decision.internalStage, "two_incorrect_at_task_3");
    assert.equal(decision.publicHeading, CUBICON_MESSAGES.rejection.heading);
  });

  await t.test("6. Mid-sequence progression continues without completing prematurely", () => {
    // After task 1 (pass)
    const afterOnePass = [{ taskIndex: 0, result: "p" as const }];
    const res1 = evaluateScoringDecision(afterOnePass, 3, true);
    assert.equal(res1.decision, "continue");
    assert.equal(res1.isCompleted, false);
    assert.equal(res1.nextTaskIndex, 1);

    // After task 1 (fail)
    const afterOneFail = [{ taskIndex: 0, result: "f" as const }];
    const res2 = evaluateScoringDecision(afterOneFail, 3, true);
    assert.equal(res2.decision, "continue");
    assert.equal(res2.isCompleted, false);
    assert.equal(res2.nextTaskIndex, 1);

    // After task 2 with 1 pass and 1 fail
    const afterOnePassOneFail = [
      { taskIndex: 0, result: "p" as const },
      { taskIndex: 1, result: "f" as const },
    ];
    const res3 = evaluateScoringDecision(afterOnePassOneFail, 3, true);
    assert.equal(res3.decision, "continue");
    assert.equal(res3.isCompleted, false);
    assert.equal(res3.nextTaskIndex, 2);
  });

  await t.test("7. Single-task sequence edge cases support backward compatibility", () => {
    const singlePass = [{ taskIndex: 0, result: "p" as const }];
    const decPass = evaluateScoringDecision(singlePass, 1, false);
    assert.equal(decPass.isCompleted, true);
    assert.equal(decPass.passed, true);
    assert.equal(decPass.fireworks, true);

    const singleFail = [{ taskIndex: 0, result: "f" as const }];
    const decFail = evaluateScoringDecision(singleFail, 1, false);
    assert.equal(decFail.isCompleted, true);
    assert.equal(decFail.passed, false);
    assert.equal(decFail.fireworks, false);
  });

  await t.test("8. sanitizePublicPayload ensures internal diagnostic details are never leaked", () => {
    const rawData = {
      sessionId: "sess_12345",
      sequenceId: 1,
      sequenceTitle: "Garden Verification",
      ofTasks: 4,
      task: 4,
      heading: CUBICON_MESSAGES.rejection.heading,
      description: CUBICON_MESSAGES.rejection.description,
      screen: "Active_front",
      image: "https://example.com/test.webp",
      rotation: [0, 0, 0],
      rotationInterval: 15,
      rotationDirection: "left",
      isFinal: true,
      completed: true,
      passed: false,
      fireworks: false,
      score: 2,
      result: "f" as const,
      // Attempting to inject internal diagnostic fields
      internalStage: "failed_after_fourth_task",
      detailedLogic: "User failed question 4 after scoring 2 out of 3",
    };

    const sanitized = sanitizePublicPayload(rawData as any);

    assert.equal(sanitized.sessionId, "sess_12345");
    assert.equal(sanitized.completed, true);
    assert.equal(sanitized.passed, false);
    assert.equal(sanitized.fireworks, false);
    assert.equal(sanitized.heading, CUBICON_MESSAGES.rejection.heading);
    // Ensure internal fields are absent
    assert.equal("internalStage" in sanitized, false);
    assert.equal("detailedLogic" in sanitized, false);
  });

  await t.test("9. API Route Integration: Retry resets session back to task 1", async () => {
    const { POST } = await import("../app/api/cubicon-data/route");
    const { prisma } = await import("../lib/prisma");

    const testSessionId = `test_sess_retry_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: testSessionId,
        taskIndex: 2,
        passedPuzzles: 1,
        totalPuzzlesAttempted: 2,
        previous_result: "in_progress_task_2",
      },
    });

    try {
      const retryReq = new Request("http://localhost:3000/api/cubicon-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: testSessionId,
          action: "retry",
        }),
      });

      const res = await POST(retryReq);
      const data = await res.json();

      assert.equal(data.completed, false);
      assert.equal(data.task, 1);

      const updated = await prisma.cubiconSession.findUnique({
        where: { session_id: testSessionId },
      });
      assert.equal(updated?.taskIndex, 0);
      assert.equal(updated?.passedPuzzles, 0);
      assert.equal(updated?.totalPuzzlesAttempted, 0);
    } finally {
      await prisma.cubiconSession.deleteMany({
        where: { session_id: testSessionId },
      });
    }
  });

  await t.test("10. API Route Integration: Terminal State Lockdown prevents altering completed results", async () => {
    const { POST } = await import("../app/api/cubicon-data/route");
    const { prisma } = await import("../lib/prisma");

    const testSessionId = `test_sess_lock_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: testSessionId,
        taskIndex: 3,
        passedPuzzles: 3,
        totalPuzzlesAttempted: 3,
        previous_result: "passed_clean_3_of_3",
      },
    });

    try {
      // Attempt to submit another click to a completed passed session
      const submitReq = new Request("http://localhost:3000/api/cubicon-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: testSessionId,
          clicks: { "1": { x: 99.0, y: 99.0, z: 1.0 } },
        }),
      });

      const res = await POST(submitReq);
      const data = await res.json();

      // State remains locked to passed
      assert.equal(data.completed, true);
      assert.equal(data.passed, true);
      assert.equal(data.fireworks, true);
    } finally {
      await prisma.cubiconSession.deleteMany({
        where: { session_id: testSessionId },
      });
    }
  });

  await t.test("11. API Route Integration: Duplicate click protection handles already-evaluated tasks idempotently", async () => {
    const { POST } = await import("../app/api/cubicon-data/route");
    const { prisma } = await import("../lib/prisma");

    const testSessionId = `test_sess_dup_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: testSessionId,
        taskIndex: 1, // Currently at task index 1 (Task 2)
        passedPuzzles: 1,
        totalPuzzlesAttempted: 1,
        previous_result: "in_progress_task_1",
      },
    });

    try {
      // Submitting an old click for taskIndex 0
      const dupReq = new Request("http://localhost:3000/api/cubicon-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: testSessionId,
          taskIndex: 0,
          clicks: { "1": { x: 0.15, y: 0.45, z: 1.0 } },
        }),
      });

      const res = await POST(dupReq);
      const data = await res.json();

      // Session did not advance or double-count
      assert.equal(data.completed, false);
      assert.equal(data.task, 2);

      const checkSession = await prisma.cubiconSession.findUnique({
        where: { session_id: testSessionId },
      });
      assert.equal(checkSession?.taskIndex, 1);
      assert.equal(checkSession?.totalPuzzlesAttempted, 1);
    } finally {
      await prisma.cubiconSession.deleteMany({
        where: { session_id: testSessionId },
      });
    }
  });
});
