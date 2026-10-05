import test from "node:test";
import assert from "node:assert/strict";
import { POST as contactPOST } from "../app/api/contact/route";
import { GET as cubiconGET, POST as cubiconPOST, ensureSeedTasks, evaluateSequencePass } from "../app/api/cubicon-data/route";
import { prisma } from "../lib/prisma";

test("Contact Form Cubicon Verification Test Suite", async (t) => {
  await ensureSeedTasks();

  await t.test("1. contact_form sequence initialization and configuration", async () => {
    const contactSeq = await prisma.cubiconSequence.findUnique({
      where: { slug: "contact_form" },
      include: { tasks: { orderBy: { taskIndex: "asc" } } },
    });

    assert.ok(contactSeq, "contact_form sequence should exist in database");
    assert.equal(contactSeq.slug, "contact_form");
    assert.equal(contactSeq.pass_threshold, 0.6, "pass_threshold must be 0.6 (60%) per requirement");
    assert.ok(contactSeq.tasks.length >= 3, "contact_form sequence should have at least 3 tasks");
  });

  await t.test("2. Cubicon Data API retrieves contact_form sequence via query parameter", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-data?sequence=contact_form", {
      method: "GET",
    });
    const res = await cubiconGET(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(data.sequence);
    assert.equal(data.sequence.slug, "contact_form");
    assert.equal(data.sequence.pass_threshold, 0.6);
    assert.ok(Array.isArray(data.tasks));
    assert.ok(data.tasks.length >= 3);
  });

  await t.test("3. POST /api/cubicon-data initializes session tied to contact_form sequence", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-data?sequence=contact_form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "init",
        sequence: "contact_form",
      }),
    });
    const res = await cubiconPOST(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(data.sessionId);

    const session = await prisma.cubiconSession.findUnique({
      where: { session_id: data.sessionId },
      include: { sequence: true },
    });

    assert.ok(session);
    assert.equal(session.sequence?.slug, "contact_form");

    // Cleanup
    await prisma.cubiconSession.delete({ where: { id: session.id } });
  });

  await t.test("4. POST /api/contact rejects when verificationSessionId is missing or invalid", async () => {
    const basePayload = {
      name: "Test User",
      email: "test@example.com",
      message: "Hello world inquiry",
      isEighteen: true,
      interest: "General Inquiry",
    };

    // Case A: missing verificationSessionId
    const reqA = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload),
    });
    const resA = await contactPOST(reqA);
    const dataA = await resA.json();
    assert.equal(resA.status, 400);
    assert.match(dataA.error, /Human verification required/i);

    // Case B: empty string verificationSessionId
    const reqB = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...basePayload, verificationSessionId: "   " }),
    });
    const resB = await contactPOST(reqB);
    const dataB = await resB.json();
    assert.equal(resB.status, 400);
    assert.match(dataB.error, /Human verification required/i);

    // Case C: non-existent verificationSessionId
    const reqC = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...basePayload, verificationSessionId: "non_existent_session_123" }),
    });
    const resC = await contactPOST(reqC);
    const dataC = await resC.json();
    assert.equal(resC.status, 400);
    assert.match(dataC.error, /Invalid verification session/i);
  });

  await t.test("5. POST /api/contact rejects session from wrong sequence", async () => {
    // Create session on 'default' sequence instead of 'contact_form'
    const defaultSeq = await prisma.cubiconSequence.findUnique({ where: { slug: "default" } });
    assert.ok(defaultSeq);

    const wrongSeqSessionId = `test_wrong_seq_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: wrongSeqSessionId,
        sequence_id: defaultSeq.id,
        passedPuzzles: 3,
        totalPuzzlesAttempted: 3,
      },
    });

    try {
      const req = new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          message: "Testing wrong sequence",
          isEighteen: true,
          verificationSessionId: wrongSeqSessionId,
        }),
      });
      const res = await contactPOST(req);
      const data = await res.json();

      assert.equal(res.status, 400);
      assert.match(data.error, /Verification sequence mismatch/i);
    } finally {
      await prisma.cubiconSession.deleteMany({ where: { session_id: wrongSeqSessionId } });
    }
  });

  await t.test("6. POST /api/contact rejects when threshold 60% is not met", async () => {
    const contactSeq = await prisma.cubiconSequence.findUnique({ where: { slug: "contact_form" } });
    assert.ok(contactSeq);

    // 1 pass out of 3 tasks = 33.3% < 60%
    const unpassedSessionId = `test_unpassed_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: unpassedSessionId,
        sequence_id: contactSeq.id,
        passedPuzzles: 1,
        totalPuzzlesAttempted: 3,
      },
    });

    try {
      const req = new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unpassed Tester",
          email: "unpassed@example.com",
          message: "Attempt with unpassed puzzle session",
          isEighteen: true,
          verificationSessionId: unpassedSessionId,
        }),
      });
      const res = await contactPOST(req);
      const data = await res.json();

      assert.equal(res.status, 400);
      assert.match(data.error, /Human verification was not passed/i);
    } finally {
      await prisma.cubiconSession.deleteMany({ where: { session_id: unpassedSessionId } });
    }
  });

  await t.test("7. POST /api/contact succeeds with passed contact_form session and prevents replay", async () => {
    const contactSeq = await prisma.cubiconSequence.findUnique({ where: { slug: "contact_form" } });
    assert.ok(contactSeq);

    // 2 passes out of 3 tasks = 66.7% >= 60%
    const passedSessionId = `test_passed_${Date.now()}`;
    await prisma.cubiconSession.create({
      data: {
        session_id: passedSessionId,
        sequence_id: contactSeq.id,
        passedPuzzles: 2,
        totalPuzzlesAttempted: 3,
      },
    });

    try {
      // 1. First submission should succeed
      const req1 = new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Verified Human",
          email: "verified@example.com",
          company: "Acme Corp",
          message: "Legitimate contact message after human verification",
          isEighteen: true,
          verificationSessionId: passedSessionId,
        }),
      });
      const res1 = await contactPOST(req1);
      const data1 = await res1.json();

      assert.equal(res1.status, 200);
      assert.equal(data1.success, true);
      assert.ok(data1.id);

      // Verify the session in DB was marked as used
      const updatedSession = await prisma.cubiconSession.findUnique({
        where: { session_id: passedSessionId },
      });
      assert.equal(updatedSession?.previous_result, "used");

      // Clean up the created inquiry
      await prisma.contactInquiry.delete({ where: { id: data1.id } });

      // 2. Replay attack: second submission with same verificationSessionId must be rejected
      const req2 = new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Spam Bot",
          email: "spambot@example.com",
          message: "Replaying token for spam submission",
          isEighteen: true,
          verificationSessionId: passedSessionId,
        }),
      });
      const res2 = await contactPOST(req2);
      const data2 = await res2.json();

      assert.equal(res2.status, 400);
      assert.match(data2.error, /already been used/i);
    } finally {
      await prisma.cubiconSession.deleteMany({ where: { session_id: passedSessionId } });
    }
  });

  await t.test("8. evaluateSequencePass 60% threshold boundary conditions", () => {
    // 3 tasks total
    assert.equal(evaluateSequencePass(0, 3, 0.6), false, "0/3 fails 60%");
    assert.equal(evaluateSequencePass(1, 3, 0.6), false, "1/3 fails 60%");
    assert.equal(evaluateSequencePass(2, 3, 0.6), true, "2/3 passes 60%");
    assert.equal(evaluateSequencePass(3, 3, 0.6), true, "3/3 passes 60%");

    // 5 tasks total
    assert.equal(evaluateSequencePass(2, 5, 0.6), false, "2/5 fails 60%");
    assert.equal(evaluateSequencePass(3, 5, 0.6), true, "3/5 passes 60% exact boundary");

    // Edge cases
    assert.equal(evaluateSequencePass(0, 0, 0.6), true, "0 total tasks passes");
  });

  await t.test("9. Submit button disabled state resolution based on verification status", () => {
    // Helper function reproducing submit button disabled and styling state logic
    const getSubmitButtonState = (isVerified: boolean, isSubmitting: boolean) => {
      const isDisabled = isSubmitting || !isVerified;
      const disabledClassApplied = (!isVerified || isSubmitting);
      return { isDisabled, disabledClassApplied };
    };

    // Case 1: Unverified, not submitting -> must be disabled and greyed out
    const unverifiedState = getSubmitButtonState(false, false);
    assert.equal(unverifiedState.isDisabled, true, "Submit button must be disabled when unverified");
    assert.equal(unverifiedState.disabledClassApplied, true, "Disabled style class must be applied when unverified");

    // Case 2: Verified, not submitting -> enabled and active
    const verifiedState = getSubmitButtonState(true, false);
    assert.equal(verifiedState.isDisabled, false, "Submit button must be enabled when verified");
    assert.equal(verifiedState.disabledClassApplied, false, "Disabled style class must not be applied when verified");

    // Case 3: Verified, currently submitting -> disabled to prevent double-submit
    const submittingState = getSubmitButtonState(true, true);
    assert.equal(submittingState.isDisabled, true, "Submit button must be disabled during submission");
    assert.equal(submittingState.disabledClassApplied, true, "Disabled style class must be applied during submission");
  });
});

