import test from "node:test";
import assert from "node:assert/strict";
import { GET as validateGET } from "../app/api/cubicon-panel/validate/route";
import { POST as completePOST } from "../app/api/cubicon-panel/complete/route";
import { prisma } from "../lib/prisma";
import { verifyPanelResult } from "../lib/panel/hmac";

test("Qubicorn Panel - Validation & Completion API Integration Suite", async (t) => {
  const createdClientIds: string[] = [];
  const createdSessionIds: string[] = [];
  const testClientId = "BF-TEST0001";
  const testRestrictedClientId = "BF-TEST0002";
  const inactiveClientId = "BF-TEST0003";

  // Setup test founding clients in database
  t.before(async () => {
    // 1. Active paid client with no domain restrictions
    await prisma.foundingClient.upsert({
      where: { clientId: testClientId },
      update: {
        paymentStatus: "paid",
        isActive: true,
        allowedCallbackDomains: "[]",
      },
      create: {
        clientId: testClientId,
        name: "Acme Analytics Inc",
        email: "panel-test@acme.com",
        company: "Acme Corp",
        paymentStatus: "paid",
        isActive: true,
        allowedCallbackDomains: "[]",
      },
    });
    createdClientIds.push(testClientId);

    // 2. Active paid client with restricted domain
    await prisma.foundingClient.upsert({
      where: { clientId: testRestrictedClientId },
      update: {
        paymentStatus: "paid",
        isActive: true,
        allowedCallbackDomains: JSON.stringify(["survey-platform.com"]),
      },
      create: {
        clientId: testRestrictedClientId,
        name: "Secure Survey Corp",
        email: "secure@surveys.com",
        company: "Secure Surveys",
        paymentStatus: "paid",
        isActive: true,
        allowedCallbackDomains: JSON.stringify(["survey-platform.com"]),
      },
    });
    createdClientIds.push(testRestrictedClientId);

    // 3. Inactive client (unpaid / pending)
    await prisma.foundingClient.upsert({
      where: { clientId: inactiveClientId },
      update: {
        paymentStatus: "pending",
        isActive: false,
      },
      create: {
        clientId: inactiveClientId,
        name: "Pending Client",
        email: "pending@client.com",
        paymentStatus: "pending",
        isActive: false,
        allowedCallbackDomains: "[]",
      },
    });
    createdClientIds.push(inactiveClientId);
  });

  t.after(async () => {
    if (createdSessionIds.length > 0) {
      await prisma.cubiconSession.deleteMany({
        where: { sessionId: { in: createdSessionIds } },
      });
    }
    if (createdClientIds.length > 0) {
      await prisma.foundingClient.deleteMany({
        where: { clientId: { in: createdClientIds } },
      });
    }
  });

  // ==========================================
  // GET /api/cubicon-panel/validate
  // ==========================================

  await t.test("1. validate returns 400 when missing clientId or callbackUrl", async () => {
    const req1 = new Request("http://localhost:3000/api/cubicon-panel/validate");
    const res1 = await validateGET(req1);
    assert.strictEqual(res1.status, 400);

    const req2 = new Request(`http://localhost:3000/api/cubicon-panel/validate?clientId=${testClientId}`);
    const res2 = await validateGET(req2);
    assert.strictEqual(res2.status, 400);
  });

  await t.test("2. validate returns 400 on invalid Client ID format", async () => {
    const req = new Request(
      "http://localhost:3000/api/cubicon-panel/validate?clientId=INVALID&callbackUrl=https://example.com/return"
    );
    const res = await validateGET(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.valid, false);
  });

  await t.test("3. validate returns 400 on invalid Respondent ID format", async () => {
    const req = new Request(
      `http://localhost:3000/api/cubicon-panel/validate?clientId=${testClientId}&respondentId=short&callbackUrl=https://example.com/return`
    );
    const res = await validateGET(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.valid, false);
    assert.match(json.error, /8-digit/i);
  });

  await t.test("4. validate returns 403 when Client ID does not exist in DB", async () => {
    const req = new Request(
      "http://localhost:3000/api/cubicon-panel/validate?clientId=BF-99999999&callbackUrl=https://example.com/return"
    );
    const res = await validateGET(req);
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.valid, false);
  });

  await t.test("5. validate returns 403 when Client ID is inactive or unpaid", async () => {
    const req = new Request(
      `http://localhost:3000/api/cubicon-panel/validate?clientId=${inactiveClientId}&callbackUrl=https://example.com/return`
    );
    const res = await validateGET(req);
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.valid, false);
  });

  await t.test("6. validate returns 200 { valid: true } for active client with unrestricted domain", async () => {
    const req = new Request(
      `http://localhost:3000/api/cubicon-panel/validate?clientId=${testClientId}&respondentId=12345678&callbackUrl=https://anywhere.org/survey/done`
    );
    const res = await validateGET(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.valid, true);
    assert.strictEqual(json.clientName, "Acme Analytics Inc");
  });

  await t.test("7. validate enforces domain allowlist when configured", async () => {
    // Authorized domain
    const reqAllowed = new Request(
      `http://localhost:3000/api/cubicon-panel/validate?clientId=${testRestrictedClientId}&respondentId=12345678&callbackUrl=https://survey-platform.com/complete`
    );
    const resAllowed = await validateGET(reqAllowed);
    assert.strictEqual(resAllowed.status, 200);
    const jsonAllowed = await resAllowed.json();
    assert.strictEqual(jsonAllowed.valid, true);

    // Subdomain of authorized domain
    const reqSubdomain = new Request(
      `http://localhost:3000/api/cubicon-panel/validate?clientId=${testRestrictedClientId}&respondentId=12345678&callbackUrl=https://app.survey-platform.com/complete`
    );
    const resSub = await validateGET(reqSubdomain);
    assert.strictEqual(resSub.status, 200);

    // Unauthorized domain
    const reqBlocked = new Request(
      `http://localhost:3000/api/cubicon-panel/validate?clientId=${testRestrictedClientId}&respondentId=12345678&callbackUrl=https://phishing-site.com/complete`
    );
    const resBlocked = await validateGET(reqBlocked);
    assert.strictEqual(resBlocked.status, 403);
    const jsonBlocked = await resBlocked.json();
    assert.strictEqual(jsonBlocked.valid, false);
    assert.match(jsonBlocked.error, /approved list/i);
  });

  // ==========================================
  // POST /api/cubicon-panel/complete
  // ==========================================

  await t.test("8. complete returns 400 when missing sessionId or callbackUrl", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-panel/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await completePOST(req);
    assert.strictEqual(res.status, 400);
  });

  await t.test("9. complete returns 404 when session is not found", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-panel/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "sess_non_existent",
        callbackUrl: "https://survey.com/return",
        respondentId: "12345678",
      }),
    });
    const res = await completePOST(req);
    assert.strictEqual(res.status, 404);
  });

  await t.test("10. complete generates signed redirect for passing session", async () => {
    const sessId = `sess_test_pass_${Date.now()}`;
    createdSessionIds.push(sessId);

    // Create session in DB with passed status (3 passed out of 3)
    await prisma.cubiconSession.create({
      data: {
        sessionId: sessId,
        sessionMode: "panel",
        clientId: testClientId,
        respondentId: "87654321",
        passedPuzzles: 3,
        totalPuzzlesAttempted: 3,
      },
    });

    const req = new Request("http://localhost:3000/api/cubicon-panel/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessId,
        callbackUrl: "https://acme-surveys.com/finish",
      }),
    });

    const res = await completePOST(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.result, "pass");
    assert.strictEqual(json.respondentId, "87654321");

    // Verify the redirect URL structure
    const redirectUrl = new URL(json.redirectUrl);
    assert.strictEqual(redirectUrl.origin, "https://acme-surveys.com");
    assert.strictEqual(redirectUrl.pathname, "/finish");
    assert.strictEqual(redirectUrl.searchParams.get("respondentId"), "87654321");
    assert.strictEqual(redirectUrl.searchParams.get("result"), "pass");
    assert.ok(redirectUrl.searchParams.get("ts"));

    const sig = redirectUrl.searchParams.get("sig")!;
    assert.ok(sig);

    // Validate the HMAC signature in the redirect URL
    const isValidSig = verifyPanelResult({
      respondentId: "87654321",
      result: "pass",
      ts: Number(redirectUrl.searchParams.get("ts")),
      sig,
    });
    assert.strictEqual(isValidSig, true);
  });

  await t.test("11. complete generates signed redirect for failing session", async () => {
    const sessId = `sess_test_fail_${Date.now()}`;
    createdSessionIds.push(sessId);

    // Create session with failed status (0 passed out of 3)
    await prisma.cubiconSession.create({
      data: {
        sessionId: sessId,
        sessionMode: "panel",
        clientId: testClientId,
        respondentId: "11223344",
        passedPuzzles: 0,
        totalPuzzlesAttempted: 3,
      },
    });

    const req = new Request("http://localhost:3000/api/cubicon-panel/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessId,
        callbackUrl: "https://acme-surveys.com/finish",
      }),
    });

    const res = await completePOST(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.result, "fail");
    assert.strictEqual(json.respondentId, "11223344");

    const redirectUrl = new URL(json.redirectUrl);
    assert.strictEqual(redirectUrl.searchParams.get("result"), "fail");

    const isValidSig = verifyPanelResult({
      respondentId: "11223344",
      result: "fail",
      ts: Number(redirectUrl.searchParams.get("ts")),
      sig: redirectUrl.searchParams.get("sig")!,
    });
    assert.strictEqual(isValidSig, true);
  });
});
