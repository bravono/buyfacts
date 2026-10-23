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
} from "../lib/cubicon/coordinateHelper";
import { evaluateTaskAttempt } from "../app/api/cubicon-data/route";

test("Cubicon Visual Coordinate Picker Integration Test Suite", async (t) => {
  await t.test("1. Single-Click Task Coordinate Generation & Evaluation Parity", async () => {
    // Admin clicks on face at UV (u = 0.60, v = 0.25)
    const target3D = projectScreenUVTo3D(0.60, 0.25);
    const points = [target3D];

    const correctCoordinates = formatCoordinatesJson(points);
    const waypoints = extractWaypoints(points);

    // Assert correct data contract
    assert.equal(typeof correctCoordinates, "string");
    const parsedJson = JSON.parse(correctCoordinates);
    assert.equal(parsedJson.length, 1);
    assert.equal(parsedJson[0].z, 1.0);
    assert.equal(waypoints.startPoint, JSON.stringify(target3D));
    assert.equal(waypoints.midPoint, "");
    assert.equal(waypoints.endPoint, "");

    // Mock task object matching CubiconTask schema
    const task = {
      taskIndex: 0,
      questionType: "Selection",
      correctCoordinates,
      startPoint: waypoints.startPoint,
      midPoint: waypoints.midPoint,
      endPoint: waypoints.endPoint,
      tolerance: 0.5,
    };

    // User click matching within tolerance passes
    const hitClick = {
      "1": { x: target3D.x + 0.05, y: target3D.y - 0.05, z: 1.0, t: 100 },
    };
    assert.equal(evaluateTaskAttempt(task, hitClick), "p");

    // Click outside tolerance fails
    const missClick = {
      "1": { x: target3D.x + 0.8, y: target3D.y + 0.8, z: 1.0, t: 100 },
    };
    assert.equal(evaluateTaskAttempt(task, missClick), "f");
  });

  await t.test("2. Multi-Point Drag Task Coordinate Generation (2-Waypoints: Start & End)", async () => {
    // Admin drags across screen from UV (0.2, 0.5) to UV (0.8, 0.5)
    const start3D = projectScreenUVTo3D(0.2, 0.5);
    const end3D = projectScreenUVTo3D(0.8, 0.5);
    const points = [start3D, end3D];

    const correctCoordinates = formatCoordinatesJson(points);
    const waypoints = extractWaypoints(points);

    assert.equal(waypoints.startPoint, JSON.stringify(start3D));
    assert.equal(waypoints.midPoint, "");
    assert.equal(waypoints.endPoint, JSON.stringify(end3D));

    const task = {
      taskIndex: 1,
      questionType: "Anticipation",
      correctCoordinates,
      startPoint: waypoints.startPoint,
      midPoint: waypoints.midPoint,
      endPoint: waypoints.endPoint,
      tolerance: 0.5,
    };

    // User drags and hits both endpoints
    const successfulDrag = {
      "1": { x: start3D.x, y: start3D.y, z: 1.0, t: 100 },
      "2": { x: (start3D.x + end3D.x) / 2, y: start3D.y, z: 1.0, t: 200 },
      "3": { x: end3D.x, y: end3D.y, z: 1.0, t: 300 },
    };
    assert.equal(evaluateTaskAttempt(task, successfulDrag), "p");

    // Fewer than 2 clicks fails drag task instantly
    const oneClick = {
      "1": { x: start3D.x, y: start3D.y, z: 1.0, t: 100 },
    };
    assert.equal(evaluateTaskAttempt(task, oneClick), "f");
  });

  await t.test("3. Multi-Point Drag Task Coordinate Generation (3-Waypoints: Start, Mid, End)", async () => {
    // Admin creates 3-point curved drag path: Start -> Mid -> End
    const start3D = projectScreenUVTo3D(0.15, 0.55);
    const mid3D = projectScreenUVTo3D(0.50, 0.20);
    const end3D = projectScreenUVTo3D(0.85, 0.55);
    const points = [start3D, mid3D, end3D];

    const correctCoordinates = formatCoordinatesJson(points);
    const waypoints = extractWaypoints(points);

    assert.equal(waypoints.startPoint, JSON.stringify(start3D));
    assert.equal(waypoints.midPoint, JSON.stringify(mid3D));
    assert.equal(waypoints.endPoint, JSON.stringify(end3D));

    const task = {
      taskIndex: 2,
      questionType: "Anticipation",
      correctCoordinates,
      startPoint: waypoints.startPoint,
      midPoint: waypoints.midPoint,
      endPoint: waypoints.endPoint,
      tolerance: 0.5,
    };

    // All 3 points hit
    const allMatchedClicks = {
      "1": { x: start3D.x + 0.02, y: start3D.y, z: 1.0, t: 100 },
      "2": { x: mid3D.x, y: mid3D.y - 0.03, z: 1.0, t: 200 },
      "3": { x: end3D.x - 0.01, y: end3D.y, z: 1.0, t: 300 },
    };
    assert.equal(evaluateTaskAttempt(task, allMatchedClicks), "p");

    // Mid point missed
    const missedMidClicks = {
      "1": { x: start3D.x, y: start3D.y, z: 1.0, t: 100 },
      "2": { x: end3D.x, y: end3D.y, z: 1.0, t: 300 },
    };
    assert.equal(evaluateTaskAttempt(task, missedMidClicks), "f");
  });

  await t.test("4. DevTools Console Copy-Paste Parsing Resilience", async () => {
    // Typical browser console output format: { x: -0.25, y: 0.3, z: 1 }
    const sampleConsoleLog = "{ x: -0.25, y: 0.3, z: 1.0 }";
    const parsed1 = parseCoordinateInput(sampleConsoleLog);
    assert.equal(parsed1.length, 1);
    assert.deepEqual(parsed1[0], { x: -0.25, y: 0.3, z: 1.0 });

    // Multi-line console log with multiple points
    const multiConsole = `
      [Cubicon Coordinate Captured] { x: -0.6, y: 0.1, z: 1.0 }
      [Cubicon Coordinate Captured] { x: 0.0, y: 0.35, z: 1.0 }
      [Cubicon Coordinate Captured] { x: 0.6, y: 0.1, z: 1.0 }
    `;
    const parsedMulti = parseCoordinateInput(multiConsole);
    assert.equal(parsedMulti.length, 3);
    assert.deepEqual(parsedMulti[0], { x: -0.6, y: 0.1, z: 1.0 });
    assert.deepEqual(parsedMulti[1], { x: 0.0, y: 0.35, z: 1.0 });
    assert.deepEqual(parsedMulti[2], { x: 0.6, y: 0.1, z: 1.0 });
  });

  await t.test("5. Question Type Bidirectional Sync Contract across Picker and Form Modals", async () => {
    const pickerContent = fs.readFileSync(
      path.resolve(__dirname, "../components/CubiconCoordinatePicker.tsx"),
      "utf8"
    );
    const adminContent = fs.readFileSync(
      path.resolve(__dirname, "../app/admin/page.tsx"),
      "utf8"
    );
    const analyticsContent = fs.readFileSync(
      path.resolve(__dirname, "../app/cubicon/analytics/page.tsx"),
      "utf8"
    );

    // Picker includes questionType in CoordinatePickerApplyResult and handleApply
    assert.ok(pickerContent.includes("questionType: CanonicalQuestionType"));
    assert.ok(pickerContent.includes("questionType: normalizedType"));
    assert.ok(pickerContent.includes("CUBICON_PICKER_MODE_CHANGED"));

    // Both Admin and Analytics modals sync questionType via onQuestionTypeChange and onApply
    assert.ok(adminContent.includes("onQuestionTypeChange"));
    assert.ok(adminContent.includes("result.questionType"));
    assert.ok(analyticsContent.includes("onQuestionTypeChange={handlePickerQuestionTypeChange}"));
    assert.ok(analyticsContent.includes("result.questionType"));

    // Picker uses a stable iframeSrc and postMessage instead of reloading iframe on config changes
    assert.ok(pickerContent.includes("src={iframeSrc}"));
    assert.ok(pickerContent.includes("onLoad={syncIframeConfig}"));
  });

  await t.test("6. Zero-Emoji Compliance across all Coordinate Picker Files", async () => {
    const filesToCheck = [
      path.resolve(__dirname, "../lib/cubicon/coordinateHelper.ts"),
      path.resolve(__dirname, "../components/CubiconCoordinatePicker.tsx"),
      path.resolve(__dirname, "../components/CubiconCoordinatePicker.module.css"),
      path.resolve(__dirname, "../app/cubicon/analytics/page.tsx"),
      path.resolve(__dirname, "../app/admin/page.tsx"),
      path.resolve(__dirname, "../tests/cubicon-visual-picker-integration.test.ts"),
    ];

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        assert.equal(
          emojiRegex.test(content),
          false,
          `File ${path.basename(file)} must not contain emojis`
        );
      }
    }
  });
});
