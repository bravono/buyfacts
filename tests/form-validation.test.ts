import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  isBusinessEmail,
  ContactInquirySchema,
  FoundingClientSchema,
  FeedbackSchema,
  ShareSchema,
  FREE_EMAIL_DOMAINS,
} from "../lib/validation/forms";
import {
  checkRateLimit,
  resetRateLimits,
  RATE_LIMIT_CONFIGS,
} from "../lib/security/rate-limiter";
import { prisma } from "../lib/prisma";

describe("Business Email Validation (Section 8)", () => {
  test("should identify and reject all standard free public email domains", () => {
    const blockedSamples = [
      "user@gmail.com",
      "test@googlemail.com",
      "founder@yahoo.com",
      "admin@yahoo.co.uk",
      "person@hotmail.com",
      "client@outlook.com",
      "user@live.com",
      "test@aol.com",
      "privacy@proton.me",
      "secure@protonmail.com",
      "work@zoho.com",
      "dev@yandex.com",
      "info@gmx.com",
      "account@fastmail.com",
      "alias@tutanota.com",
      "user@icloud.com",
    ];

    for (const email of blockedSamples) {
      assert.strictEqual(
        isBusinessEmail(email),
        false,
        `Expected ${email} to be flagged as free/non-business email`
      );
    }
  });

  test("should handle case-insensitivity when evaluating domain blacklist", () => {
    assert.strictEqual(isBusinessEmail("CEO@GMAIL.COM"), false);
    assert.strictEqual(isBusinessEmail("partner@Yahoo.Com"), false);
    assert.strictEqual(isBusinessEmail("lead@Proton.Me"), false);
  });

  test("should accept legitimate business and corporate email domains", () => {
    const validBusinessEmails = [
      "robert@buyfacts.com",
      "analyst@mckinsey.com",
      "director@gartner.com",
      "researcher@stanford.edu",
      "partner@sequoiacap.com",
      "consultant@deloitte.co.uk",
      "founder@deeptech.io",
      "contact@agency.org",
    ];

    for (const email of validBusinessEmails) {
      assert.strictEqual(
        isBusinessEmail(email),
        true,
        `Expected ${email} to be recognized as a valid business email`
      );
    }
  });

  test("should reject empty, malformed, or non-email inputs", () => {
    assert.strictEqual(isBusinessEmail(""), false);
    assert.strictEqual(isBusinessEmail("notanemail"), false);
    assert.strictEqual(isBusinessEmail("@nodomain"), false);
    assert.strictEqual(isBusinessEmail("user@"), false);
    assert.strictEqual(isBusinessEmail(null as any), false);
  });
});

describe("Contact Us Form Schema & Honeypot (Section 9.1 & 13)", () => {
  test("should validate standard complete contact form submission", () => {
    const input = {
      name: "Jane Doe",
      email: "jane.doe@enterprise.com",
      company: "Acme Corp",
      interest: "Methodology Licensing",
      message: "We would like to explore licensing BuyFacts survey instruments.",
      isEighteen: true,
      hp_website: "",
    };

    const result = ContactInquirySchema.safeParse(input);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.name, "Jane Doe");
      assert.strictEqual(result.data.email, "jane.doe@enterprise.com");
      assert.strictEqual(result.data.isEighteen, true);
    }
  });

  test("should reject submission if isEighteen is false or missing", () => {
    const input = {
      name: "Underage Inquirer",
      email: "inquiry@example.com",
      message: "Inquiry message text here",
      isEighteen: false,
    };

    const result = ContactInquirySchema.safeParse(input);
    assert.strictEqual(result.success, false);
    assert.match(
      result.error?.issues[0]?.message || "",
      /18 years of age or older/
    );
  });

  test("should reject submission if honeypot field is filled by a bot", () => {
    const input = {
      name: "Spam Bot",
      email: "spambot@automated.com",
      message: "Automated SEO spam pitch here",
      isEighteen: true,
      hp_website: "https://spamlink.biz",
    };

    const result = ContactInquirySchema.safeParse(input);
    assert.strictEqual(result.success, false);
    assert.match(
      result.error?.issues[0]?.message || "",
      /Anti-automation check triggered/
    );
  });

  test("should reject empty or overly short name and message", () => {
    const shortNameResult = ContactInquirySchema.safeParse({
      name: "J",
      email: "j@example.com",
      message: "Valid message content",
      isEighteen: true,
    });
    assert.strictEqual(shortNameResult.success, false);

    const shortMsgResult = ContactInquirySchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      message: "Hi",
      isEighteen: true,
    });
    assert.strictEqual(shortMsgResult.success, false);
  });
});

