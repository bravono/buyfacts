import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { POST as registerPOST } from "../app/api/cubicon-registration/route";
import { GET as verifyGET } from "../app/api/verify-email/route";
import { prisma } from "../lib/prisma";

import { resetRateLimits } from "../lib/security/rate-limiter";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Cubicon Founding Client Registration Email Verification & Template Suite", async (t) => {
  const createdTokens: string[] = [];
  const createdRegistrationIds: string[] = [];
  const createdSessionIds: string[] = [];

  t.after(async () => {
    if (createdTokens.length > 0) {
      await prisma.emailVerification.deleteMany({
        where: { token: { in: createdTokens } },
      });
    }
    if (createdRegistrationIds.length > 0) {
      await prisma.cubiconRegistration.deleteMany({
        where: { id: { in: createdRegistrationIds } },
      });
    }
    if (createdSessionIds.length > 0) {
      await prisma.cubiconSession.deleteMany({
        where: { session_id: { in: createdSessionIds } },
      });
    }
  });

  await t.test("1. Registration API route places submission on hold awaiting verification", async () => {
    const testEmail = `founding_${Date.now()}@cyberdyne.com`;
    const req = new Request("http://localhost:3000/api/cubicon-registration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.200.1.55",
      },
      body: JSON.stringify({
        firstName: "Sarah",
        lastName: "Connor",
        email: testEmail,
        emailConfirm: testEmail,
        phone: "(555) 019-2834",
        urgency: "High",
        requestConfirmation: true,
        isEighteen: true,
        isUsBased: true,
        hp_website: "",
        selectedAreas: { interest: true, need: true },
        priorityScore: 75,
      }),
    });

    const res = await registerPOST(req);
    assert.equal(res.status, 200, "Registration route must return 200 OK");

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.verificationRequired, true, "Must require email verification");
    assert.ok(
      data.message.includes("placed on hold") || data.message.includes("verify your business email"),
      "Message must instruct user to verify email"
    );

    // Verify record exists in email_verifications table
    const verificationRecord = await prisma.emailVerification.findFirst({
      where: { email: testEmail },
    });
    assert.ok(verificationRecord, "Verification hold record must be created");
    assert.equal(verificationRecord.type, "founding_client");
    assert.equal(verificationRecord.verifiedAt, null, "Must not be verified yet");
    createdTokens.push(verificationRecord.token);

    // Crucial: Must NOT have created the cubiconRegistration record yet
    const prematurelyCreated = await prisma.cubiconRegistration.findFirst({
      where: { email: testEmail },
    });
    assert.equal(
      prematurelyCreated,
      null,
      "cubiconRegistration must NOT be created before email verification"
    );
  });

  await t.test("2. Verification endpoint activates registration and creates record only after token confirmation", async () => {
    const testEmail = `verified_${Date.now()}@acmeresearch.org`;
    const token = `token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const submissionId = `sub-${Date.now()}`;
    createdTokens.push(token);
    createdRegistrationIds.push(submissionId);

    const payload = JSON.stringify({
      id: submissionId,
      firstName: "Miles",
      lastName: "Dyson",
      name: "Miles Dyson",
      company: "Cyberdyne Systems",
      phone: "(555) 999-0000",
      email: testEmail,
      urgency: "High",
      requestConfirmation: true,
      isEighteen: true,
      isUsBased: true,
      selectedAreas: { interest: true },
      priorityScore: 80,
    });

    await prisma.emailVerification.create({
      data: {
        token,
        email: testEmail,
        type: "founding_client",
        payload,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Execute GET /api/verify-email?token=...
    const verifyReq = new Request(`http://localhost:3000/api/verify-email?token=${token}`);
    const verifyRes = await verifyGET(verifyReq);
    assert.equal(verifyRes.status, 200, "Verification must succeed with 200 OK");

    const html = await verifyRes.text();
    assert.ok(
      html.includes("Email Verified") || html.includes("Welcome to Cubicon"),
      "Response HTML must acknowledge verification"
    );
    assert.ok(
      html.includes("/payment") || html.includes("Payment Checkout"),
      "Response HTML must provide next steps to checkout"
    );

    // Verify record is now created in cubiconRegistration table
    const registered = await prisma.cubiconRegistration.findUnique({
      where: { id: submissionId },
    });
    assert.ok(registered, "cubiconRegistration record must now exist");
    assert.equal(registered.email, testEmail);
    assert.equal(registered.name, "Miles Dyson");
  });

  await t.test("3. Client Confirmation Email Template Excludes Raw Details and Personalizes Acknowledgement", () => {
    const resendFilePath = path.join(BUYFACTS_ROOT, "lib", "resend.ts");
    assert.ok(fs.existsSync(resendFilePath), "lib/resend.ts must exist");
    const resendContent = fs.readFileSync(resendFilePath, "utf-8");

    // Extract the client confirmation email section within sendCubiconRegistrationEmails
    const fnStart = resendContent.indexOf("export async function sendCubiconRegistrationEmails");
    const fnEnd = resendContent.indexOf("export async function sendPaymentReceiptEmail");
    assert.ok(fnStart !== -1 && fnEnd !== -1, "sendCubiconRegistrationEmails function must be present");
    const cubiconFn = resendContent.substring(fnStart, fnEnd);

    const clientEmailStart = cubiconFn.indexOf("// 1. Client Confirmation Email");
    const clientEmailEnd = cubiconFn.indexOf("// 2. Admin Alert Email");
    assert.ok(clientEmailStart !== -1 && clientEmailEnd !== -1, "Client confirmation email block must be present");
    const clientEmailContent = cubiconFn.substring(clientEmailStart, clientEmailEnd);

    // Client confirmation email must NOT display the raw Registration Details box or raw fields
    assert.ok(
      !clientEmailContent.includes("Registration Details"),
      "Client confirmation email must not have raw Registration Details header"
    );
    assert.ok(
      !clientEmailContent.includes("Registration ID:"),
      "Client confirmation email must not expose raw Registration ID"
    );
    assert.ok(
      !clientEmailContent.includes("Urgency Level:"),
      "Client confirmation email must not expose raw Urgency Level"
    );
    assert.ok(
      !clientEmailContent.includes("Selected Focus Areas:"),
      "Client confirmation email must not expose raw Selected Focus Areas"
    );

    // Client confirmation email MUST include personalized greeting and acknowledgement
    assert.ok(
      clientEmailContent.includes("Welcome to Cubicon, ${escapeHtml(greetingName)}!"),
      "Must personalize greeting with greetingName"
    );
    assert.ok(
      clientEmailContent.includes("Your Founding Client Privileges"),
      "Must include Founding Client Privileges section"
    );
    assert.ok(
      clientEmailContent.includes("30% Permanent Wholesale Price"),
      "Must include wholesale price benefit"
    );
    assert.ok(
      clientEmailContent.includes("100% Refund Guarantee"),
      "Must include refund guarantee benefit"
    );
  });

  await t.test("4. Verification Email Template Supports founding_client Specific Messaging", () => {
    const resendFilePath = path.join(BUYFACTS_ROOT, "lib", "resend.ts");
    const resendContent = fs.readFileSync(resendFilePath, "utf-8");

    assert.ok(
      resendContent.includes("Action Required: Verify your email to complete your Cubicon Founding Client registration"),
      "Verification email must provide tailored subject for founding client"
    );
    assert.ok(
      resendContent.includes("Verify Email & Confirm Registration"),
      "Verification button text must be tailored for founding client registration"
    );
  });

  await t.test("5. POST /api/cubicon-registration rejects when verificationSessionId is missing", async () => {
    resetRateLimits();
    const req = new Request("http://localhost:3000/api/cubicon-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Arthur",
        lastName: "Dent",
        email: "arthur@cyberdyne.com",
        emailConfirm: "arthur@cyberdyne.com",
        phone: "(555) 123-4567",
        requestConfirmation: true,
        isEighteen: true,
        isUsBased: true,
        hp_website: "",
      }),
    });

    const res = await registerPOST(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.match(data.error, /Human verification required/i);
  });

  await t.test("6. POST /api/cubicon-registration rejects on invalid session or sequence mismatch", async () => {
    resetRateLimits();
    // 6a. Non-existent session
    const reqInvalid = new Request("http://localhost:3000/api/cubicon-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Ford",
        lastName: "Prefect",
        email: "ford@cyberdyne.com",
        emailConfirm: "ford@cyberdyne.com",
        phone: "(555) 234-5678",
        requestConfirmation: true,
        isEighteen: true,
        isUsBased: true,
        hp_website: "",
        verificationSessionId: "nonexistent_session_id_12345",
      }),
    });
    const resInvalid = await registerPOST(reqInvalid);
    const dataInvalid = await resInvalid.json();
    assert.equal(resInvalid.status, 400);
    assert.match(dataInvalid.error, /Invalid verification session/i);

    // 6b. Sequence mismatch (default sequence instead of contact_form)
    const defaultSeq = await prisma.cubiconSequence.findUnique({ where: { slug: "default" } });
    if (defaultSeq) {
      const wrongSeqSessionId = `test_wrong_seq_${Date.now()}`;
      createdSessionIds.push(wrongSeqSessionId);
      await prisma.cubiconSession.create({
        data: {
          session_id: wrongSeqSessionId,
          sequence_id: defaultSeq.id,
          passedPuzzles: 3,
          totalPuzzlesAttempted: 3,
        },
      });

      const reqWrongSeq = new Request("http://localhost:3000/api/cubicon-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Ford",
          lastName: "Prefect",
          email: "ford@cyberdyne.com",
          emailConfirm: "ford@cyberdyne.com",
          phone: "(555) 234-5678",
          requestConfirmation: true,
          isEighteen: true,
          isUsBased: true,
          hp_website: "",
          verificationSessionId: wrongSeqSessionId,
        }),
      });
      const resWrongSeq = await registerPOST(reqWrongSeq);
      const dataWrongSeq = await resWrongSeq.json();
      assert.equal(resWrongSeq.status, 400);
      assert.match(dataWrongSeq.error, /Verification sequence mismatch/i);
    }
  });

  await t.test("7. POST /api/cubicon-registration rejects when pass threshold 60% is not met", async () => {
    resetRateLimits();
    const contactSeq = await prisma.cubiconSequence.findUnique({ where: { slug: "contact_form" } });
    assert.ok(contactSeq, "contact_form sequence must exist");

    // 1 pass out of 3 tasks = 33.3% < 60%
    const unpassedSessionId = `test_unpassed_reg_${Date.now()}`;
    createdSessionIds.push(unpassedSessionId);
    await prisma.cubiconSession.create({
      data: {
        session_id: unpassedSessionId,
        sequence_id: contactSeq.id,
        passedPuzzles: 1,
        totalPuzzlesAttempted: 3,
      },
    });

    const req = new Request("http://localhost:3000/api/cubicon-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Tricia",
        lastName: "McMillan",
        email: "tricia@cyberdyne.com",
        emailConfirm: "tricia@cyberdyne.com",
        phone: "(555) 345-6789",
        requestConfirmation: true,
        isEighteen: true,
        isUsBased: true,
        hp_website: "",
        verificationSessionId: unpassedSessionId,
      }),
    });
    const res = await registerPOST(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.match(data.error, /Human verification was not passed/i);
  });

  await t.test("8. POST /api/cubicon-registration succeeds with passed contact_form session and prevents replay", async () => {
    resetRateLimits();
    const contactSeq = await prisma.cubiconSequence.findUnique({ where: { slug: "contact_form" } });
    assert.ok(contactSeq, "contact_form sequence must exist");

    // 2 passes out of 3 tasks = 66.7% >= 60%
    const passedSessionId = `test_passed_reg_${Date.now()}`;
    createdSessionIds.push(passedSessionId);
    await prisma.cubiconSession.create({
      data: {
        session_id: passedSessionId,
        sequence_id: contactSeq.id,
        passedPuzzles: 2,
        totalPuzzlesAttempted: 3,
      },
    });

    const testEmail = `verified_reg_${Date.now()}@cyberdyne.com`;

    // First attempt should succeed
    const req1 = new Request("http://localhost:3000/api/cubicon-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Connor",
        email: testEmail,
        emailConfirm: testEmail,
        phone: "(555) 456-7890",
        requestConfirmation: true,
        isEighteen: true,
        isUsBased: true,
        hp_website: "",
        verificationSessionId: passedSessionId,
      }),
    });
    const res1 = await registerPOST(req1);
    const data1 = await res1.json();

    assert.equal(res1.status, 200, "Registration with passed verification must return 200 OK");
    assert.equal(data1.success, true);
    assert.equal(data1.verificationRequired, true);

    const record = await prisma.emailVerification.findFirst({
      where: { email: testEmail },
    });
    assert.ok(record, "Verification hold record must be created");
    createdTokens.push(record.token);

    // Second attempt with same session should fail (replay prevention)
    const req2 = new Request("http://localhost:3000/api/cubicon-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Connor",
        email: testEmail,
        emailConfirm: testEmail,
        phone: "(555) 456-7890",
        requestConfirmation: true,
        isEighteen: true,
        isUsBased: true,
        hp_website: "",
        verificationSessionId: passedSessionId,
      }),
    });
    const res2 = await registerPOST(req2);
    const data2 = await res2.json();

    assert.equal(res2.status, 400, "Replay attempt must be rejected with 400 Bad Request");
    assert.match(data2.error, /already been used/i);
  });

  await t.test("9. Frontend Cubicon Registration Form: Urgency field removed and Captcha modal added", () => {
    const cubiconPagePath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    assert.ok(fs.existsSync(cubiconPagePath), "app/cubicon/page.tsx must exist");
    const content = fs.readFileSync(cubiconPagePath, "utf-8");

    // Urgency select field must NOT exist in the form markup
    assert.ok(
      !content.includes('id="urgency"'),
      "Urgency select input id='urgency' must be removed from form"
    );
    assert.ok(
      !content.includes('name="urgency"'),
      "Urgency input name='urgency' must be removed from form"
    );

    // Full-screen modal and verification puzzle elements must be present
    assert.ok(
      content.includes("/cubicon-app/index.html?sequence=contact_form"),
      "Cubicon verification iframe must use contact_form sequence"
    );
    assert.ok(
      content.includes("COMPLETE PUZZLE TO REGISTER"),
      "Submit button must display COMPLETE PUZZLE TO REGISTER when unverified"
    );
    assert.ok(
      content.includes("REGISTER AS FOUNDING CLIENT"),
      "Submit button must display REGISTER AS FOUNDING CLIENT when verified"
    );
    assert.ok(
      content.includes("fullscreenModalOverlay"),
      "Must render full-screen modal overlay container"
    );
    assert.ok(
      content.includes("CUBICON_VERIFICATION_COMPLETE"),
      "Must listen for CUBICON_VERIFICATION_COMPLETE message event"
    );
  });

  await t.test("10. Zero-Emoji Compliance across Modified Source Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

    const files = [
      path.join(BUYFACTS_ROOT, "lib", "resend.ts"),
      path.join(BUYFACTS_ROOT, "app", "api", "cubicon-registration", "route.ts"),
      path.join(BUYFACTS_ROOT, "app", "api", "verify-email", "route.ts"),
      path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "cubicon", "cubicon.module.css"),
      path.join(BUYFACTS_ROOT, "tests", "cubicon-registration-verification.test.ts"),
    ];

    for (const filePath of files) {
      const fileText = fs.readFileSync(filePath, "utf-8");
      assert.equal(
        fileText.match(emojiRegex),
        null,
        `File ${path.basename(filePath)} must not contain any emojis`
      );
    }
  });
});
