import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/auth/password";
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
    assert.equal(decoded, null, "Expired token must return null");
  });

  test("should return null for malformed token strings", async () => {
    assert.equal(await verifyJWT("not.a.valid.jwt"), null);
    assert.equal(await verifyJWT(""), null);
    assert.equal(await verifyJWT("header.payload"), null);
  });
});

describe("API Auth Validation", () => {
  test("should validate Authorization Bearer header", async () => {
    const token = await signJWT({
      userId: "1",
      email: "rmj@robertjohnso.com",
      role: "admin",
    });

    const mockRequest = new Request("http://localhost/api/test", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const result = await validateApiAuth(mockRequest);
    assert.equal(result.isAuthenticated, true);
    assert.equal(result.user?.email, "rmj@robertjohnso.com");
  });

  test("should validate session cookie header", async () => {
    const token = await signJWT({
      userId: "2",
      email: "ahbideeny@gmail.com",
      role: "admin",
    });

    const mockRequest = new Request("http://localhost/api/test", {
      headers: {
        cookie: `other_cookie=xyz; ${AUTH_COOKIE_NAME}=${token}; yet_another=123`,
      },
    });

    const result = await validateApiAuth(mockRequest);
    assert.equal(result.isAuthenticated, true);
    assert.equal(result.user?.email, "ahbideeny@gmail.com");
  });

  test("should reject missing credentials", async () => {
    const mockRequest = new Request("http://localhost/api/test");
    const result = await validateApiAuth(mockRequest);
    assert.equal(result.isAuthenticated, false);
    assert.ok(result.error);
  });

  test("should reject invalid token scheme", async () => {
    const mockRequest = new Request("http://localhost/api/test", {
      headers: {
        authorization: "Basic 12345",
      },
    });

    const result = await validateApiAuth(mockRequest);
    assert.equal(result.isAuthenticated, false);
  });
});
