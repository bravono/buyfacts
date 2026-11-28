import test from "node:test";
import assert from "node:assert/strict";
import { POST as capturePaymentPOST } from "../app/api/payments/capture-venmo-order/route";
import { prisma } from "../lib/prisma";
import { isValidClientId } from "../lib/panel/client-id";

test("Qubicorn Panel - Client ID Issuance on Payment Capture", async (t) => {
  const createdRegistrationIds: string[] = [];
  const createdClientIds: string[] = [];

  t.after(async () => {
    if (createdClientIds.length > 0) {
      await prisma.foundingClient.deleteMany({
        where: { clientId: { in: createdClientIds } },
      });
    }
    if (createdRegistrationIds.length > 0) {
      await prisma.cubiconRegistration.deleteMany({
        where: { id: { in: createdRegistrationIds } },
      });
    }
  });

  await t.test("1. Returns 400 when orderId or registrationId is missing", async () => {
    const req = new Request("http://localhost:3000/api/payments/capture-venmo-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await capturePaymentPOST(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.match(json.error, /required/i);
  });

  await t.test("2. Successful payment capture generates unique Client ID and creates FoundingClient record", async () => {
    const regId = `reg_test_${Date.now()}`;
    createdRegistrationIds.push(regId);

    // Create verified founding client registration
    await prisma.cubiconRegistration.create({
      data: {
        id: regId,
        name: "Dr. Gregory House",
        email: `house_${Date.now()}@princeton-plainsboro.org`,
        company: "Diagnostics Department",
        role: "High",
        interest: "Founding Client",
        isUsBased: true,
      },
    });

    const mockOrderId = `MOCK_VENMO_${Date.now()}`;
    const req = new Request("http://localhost:3000/api/payments/capture-venmo-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: mockOrderId,
        registrationId: regId,
        email: "house@princeton-plainsboro.org",
        name: "Dr. Gregory House",
      }),
    });

    const res = await capturePaymentPOST(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.amount, 100);
    assert.ok(json.clientId, "Expected clientId in response");

    const issuedId = json.clientId;
    createdClientIds.push(issuedId);

    // Verify format of issued Client ID
    assert.strictEqual(isValidClientId(issuedId), true);
    assert.match(issuedId, /^BF-[A-Z0-9]{8}$/);

    // Verify record in database
    const foundingClient = await prisma.foundingClient.findUnique({
      where: { clientId: issuedId },
    });

    assert.ok(foundingClient, "FoundingClient record should exist in database");
    assert.strictEqual(foundingClient.registrationId, regId);
    assert.strictEqual(foundingClient.paymentStatus, "paid");
    assert.strictEqual(foundingClient.isActive, true);
    assert.strictEqual(foundingClient.name, "Dr. Gregory House");
    assert.strictEqual(foundingClient.company, "Diagnostics Department");
    assert.ok(foundingClient.paidAt);
  });

  await t.test("3. Payment capture succeeds even if registrationId is unknown (graceful fallback)", async () => {
    const mockOrderId = `MOCK_VENMO_FALLBACK_${Date.now()}`;
    const req = new Request("http://localhost:3000/api/payments/capture-venmo-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: mockOrderId,
        registrationId: "unknown-registration-id-999",
        email: "fallback@client.com",
      }),
    });

    const res = await capturePaymentPOST(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.clientId, null);
  });
});
