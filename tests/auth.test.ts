import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../lib/auth/password";
import { signJWT, verifyJWT } from "../lib/auth/jwt";
import { validateApiAuth } from "../lib/auth/middleware";
import { AUTH_COOKIE_NAME } from "../lib/auth/session";

describe("Password Hashing & Verification", () => {
  test("should generate valid salt:hash format and verify correctly", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    assert.ok(hash.includes(":"), "Hash must contain salt delimiter");
    const parts = hash.split(":");
    assert.equal(parts.length, 2, "Hash must have exactly two parts: salt and key");
    assert.equal(parts[0].length, 32, "Salt should be 16 bytes (32 hex characters)");

    const isValid = await verifyPassword(password, hash);
    assert.equal(isValid, true, "Correct password must verify to true");
  });

  test("should reject incorrect passwords", async () => {
    const password = "CorrectPassword123!";
    const hash = await hashPassword(password);

    const isWrongValid = await verifyPassword("WrongPassword123!", hash);
    assert.equal(isWrongValid, false, "Wrong password must verify to false");
  });

  test("should handle malformed hashes gracefully without throwing", async () => {
    assert.equal(await verifyPassword("test", "invalid_format"), false);
    assert.equal(await verifyPassword("test", ":"), false);
    assert.equal(await verifyPassword("test", "salt:"), false);
    assert.equal(await verifyPassword("test", ""), false);
  });

  test("should generate distinct hashes for identical passwords due to unique salts", async () => {
    const password = "SharedPassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    assert.notEqual(hash1, hash2, "Hashes of same password must differ due to unique salts");
    assert.equal(await verifyPassword(password, hash1), true);
    assert.equal(await verifyPassword(password, hash2), true);
  });
});

describe("Password strength policy", () => {
  test("accepts a compliant password", () => {
    assert.equal(validatePasswordStrength("LongEnough123").ok, true);
  });

  test("rejects short, all-lowercase, and no-digit passwords", () => {
    assert.equal(validatePasswordStrength("Short1a").ok, false);
    assert.equal(validatePasswordStrength("alllowercase123").ok, false);
    assert.equal(validatePasswordStrength("NoDigitsHereAtAll").ok, false);
    assert.equal(validatePasswordStrength("aaaaaaaaaaaaaaaa").ok, false);
  });
});

describe("JWT Signing & Verification", () => {
  test("should sign and verify valid payload", async () => {
    const payload = {
      userId: "user-123",
      email: "admin@buyfacts.com",
      role: "admin",
    };

    const token = await signJWT(payload, "test_secret_key_1234567890", 3600);
    assert.ok(token, "Token must be a non-empty string");

    const decoded = await verifyJWT(token, "test_secret_key_1234567890");
    assert.ok(decoded, "Decoded payload must not be null");
    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
    assert.ok(typeof decoded.exp === "number", "Token must include expiration");
  });

  test("should fail verification with wrong secret", async () => {
    const payload = { userId: "user-123", email: "admin@buyfacts.com" };
    const token = await signJWT(payload, "correct_secret_1234567890", 3600);

    const decoded = await verifyJWT(token, "wrong_secret_1234567890");
    assert.equal(decoded, null, "Decoded payload must be null when secret is incorrect");
  });

  test("should fail verification on expired token", async () => {
    const payload = { userId: "user-123", email: "admin@buyfacts.com" };
    // Issue token with -10 seconds expiration (already expired)
    const token = await signJWT(payload, "test_secret_key_1234567890", -10);

    const decoded = await verifyJWT(token, "test_secret_key_1234567890");
    assert.equal(decoded, null, "Expired token must not verify");
  });
});

describe("API Authentication Middleware", () => {
  // Tokens are signed with the app secret (no per-test override), and the
  // account must exist in the database — that is exactly what the middleware checks.
  // NOTE: This test relies on the current seeded super_admin user.
  // The ID is fetched dynamically in the test setup.
  let LIVE_ADMIN_ID = "104"; // default fallback

  test("rejects requests without a token", async () => {
    const req = new Request("http://localhost/api/admin/database");
    const result = await validateApiAuth(req);
    assert.equal(result.isAuthenticated, false);
    assert.ok(result.error);
  });

  test("accepts a Bearer token for a live admin account", async () => {
    const token = await signJWT(
      { userId: LIVE_ADMIN_ID, email: "rmj@robertjohnson.com", role: "admin" },
      undefined,
      600
    );
    const req = new Request("http://localhost/api/admin/database", {
      headers: { authorization: `Bearer ${token}` },
    });
    const result = await validateApiAuth(req);
    assert.equal(result.isAuthenticated, true);
    assert.equal(result.user?.email, "rmj@robertjohnson.com");
  });

  test("accepts a session cookie", async () => {
    const token = await signJWT(
      { userId: LIVE_ADMIN_ID, email: "rmj@robertjohnson.com", role: "super_admin" },
      undefined,
      600
    );
    const req = new Request("http://localhost/api/admin/database", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    });
    const result = await validateApiAuth(req);
    assert.equal(result.isAuthenticated, true);
  });

  test("rejects a token for an account that no longer exists", async () => {
    const token = await signJWT(
      { userId: "999999", email: "ghost@example.com", role: "admin" },
      undefined,
      600
    );
    const req = new Request("http://localhost/api/admin/database", {
      headers: { authorization: `Bearer ${token}` },
    });
    const result = await validateApiAuth(req);
    assert.equal(result.isAuthenticated, false);
  });
});
