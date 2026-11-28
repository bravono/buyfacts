import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { POST } from "../app/api/contact/route";
import { resetRateLimits, resetThrottleHealth } from "../lib/security/rate-limiter";
import {
  CONTACT_SEQUENCE_SLUG,
  CONTACT_VERIFICATION_ERRORS,
  verifyAndConsumeContactSession,
  type ContactVerificationDb,
  type ContactVerificationSession,
} from "../lib/security/contact-verification";

/** In-memory stand-in for the Cubicon tables, with an atomic consume like the real one. */
function fakeDb(sessions: Record<string, Partial<ContactVerificationSession>>, scoredTasks = 3) {
  const rows = new Map<string, ContactVerificationSession>();
  let nextId = 1;
  for (const [sessionId, partial] of Object.entries(sessions)) {
    rows.set(sessionId, {
      id: nextId++,
      sequenceId: 7,
      passedPuzzles: 3,
      totalPuzzlesAttempted: 3,
      previousResult: "",
      sequence: { slug: CONTACT_SEQUENCE_SLUG, passThreshold: 0.66 },
      ...partial,
    });
  }
  const consumed: number[] = [];
  const db: ContactVerificationDb = {
    findSession: async (sessionId) => {
      const row = rows.get(sessionId);
      return row ? { ...row } : null;
    },
    countScoredTasks: async () => scoredTasks,
    consumeSession: async (id) => {
      // Yield first so concurrent callers interleave, as they would against a database.
      await new Promise((resolve) => setImmediate(resolve));
      const row = [...rows.values()].find((r) => r.id === id);
      if (!row || row.previousResult === "used" || row.previousResult === "consumed") return false;
      row.previousResult = "used";
      consumed.push(id);
      return true;
    },
  };
  return { db, consumed };
}

const post = (body: Record<string, unknown>, ip: string) =>
  POST(
    new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );

const VALID_FORM = {
  name: "Security Test",
  email: "security.test@acmecorp.com",
  company: "Acme",
  interest: "General Inquiry",
  message: "Checking the contact form protections.",
  isEighteen: true,
  hp_website: "",
};

test("Contact API Security Suite", async (t) => {
  t.beforeEach(() => {
    resetRateLimits();
    resetThrottleHealth();
  });

  await t.test("1. A verificationSessionId is required (missing, blank or non-string)", async () => {
    const { db } = fakeDb({});
    for (const value of [undefined, "", "   ", 42, null]) {
      const result = await verifyAndConsumeContactSession(value, db);
      assert.deepEqual(result, { ok: false, error: CONTACT_VERIFICATION_ERRORS.missing });
    }
  });

  await t.test("2. Unknown, wrong-sequence, spent and failed sessions are rejected", async () => {
    const { db, consumed } = fakeDb({
      wrongSeq: { sequence: { slug: "default", passThreshold: 0.66 } },
      used: { previousResult: "used" },
      consumedBefore: { previousResult: "consumed" },
      failed: { passedPuzzles: 1, totalPuzzlesAttempted: 3 },
    });
    const expect = async (id: string, error: string) =>
      assert.deepEqual(await verifyAndConsumeContactSession(id, db), { ok: false, error });
    await expect("nope", CONTACT_VERIFICATION_ERRORS.invalid);
    await expect("wrongSeq", CONTACT_VERIFICATION_ERRORS.wrongSequence);
    await expect("used", CONTACT_VERIFICATION_ERRORS.spent);
    await expect("consumedBefore", CONTACT_VERIFICATION_ERRORS.spent);
    await expect("failed", CONTACT_VERIFICATION_ERRORS.notPassed);
    assert.deepEqual(consumed, [], "a rejected session is never consumed");
  });

  await t.test("3. A solved session passes once; replaying it is rejected", async () => {
    const { db, consumed } = fakeDb({ solved: {} });
    assert.deepEqual(await verifyAndConsumeContactSession(" solved ", db), { ok: true });
    assert.deepEqual(await verifyAndConsumeContactSession("solved", db), {
      ok: false,
      error: CONTACT_VERIFICATION_ERRORS.spent,
    });
    assert.equal(consumed.length, 1);
  });

  await t.test("4. Two simultaneous submissions with one session: exactly one succeeds", async () => {
    const { db, consumed } = fakeDb({ solved: {} });
    const results = await Promise.all([
      verifyAndConsumeContactSession("solved", db),
      verifyAndConsumeContactSession("solved", db),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results));
    assert.equal(consumed.length, 1);
  });

  await t.test("5. Without recorded attempts, the sequence's scored puzzles set the bar", async () => {
    const { db } = fakeDb({ fresh: { passedPuzzles: 0, totalPuzzlesAttempted: 0 } }, 3);
    assert.deepEqual(await verifyAndConsumeContactSession("fresh", db), {
      ok: false,
      error: CONTACT_VERIFICATION_ERRORS.notPassed,
    });
  });

  // Throttling is shared across instances, so a budget lives in the database and
  // survives between runs: these cases use 203.0.114.x, which no other test fills.
  // Throttling is shared across instances, so a budget lives in the database and
  // survives between runs. Cases that are not about throttling still need a
  // fresh address, or a spent budget from an earlier run answers 429 first.
  const freshIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

  await t.test("6. The API rejects a submission without a session, even behind a proxy", async () => {
    // A proxy always adds X-Forwarded-For; it used to switch the Cubicon check off.
    const res = await post(VALID_FORM, freshIp());
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, CONTACT_VERIFICATION_ERRORS.missing);
  });

  await t.test("7. The honeypot field rejects bots that fill it in", async () => {
    const res = await post({ ...VALID_FORM, hp_website: "https://spam.example" }, freshIp());
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /Anti-automation check triggered/);
  });

  await t.test("8. Rate limiting: the 6th submission in 10 minutes from one IP gets 429", async () => {
    // The budget lives in the database so every instance shares it, which also
    // means it survives between runs. A fresh address per run keeps this case
    // independent of any earlier execution.
    const runIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

    for (let i = 0; i < 5; i++) {
      const res = await post({ ...VALID_FORM, hp_website: "bot" }, runIp);
      assert.equal(res.status, 400, `request ${i + 1} is counted and rejected on its merits`);
    }
    const limited = await post(VALID_FORM, runIp);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("Retry-After")) > 0, "Retry-After header is set");
    const other = await post({ ...VALID_FORM, hp_website: "bot" }, `${runIp}.other`);
    assert.notEqual(other.status, 429, "another IP is not limited");
  });

  await t.test("9. The route has no verification bypass", () => {
    const route = fs.readFileSync(path.join(__dirname, "..", "app", "api", "contact", "route.ts"), "utf-8");
    assert.ok(!route.includes("isHoldPipelineTest"), "no test-only bypass");
    assert.ok(route.includes("verifyAndConsumeContactSession(body.verificationSessionId"));
    assert.ok(
      route.includes('await checkRateLimitAsync(ip, "contact")'),
      "throttling goes through the shared, multi-instance limiter"
    );
  });
});
