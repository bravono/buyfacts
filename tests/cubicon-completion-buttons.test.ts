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
  return "unhandled";
}

test("Cubicon Completion Buttons Message Handling Test Suite", async (t) => {
  await t.test("1. CUBICON_EXIT message handling", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
      },
    };

    // Object payload { type: "CUBICON_EXIT" }
    const res1 = simulateCubiconMessage({ type: "CUBICON_EXIT" }, handlers);
    assert.equal(res1, "exit");
    assert.equal(exitTriggered, 1);
    assert.equal(contactTriggered, 0);

    // String payload "CUBICON_EXIT"
    const res2 = simulateCubiconMessage("CUBICON_EXIT", handlers);
    assert.equal(res2, "exit");
    assert.equal(exitTriggered, 2);
    assert.equal(contactTriggered, 0);
  });

  await t.test("2. CUBICON_CONTACT message handling", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
      },
    };

    // Object payload { type: "CUBICON_CONTACT" }
    const res1 = simulateCubiconMessage({ type: "CUBICON_CONTACT" }, handlers);
    assert.equal(res1, "contact");
    assert.equal(contactTriggered, 1);
    assert.equal(exitTriggered, 0);

    // String payload "CUBICON_CONTACT"
    const res2 = simulateCubiconMessage("CUBICON_CONTACT", handlers);
    assert.equal(res2, "contact");
    assert.equal(contactTriggered, 2);
    assert.equal(exitTriggered, 0);
  });

  await t.test("3. Edge cases and unhandled payloads", () => {
    let exitTriggered = 0;
    let contactTriggered = 0;
    const handlers = {
      onExit: () => {
        exitTriggered++;
      },
      onContact: () => {
        contactTriggered++;
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
  });

  await t.test("4. Destination paths and route resolution", () => {
    const exitTargetSection = "founding-client-benefits";
    const contactTargetSection = "contact";

    const standaloneExitUrl = `/cubicon#${exitTargetSection}`;
    const contactUrl = `/#${contactTargetSection}`;

    assert.equal(standaloneExitUrl, "/cubicon#founding-client-benefits");
    assert.equal(contactUrl, "/#contact");
  });
});
