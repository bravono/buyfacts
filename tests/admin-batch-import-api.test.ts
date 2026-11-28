import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/admin/database/route";
import { signJWT } from "../lib/auth/jwt";
import { prisma } from "../lib/prisma";
import { ADMIN_MODEL_REGISTRY } from "../lib/admin/schemaRegistry";

async function createAdminAuthHeader(): Promise<Record<string, string>> {
  const token = await signJWT({
    userId: "1",
    email: "rmj@robertjohnson.com",
    role: "admin",
  });
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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

describe("Admin Batch Import API Suite", () => {
  test("Access Control: bulk import rejects unauthenticated requests with 401", async () => {
    const req = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulkCreate",
        table: "contactInquiry",
        headers: ["name", "email", "message"],
        rows: [["Jane", "jane@example.com", "Hello"]],
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 401);
  });

  test("Model Whitelist Validation: unknown table is rejected with 400", async () => {
    const res = await postBulk({
      table: "notAModel",
      headers: ["name"],
      rows: [["x"]],
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Invalid table/);
  });

  test("Payload Validation: missing headers or rows is rejected with 400", async () => {
    const noHeaders = await postBulk({ table: "contactInquiry", headers: [], rows: [["a"]] });
    assert.equal(noHeaders.status, 400);

    const noRows = await postBulk({ table: "contactInquiry", headers: ["name"], rows: [] });
    assert.equal(noRows.status, 400);
    const data = await noRows.json();
    assert.match(data.error, /no data rows/i);
  });

  test("Missing required columns abort the whole import with 400 and no writes", async () => {
    const before = await prisma.contactInquiry.count();
    const res = await postBulk({
      table: "contactInquiry",
      headers: ["name", "company"],
      rows: [["Bulk Lead", "Acme"]],
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Missing required column/);
    assert.deepEqual(data.preview.missingRequired.sort(), ["email", "message"]);
    const after = await prisma.contactInquiry.count();
    assert.equal(after, before, "No rows may be written when required columns are missing");
  });

  test("Happy Path: imports valid rows, coerces types and applies defaults", async () => {
    const stamp = Date.now();
    const res = await postBulk({
      table: "contactInquiry",
      headers: ["name", "email", "company", "message", "isEighteen"],
      rows: [
        ["Bulk Lead One", `bulk_one_${stamp}@example.com`, "Acme", "First message", "true"],
        ["Bulk Lead Two", `bulk_two_${stamp}@example.com`, "Globex", "Second message", ""],
      ],
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.importedCount, 2);
    assert.equal(data.createdCount, 2);
    assert.equal(data.failedCount, 0);
    assert.equal(data.matchField, null);

    const stored = await prisma.contactInquiry.findMany({
      where: { email: { in: [`bulk_one_${stamp}@example.com`, `bulk_two_${stamp}@example.com`] } },
    });
    assert.equal(stored.length, 2);

    const one = stored.find((r) => r.email === `bulk_one_${stamp}@example.com`)!;
    const two = stored.find((r) => r.email === `bulk_two_${stamp}@example.com`)!;
    assert.equal(one.isEighteen, true);
    assert.equal(two.isEighteen, true, "Empty cell must fall back to the schema default");
    assert.equal(two.company, "Globex");

    await prisma.contactInquiry.deleteMany({
      where: { id: { in: [one.id, two.id] } },
    });
  });

  test("Partial Import: invalid rows are skipped and reported with row numbers", async () => {
    const stamp = Date.now();
    const res = await postBulk({
      table: "contactInquiry",
      headers: ["name", "email", "message", "isEighteen"],
      rows: [
        ["Good Lead", `bulk_good_${stamp}@example.com`, "Fine", "true"],
        ["Bad Bool", `bulk_bad_${stamp}@example.com`, "Bad flag", "maybe"],
        ["", `bulk_nameless_${stamp}@example.com`, "No name", "true"],
      ],
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.partial, true);
    assert.equal(data.importedCount, 1);
    assert.equal(data.failedCount, 2);

    const rowNumbers = data.failures.map((f: any) => f.rowNumber).sort();
    assert.deepEqual(rowNumbers, [2, 3]);

    const created = await prisma.contactInquiry.findMany({
      where: { email: `bulk_good_${stamp}@example.com` },
    });
    assert.equal(created.length, 1);
    await prisma.contactInquiry.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
  });

  test("Upsert Mode: updates existing rows matched on email instead of duplicating", async () => {
    const stamp = Date.now();
    const email = `bulk_upsert_${stamp}@example.com`;

    const first = await (
      await postBulk({
        table: "contactInquiry",
        headers: ["name", "email", "message", "company"],
        rows: [["Original Name", email, "First pass", "Acme"]],
        mode: "upsert",
      })
    ).json();
    assert.equal(first.importedCount, 1);
    assert.equal(first.createdCount, 1);
    assert.equal(first.matchField, "email");

    const second = await (
      await postBulk({
        table: "contactInquiry",
        headers: ["name", "email", "message", "company"],
        rows: [["Updated Name", email, "First pass", "Acme Global"]],
        mode: "upsert",
      })
    ).json();
    assert.equal(second.updatedCount, 1);
    assert.equal(second.createdCount, 0);

    const rows = await prisma.contactInquiry.findMany({ where: { email } });
    assert.equal(rows.length, 1, "Upsert must not create a duplicate row");
    assert.equal(rows[0].name, "Updated Name");
    assert.equal(rows[0].company, "Acme Global");

    await prisma.contactInquiry.deleteMany({ where: { email } });
  });

  test("Cubicon Task Import: sequenceId is validated per row and never auto-creates a sequence", async () => {
    const stamp = Date.now();
    const seqRes = await (
      await postBulk({
        table: "cubiconSequence",
        headers: ["slug", "title", "description"],
        rows: [[`bulk-seq-${stamp}`, "Bulk Sequence", "Created by the batch import test"]],
      })
    ).json();
    assert.equal(seqRes.createdCount, 1);
    const sequenceId = seqRes.sample[0].id as number;

    const before = await prisma.cubiconSequence.count();

    const taskRes = await (
      await postBulk({
        table: "cubiconTask",
        headers: ["sequenceId", "heading", "description", "image", "isFinal"],
        rows: [
          [String(sequenceId), "Imported Task 1", "Prompt one", "/cubicon-app/arts/Puzzle1.webp", "false"],
          ["9999999", "Imported Task 2", "Prompt two", "/cubicon-app/arts/Puzzle1.webp", "false"],
        ],
      })
    ).json();

    assert.equal(taskRes.importedCount, 1);
    assert.equal(taskRes.failedCount, 1);
    assert.match(taskRes.failures[0].errors.join(" "), /Sequence ID 9999999 does not exist/);

    const after = await prisma.cubiconSequence.count();
    assert.equal(after, before, "Importing tasks must not create sequences");

    const createdTasks = await prisma.cubiconTask.findMany({
      where: { sequenceId, heading: "Imported Task 1" },
    });
    assert.equal(createdTasks.length, 1);

    await prisma.cubiconTask.deleteMany({ where: { sequenceId } });
    await prisma.cubiconSequence.delete({ where: { id: sequenceId } });
  });

  test("Security: masked password columns are never written by a batch import", async () => {
    const stamp = Date.now();
    const email = `bulk_admin_${stamp}@example.com`;

    await postBulk({
      table: "user",
      headers: ["email", "name", "role", "password"],
      rows: [[email, "Bulk Admin", "admin", "PlaintextShouldBeIgnored123!"]],
    });

    const created = await prisma.user.findUnique({ where: { email } });
    assert.ok(created);
    assert.equal(created?.passwordHash, null, "password must not be set through batch import");

    await prisma.user.delete({ where: { email } });
  });

  test("Single-record POST still works alongside the bulk path", async () => {
    const stamp = Date.now();
    const headers = await createAdminAuthHeader();
    const req = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers,
      body: JSON.stringify({
        table: "contactInquiry",
        data: {
          name: "Single Record",
          email: `single_${stamp}@example.com`,
          message: "Still works",
        },
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.record.id);
    await prisma.contactInquiry.delete({ where: { id: data.record.id } });
  });

  test("Admin page exposes the Import CSV control next to the exports", async () => {
    const fs = await import("fs/promises");
    const adminCode = await fs.readFile("app/admin/page.tsx", "utf-8");
    assert.match(adminCode, /Import CSV/);
    assert.match(adminCode, /action: "bulkCreate"/);
    assert.match(adminCode, /Export CSV/);
    assert.ok(ADMIN_MODEL_REGISTRY.contactInquiry);
  });
});
