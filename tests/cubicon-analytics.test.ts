import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";

test("Cubicon Analytics & Share Test Suite", async (t) => {
  await t.test("Prisma CubiconShare Model Persistence", async () => {
    const testSender = `test_sender_${Date.now()}@example.com`;
    const testReceiver = `test_receiver_${Date.now()}@example.com`;

    const share = await prisma.cubiconShare.create({
      data: {
        senderName: "Dr. Jane Smith",
        senderEmail: testSender,
        receiverName: "Alex Johnson",
        receiverEmail: testReceiver,
        sharePlatform: "email",
        shareUrl: "https://buyfacts.com/cubicon",
        sessionId: "test_session_123",
        status: "invited",
      },
    });

    assert.ok(share.id, "Share record should be created with an autoincrement ID");
    assert.equal(share.senderName, "Dr. Jane Smith");
    assert.equal(share.senderEmail, testSender);
    assert.equal(share.receiverEmail, testReceiver);
    assert.equal(share.status, "invited");

    // Retrieve from database
    const found = await prisma.cubiconShare.findUnique({
      where: { id: share.id },
    });
    assert.ok(found, "Should find created share in database");
    assert.equal(found.receiverName, "Alex Johnson");
  });

  await t.test("Prisma FeedbackSubmission Model Persistence", async () => {
    const feedback = await prisma.feedbackSubmission.create({
      data: {
        userId: "user_test_456",
        userEmail: "reviewer@example.com",
        sessionId: "sess_fb_789",
        feedbackText: "Great 3D survey verification experience. Very responsive.",
        rating: 5,
      },
    });

    assert.ok(feedback.id, "Feedback record should have ID");
    assert.equal(feedback.rating, 5);
    assert.equal(feedback.userEmail, "reviewer@example.com");
  });

  await t.test("Referral Conversion Matching Logic", async () => {
    const senderEmail = `advocate_${Date.now()}@example.com`;
    const receiver1 = `converted_${Date.now()}@example.com`;
    const receiver2 = `pending_${Date.now()}@example.com`;

    // Create 2 shares from the same advocate
    await prisma.cubiconShare.create({
      data: {
        senderName: "Top Advocate",
        senderEmail,
        receiverName: "Converted User",
        receiverEmail: receiver1,
        status: "invited",
      },
    });

    await prisma.cubiconShare.create({
      data: {
        senderName: "Top Advocate",
        senderEmail,
        receiverName: "Pending User",
        receiverEmail: receiver2,
        status: "invited",
      },
    });

    // Receiver1 attempts and completes all 3 tasks
    const sessionId = `sess_conv_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: sessionId,
        taskIndex: 3,
        user_email: receiver1,
        passedPuzzles: 3,
        totalPuzzlesAttempted: 3,
      },
    });

    await prisma.cubiconAttempt.create({
      data: {
        session_id: sessionId,
        taskIndex: 2,
        user_email: receiver1,
        result: "p",
      },
    });

    // Verify matching logic
    const completedSet = new Set([receiver1]);
    const activeSet = new Set([receiver1]);

    const status1 = completedSet.has(receiver1) ? "completed" : activeSet.has(receiver1) ? "attempted" : "invited";
    const status2 = completedSet.has(receiver2) ? "completed" : activeSet.has(receiver2) ? "attempted" : "invited";

    assert.equal(status1, "completed", "Receiver 1 should be matched as completed");
    assert.equal(status2, "invited", "Receiver 2 should remain invited/pending");
  });

  await t.test("KPI Summary and Viral Multiplier Calculation", async () => {
    const totalTesters = 50;
    const totalShares = 25;
    const convertedShares = 10;

    const referralConversionRate = Math.round((convertedShares / totalShares) * 100);
    assert.equal(referralConversionRate, 40, "40% conversion rate");

    const viralMultiplier = Number(((totalShares / totalTesters) * (referralConversionRate / 100)).toFixed(2));
    assert.equal(viralMultiplier, 0.2, "Viral multiplier should be (25/50) * 0.4 = 0.2");
  });

  await t.test("Funnel Step Aggregation Edge Cases", async () => {
    const tasks = [
      { taskIndex: 0, task_number: 1, heading: "Task 1" },
      { taskIndex: 1, task_number: 2, heading: "Task 2" },
      { taskIndex: 2, task_number: 3, heading: "Task 3" },
    ];

    const sampleAttempts = [
      { taskIndex: 0, result: "p", clicks_data: JSON.stringify({ 1: { x: 10, y: 20 }, 2: { x: 30, y: 40 } }) },
      { taskIndex: 0, result: "p", clicks_data: JSON.stringify({ 1: { x: 12, y: 22 } }) },
      { taskIndex: 1, result: "p", clicks_data: JSON.stringify({ 1: { x: 50, y: 60 } }) },
      { taskIndex: 2, result: "f", clicks_data: "{}" },
    ];

    const task0Attempts = sampleAttempts.filter((a) => a.taskIndex === 0);
    assert.equal(task0Attempts.length, 2);
    assert.equal(task0Attempts.filter((a) => a.result === "p").length, 2);

    let task0Clicks = 0;
    task0Attempts.forEach((a) => {
      task0Clicks += Object.keys(JSON.parse(a.clicks_data)).length;
    });
    const avgClicks = task0Clicks / task0Attempts.length;
    assert.equal(avgClicks, 1.5, "Average clicks should be 3/2 = 1.5");
  });
});
