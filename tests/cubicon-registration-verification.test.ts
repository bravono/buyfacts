import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { POST as registerPOST } from "../app/api/cubicon-registration/route";
import { GET as verifyGET } from "../app/api/verify-email/route";
import { prisma } from "../lib/prisma";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

test("Cubicon Founding Client Registration Email Verification & Template Suite", async (t) => {
  const createdTokens: string[] = [];
  const createdRegistrationIds: string[] = [];

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

  await t.test("5. Zero-Emoji Compliance across Modified Source Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

    const files = [
      path.join(BUYFACTS_ROOT, "lib", "resend.ts"),
      path.join(BUYFACTS_ROOT, "app", "api", "cubicon-registration", "route.ts"),
      path.join(BUYFACTS_ROOT, "app", "api", "verify-email", "route.ts"),
      path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx"),
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
