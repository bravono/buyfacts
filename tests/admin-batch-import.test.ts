import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, detectDelimiter, toCsv } from "../lib/admin/csv";
import {
  buildImportPreview,
  buildTemplateCsv,
  parseCell,
  resolveHeader,
} from "../lib/admin/import";
import { ADMIN_MODEL_REGISTRY } from "../lib/admin/schemaRegistry";

describe("Batch Import — CSV parsing", () => {
  test("parses a simple comma separated file", () => {
    const { headers, rows, delimiter } = parseCsv("name,email\nJane,jane@example.com\nJohn,john@example.com");
    assert.equal(delimiter, ",");
    assert.deepEqual(headers, ["name", "email"]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], ["Jane", "jane@example.com"]);
  });

  test("honours quoted fields containing commas, quotes and newlines", () => {
    const text = 'name,message\n"Smith, Jane","She said ""hello""\nsecond line"';
    const { rows } = parseCsv(text);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][0], "Smith, Jane");
    assert.equal(rows[0][1], 'She said "hello"\nsecond line');
  });

  test("strips UTF-8 BOM and handles CRLF line endings", () => {
    const { headers, rows } = parseCsv("\uFEFFemail\r\na@b.com\r\n");
    assert.deepEqual(headers, ["email"]);
    assert.deepEqual(rows, [["a@b.com"]]);
  });

  test("auto-detects semicolon and tab delimiters", () => {
    assert.equal(detectDelimiter("a;b;c\n1;2;3"), ";");
    assert.equal(detectDelimiter("a\tb\tc\n1\t2\t3"), "\t");
    const { rows } = parseCsv("a;b\n1;2");
    assert.deepEqual(rows, [["1", "2"]]);
  });

  test("ignores blank lines and escapes output", () => {
    const { rows } = parseCsv("a,b\n1,2\n\n3,4\n");
    assert.equal(rows.length, 2);
    assert.equal(toCsv(["a", "b"], [['x"y', 2]]), '"a","b"\n"x""y","2"');
  });
});

describe("Batch Import — field mapping and coercion", () => {
  const contactMeta = ADMIN_MODEL_REGISTRY.contactInquiry;

  test("resolves headers by field name and by human label, case/punctuation insensitive", () => {
    assert.equal(resolveHeader(contactMeta, "email")?.name, "email");
    assert.equal(resolveHeader(contactMeta, "Email")?.name, "email");
    assert.equal(resolveHeader(contactMeta, "Company")?.name, "company");
    assert.equal(resolveHeader(contactMeta, "Is 18+")?.name, "isEighteen");
    assert.equal(resolveHeader(contactMeta, "Area of Interest")?.name, "interest");
    assert.equal(resolveHeader(contactMeta, "not_a_field"), null);
  });

  test("read-only fields are not importable", () => {
    assert.equal(resolveHeader(contactMeta, "id"), null);
    assert.equal(resolveHeader(contactMeta, "Created At"), null);
  });

  test("coerces numbers, floats, booleans, dates and json", () => {
    const numberField = { name: "n", label: "N", type: "number" as const };
    const floatField = { name: "f", label: "F", type: "float" as const };
    const boolField = { name: "b", label: "B", type: "boolean" as const };
    const dateField = { name: "d", label: "D", type: "datetime" as const };
    const jsonField = { name: "j", label: "J", type: "json" as const };

    assert.deepEqual(parseCell(numberField, " 42 "), { ok: true, value: 42, empty: false });
    assert.equal(parseCell(numberField, "4.2").ok, false);
    assert.deepEqual(parseCell(floatField, "0.66"), { ok: true, value: 0.66, empty: false });
    assert.deepEqual(parseCell(boolField, "yes"), { ok: true, value: true, empty: false });
    assert.deepEqual(parseCell(boolField, "false"), { ok: true, value: false, empty: false });
    assert.equal(parseCell(boolField, "maybe").ok, false);
    const date = parseCell(dateField, "2024-01-02");
    assert.ok(date.ok && typeof date.value === "string" && date.value.startsWith("2024-01-02"));
    assert.equal(parseCell(dateField, "not-a-date").ok, false);
    assert.deepEqual(parseCell(jsonField, '{"a":1}'), { ok: true, value: '{"a":1}', empty: false });
    assert.equal(parseCell(jsonField, "{broken").ok, false);
  });

  test("validates option fields against the registry whitelist", () => {
    const shareMeta = ADMIN_MODEL_REGISTRY.cubiconShare;
    const statusField = shareMeta.fields.find((f) => f.name === "status")!;
    assert.equal(parseCell(statusField, "completed").ok, true);
    assert.equal(parseCell(statusField, "bogus").ok, false);
  });
});

describe("Batch Import — preview building", () => {
  const meta = ADMIN_MODEL_REGISTRY.contactInquiry;

  test("flags missing required columns", () => {
    const preview = buildImportPreview(meta, ["name", "company"], [["Jane", "Acme"]]);
    assert.deepEqual(preview.missingRequired.sort(), ["email", "message"]);
  });

  test("flags unmapped headers without failing the import", () => {
    const preview = buildImportPreview(
      meta,
      ["name", "email", "message", "favourite_colour"],
      [["Jane", "jane@example.com", "Hello", "green"]]
    );
    assert.deepEqual(preview.unmappedHeaders, ["favourite_colour"]);
    assert.deepEqual(preview.missingRequired, []);
    assert.equal(preview.validCount, 1);
  });

  test("reports per-row issues with row numbers and skips empty cells", () => {
    const preview = buildImportPreview(
      meta,
      ["name", "email", "message", "isEighteen"],
      [
        ["Jane", "jane@example.com", "Hello", ""],
        ["", "missing-name@example.com", "Hello", "true"],
      ]
    );
    assert.equal(preview.invalidCount, 1);
    assert.equal(preview.validCount, 1);
    assert.ok(preview.issues.some((i) => i.rowNumber === 2 && i.field === "name"));
    // Empty isEighteen is omitted so the schema default applies
    assert.deepEqual(preview.rows[0].skipped, ["isEighteen"]);
    assert.equal(preview.rows[0].data.isEighteen, undefined);
  });

  test("detects duplicate primary keys inside the file", () => {
    const seqMeta = ADMIN_MODEL_REGISTRY.cubiconSequence;
    const preview = buildImportPreview(
      seqMeta,
      ["slug", "title", "isActive"],
      [
        ["dup-slug", "First", "true"],
        ["dup-slug", "Second", "false"],
      ]
    );
    assert.equal(preview.invalidCount, 1);
    assert.ok(preview.issues.some((i) => i.message.includes("Duplicate")));
  });

  test("template contains exactly the importable columns", () => {
    const csv = buildTemplateCsv(meta);
    const { headers } = parseCsv(csv);
    assert.ok(headers.includes("email"));
    assert.ok(!headers.includes("id"));
    assert.ok(!headers.includes("createdAt"));
  });
});
