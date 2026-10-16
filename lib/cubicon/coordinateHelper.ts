/**
 * Cubicon 3D Coordinate Helper Utilities
 *
 * Provides coordinate normalization, serialization, projection between
 * 2D texture UV space and 3D Cubicon object space, and resilient
 * parsing for single-click and multi-point drag puzzle tasks.
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface WaypointSet {
  startPoint: string;
  midPoint: string;
  endPoint: string;
}

/**
 * Standard scale factor matching the 3D model front screen bounds.
 * Front face boundary corresponds to x and y within approximately [-0.85, 0.85].
 */
export const FACE_SPAN = 1.7;

/**
 * Round a number to specified decimal places (default: 3).
 */
export function round(val: number, decimals: number = 3): number {
  if (typeof val !== "number" || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Normalize a point to standard 3D coordinate format with 3 decimal precision.
 * Always ensures z is defined (defaults to 1.0 for active screen surface).
 */
export function normalizePoint(p: { x: number; y: number; z?: number }): Point3D {
  const x = round(p.x, 3);
  const y = round(p.y, 3);
  const z = round(typeof p.z === "number" && !isNaN(p.z) ? p.z : 1.0, 3);
  return { x, y, z };
}

/**
 * Format an array of 3D points as a standard JSON string.
 */
export function formatCoordinatesJson(points: Array<{ x: number; y: number; z?: number }>): string {
  if (!Array.isArray(points) || points.length === 0) {
    return "[]";
  }
  const normalized = points.map(normalizePoint);
  return JSON.stringify(normalized);
}

/**
 * Project 2D texture UV coordinates (u: 0 left to 1 right, v: 0 top to 1 bottom)
 * to 3D cube face coordinates.
 */
export function projectScreenUVTo3D(u: number, v: number): Point3D {
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, v));

  // Horizontal: u = 0 -> -0.85, u = 0.5 -> 0, u = 1 -> +0.85
  const x = round((clampedU - 0.5) * FACE_SPAN, 3);
  // Vertical: v = 0 (top) -> +0.85, v = 0.5 -> 0, v = 1 (bottom) -> -0.85
  const y = round((0.5 - clampedV) * FACE_SPAN, 3);
  const z = 1.0;

  return { x, y, z };
}

/**
 * Project 3D cube face coordinates back to 2D texture UV coordinates
 * (u: 0 to 1, v: 0 to 1 for rendering overlay pins).
 */
export function project3DToScreenUV(p: { x: number; y: number; z?: number }): { u: number; v: number } {
  const normX = typeof p.x === "number" ? p.x : 0;
  const normY = typeof p.y === "number" ? p.y : 0;

  const u = Math.max(0, Math.min(1, normX / FACE_SPAN + 0.5));
  const v = Math.max(0, Math.min(1, 0.5 - normY / FACE_SPAN));

  return { u: round(u, 4), v: round(v, 4) };
}

/**
 * Resilient parser that converts various inputs into a clean array of Point3D objects.
 * Handles:
 * - Array of objects [{ x, y, z }]
 * - Single coordinate object { x, y, z }
 * - Legacy waypoint object { start: {...}, mid: {...}, end: {...} }
 * - Indexed object map { "1": { x, y, z }, "2": { x, y, z } }
 * - JSON strings
 * - Comma-separated strings ("0.15, 0.45, 1.0")
 * - Raw console log strings ("x: -0.25, y: 0.30, z: 1.0")
 */
export function parseCoordinateInput(input: any): Point3D[] {
  if (input === null || input === undefined) return [];

  // If already an array
  if (Array.isArray(input)) {
    const points: Point3D[] = [];
    for (const item of input) {
      if (typeof item === "number" && input.length >= 2) {
        // [x, y, z] flat array format
        const x = input[0];
        const y = input[1];
        const z = input.length > 2 ? input[2] : 1.0;
        return [normalizePoint({ x, y, z })];
      }
      if (item && typeof item === "object" && "x" in item && "y" in item) {
        points.push(normalizePoint(item));
      }
    }
    return points;
  }

  // If string, attempt JSON parse first
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseCoordinateInput(parsed);
      } catch {
        // Fall through to regex extraction
      }
    }

    // Try CSV format: "x, y, z" or "x, y"
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?(\s*,\s*-?\d+(\.\d+)?)?$/.test(trimmed)) {
      const parts = trimmed.split(",").map((s) => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [normalizePoint({ x: parts[0], y: parts[1], z: parts[2] ?? 1.0 })];
      }
    }

    // Try regex matching x, y, z key-value pairs (e.g. from browser console logs)
    const pointMatches = trimmed.matchAll(/x[:=\s]+(-?\d+(\.\d+)?)[,\s]+y[:=\s]+(-?\d+(\.\d+)?)(?:[,\s]+z[:=\s]+(-?\d+(\.\d+)?))?/gi);
    const regexPoints: Point3D[] = [];
    for (const m of pointMatches) {
      const x = parseFloat(m[1]);
      const y = parseFloat(m[3]);
      const z = m[5] !== undefined ? parseFloat(m[5]) : 1.0;
      if (!isNaN(x) && !isNaN(y)) {
        regexPoints.push(normalizePoint({ x, y, z }));
      }
    }
    if (regexPoints.length > 0) {
      return regexPoints;
    }
  }

  // If object
  if (typeof input === "object") {
    // Single object: { x, y, z }
    if ("x" in input && "y" in input) {
      return [normalizePoint(input)];
    }

    // Legacy waypoint keys: { start, mid, end }
    const waypointKeys = ["start", "mid", "end"];
    const foundWaypoints = waypointKeys
      .map((k) => input[k])
      .filter(Boolean)
      .flatMap((sub) => parseCoordinateInput(sub));
    if (foundWaypoints.length > 0) {
      return foundWaypoints;
    }

    // Numeric indexed map: { "1": { x, y, z }, "2": { x, y, z } }
    const keys = Object.keys(input).filter((k) => !isNaN(parseInt(k, 10)));
    if (keys.length > 0) {
      keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      const extracted: Point3D[] = [];
      for (const k of keys) {
        const item = input[k];
        if (item && typeof item === "object" && "x" in item && "y" in item) {
          extracted.push(normalizePoint(item));
        }
      }
      if (extracted.length > 0) return extracted;
    }
  }

  return [];
}

/**
 * Extract startPoint, midPoint, and endPoint column strings from an array of coordinates.
 */
export function extractWaypoints(points: Point3D[]): WaypointSet {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      startPoint: "",
      midPoint: "",
      endPoint: "",
    };
  }

  if (points.length === 1) {
    return {
      startPoint: JSON.stringify(points[0]),
      midPoint: "",
      endPoint: "",
    };
  }

  if (points.length === 2) {
    return {
      startPoint: JSON.stringify(points[0]),
      midPoint: "",
      endPoint: JSON.stringify(points[1]),
    };
  }

  // 3 or more points: point 0 is start, point 1 is mid, last point is end
  return {
    startPoint: JSON.stringify(points[0]),
    midPoint: JSON.stringify(points[1]),
    endPoint: JSON.stringify(points[points.length - 1]),
  };
}
