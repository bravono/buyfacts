import test from "node:test";
import assert from "node:assert/strict";
import { signPanelResult, verifyPanelResult } from "../lib/panel/hmac";

test("Qubicorn Panel - HMAC Result Signing and Verification Suite", async (t) => {
  const samplePayload = {
    respondentId: "12345678",
    result: "pass" as const,
    ts: 1774300000,
  };

  await t.test("1. signPanelResult produces a 64-character hex signature", () => {
    const sig = signPanelResult(samplePayload);
    assert.strictEqual(typeof sig, "string");
    assert.strictEqual(sig.length, 64);
    assert.match(sig, /^[a-f0-9]{64}$/);
  });

  await t.test("2. signPanelResult is deterministic for identical inputs", () => {
    const sig1 = signPanelResult(samplePayload);
    const sig2 = signPanelResult(samplePayload);
    assert.strictEqual(sig1, sig2);
  });

  await t.test("3. signPanelResult changes if any field changes", () => {
    const baseSig = signPanelResult(samplePayload);

    const changedRespondent = signPanelResult({
      ...samplePayload,
      respondentId: "87654321",
    });
    assert.notStrictEqual(baseSig, changedRespondent);

    const changedResult = signPanelResult({
      ...samplePayload,
      result: "fail",
    });
    assert.notStrictEqual(baseSig, changedResult);

    const changedTimestamp = signPanelResult({
      ...samplePayload,
      ts: samplePayload.ts + 1,
    });
    assert.notStrictEqual(baseSig, changedTimestamp);
  });

  await t.test("4. verifyPanelResult validates correct signatures", () => {
    const sig = signPanelResult(samplePayload);
    const valid = verifyPanelResult({
      ...samplePayload,
      sig,
    });
    assert.strictEqual(valid, true);
  });

  await t.test("5. verifyPanelResult rejects tampered result", () => {
    const sig = signPanelResult({
      ...samplePayload,
      result: "pass",
    });

    const tampered = verifyPanelResult({
      ...samplePayload,
      result: "fail", // attacker attempts to alter result
      sig,
    });
    assert.strictEqual(tampered, false);
  });

  await t.test("6. verifyPanelResult rejects tampered respondentId", () => {
    const sig = signPanelResult(samplePayload);
    const tampered = verifyPanelResult({
      ...samplePayload,
      respondentId: "99999999",
      sig,
    });
    assert.strictEqual(tampered, false);
  });

  await t.test("7. verifyPanelResult rejects invalid signature strings", () => {
    assert.strictEqual(
      verifyPanelResult({ ...samplePayload, sig: "invalid-signature" }),
      false
    );
    assert.strictEqual(
      verifyPanelResult({ ...samplePayload, sig: "" }),
      false
    );
    assert.strictEqual(
      verifyPanelResult({ ...samplePayload, sig: "a".repeat(64) }),
      false
    );
  });
});