describe("Founding Client Schema (Section 8)", () => {
  test("should validate valid founding client registration with business email and US-based confirmation", () => {
    const input = {
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "sjenkins@datacorp.com",
      emailConfirm: "sjenkins@datacorp.com",
      phone: "(555) 234-5678",
      urgency: "High",
      requestConfirmation: true,
      isEighteen: true,
      isUsBased: true,
      hp_website: "",
    };

    const result = FoundingClientSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("should reject founding client submission using free webmail (gmail)", () => {
    const input = {
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "sarah.jenkins@gmail.com",
      emailConfirm: "sarah.jenkins@gmail.com",
      isEighteen: true,
      isUsBased: true,
    };

    const result = FoundingClientSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    const hasBusinessEmailErr = result.error?.issues.some((issue) =>
      issue.message.includes("business email address is required")
    );
    assert.strictEqual(hasBusinessEmailErr, true);
  });

  test("should reject founding client if email and emailConfirm do not match", () => {
    const input = {
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "sarah@datacorp.com",
      emailConfirm: "sjenkins@datacorp.com",
      isEighteen: true,
      isUsBased: true,
    };

    const result = FoundingClientSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    const hasMismatchErr = result.error?.issues.some((issue) =>
      issue.message.includes("do not match")
    );
    assert.strictEqual(hasMismatchErr, true);
  });

  test("should reject founding client if organization is not US based", () => {
    const input = {
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "sarah@datacorp.com",
      emailConfirm: "sarah@datacorp.com",
      isEighteen: true,
      isUsBased: false,
    };

    const result = FoundingClientSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    const hasUsBasedErr = result.error?.issues.some((issue) =>
      issue.message.includes("US based")
    );
    assert.strictEqual(hasUsBasedErr, true);
  });
});

describe("Feedback Schema (Section 9.4 Non-Anonymous Requirement)", () => {
  test("should validate feedback with full name, valid email, and comments", () => {
    const input = {
      name: "Alex Rivera",
      email: "alex.rivera@marketresearch.com",
      comment: "The 3D spatial rotation is remarkably responsive on desktop Chrome.",
      rating: 5,
    };

    const result = FeedbackSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("should reject anonymous feedback without a name", () => {
    const input = {
      name: "",
      email: "alex@example.com",
      comment: "Great experience with the 3D cube.",
      rating: 4,
    };

    const result = FeedbackSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    assert.match(
      result.error?.issues[0]?.message || "",
      /Name is required so feedback is not anonymous/
    );
  });

  test("should reject feedback without a valid email address", () => {
    const input = {
      name: "Alex Rivera",
      email: "invalid-email-string",
      comment: "Feedback comments here",
    };

    const result = FeedbackSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  test("should reject feedback when rating is outside 0 to 5", () => {
    const input = {
      name: "Alex Rivera",
      email: "alex@example.com",
      comment: "Testing ratings",
      rating: 10,
    };

    const result = FeedbackSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });
});

describe("Share Invitation Schema (Section 9.3)", () => {
  test("should validate standard share invitation payload", () => {
    const input = {
      senderName: "Robert Johnson",
      senderEmail: "robert@buyfacts.com",
      receiverName: "David Miller",
      receiverEmail: "david.miller@clientcorp.com",
      sharePlatform: "email",
    };

    const result = ShareSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("should reject share invitation if receiver email is invalid", () => {
    const input = {
      senderName: "Robert Johnson",
      senderEmail: "robert@buyfacts.com",
      receiverName: "David Miller",
      receiverEmail: "not-an-email",
    };

    const result = ShareSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });
});

describe("In-Memory Sliding Window Rate Limiter (Section 13)", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test("should allow requests within limit and throttle subsequent requests", () => {
    const testIp = "192.168.1.100";
    const customConfig = { maxRequests: 3, windowSeconds: 60 };

    const first = checkRateLimit(testIp, "test_action", customConfig);
    assert.strictEqual(first.allowed, true);
    assert.strictEqual(first.remaining, 2);

    const second = checkRateLimit(testIp, "test_action", customConfig);
    assert.strictEqual(second.allowed, true);
    assert.strictEqual(second.remaining, 1);

    const third = checkRateLimit(testIp, "test_action", customConfig);
    assert.strictEqual(third.allowed, true);
    assert.strictEqual(third.remaining, 0);

    // 4th request must be throttled
    const fourth = checkRateLimit(testIp, "test_action", customConfig);
    assert.strictEqual(fourth.allowed, false);
    assert.strictEqual(fourth.remaining, 0);
    assert.ok(fourth.resetSeconds > 0);
  });

  test("should track limits independently across different client IPs", () => {
    const customConfig = { maxRequests: 1, windowSeconds: 60 };

    const ipA = checkRateLimit("10.0.0.1", "contact", customConfig);
    assert.strictEqual(ipA.allowed, true);

    const ipABlocked = checkRateLimit("10.0.0.1", "contact", customConfig);
    assert.strictEqual(ipABlocked.allowed, false);

    // ipB should still have quota
    const ipB = checkRateLimit("10.0.0.2", "contact", customConfig);
    assert.strictEqual(ipB.allowed, true);
  });
});

describe("Email Verification Database Operations (Section 9.1)", () => {
  const testToken = `test-token-${Date.now()}`;
  const testEmail = `verify-${Date.now()}@testcompany.com`;

  test("should persist pending verification token and payload into SQLite", async () => {
    const payload = JSON.stringify({
      name: "Test Inquirer",
      email: testEmail,
      message: "Holding message until verification is confirmed.",
    });

    const record = await prisma.emailVerification.create({
      data: {
        token: testToken,
        email: testEmail,
        type: "contact",
        payload,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    assert.ok(record.id);
    assert.strictEqual(record.token, testToken);
    assert.strictEqual(record.email, testEmail);
    assert.strictEqual(record.verifiedAt, null);
  });

  test("should query token and mark as verified upon user confirmation", async () => {
    const found = await prisma.emailVerification.findUnique({
      where: { token: testToken },
    });
    assert.ok(found);
    assert.strictEqual(found?.verifiedAt, null);

    const verified = await prisma.emailVerification.update({
      where: { token: testToken },
      data: { verifiedAt: new Date() },
    });

    assert.ok(verified.verifiedAt instanceof Date);
  });

  test("should detect expired tokens past 24-hour expiration window", async () => {
    const expiredToken = `expired-token-${Date.now()}`;
    await prisma.emailVerification.create({
      data: {
        token: expiredToken,
        email: "expired@testcompany.com",
        type: "contact",
        payload: "{}",
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
      },
    });

    const expiredRecord = await prisma.emailVerification.findUnique({
      where: { token: expiredToken },
    });

    assert.ok(expiredRecord);
    const isExpired = expiredRecord.expiresAt < new Date();
    assert.strictEqual(isExpired, true);

    // Clean up
    await prisma.emailVerification.delete({ where: { token: expiredToken } });
  });

  test("clean up test verification record", async () => {
    await prisma.emailVerification.delete({ where: { token: testToken } });
  });
});
