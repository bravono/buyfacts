import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCoordinate,
  distance3D,
  parseClicksList,
  normalizePuzzleType,
  evaluateTaskAttempt
} from "../app/api/cubicon-data/route";

test("BuyFacts Cubicon Task Coordinates and Drag Features Test Suite", async (t) => {
  await t.test("1. Coordinate Parsing (parseCoordinate)", async () => {
    // Standard object
    const fromObj = parseCoordinate({ x: 0.15, y: 0.45, z: 1.0 });
    assert.deepEqual(fromObj, { x: 0.15, y: 0.45, z: 1.0 });

    // Array format
    const fromArr = parseCoordinate([0.15, 0.45, 1.0]);
    assert.deepEqual(fromArr, { x: 0.15, y: 0.45, z: 1.0 });

    // JSON string format
    const fromJsonStr = parseCoordinate('{"x": -0.6, "y": 0.1, "z": 1.0}');
    assert.deepEqual(fromJsonStr, { x: -0.6, y: 0.1, z: 1.0 });

    // Comma-separated string format
    const fromCsvStr = parseCoordinate("-0.6, 0.1, 1.0");
    assert.deepEqual(fromCsvStr, { x: -0.6, y: 0.1, z: 1.0 });

    // Edge cases and error handling
    assert.equal(parseCoordinate(null), null);
    assert.equal(parseCoordinate(undefined), null);
    assert.equal(parseCoordinate(""), null);
    assert.equal(parseCoordinate("not a coordinate"), null);
  });

  await t.test("2. 3D Distance Calculation (distance3D)", async () => {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 1, y: 2, z: 2 };
    assert.equal(distance3D(p1, p2), 3);
    assert.equal(distance3D(p1, p1), 0);
    assert.equal(distance3D(null, p2), Infinity);
  });

  await t.test("3. Clicks Parsing & Sorting (parseClicksList)", async () => {
    const clickMap = {
      "2": { x: 0.0, y: 0.35, z: 1.0, t: 200 },
      "1": { x: -0.6, y: 0.1, z: 1.0, t: 100 },
      "3": { x: 0.6, y: 0.1, z: 1.0, t: 300 }
    };

    const list = parseClicksList(clickMap);
    assert.equal(list.length, 3);
    assert.deepEqual(list[0], { x: -0.6, y: 0.1, z: 1.0, t: 100 });
    assert.deepEqual(list[1], { x: 0.0, y: 0.35, z: 1.0, t: 200 });
    assert.deepEqual(list[2], { x: 0.6, y: 0.1, z: 1.0, t: 300 });
  });

  await t.test("4. Puzzle Type Normalization & Single-Click Evaluation (Strict Click Count)", async () => {
    // Normalization verification
    assert.equal(normalizePuzzleType("click"), "click");
    assert.equal(normalizePuzzleType("Selection"), "click");
    assert.equal(normalizePuzzleType("drag"), "drag");
    assert.equal(normalizePuzzleType("Anticipation"), "drag");
    assert.equal(normalizePuzzleType("double_click"), "double_click");
    assert.equal(normalizePuzzleType("double-click"), "double_click");

    const clickTask = {
      taskIndex: 1,
      question_type: "click",
      correct_coordinates: JSON.stringify([{ x: -0.25, y: 0.30, z: 1.0 }]),
      tolerance: 0.5
    };

    // Pass within tolerance (exactly 1 click)
    const passClicks = { "1": { x: -0.20, y: 0.30, z: 1.0 } };
    assert.equal(evaluateTaskAttempt(clickTask, passClicks), "p");

    // Strict Rule: Multiple clicks on single-click task fail immediately
    const multipleClicks = {
      "1": { x: -0.20, y: 0.30, z: 1.0 },
      "2": { x: 1.50, y: 2.00, z: 1.0 }
    };
    assert.equal(
      evaluateTaskAttempt(clickTask, multipleClicks),
      "f",
      "Multiple clicks on single-click puzzle must fail immediately"
    );

    // Fail outside tolerance (1 click)
    const failClicks = { "1": { x: 1.50, y: 2.00, z: 1.0 } };
    assert.equal(evaluateTaskAttempt(clickTask, failClicks), "f");

    // Empty clicks
    assert.equal(evaluateTaskAttempt(clickTask, {}), "f");

    // Double-click puzzle verification
    const doubleClickTask = {
      taskIndex: 9,
      question_type: "double_click",
      correct_coordinates: JSON.stringify([{ x: 0.0, y: 0.0, z: 1.0 }]),
      tolerance: 0.5
    };

    // Exactly 2 clicks inside tolerance -> passes
    assert.equal(
      evaluateTaskAttempt(doubleClickTask, {
        "1": { x: 0.01, y: 0.01, z: 1.0 },
        "2": { x: 0.02, y: 0.02, z: 1.0 }
      }),
      "p"
    );

    // 1 click on double click task -> fails
    assert.equal(
      evaluateTaskAttempt(doubleClickTask, {
        "1": { x: 0.01, y: 0.01, z: 1.0 }
      }),
      "f"
    );

    // 3 clicks on double click task -> fails
    assert.equal(
      evaluateTaskAttempt(doubleClickTask, {
        "1": { x: 0.01, y: 0.01, z: 1.0 },
        "2": { x: 0.02, y: 0.02, z: 1.0 },
        "3": { x: 0.03, y: 0.03, z: 1.0 }
      }),
      "f"
    );
  });

  await t.test("5. Up to 3-Coordinate Drag Feature Evaluation (Order-Independent Array)", async () => {
    const dragTask = {
      taskIndex: 2,
      question_type: "Anticipation",
      correct_coordinates: JSON.stringify([
        { x: -0.60, y: 0.10, z: 1.0 },
        { x: 0.0, y: 0.35, z: 1.0 },
        { x: 0.60, y: 0.10, z: 1.0 }
      ]),
      tolerance: 0.5
    };

    // Forward traversal
    const successfulDrag = {
      "1": { x: -0.58, y: 0.12, z: 1.0, t: 100 },
      "2": { x: -0.30, y: 0.20, z: 1.0, t: 200 },
      "3": { x: 0.02, y: 0.34, z: 1.0, t: 300 },
      "4": { x: 0.30, y: 0.20, z: 1.0, t: 400 },
      "5": { x: 0.59, y: 0.09, z: 1.0, t: 500 }
    };
    assert.equal(evaluateTaskAttempt(dragTask, successfulDrag), "p");

    // Reverse traversal: order does not matter
    const reverseDrag = {
      "1": { x: 0.59, y: 0.09, z: 1.0, t: 100 },
      "2": { x: 0.02, y: 0.34, z: 1.0, t: 200 },
      "3": { x: -0.58, y: 0.12, z: 1.0, t: 300 }
    };
    assert.equal(evaluateTaskAttempt(dragTask, reverseDrag), "p", "Reverse traversal passes because drawing direction is unknown");

    // Middle-first traversal: order does not matter
    const midFirstDrag = {
      "1": { x: 0.02, y: 0.34, z: 1.0, t: 100 },
      "2": { x: -0.58, y: 0.12, z: 1.0, t: 200 },
      "3": { x: 0.59, y: 0.09, z: 1.0, t: 300 }
    };
    assert.equal(evaluateTaskAttempt(dragTask, midFirstDrag), "p", "Order does not matter as long as all points are matched");

    // Missed midpoint
    const missedMidDrag = {
      "1": { x: -0.58, y: 0.12, z: 1.0, t: 100 },
      "2": { x: 0.59, y: 0.09, z: 1.0, t: 500 }
    };
    assert.equal(evaluateTaskAttempt(dragTask, missedMidDrag), "f");

    // Empty clicks
    assert.equal(evaluateTaskAttempt(dragTask, {}), "f");
  });

  await t.test("6. CubiconTask Prisma Model Persistence", async () => {
    const { prisma } = await import("../lib/prisma");
    const testTask = await prisma.cubiconTask.create({
      data: {
        taskIndex: 99,
        task_number: 99,
        heading: "Test Seed Task",
        description: "Test description for validation",
        screen: "Active_front",
        image: "https://example.com/test.webp",
        rotation: "left",
        rotationInterval: 15,
        question_type: "Selection",
        correct_coordinates: JSON.stringify([{ x: 0.1, y: 0.2, z: 1.0 }]),
        start_point: JSON.stringify({ x: 0.1, y: 0.2, z: 1.0 }),
        mid_point: "",
        end_point: "",
        tolerance: 0.5,
        isFinal: false,
      },
    });

    assert.ok(testTask.id);
    assert.equal(testTask.taskIndex, 99);
    assert.equal(testTask.correct_coordinates, JSON.stringify([{ x: 0.1, y: 0.2, z: 1.0 }]));

    // Cleanup
    await prisma.cubiconTask.delete({
      where: { id: testTask.id },
    });
  });
});

