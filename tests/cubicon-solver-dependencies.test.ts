import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

test("Cubicon solver module dependencies suite", async (t) => {
  const packageJsonPath = path.resolve(__dirname, "..", "package.json");

  await t.test("1. Package.json declares three and canvas-confetti dependencies", () => {
    assert.ok(fs.existsSync(packageJsonPath), "package.json must exist");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    assert.ok(
      pkg.dependencies && pkg.dependencies.three,
      "package.json dependencies must contain three"
    );
    assert.ok(
      pkg.dependencies && pkg.dependencies["canvas-confetti"],
      "package.json dependencies must contain canvas-confetti"
    );
  });

  await t.test("2. Package.json declares TypeScript types for three and canvas-confetti", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    assert.ok(
      pkg.devDependencies && pkg.devDependencies["@types/three"],
      "devDependencies must contain @types/three"
    );
    assert.ok(
      pkg.devDependencies && pkg.devDependencies["@types/canvas-confetti"],
      "devDependencies must contain @types/canvas-confetti"
    );
  });

  await t.test("3. Three.js core constructors are functional", () => {
    const scene = new THREE.Scene();
    assert.ok(scene, "THREE.Scene instance should initialize");

    const vector = new THREE.Vector3(1, 2, 3);
    assert.equal(vector.x, 1);
    assert.equal(vector.y, 2);
    assert.equal(vector.z, 3);

    const matrix = new THREE.Matrix4();
    assert.ok(matrix, "THREE.Matrix4 should initialize");
  });

  await t.test("4. Canvas-confetti module resolves without throwing", async () => {
    const confettiModule = await import("canvas-confetti");
    assert.ok(confettiModule, "canvas-confetti module should resolve");
    assert.ok(
      typeof confettiModule.default === "function" ||
        typeof confettiModule.create === "function",
      "canvas-confetti module must export a callable function or factory"
    );
  });
});
