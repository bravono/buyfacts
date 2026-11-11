import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isJsonUpload, parseJsonImport, stringifyJsonCell } from "../lib/admin/jsonImport";
import { buildImportPreview, parseTypedCell } from "../lib/admin/import";
import { ADMIN_MODEL_REGISTRY } from "../lib/admin/schemaRegistry";
import { POST } from "../app/api/admin/database/route";
import { signJWT } from "../lib/auth/jwt";
import { prisma } from "../lib/prisma";

async function createAdminAuthHeader(): Promise<Record<string, string>> {
  const token = await signJWT({
    userId: "1",
    email: "rmj@robertjohnson.com",
    role: "admin",
  });
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function postBulk(body: Record<string, unknown>) {
  const headers = await createAdminAuthHeader();
  const req = new Request("http://localhost/api/admin/database", {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "bulkCreate", ...body }),
  });
  return POST(req);
}

describe("Batch Import — JSON payloads", () => {
  test("parses an array of records into headers and rows", () => {
    const result = parseJsonImport(
      JSON.stringify([
        { name: "Jane", email: "jane@example.com" },
        { name: "John", email: "john@example.com", company: "Acme" },
      ])
    );
    assert.deepEqual(result.headers, ["name", "email", "company"]);
    assert.equal(result.rows.length, 2);
    assert.deepEqual(result.rows[0], ["Jane", "jane@example.com", ""]);
    assert.deepEqual(result.rows[1], ["John", "john@example.com", "Acme"]);
  });

  test("accepts wrapped arrays and single objects", () => {
    const wrapped = parseJsonImport(JSON.stringify({ records: [{ a: 1 }] }));
    assert.deepEqual(wrapped.headers, ["a"]);

    const dataWrapped = parseJsonImport(JSON.stringify({ data: [{ a: 1 }, { a: 2 }] }));
    assert.equal(dataWrapped.rows.length, 2);

    const single = parseJsonImport(JSON.stringify({ email: "solo@example.com" }));
    assert.deepEqual(single.headers, ["email"]);
    assert.equal(single.rows.length, 1);
  });

  test("keeps nested values as JSON text and rejects unusable payloads", () => {
    assert.equal(stringifyJsonCell({ a: 1 }), '{"a":1}');
    assert.equal(stringifyJsonCell(true), "true");
    assert.equal(stringifyJsonCell(null), "");

    assert.throws(() => parseJsonImport("{not json"), /not valid JSON/);
    assert.throws(() => parseJsonImport("[]"), /no records/);
    assert.throws(() => parseJsonImport('"just a string"'), /array of objects/);
    assert.throws(() => parseJsonImport("[1,2]"), /not a JSON object/);
  });

  test("detects JSON uploads by extension, mime type or leading bracket", () => {
    assert.equal(isJsonUpload("rows.json", "application/octet-stream", "x"), true);
    assert.equal(isJsonUpload("rows.txt", "application/json", "x"), true);
    assert.equal(isJsonUpload("rows.txt", "text/plain", "  [{\"a\":1}]"), true);
    assert.equal(isJsonUpload("rows.csv", "text/csv", "name,email\n"), false);
  });

  test("typed cells keep native JSON types", () => {
    const numberField = { name: "n", label: "N", type: "number" as const };
    const boolField = { name: "b", label: "B", type: "boolean" as const };
    const jsonField = { name: "j", label: "J", type: "json" as const };

    assert.deepEqual(parseTypedCell(numberField, 42), { ok: true, value: 42, empty: false });
    assert.equal(parseTypedCell(numberField, 4.5).ok, false);
    assert.deepEqual(parseTypedCell(boolField, true), { ok: true, value: true, empty: false });
    assert.deepEqual(parseTypedCell(jsonField, { a: 1 }), { ok: true, value: '{"a":1}', empty: false });
    assert.deepEqual(parseTypedCell(jsonField, [1, 2]), { ok: true, value: "[1,2]", empty: false });
    assert.equal(parseTypedCell(jsonField, "{broken").ok, false);
  });

  test("preview accepts typed rows so JSON objects are not double-encoded", () => {
    const meta = ADMIN_MODEL_REGISTRY.contactInquiry;
    const typed = [{ name: "Jane", email: "jane@example.com", message: "Hi", isEighteen: true }];
    const preview = buildImportPreview(
      meta,
      ["name", "email", "message", "isEighteen"],
      [["Jane", "jane@example.com", "Hi", "true"]],
      "create",
      typed
    );
    assert.equal(preview.validCount, 1);
    assert.equal(preview.rows[0].data.isEighteen, true);
  });
});

describe("Batch Import API — JSON body", () => {
  test("imports a JSON array of records through the bulkCreate action", async () => {
    const stamp = Date.now();
    const res = await postBulk({
      table: "contactInquiry",
      json: JSON.stringify([
        {
          name: "JSON Lead One",
          email: `json_one_${stamp}@example.com`,
          message: "From JSON",
          company: "Acme",
          isEighteen: true,
        },
        {
          name: "JSON Lead Two",
          email: `json_two_${stamp}@example.com`,
          message: "Also from JSON",
          isEighteen: false,
        },
      ]),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.importedCount, 2);
    assert.equal(data.failedCount, 0);

    const stored = await prisma.contactInquiry.findMany({
      where: {
        email: { in: [`json_one_${stamp}@example.com`, `json_two_${stamp}@example.com`] },
      },
    });
    assert.equal(stored.length, 2);
    assert.equal(
      stored.find((r) => r.email === `json_two_${stamp}@example.com`)?.isEighteen,
      false,
      "Boolean false must survive the JSON path"
    );

    await prisma.contactInquiry.deleteMany({ where: { id: { in: stored.map((s) => s.id) } } });
  });

  test("JSON imports upsert on email and honour nested JSON fields", async () => {
    const stamp = Date.now();
    const sessionId = `json-session-${stamp}`;

    const create = await (
      await postBulk({
        table: "cubiconAttempt",
        json: JSON.stringify([
          {
            sessionId,
            taskIndex: 0,
            result: "passed",
            clicksData: { clicks: [{ x: 1, y: 2 }] },
          },
        ]),
      })
    ).json();

    assert.equal(create.createdCount, 1);
    const attempt = await prisma.cubiconAttempt.findFirst({ where: { sessionId } });
    assert.ok(attempt);
    assert.deepEqual(JSON.parse(attempt!.clicksData || "{}"), { clicks: [{ x: 1, y: 2 }] });

    await prisma.cubiconAttempt.deleteMany({ where: { sessionId } });
  });

  test("invalid JSON is rejected with 400 and writes nothing", async () => {
    const before = await prisma.contactInquiry.count();
    const res = await postBulk({ table: "contactInquiry", json: "{nope" });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /not valid JSON/);
    assert.equal(await prisma.contactInquiry.count(), before);
  });
});
