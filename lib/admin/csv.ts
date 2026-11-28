/**
 * Minimal, dependency-free CSV parser/writer used by the Admin batch import feature.
 *
 * Supports:
 *  - Comma, semicolon or tab delimited files (auto-detected)
 *  - RFC 4180 quoting (quoted fields, escaped quotes "" inside quotes, embedded newlines)
 *  - UTF-8 BOM stripping
 *  - CRLF / CR / LF line endings
 *
 * Kept deliberately small and pure so it can be unit tested without a DOM or network.
 */

export type CsvDelimiter = "," | ";" | "\t";

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
}

/**
 * Detect the delimiter by counting unquoted occurrences on the header line.
 */
export function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = text.split(/\r\n|\n|\r/)[0] || "";
  const candidates: CsvDelimiter[] = [",", ";", "\t"];
  let best: CsvDelimiter = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        if (inQuotes && firstLine[i + 1] === '"') {
          i++;
          continue;
        }
        inQuotes = !inQuotes;
      } else if (ch === candidate && !inQuotes) {
        count++;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  return best;
}

/**
 * Parse a delimited text blob into a header list plus data rows.
 */
export function parseCsv(rawText: string, delimiterOverride?: CsvDelimiter): CsvParseResult {
  const text = rawText.replace(/^\uFEFF/, "");
  const delimiter = delimiterOverride || detectDelimiter(text);

  const records: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const pushField = () => {
    current.push(field);
    field = "";
    fieldStarted = false;
  };

  const pushRecord = () => {
    pushField();
    // Ignore completely blank lines
    if (current.length > 1 || (current.length === 1 && current[0].trim() !== "")) {
      records.push(current);
    }
    current = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
      continue;
    }

    if (ch === delimiter) {
      pushField();
      continue;
    }

    if (ch === "\n") {
      pushRecord();
      continue;
    }

    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      pushRecord();
      continue;
    }

    field += ch;
    fieldStarted = true;
  }

  // Flush trailing field/record
  if (field !== "" || current.length > 0) {
    pushRecord();
  }

  if (records.length === 0) {
    return { headers: [], rows: [], delimiter };
  }

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1);

  return { headers, rows, delimiter };
}

/**
 * Escape a single value for CSV output (always quoted for safety).
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV document from headers + rows.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}
