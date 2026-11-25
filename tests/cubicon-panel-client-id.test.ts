import test from "node:test";
import assert from "node:assert/strict";
import {
  generateClientId,
  isValidClientId,
  isValidRespondentId,
} from "../lib/panel/client-id";

test("Qubicorn Panel - Client ID and Respondent ID Utilities", async (t) => {
  await t.test("1. generateClientId generates format BF-XXXXXXXX with 8 uppercase alphanumeric chars", () => {
    const id = generateClientId();
    assert.match(id, /^BF-[A-Z0-9]{8}$/, `Expected BF-XXXXXXXX format, got: ${id}`);
  });

  await t.test("2. generateClientId produces unique values across 200 generations", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const id = generateClientId();
      assert.strictEqual(ids.has(id), false, `Collision detected on: ${id}`);
      ids.add(id);
    }
    assert.strictEqual(ids.size, 200);
  });

  await t.test("3. isValidClientId accepts valid format BF-XXXXXXXX", () => {
    assert.strictEqual(isValidClientId("BF-A1B2C3D4"), true);
    assert.strictEqual(isValidClientId("BF-00000000"), true);
    assert.strictEqual(isValidClientId("BF-ZZZZZZZZ"), true);
    assert.strictEqual(isValidClientId("BF-12345678"), true);
  });

  await t.test("4. isValidClientId rejects malformed or invalid inputs", () => {
    assert.strictEqual(isValidClientId(""), false);
    assert.strictEqual(isValidClientId("bf-A1B2C3D4"), false); // lowercase prefix
    assert.strictEqual(isValidClientId("BF-a1b2c3d4"), false); // lowercase body
    assert.strictEqual(isValidClientId("BF-A1B2C3D"), false);  // too short (7 chars)
    assert.strictEqual(isValidClientId("BF-A1B2C3D4E"), false); // too long (9 chars)
    assert.strictEqual(isValidClientId("A1B2C3D4"), false);    // missing prefix
    assert.strictEqual(isValidClientId("BF-A1B2_3D4"), false); // illegal character
    assert.strictEqual(isValidClientId("BF-A1B2 C3D"), false); // space
  });

  await t.test("5. isValidRespondentId accepts valid 8-digit numeric strings", () => {
    assert.strictEqual(isValidRespondentId("12345678"), true);
    assert.strictEqual(isValidRespondentId("00000000"), true);
    assert.strictEqual(isValidRespondentId("99999999"), true);
    assert.strictEqual(isValidRespondentId(" 87654321 "), true); // trimmed
  });

  await t.test("6. isValidRespondentId rejects non-8-digit or non-numeric strings", () => {
    assert.strictEqual(isValidRespondentId(""), false);
    assert.strictEqual(isValidRespondentId("1234567"), false);   // 7 digits
    assert.strictEqual(isValidRespondentId("123456789"), false); // 9 digits
    assert.strictEqual(isValidRespondentId("1234abcd"), false);  // letters
    assert.strictEqual(isValidRespondentId("1234-567"), false);  // hyphen
    assert.strictEqual(isValidRespondentId("abcdefgh"), false);  // all letters
  });
});
