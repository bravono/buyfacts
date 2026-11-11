/**
 * Batch import helpers for the Admin database dashboard.
 *
 * Shared by the client (modal preview + validation) and the server
 * (POST /api/admin/database?action=bulkCreate) so the two can never disagree
 * about how a CSV cell becomes a model field.
 */

import type { ModelFieldDefinition, ModelMetadata } from "./schemaRegistry";

export type ImportMode = "create" | "upsert";

export type CellOutcome =
  | { ok: true; value: any; empty: boolean }
  | { ok: false; error: string };

export interface NormalizedImportRow {
  /** 1-based row number in the source file (header row excluded). */
  rowNumber: number;
  data: Record<string, any>;
  /** Cells that were empty and therefore omitted from `data`. */
  skipped: string[];
  errors: string[];
}

export interface ImportIssue {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportPreview {
  headers: string[];
  rows: NormalizedImportRow[];
  issues: ImportIssue[];
  validCount: number;
  invalidCount: number;
  unmappedHeaders: string[];
  missingRequired: string[];
}

export const IMPORT_TEMPLATE_INSTRUCTION =
  "Column headers may be the field name (e.g. email) or the human label (e.g. Email Address). Read-only fields such as id / createdAt are ignored on import.";

/**
 * Normalize a header/label to a comparable token.
 */
function tokenize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Fields an admin may import into (read-only columns are excluded).
 */
export function getImportableFields(meta: ModelMetadata): ModelFieldDefinition[] {
  return meta.fields.filter((f) => !f.readOnly);
}

/**
 * Resolve a CSV header to a model field. Matches on field name or label,
 * case-insensitively, ignoring spaces/punctuation/parenthetical hints.
 */
export function resolveHeader(
  meta: ModelMetadata,
  header: string
): ModelFieldDefinition | null {
  const target = tokenize(header);
  if (!target) return null;

  const importable = getImportableFields(meta);
  const byName = importable.find((f) => tokenize(f.name) === target);
  if (byName) return byName;

  const byLabel = importable.find((f) => tokenize(f.label) === target);
  if (byLabel) return byLabel;

  return null;
}

/**
 * Parse a single CSV cell into a typed value for a model field.
 * Empty cells are reported as `empty: true` so the caller can omit them and
 * let Prisma defaults apply.
 */
export function parseCell(field: ModelFieldDefinition, raw: string | undefined): CellOutcome {
  const text = (raw ?? "").trim();
  if (text === "") return { ok: true, value: undefined, empty: true };

  switch (field.type) {
    case "number": {
      const num = Number(text.replace(/,/g, ""));
      if (!Number.isFinite(num) || !Number.isInteger(num)) {
        return { ok: false, error: `'${text}' is not a whole number.` };
      }
      return { ok: true, value: num, empty: false };
    }
    case "float": {
      const num = Number(text.replace(/,/g, ""));
      if (!Number.isFinite(num)) {
        return { ok: false, error: `'${text}' is not a number.` };
      }
      return { ok: true, value: num, empty: false };
    }
    case "boolean": {
      const lowered = text.toLowerCase();
      if (["true", "yes", "y", "1", "on"].includes(lowered)) {
        return { ok: true, value: true, empty: false };
      }
      if (["false", "no", "n", "0", "off"].includes(lowered)) {
        return { ok: true, value: false, empty: false };
      }
      return { ok: false, error: `'${text}' is not a boolean (use true/false).` };
    }
    case "datetime": {
      const parsed = new Date(text);
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: `'${text}' is not a valid date/time.` };
      }
      return { ok: true, value: parsed.toISOString(), empty: false };
    }
    case "json": {
      try {
        const parsed = JSON.parse(text);
        return { ok: true, value: JSON.stringify(parsed), empty: false };
      } catch {
        return { ok: false, error: "Value is not valid JSON." };
      }
    }
    case "masked":
    case "string":
    default: {
      if (field.options && field.options.length > 0 && !field.options.includes(text)) {
        return {
          ok: false,
          error: `'${text}' is not one of: ${field.options.join(", ")}.`,
        };
      }
      return { ok: true, value: text, empty: false };
    }
  }
}

/**
 * Parse a JSON-typed value for a model field. Used by JSON imports so nested
 * objects/arrays do not have to be round-tripped through a string first.
 * Falls back to parseCell for anything that is not already a JSON value.
 */
export function parseTypedCell(field: ModelFieldDefinition, raw: unknown): CellOutcome {
  if (raw === undefined || raw === null) return { ok: true, value: undefined, empty: true };

  switch (field.type) {
    case "json": {
      const serialized =
        typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
      if (serialized === "") return { ok: true, value: undefined, empty: true };
      try {
        return { ok: true, value: JSON.stringify(JSON.parse(serialized)), empty: false };
      } catch {
        return { ok: false, error: "Value is not valid JSON." };
      }
    }
    case "number":
    case "float":
    case "boolean": {
      if (typeof raw === "number" || typeof raw === "boolean") {
        if (field.type === "boolean") return { ok: true, value: Boolean(raw), empty: false };
        const num = Number(raw);
        if (!Number.isFinite(num)) return { ok: false, error: `'${String(raw)}' is not a number.` };
        if (field.type === "number" && !Number.isInteger(num)) {
          return { ok: false, error: `'${String(raw)}' is not a whole number.` };
        }
        return { ok: true, value: num, empty: false };
      }
      return parseCell(field, String(raw));
    }
    case "datetime": {
      if (raw instanceof Date) return { ok: true, value: raw.toISOString(), empty: false };
      return parseCell(field, String(raw));
    }
    default: {
      if (typeof raw === "object") {
        return { ok: false, error: "Expected a text value, got an object." };
      }
      return parseCell(field, String(raw));
    }
  }
}

