import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FeedbackSchema } from "../lib/validation/forms";
import { POST, GET, DELETE } from "../app/api/cubicon-feedback/route";
import { prisma } from "../lib/prisma";

test("User Feedback Feature Test Suite", async (t) => {
  const createdFeedbackIds: number[] = [];

  t.after(async () => {
    if (createdFeedbackIds.length > 0) {
      await prisma.feedbackSubmission.deleteMany({
        where: { id: { in: createdFeedbackIds } },
      });
    }
  });

  await t.test("1. FeedbackSchema Validation Rules", async (st) => {
    await st.test("Happy path: valid full submission", () => {
      const input = {
        name: "Dr. Evelyn Reed",
        email: "evelyn.reed@bioresearch.org",
        comment: "The 3D spatial alignment puzzles provide rigorous human authentication.",
        rating: 5,
        sessionId: "sess_test_101",
        hp_website: "",
      };

      const result = FeedbackSchema.safeParse(input);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.name, "Dr. Evelyn Reed");
        assert.strictEqual(result.data.email, "evelyn.reed@bioresearch.org");
        assert.strictEqual(result.data.rating, 5);
        assert.strictEqual(result.data.sessionId, "sess_test_101");
      }
    });

    await st.test("Non-anonymous validation: missing or empty name rejected", () => {
      const input = {
        name: "   ",
        email: "evelyn.reed@bioresearch.org",
        comment: "Valid comment text here.",
        rating: 4,
      };

      const result = FeedbackSchema.safeParse(input);
      assert.strictEqual(result.success, false);
      assert.match(
        result.error?.issues[0]?.message || "",
        /Name is required so feedback is not anonymous/
      );
    });

    await st.test("Email validation: invalid email format rejected", () => {
      const input = {
        name: "Dr. Evelyn Reed",
        email: "not-a-valid-email",
        comment: "Valid comment text here.",
        rating: 4,
      };

      const result = FeedbackSchema.safeParse(input);
      assert.strictEqual(result.success, false);
      assert.match(
        result.error?.issues[0]?.message || "",
        /Please provide a valid email address/
      );
    });

    await st.test("Rating boundary values: 0 to 5 allowed, invalid rejected", () => {
      // 0, 1, 5 are allowed
      for (const val of [0, 1, 2, 3, 4, 5]) {
        const res = FeedbackSchema.safeParse({
          name: "Test User",
          email: "user@example.com",
          comment: "Testing rating boundary.",
          rating: val,
        });
        assert.strictEqual(res.success, true);
      }

      // Negative numbers rejected
      const negRes = FeedbackSchema.safeParse({
        name: "Test User",
        email: "user@example.com",
        comment: "Testing rating boundary.",
        rating: -1,
      });
      assert.strictEqual(negRes.success, false);

      // Above 5 rejected
      const highRes = FeedbackSchema.safeParse({
        name: "Test User",
        email: "user@example.com",
        comment: "Testing rating boundary.",
        rating: 6,
      });
      assert.strictEqual(highRes.success, false);

      // Non-integer floats rejected
      const floatRes = FeedbackSchema.safeParse({
        name: "Test User",
        email: "user@example.com",
        comment: "Testing rating boundary.",
        rating: 4.5,
      });
      assert.strictEqual(floatRes.success, false);
    });

    await st.test("Comment length boundaries: min 3 chars, max 3000 chars", () => {
      // Too short (< 3 chars)
      const shortRes = FeedbackSchema.safeParse({
        name: "Test User",
        email: "user@example.com",
        comment: "hi",
        rating: 5,
      });
      assert.strictEqual(shortRes.success, false);
      assert.match(
        shortRes.error?.issues[0]?.message || "",
        /Comment must be at least 3 characters/
      );

      // Boundary: exactly 3 characters allowed
      const exact3 = FeedbackSchema.safeParse({
        name: "Test User",
        email: "user@example.com",
        comment: "Yes",
        rating: 5,
      });
      assert.strictEqual(exact3.success, true);

      // Excessively long (> 3000 chars)
      const longComment = "a".repeat(3001);
      const longRes = FeedbackSchema.safeParse({
        name: "Test User",
        email: "user@example.com",
        comment: longComment,
        rating: 5,
      });
      assert.strictEqual(longRes.success, false);
      assert.match(
        longRes.error?.issues[0]?.message || "",
        /Comment cannot exceed 3,000 characters/
      );
    });

    await st.test("Honeypot protection: non-empty hp_website triggers rejection", () => {
      const botInput = {
        name: "Bot Spammer",
        email: "bot@spam.com",
        comment: "Buy cheap meds now at our link.",
        rating: 5,
        hp_website: "https://spam-domain.com",
      };

      const result = FeedbackSchema.safeParse(botInput);
      assert.strictEqual(result.success, false);
      assert.match(
        result.error?.issues[0]?.message || "",
        /Anti-automation check triggered/
      );
    });
  });

  await t.test("2. API Route POST /api/cubicon-feedback Persistence", async () => {
    const testEmail = `fb_test_${Date.now()}@domain.com`;
    const req = new Request("http://localhost:3000/api/cubicon-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.20.30.40",
      },
      body: JSON.stringify({
        name: "Marcus Vance",
        email: testEmail,
        rating: 5,
        comment: "Exceptionally intuitive interface and robust 3D verification mechanics.",
        sessionId: "sess_cubicon_999",
        hp_website: "",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, "Thank you for your feedback.");
    assert.ok(data.feedback?.id, "Created record must have an autoincrement ID");

    createdFeedbackIds.push(data.feedback.id);

    // Verify database record in SQLite
    const persisted = await prisma.feedbackSubmission.findUnique({
      where: { id: data.feedback.id },
    });
    assert.ok(persisted, "Record must exist in cubicon_feedback table");
    assert.strictEqual(persisted?.userId, "Marcus Vance");
    assert.strictEqual(persisted?.userEmail, testEmail);
    assert.strictEqual(persisted?.rating, 5);
    assert.strictEqual(persisted?.sessionId, "sess_cubicon_999");
    assert.strictEqual(
      persisted?.feedbackText,
      "Exceptionally intuitive interface and robust 3D verification mechanics."
    );
  });

  await t.test("3. API Route POST /api/cubicon-feedback Validation Rejection", async () => {
    const req = new Request("http://localhost:3000/api/cubicon-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.20.30.41",
      },
      body: JSON.stringify({
        name: "", // Anonymous name rejected
        email: "valid@email.com",
        rating: 4,
        comment: "Good tool.",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.match(data.error, /Name is required so feedback is not anonymous/);
  });

  await t.test("4. API Route GET /api/cubicon-feedback", async () => {
    // JSON response
    const reqJson = new Request("http://localhost:3000/api/cubicon-feedback");
    const resJson = await GET(reqJson);
    assert.strictEqual(resJson.status, 200);

    const data = await resJson.json();
    assert.ok(Array.isArray(data.feedback), "Response should include feedback array");

    // CSV export response
    const reqCsv = new Request("http://localhost:3000/api/cubicon-feedback?export=csv");
    const resCsv = await GET(reqCsv);
    assert.strictEqual(resCsv.status, 200);
    assert.ok(resCsv.headers.get("content-type")?.includes("text/csv"));
    const csvText = await resCsv.text();
    assert.ok(csvText.startsWith("ID,Name,Email,Session ID,Rating,Feedback,Date"));
  });

  await t.test("5. API Route DELETE /api/cubicon-feedback Retention Policy", async () => {
    // Unsupported purge param returns 400
    const reqInvalid = new Request("http://localhost:3000/api/cubicon-feedback?purge=invalid");
    const resInvalid = await DELETE(reqInvalid);
    assert.strictEqual(resInvalid.status, 400);

    // Valid ?purge=30d returns 200
    const reqPurge = new Request("http://localhost:3000/api/cubicon-feedback?purge=30d");
    const resPurge = await DELETE(reqPurge);
    assert.strictEqual(resPurge.status, 200);
    const purgeData = await resPurge.json();
    assert.strictEqual(purgeData.success, true);
    assert.ok(typeof purgeData.purgedCount === "number");
  });

  await t.test("6. Zero-Emoji Compliance across New and Modified Files", () => {
    const filesToCheck = [
      path.resolve(__dirname, "../app/feedback/page.tsx"),
      path.resolve(__dirname, "../app/feedback/feedback.module.css"),
      path.resolve(__dirname, "../components/Footer.tsx"),
      path.resolve(__dirname, "../tests/feedback-feature.test.ts"),
    ];

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const match = content.match(emojiRegex);
        assert.strictEqual(
          match,
          null,
          `Emoji found in ${path.basename(filePath)}: ${match ? match[0] : ""}`
        );
      }
    }
  });
});
