import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/contact/route";
import { prisma } from "../lib/prisma";

test("Contact API Route - General Inquiry Hold Pipeline (Section 9.1)", async (t) => {
  const createdTokens: string[] = [];

  t.after(async () => {
    if (createdTokens.length > 0) {
      await prisma.emailVerification.deleteMany({
        where: { token: { in: createdTokens } },
      });
    }
  });

  await t.test("should accept general contact submission with webmail address (e.g. ahbideenyusuf@gmail.com) and hold for verification", async () => {
    const testEmail = `ahbideenyusuf_${Date.now()}@gmail.com`;
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.10.99",
      },
      body: JSON.stringify({
        name: "Ahbideen Adeshina Yusuf",
        email: testEmail,
        company: "Brave Work Studio",
        interest: "General Inquiry",
        message: "Hello, testing general contact submission with verification hold.",
        isEighteen: true,
        hp_website: "",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200, `Expected 200 status for valid contact email: ${testEmail}`);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.verificationRequired, true);
    assert.ok(data.message.includes("placed on hold"));

    // Verify verification token record was created in SQLite hold queue
    const record = await prisma.emailVerification.findFirst({
      where: { email: testEmail },
    });
    assert.ok(record, "Verification record must exist in hold queue");
    assert.equal(record.type, "contact");
    if (record) {
      createdTokens.push(record.token);
    }
  });

  await t.test("should accept general contact submission with business email address", async () => {
    const businessEmail = `contact_${Date.now()}@acmecorp.com`;
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "172.16.0.42",
      },
      body: JSON.stringify({
        name: "Enterprise Contact",
        email: businessEmail,
        company: "Acme Corporate",
        interest: "Licensing",
        message: "We would like to discuss licensing BuyFacts data.",
        isEighteen: true,
        hp_website: "",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.verificationRequired, true);

    const record = await prisma.emailVerification.findFirst({
      where: { email: businessEmail },
    });
    assert.ok(record, "Verification record must exist in database");
    assert.equal(record.type, "contact");
    if (record) {
      createdTokens.push(record.token);
    }
  });

  await t.test("should reject submission with malformed email address", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.10.101",
      },
      body: JSON.stringify({
        name: "Test Inquirer",
        email: "not-a-valid-email",
        company: "Test Co",
        interest: "General Inquiry",
        message: "Valid message content",
        isEighteen: true,
        hp_website: "",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.ok(data.error.includes("valid email address"));
  });

  await t.test("should reject missing required fields", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "172.16.0.43",
      },
      body: JSON.stringify({
        name: "",
        email: "valid@enterprise.com",
        message: "Valid message content",
        isEighteen: true,
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
  });
});
