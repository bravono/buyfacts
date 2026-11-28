import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  round,
  normalizePoint,
  formatCoordinatesJson,
  projectScreenUVTo3D,
  project3DToScreenUV,
  parseCoordinateInput,
  extractWaypoints,
  normalizeQuestionType,
  questionTypeToInteractionMode,
  interactionModeToQuestionType,
  FACE_SPAN,
} from "../lib/cubicon/coordinateHelper";

test("Cubicon Coordinate Helper Test Suite", async (t) => {
  await t.test("1. round and normalizePoint", async () => {
    assert.equal(round(0.123456, 3), 0.123);
    assert.equal(round(-0.987654, 2), -0.99);

    const norm = normalizePoint({ x: 0.150001, y: 0.450999 });
    assert.deepEqual(norm, { x: 0.15, y: 0.451, z: 1.0 });

    const normWithZ = normalizePoint({ x: -0.25, y: 0.3, z: 0.9999 });
    assert.deepEqual(normWithZ, { x: -0.25, y: 0.3, z: 1.0 });
  });

  await t.test("2. formatCoordinatesJson", async () => {
    const emptyJson = formatCoordinatesJson([]);
    assert.equal(emptyJson, "[]");

    const singleJson = formatCoordinatesJson([{ x: 0.15, y: 0.45 }]);
    assert.equal(singleJson, JSON.stringify([{ x: 0.15, y: 0.45, z: 1.0 }]));

    const multiJson = formatCoordinatesJson([
      { x: -0.6, y: 0.1 },
      { x: 0.0, y: 0.35 },
      { x: 0.6, y: 0.1 },
    ]);
    assert.equal(
      multiJson,
      JSON.stringify([
        { x: -0.6, y: 0.1, z: 1.0 },
        { x: 0.0, y: 0.35, z: 1.0 },
        { x: 0.6, y: 0.1, z: 1.0 },
      ])
    );
  });

  await t.test("3. projectScreenUVTo3D and project3DToScreenUV roundtrip", async () => {
    // Center point (u = 0.5, v = 0.5) maps to (0, 0, 1.0)
    const center3D = projectScreenUVTo3D(0.5, 0.5);
    assert.deepEqual(center3D, { x: 0, y: 0, z: 1.0 });

    const centerUV = project3DToScreenUV(center3D);
    assert.equal(centerUV.u, 0.5);
    assert.equal(centerUV.v, 0.5);

    // Boundary corners
    const topLeft3D = projectScreenUVTo3D(0, 0);
    assert.deepEqual(topLeft3D, { x: round(-0.5 * FACE_SPAN, 3), y: round(0.5 * FACE_SPAN, 3), z: 1.0 });

    const bottomRight3D = projectScreenUVTo3D(1, 1);
    assert.deepEqual(bottomRight3D, { x: round(0.5 * FACE_SPAN, 3), y: round(-0.5 * FACE_SPAN, 3), z: 1.0 });

    // Roundtrip test for arbitrary point
    const originalUV = { u: 0.35, v: 0.65 };
    const p3D = projectScreenUVTo3D(originalUV.u, originalUV.v);
    const roundtripUV = project3DToScreenUV(p3D);
    assert.ok(Math.abs(roundtripUV.u - originalUV.u) < 0.005);
    assert.ok(Math.abs(roundtripUV.v - originalUV.v) < 0.005);
  });

  await t.test("4. parseCoordinateInput formats", async () => {
    // Array of objects
    const arrInput = [{ x: -0.25, y: 0.3, z: 1.0 }];
    assert.deepEqual(parseCoordinateInput(arrInput), [{ x: -0.25, y: 0.3, z: 1.0 }]);

    // Flat array [x, y, z]
    const flatArr = [0.15, 0.45, 1.0];
    assert.deepEqual(parseCoordinateInput(flatArr), [{ x: 0.15, y: 0.45, z: 1.0 }]);

    // Single object
    const singleObj = { x: 0.15, y: 0.45 };
    assert.deepEqual(parseCoordinateInput(singleObj), [{ x: 0.15, y: 0.45, z: 1.0 }]);

    // JSON array string
    const jsonStr = '[{"x": -0.6, "y": 0.1, "z": 1.0}, {"x": 0.6, "y": 0.1, "z": 1.0}]';
    assert.equal(parseCoordinateInput(jsonStr).length, 2);

    // Indexed click map (as logged during clicks)
    const clickMap = {
      "1": { x: -0.25, y: 0.3, z: 1.0, t: 100 },
      "2": { x: 0.0, y: 0.35, z: 1.0, t: 200 },
    };
    const parsedMap = parseCoordinateInput(clickMap);
    assert.equal(parsedMap.length, 2);
    assert.deepEqual(parsedMap[0], { x: -0.25, y: 0.3, z: 1.0 });
    assert.deepEqual(parsedMap[1], { x: 0.0, y: 0.35, z: 1.0 });

    // Legacy start, mid, end object
    const legacyObj = {
      start: { x: -0.6, y: 0.1, z: 1.0 },
      mid: { x: 0.0, y: 0.35, z: 1.0 },
      end: { x: 0.6, y: 0.1, z: 1.0 },
    };
    const parsedLegacy = parseCoordinateInput(legacyObj);
    assert.equal(parsedLegacy.length, 3);
    assert.deepEqual(parsedLegacy[0], { x: -0.6, y: 0.1, z: 1.0 });
    assert.deepEqual(parsedLegacy[2], { x: 0.6, y: 0.1, z: 1.0 });

    // CSV string
    const csv = "-0.6, 0.1, 1.0";
    assert.deepEqual(parseCoordinateInput(csv), [{ x: -0.6, y: 0.1, z: 1.0 }]);

    // Raw console log copy-paste
    const consoleLog = "Captured coordinates: x: -0.25, y: 0.30, z: 1.0";
    const parsedConsole = parseCoordinateInput(consoleLog);
    assert.equal(parsedConsole.length, 1);
    assert.deepEqual(parsedConsole[0], { x: -0.25, y: 0.3, z: 1.0 });

    // Empty and invalid values
    assert.deepEqual(parseCoordinateInput(null), []);
    assert.deepEqual(parseCoordinateInput(undefined), []);
    assert.deepEqual(parseCoordinateInput(""), []);
    assert.deepEqual(parseCoordinateInput("invalid random text"), []);
  });

  await t.test("5. extractWaypoints for 1, 2, and 3 points", async () => {
    // 0 points
    const wp0 = extractWaypoints([]);
    assert.equal(wp0.startPoint, "");
    assert.equal(wp0.midPoint, "");
    assert.equal(wp0.endPoint, "");

    // 1 point (single-click)
    const p1 = [{ x: 0.15, y: 0.45, z: 1.0 }];
    const wp1 = extractWaypoints(p1);
    assert.equal(wp1.startPoint, JSON.stringify(p1[0]));
    assert.equal(wp1.midPoint, "");
    assert.equal(wp1.endPoint, "");

    // 2 points (drag start + end)
    const p2 = [
      { x: -0.6, y: 0.1, z: 1.0 },
      { x: 0.6, y: 0.1, z: 1.0 },
    ];
    const wp2 = extractWaypoints(p2);
    assert.equal(wp2.startPoint, JSON.stringify(p2[0]));
    assert.equal(wp2.midPoint, "");
    assert.equal(wp2.endPoint, JSON.stringify(p2[1]));

    // 3 points (drag start + mid + end)
    const p3 = [
      { x: -0.6, y: 0.1, z: 1.0 },
      { x: 0.0, y: 0.35, z: 1.0 },
      { x: 0.6, y: 0.1, z: 1.0 },
    ];
    const wp3 = extractWaypoints(p3);
    assert.equal(wp3.startPoint, JSON.stringify(p3[0]));
    assert.equal(wp3.midPoint, JSON.stringify(p3[1]));
    assert.equal(wp3.endPoint, JSON.stringify(p3[2]));
  });

  await t.test("6. questionType normalization and interactionMode conversion", async () => {
    assert.equal(normalizeQuestionType(undefined), "Selection");
    assert.equal(normalizeQuestionType(null), "Selection");
    assert.equal(normalizeQuestionType(""), "Selection");
    assert.equal(normalizeQuestionType("Selection"), "Selection");
    assert.equal(normalizeQuestionType("click"), "Selection");
    assert.equal(normalizeQuestionType("CLICK"), "Selection");

    assert.equal(normalizeQuestionType("Anticipation"), "Anticipation");
    assert.equal(normalizeQuestionType("drag"), "Anticipation");
    assert.equal(normalizeQuestionType("DRAG"), "Anticipation");
    assert.equal(normalizeQuestionType("Drawing"), "Anticipation");
    assert.equal(normalizeQuestionType("Multi-point"), "Anticipation");
    assert.equal(normalizeQuestionType("sequence"), "Anticipation");

    assert.equal(questionTypeToInteractionMode("Selection"), "click");
    assert.equal(questionTypeToInteractionMode("click"), "click");
    assert.equal(questionTypeToInteractionMode("Anticipation"), "drag");
    assert.equal(questionTypeToInteractionMode("drag"), "drag");

    assert.equal(interactionModeToQuestionType("click"), "Selection");
    assert.equal(interactionModeToQuestionType("drag"), "Anticipation");
    assert.equal(interactionModeToQuestionType(undefined), "Selection");
  });

  await t.test("7. Zero-Emoji Compliance", async () => {
    const helperFile = path.resolve(__dirname, "../lib/cubicon/coordinateHelper.ts");
    const testFile = __filename;

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const helperContent = fs.readFileSync(helperFile, "utf8");
    assert.equal(emojiRegex.test(helperContent), false, "coordinateHelper.ts must not contain emojis");

    const testContent = fs.readFileSync(testFile, "utf8");
    assert.equal(emojiRegex.test(testContent), false, "cubicon-coordinate-helper.test.ts must not contain emojis");
  });
});
