/**
 * JSON payload support for the Admin batch import feature.
 *
 * The import pipeline is header/row based (see lib/admin/csv.ts), so a JSON
 * upload is flattened into the same shape before validation runs:
 *
 *   [ { "email": "...", "name": "..." }, ... ]   -> array of records
 *   { "records": [ ... ] }                        -> wrapped array
 *   { "data": [ ... ] } / { "rows": [ ... ] }     -> wrapped array
 *   { "email": "...", ... }                       -> a single record
 *
 * Values keep their JSON types (numbers, booleans, nested objects) and are
 * stringified only when they have to fit a CSV-shaped cell.
 */

export interface JsonImportResult {
  headers: string[];
  rows: string[][];
  /** Original typed values per row, aligned with `rows`, used for JSON-typed fields. */
  typedRows: Array<Record<string, unknown>>;
}

export const MAX_JSON_IMPORT_ROWS = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Turn one typed JSON value into the string a CSV cell would carry.
 */
export function stringifyJsonCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Parse a JSON import payload into headers + rows.
 * Throws an Error with a human-readable message when the payload is unusable.
 */
export function parseJsonImport(rawText: string): JsonImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("The file is not valid JSON.");
  }

  let records: unknown[];

  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (isPlainObject(parsed)) {
    const wrapperKey = ["records", "rows", "data", "items"].find(
      (key) => Array.isArray((parsed as Record<string, unknown>)[key])
    );
    records = wrapperKey
      ? ((parsed as Record<string, unknown>)[wrapperKey] as unknown[])
      : [parsed];
  } else {
    throw new Error("JSON import expects an array of objects, e.g. [{\"email\":\"a@b.com\"}].");
  }

  if (records.length === 0) {
    throw new Error("The JSON file contains no records.");
  }

  if (records.length > MAX_JSON_IMPORT_ROWS) {
    throw new Error(
      `This file has ${records.length} records. Import at most ${MAX_JSON_IMPORT_ROWS} records per file.`
    );
  }

  const objects: Array<Record<string, unknown>> = [];
  records.forEach((record, idx) => {
    if (!isPlainObject(record)) {
      throw new Error(`Record ${idx + 1} is not a JSON object.`);
    }
    objects.push(record);
  });

  // Union of keys, in first-seen order so the preview mirrors the file.
  const headers: string[] = [];
  for (const record of objects) {
    for (const key of Object.keys(record)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }

  const rows = objects.map((record) => headers.map((h) => stringifyJsonCell(record[h])));

  return { headers, rows, typedRows: objects };
}

/**
 * Detect whether an uploaded file should be treated as JSON.
 */
export function isJsonUpload(fileName: string, mimeType: string, text: string): boolean {
  if (/\.json$/i.test(fileName)) return true;
  if (/json/i.test(mimeType)) return true;
  const head = text.replace(/^\uFEFF/, "").trimStart();
  return head.startsWith("[") || head.startsWith("{");
}
