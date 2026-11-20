import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { can, normalizeRole, isSuperAdmin, ROLES } from "../lib/auth/roles";
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from "../lib/auth/totp";

describe("Role model", () => {
  test("normalises legacy and messy role strings", () => {
    assert.equal(normalizeRole("super_admin"), "super_admin");
    assert.equal(normalizeRole("Super Admin"), "super_admin");
    assert.equal(normalizeRole("super-admin"), "super_admin");
    assert.equal(normalizeRole("ADMIN"), "admin");
    assert.equal(normalizeRole(null), "user");
    assert.equal(normalizeRole("something-else"), "user");
  });

  test("every role has a defined capability set", () => {
    for (const role of ROLES) {
      assert.equal(typeof can(role, "read"), "boolean");
    }
  });

  test("only super admins may delete or manage accounts", () => {
    assert.equal(can("super_admin", "delete"), true);
    assert.equal(can("admin", "delete"), false);
    assert.equal(can("editor", "delete"), false);
    assert.equal(can("user", "delete"), false);

    assert.equal(can("super_admin", "manage_super_admins"), true);
    assert.equal(can("admin", "manage_super_admins"), false);
    assert.equal(can("admin", "manage_users"), false);
  });

  test("admins may write but read-only roles may not", () => {
    assert.equal(can("admin", "write"), true);
    assert.equal(can("editor", "write"), false);
    assert.equal(can("user", "write"), false);
    assert.equal(can("editor", "read"), true);
  });

  test("isSuperAdmin recognises only super_admin", () => {
    assert.equal(isSuperAdmin("super_admin"), true);
    assert.equal(isSuperAdmin("admin"), false);
    assert.equal(isSuperAdmin(undefined), false);
  });
});

describe("TOTP second factor", () => {
  test("base32 round-trips", () => {
    const original = Buffer.from("BuyFacts admin 2FA secret");
    const encoded = base32Encode(original);
    assert.deepEqual(base32Decode(encoded), original);
  });

  test("a generated code verifies against its own secret", () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    assert.equal(code.length, 6);
    assert.equal(verifyTotp(secret, code), true);
  });

  test("rejects a wrong, empty or malformed code", () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    const wrong = String((Number(code) + 1) % 1000000).padStart(6, "0");

    assert.equal(verifyTotp(secret, wrong), false);
    assert.equal(verifyTotp(secret, ""), false);
    assert.equal(verifyTotp(secret, "abcdef"), false);
    assert.equal(verifyTotp(null, code), false);
  });

  test("accepts a code from the previous 30-second window (clock drift)", () => {
    const secret = generateTotpSecret();
    const previous = generateTotp(secret, Date.now() - 30_000);
    assert.equal(verifyTotp(secret, previous), true);
  });

  test("rejects a code from far outside the drift window", () => {
    const secret = generateTotpSecret();
    const stale = generateTotp(secret, Date.now() - 10 * 60_000);
    assert.equal(verifyTotp(secret, stale), false);
  });

  test("otpauth URI carries issuer, secret and label", () => {
    const secret = generateTotpSecret();
    const uri = buildOtpAuthUri({ secret, email: "admin@buyfacts.com" });
    assert.ok(uri.startsWith("otpauth://totp/"));
    assert.ok(uri.includes(secret));
    assert.ok(uri.includes("issuer=BuyFacts"));
  });
});