/**
 * Build a preview for a parsed CSV: maps headers to fields, coerces values,
 * and collects per-row issues without touching the database.
 */
export function buildImportPreview(
  meta: ModelMetadata,
  headers: string[],
  rows: string[][],
  mode: ImportMode = "create",
  typedRows?: Array<Record<string, unknown>>
): ImportPreview {
  const fieldByColumn: Array<ModelFieldDefinition | null> = headers.map((h) =>
    resolveHeader(meta, h)
  );
  const unmappedHeaders = headers.filter((_, idx) => !fieldByColumn[idx]);
  const mappedFieldNames = new Set(
    fieldByColumn.filter(Boolean).map((f) => (f as ModelFieldDefinition).name)
  );

  const requiredNames = getImportableFields(meta)
    .filter((f) => f.required)
    .map((f) => f.name);

  const uniqueFieldNames = getImportableFields(meta)
    .filter((f) => f.unique || f.name === meta.idField)
    .map((f) => f.name);

  const missingRequired = requiredNames.filter((name) => {
    if (mappedFieldNames.has(name)) return false;
    // On upsert the id column identifies the row; other required cells may come from the DB.
    if (mode === "upsert" && mappedFieldNames.has(meta.idField)) return false;
    return true;
  });

  const issues: ImportIssue[] = [];
  const normalizedRows: NormalizedImportRow[] = [];
  const seenKeys = new Map<string, number>();

  rows.forEach((rawRow, idx) => {
    const rowNumber = idx + 1;
    const data: Record<string, any> = {};
    const skipped: string[] = [];
    const rowErrors: string[] = [];

    const typedRow = typedRows?.[idx];

    fieldByColumn.forEach((field, colIdx) => {
      if (!field) return;
      const outcome = typedRow
        ? parseTypedCell(field, typedRow[field.name])
        : parseCell(field, rawRow[colIdx]);
      if (outcome.ok) {
        if (outcome.empty) {
          skipped.push(field.name);
        } else {
          data[field.name] = outcome.value;
        }
      } else {
        rowErrors.push(`${field.label}: ${outcome.error}`);
        issues.push({ rowNumber, field: field.name, message: outcome.error });
      }
    });

    // Required field presence (per row)
    for (const name of requiredNames) {
      if (mode === "upsert" && name === meta.idField) continue;
      const provided = data[name] !== undefined && data[name] !== "";
      if (!provided) {
        // If the whole column is missing it is already reported as a global issue.
        if (!mappedFieldNames.has(name)) continue;
        const message = "Required value is missing.";
        rowErrors.push(`${name}: ${message}`);
        issues.push({ rowNumber, field: name, message });
      }
    }

    // Duplicate detection inside the file: primary key first, then any unique column.
    const duplicateKeyField =
      data[meta.idField] !== undefined
        ? meta.idField
        : uniqueFieldNames.find((name) => data[name] !== undefined);
    if (duplicateKeyField) {
      const key = `${duplicateKeyField}:${String(data[duplicateKeyField])}`;
      if (seenKeys.has(key)) {
        const message = `Duplicate ${duplicateKeyField} '${String(
          data[duplicateKeyField]
        )}' also on row ${seenKeys.get(key)}.`;
        rowErrors.push(message);
        issues.push({ rowNumber, field: duplicateKeyField, message });
      } else {
        seenKeys.set(key, rowNumber);
      }
    }

    normalizedRows.push({ rowNumber, data, skipped, errors: rowErrors });
  });

  const invalidCount = normalizedRows.filter((r) => r.errors.length > 0).length;

  return {
    headers,
    rows: normalizedRows,
    issues,
    validCount: normalizedRows.length - invalidCount,
    invalidCount,
    unmappedHeaders,
    missingRequired,
  };
}

/**
 * Build a CSV template for a model: header row of field names plus one
 * commented-out example row where every column is empty.
 */
export function buildTemplateCsv(meta: ModelMetadata): string {
  const fields = getImportableFields(meta);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return fields.map((f) => escape(f.name)).join(",") + "\n";
}

/**
 * Small helper for the UI: a human summary of the required columns.
 */
export function describeRequiredColumns(meta: ModelMetadata): string {
  const required = getImportableFields(meta).filter((f) => f.required);
  if (required.length === 0) return "No required columns.";
  return required.map((f) => `${f.name} (${f.label})`).join(", ");
}
