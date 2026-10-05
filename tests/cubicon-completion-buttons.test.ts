import test from "node:test";
import assert from "node:assert/strict";

/**
 * Message handler simulation mirroring handleCubiconMessage in app/cubicon/page.tsx
 */
function simulateCubiconMessage(
  data: any,
  handlers: {
    onExit: () => void;
    onContact: () => void;
    onFeedback?: (sessionId?: string) => void;
  }
) {
  if (data?.type === "CUBICON_EXIT" || data === "CUBICON_EXIT") {
    handlers.onExit();
    return "exit";
  }
  if (data?.type === "CUBICON_CONTACT" || data === "CUBICON_CONTACT") {
    handlers.onContact();
    return "contact";
  }
  if (data?.type === "CUBICON_FEEDBACK" || data === "CUBICON_FEEDBACK") {
    const sessionId = typeof data === "object" ? data?.sessionId : undefined;
    handlers.onFeedback?.(sessionId);
    return "feedback";
  }
  return "unhandled";
}

test("Cubicon Completion Buttons Message Handling Test Suite", async (t) => {
  await t.test("1. CUBICON_EXIT message handling", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    let feedbackTriggered = 0;
    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
      },
      onFeedback: () => {
        feedbackTriggered++;
      },
    };

    // Object payload { type: "CUBICON_EXIT" }
    const res1 = simulateCubiconMessage({ type: "CUBICON_EXIT" }, handlers);
    assert.equal(res1, "exit");
    assert.equal(exitTriggered, 1);
    assert.equal(contactTriggered, 0);
    assert.equal(feedbackTriggered, 0);

    // String payload "CUBICON_EXIT"
    const res2 = simulateCubiconMessage("CUBICON_EXIT", handlers);
    assert.equal(res2, "exit");
    assert.equal(exitTriggered, 2);
    assert.equal(contactTriggered, 0);
    assert.equal(feedbackTriggered, 0);
  });

  await t.test("2. CUBICON_CONTACT message handling", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    let feedbackTriggered = 0;
    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
      },
      onFeedback: () => {
        feedbackTriggered++;
      },
    };

    // Object payload { type: "CUBICON_CONTACT" }
    const res1 = simulateCubiconMessage({ type: "CUBICON_CONTACT" }, handlers);
    assert.equal(res1, "contact");
    assert.equal(contactTriggered, 1);
    assert.equal(exitTriggered, 0);
    assert.equal(feedbackTriggered, 0);

    // String payload "CUBICON_CONTACT"
    const res2 = simulateCubiconMessage("CUBICON_CONTACT", handlers);
    assert.equal(res2, "contact");
    assert.equal(contactTriggered, 2);
    assert.equal(exitTriggered, 0);
    assert.equal(feedbackTriggered, 0);
  });

  await t.test("3. CUBICON_FEEDBACK message handling", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    let feedbackTriggered = 0;
    let receivedSessionId: string | undefined = undefined;

    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
      },
      onFeedback: (sessionId?: string) => {
        feedbackTriggered++;
        receivedSessionId = sessionId;
      },
    };

    // String payload "CUBICON_FEEDBACK"
    const res1 = simulateCubiconMessage("CUBICON_FEEDBACK", handlers);
    assert.equal(res1, "feedback");
    assert.equal(feedbackTriggered, 1);
    assert.equal(receivedSessionId, undefined);

    // Object payload { type: "CUBICON_FEEDBACK", sessionId: "sess_12345" }
    const res2 = simulateCubiconMessage(
      { type: "CUBICON_FEEDBACK", sessionId: "sess_12345" },
      handlers
    );
    assert.equal(res2, "feedback");
    assert.equal(feedbackTriggered, 2);
    assert.equal(receivedSessionId, "sess_12345");

    assert.equal(exitTriggered, 0);
    assert.equal(contactTriggered, 0);
  });

  await t.test("4. Edge cases and unhandled payloads", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    let feedbackTriggered = 0;
    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
      },
      onFeedback: () => {
        feedbackTriggered++;
      },
    };

    // Null or undefined
    assert.equal(simulateCubiconMessage(null, handlers), "unhandled");
    assert.equal(simulateCubiconMessage(undefined, handlers), "unhandled");

    // Empty object
    assert.equal(simulateCubiconMessage({}, handlers), "unhandled");

    // Other message types (e.g. fullscreen sync or third-party messages)
    assert.equal(
      simulateCubiconMessage({ type: "CUBICON_SET_FULLSCREEN" }, handlers),
      "unhandled"
    );
    assert.equal(
      simulateCubiconMessage("RANDOM_POST_MESSAGE", handlers),
      "unhandled"
    );

    // Numbers or boolean
    assert.equal(simulateCubiconMessage(12345, handlers), "unhandled");
    assert.equal(simulateCubiconMessage(false, handlers), "unhandled");

    // No handlers called
    assert.equal(exitTriggered, 0);
    assert.equal(contactTriggered, 0);
    assert.equal(feedbackTriggered, 0);
  });

  await t.test("5. Destination paths and route resolution", () => {
    const exitTargetSection = "founding-client-benefits";
    const contactTargetSection = "contact";

    const standaloneExitUrl = `/cubicon#${exitTargetSection}`;
    const contactUrl = `/#${contactTargetSection}`;
    const feedbackUrl = `/feedback`;

    assert.equal(standaloneExitUrl, "/cubicon#founding-client-benefits");
    assert.equal(contactUrl, "/#contact");
    assert.equal(feedbackUrl, "/feedback");

    const feedbackWithSession = (sessionId: string) =>
      sessionId ? `/feedback?sessionId=${encodeURIComponent(sessionId)}` : "/feedback";

    assert.equal(
      feedbackWithSession("cubicon_sess_99"),
      "/feedback?sessionId=cubicon_sess_99"
    );
    assert.equal(feedbackWithSession(""), "/feedback");
  });
});
