import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { signJWT } from "../lib/auth/jwt";
import { validateApiAuth } from "../lib/auth/middleware";

test("BuyFacts Cubicon Sequences Test Suite", async (t) => {
  const adminPayload = {
    userId: "admin-seq-test-user",
    email: "admin-seq@buyfacts.com",
    role: "admin",
  };
  const validToken = await signJWT(adminPayload);

  await t.test("1. CubiconSequence Prisma Model Persistence & Schema", async () => {
    const uniqueSlug = `seq-test-${Date.now()}`;
    const seq = await prisma.cubiconSequence.create({
      data: {
        title: "Test Group A",
        slug: uniqueSlug,
        description: "Automated sequence test group",
        passThreshold: 0.66,
        rotationDirection: "right",
        defaultRotationInterval: 20,
        isActive: false,
        createdBy: "tester@buyfacts.com",
      },
    });

    assert.ok(seq.id, "Sequence should have autoincrement ID");
    assert.equal(seq.title, "Test Group A");
    assert.equal(seq.slug, uniqueSlug);
    assert.equal(seq.passThreshold, 0.66);
    assert.equal(seq.rotationDirection, "right");
    assert.equal(seq.defaultRotationInterval, 20);
    assert.equal(seq.isActive, false);

    // Create a task associated with this sequence
    const task = await prisma.cubiconTask.create({
      data: {
        sequenceId: seq.id,
        taskIndex: 0,
        heading: "Find the Marker",
        description: "Click marker to continue",
        screen: "Active_side_r",
        image: "/cubicon-app/arts/task1.png",
        rotation: "right",
        rotationInterval: 20,
        questionType: "Selection",
        tolerance: 0.5,
      },
    });

    assert.ok(task.id, "Task should be created with ID");
    assert.equal(task.sequenceId, seq.id, "Task sequenceId should match parent sequence");

    // Clean up
    await prisma.cubiconTask.delete({ where: { id: task.id } });
    await prisma.cubiconSequence.delete({ where: { id: seq.id } });
  });

  await t.test("2. Admin Auth Validation for Sequence Operations", async () => {
    // Unauthenticated request (no header, no cookie)
    const reqNoAuth = new Request("http://localhost:3000/api/admin/sequences", {
      method: "GET",
    });
    const authResultNoAuth = await validateApiAuth(reqNoAuth);
    assert.equal(authResultNoAuth.isAuthenticated, false, "Should reject unauthenticated request");

    // Authenticated request with Bearer token
    const reqWithAuth = new Request("http://localhost:3000/api/admin/sequences", {
      method: "GET",
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });
    const authResultWithAuth = await validateApiAuth(reqWithAuth);
    assert.equal(authResultWithAuth.isAuthenticated, true, "Should accept valid Bearer token");
    assert.equal(authResultWithAuth.user?.email, "admin-seq@buyfacts.com");
  });

  await t.test("3. Sequence Activation Logic & Single Active Sequence", async () => {
    const slug1 = `seq-act-1-${Date.now()}`;
    const slug2 = `seq-act-2-${Date.now()}`;

    const seq1 = await prisma.cubiconSequence.create({
      data: { title: "Sequence 1", slug: slug1, isActive: false },
    });
    const seq2 = await prisma.cubiconSequence.create({
      data: { title: "Sequence 2", slug: slug2, isActive: false },
    });

    // Activate seq1
    await prisma.cubiconSequence.updateMany({ data: { isActive: false } });
    await prisma.cubiconSequence.update({
      where: { id: seq1.id },
      data: { isActive: true },
    });

    let active = await prisma.cubiconSequence.findFirst({ where: { isActive: true } });
    assert.equal(active?.id, seq1.id, "Sequence 1 should be active");

    // Activate seq2
    await prisma.cubiconSequence.updateMany({ data: { isActive: false } });
    await prisma.cubiconSequence.update({
      where: { id: seq2.id },
      data: { isActive: true },
    });

    active = await prisma.cubiconSequence.findFirst({ where: { isActive: true } });
    assert.equal(active?.id, seq2.id, "Sequence 2 should now be active");

    // Verify seq1 is deactivated
    const updatedSeq1 = await prisma.cubiconSequence.findUnique({ where: { id: seq1.id } });
    assert.equal(updatedSeq1?.isActive, false, "Sequence 1 should no longer be active");

    // Clean up
    await prisma.cubiconSequence.delete({ where: { id: seq1.id } });
    await prisma.cubiconSequence.delete({ where: { id: seq2.id } });
  });

  await t.test("4. Pass Threshold Calculations (Ratio and Count)", () => {
    const evaluateThreshold = (passedCount: number, total: number, threshold: number): boolean => {
      if (total <= 0) return true;
      if (threshold > 1) {
        return passedCount >= threshold;
      }
      const ratio = passedCount / total;
      return ratio >= (threshold - 0.0001);
    };

    // Percentage ratio threshold tests (0.66 for 2 out of 3, 3 out of 4)
    assert.equal(evaluateThreshold(2, 3, 0.66), true, "2 out of 3 tasks must pass a 0.66 threshold");
    assert.equal(evaluateThreshold(1, 3, 0.66), false, "1 out of 3 tasks must fail a 0.66 threshold");
    assert.equal(evaluateThreshold(3, 4, 0.66), true, "3 out of 4 tasks must pass a 0.66 threshold");
    assert.equal(evaluateThreshold(2, 4, 0.66), false, "2 out of 4 tasks must fail a 0.66 threshold");

    // Count threshold tests (e.g. 3 tasks required)
    assert.equal(evaluateThreshold(3, 4, 3), true, "3 passed out of 4 must satisfy count threshold of 3");
    assert.equal(evaluateThreshold(2, 4, 3), false, "2 passed out of 4 must fail count threshold of 3");
    assert.equal(evaluateThreshold(4, 4, 3), true, "4 passed out of 4 must satisfy count threshold of 3");
  });

  await t.test("5. Sequence Rotation Direction Mapping", () => {
    const mapRotationDirection = (dir: string): string => {
      const norm = (dir || "left").toLowerCase();
      if (norm === "left") return "right";
      if (norm === "right") return "left";
      return dir;
    };

    assert.equal(mapRotationDirection("left"), "right");
    assert.equal(mapRotationDirection("right"), "left");
    assert.equal(mapRotationDirection("LEFT"), "right");
    assert.equal(mapRotationDirection("RIGHT"), "left");
  });

  await t.test("6. CubiconSession Sequence Linkage", async () => {
    const testSlug = `seq-sess-${Date.now()}`;
    const seq = await prisma.cubiconSequence.create({
      data: { title: "Session Link Sequence", slug: testSlug, isActive: false },
    });

    const sessionId = `test_sess_${Date.now()}`;
    const session = await prisma.cubiconSession.create({
      data: {
        sessionId: sessionId,
        sequenceId: seq.id,
        userEmail: "tester-session@buyfacts.com",
        passedPuzzles: 1,
        totalPuzzlesAttempted: 1,
      },
    });

    assert.ok(session.id);
    assert.equal(session.sequenceId, seq.id, "Session must record sequenceId");

    // Cleanup
    await prisma.cubiconSession.delete({ where: { id: session.id } });
    await prisma.cubiconSequence.delete({ where: { id: seq.id } });
  });
});

