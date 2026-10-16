import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GET, POST, PUT, DELETE } from "../app/api/admin/database/route";
import { signJWT } from "../lib/auth/jwt";
import { ADMIN_MODEL_REGISTRY } from "../lib/admin/schemaRegistry";
import { prisma } from "../lib/prisma";
import { shouldHideBorderFrame } from "../lib/admin/navigation";

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

describe("Admin Database Dashboard API Suite", () => {
  test("Access Control: should reject unauthenticated GET requests with 401", async () => {
    const req = new Request("http://localhost/api/admin/database?action=summary");
    const res = await GET(req);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error);
  });

  test("Access Control: should reject unauthenticated POST requests with 401", async () => {
    const req = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "contactInquiry", data: {} }),
    });
    const res = await POST(req);
    assert.equal(res.status, 401);
  });

  test("Model Whitelist Validation: should reject unknown table with 400", async () => {
    const headers = await createAdminAuthHeader();
    const req = new Request("http://localhost/api/admin/database?action=table&table=unknownModel", {
      headers,
    });
    const res = await GET(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error.includes("Invalid table"));
  });

  test("Summary Action: should return counts for all 17 registered models", async () => {
    const headers = await createAdminAuthHeader();
    const req = new Request("http://localhost/api/admin/database?action=summary", {
      headers,
    });
    const res = await GET(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.summary);
    assert.equal(data.summary.modelCount, 20);

    const registryKeys = Object.keys(ADMIN_MODEL_REGISTRY);
    for (const key of registryKeys) {
      assert.ok(
        typeof data.summary.counts[key] === "number",
        `Count for ${key} must be a number`
      );
    }

    assert.ok(data.summary.totalRecords >= 0);
    assert.ok(data.summary.categoryCounts);
    assert.ok(data.summary.recentActivity);
  });

  test("Table Action: should return paginated records and metadata for valid model", async () => {
    const headers = await createAdminAuthHeader();
    const req = new Request(
      "http://localhost/api/admin/database?action=table&table=dashboardButton&page=1&limit=5",
      { headers }
    );
    const res = await GET(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.table, "dashboardButton");
    assert.equal(data.page, 1);
    assert.equal(data.limit, 5);
    assert.ok(Array.isArray(data.records));
    assert.ok(data.records.length <= 5);
    assert.ok(data.totalCount >= data.records.length);
    assert.ok(data.metadata);
    assert.equal(data.metadata.key, "dashboardButton");
  });

  test("Search Filtering: should filter records matching query string", async () => {
    const headers = await createAdminAuthHeader();
    const req = new Request(
      "http://localhost/api/admin/database?action=table&table=dashboardButton&search=Survey",
      { headers }
    );
    const res = await GET(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    for (const row of data.records) {
      const match =
        (row.label && row.label.toLowerCase().includes("survey")) ||
        (row.subtitle && row.subtitle.toLowerCase().includes("survey"));
      assert.ok(match, "Searched records must contain matching term");
    }
  });

  test("Security Sanitization: User password hash must never be returned", async () => {
    const headers = await createAdminAuthHeader();
    const req = new Request(
      "http://localhost/api/admin/database?action=table&table=user",
      { headers }
    );
    const res = await GET(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.records.length > 0);

    for (const user of data.records) {
      assert.equal(
        user.passwordHash,
        undefined,
        "passwordHash must not exist on sanitized user records"
      );
      assert.ok(
        user.passwordStatus,
        "passwordStatus indicator should be provided instead"
      );
    }
  });

  test("Full CRUD Lifecycle: Create, Read, Update, and Delete records", async () => {
    const headers = await createAdminAuthHeader();
    const testEmail = `test_crud_lead_${Date.now()}@example.com`;

    // 1. CREATE (POST)
    const createReq = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers,
      body: JSON.stringify({
        table: "contactInquiry",
        data: {
          name: "Test Lead User",
          email: testEmail,
          company: "Acme Corp",
          interest: "Cubicon 3D Validation",
          message: "We are interested in evaluating the Return on Effort framework.",
          isEighteen: true,
        },
      }),
    });
    const createRes = await POST(createReq);
    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.equal(createData.success, true);
    assert.ok(createData.record);
    const recordId = createData.record.id;
    assert.ok(recordId, "Created record must have an ID");

    // 2. READ (GET)
    const readReq = new Request(
      `http://localhost/api/admin/database?action=table&table=contactInquiry&search=${encodeURIComponent(testEmail)}`,
      { headers }
    );
    const readRes = await GET(readReq);
    assert.equal(readRes.status, 200);
    const readData = await readRes.json();
    assert.equal(readData.success, true);
    const foundRecord = readData.records.find((r: any) => r.id === recordId);
    assert.ok(foundRecord, "Created record must be searchable");
    assert.equal(foundRecord.email, testEmail);

    // 3. UPDATE (PUT)
    const updatedCompany = "Acme Global Solutions";
    const updateReq = new Request("http://localhost/api/admin/database", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        table: "contactInquiry",
        id: recordId,
        data: {
          company: updatedCompany,
        },
      }),
    });
    const updateRes = await PUT(updateReq);
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.success, true);
    assert.equal(updateData.record.company, updatedCompany);

    // 4. DELETE (DELETE)
    const deleteReq = new Request("http://localhost/api/admin/database", {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        table: "contactInquiry",
        id: recordId,
      }),
    });
    const deleteRes = await DELETE(deleteReq);
    assert.equal(deleteRes.status, 200);
    const deleteData = await deleteRes.json();
    assert.equal(deleteData.success, true);

    // 5. Verify Deletion
    const verifyDeleted = await prisma.contactInquiry.findUnique({
      where: { id: recordId },
    });
    assert.equal(verifyDeleted, null, "Deleted record must not exist in database");
  });

  test("User Management: Create user with hashed password and delete", async () => {
    const headers = await createAdminAuthHeader();
    const testAdminEmail = `temp_admin_${Date.now()}@example.com`;

    // 1. Create user with password
    const createReq = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers,
      body: JSON.stringify({
        table: "user",
        data: {
          email: testAdminEmail,
          name: "Temporary Test Admin",
          role: "admin",
          password: "SecureTestPassword123!",
        },
      }),
    });
    const createRes = await POST(createReq);
    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.equal(createData.success, true);
    assert.equal(createData.record.email, testAdminEmail);
    assert.equal(createData.record.passwordHash, undefined);
    assert.equal(createData.record.passwordStatus, "[Password Configured]");

    const newUserId = createData.record.id;

    // Verify hash exists in database directly
    const dbUser = await prisma.user.findUnique({
      where: { id: newUserId },
    });
    assert.ok(dbUser?.passwordHash, "Database record must have hashed password");
    assert.notEqual(dbUser?.passwordHash, "SecureTestPassword123!");

    // Clean up
    const deleteReq = new Request("http://localhost/api/admin/database", {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        table: "user",
        id: newUserId,
      }),
    });
    const deleteRes = await DELETE(deleteReq);
    assert.equal(deleteRes.status, 200);
  });

  test("BorderFrame Navigation: should hide borders on admin routes and preserve on public pages", () => {
    // Admin routes must hide borders
    assert.equal(shouldHideBorderFrame("/admin"), true);
    assert.equal(shouldHideBorderFrame("/admin/"), true);
    assert.equal(shouldHideBorderFrame("/admin/cubicon-analytics"), true);
    assert.equal(shouldHideBorderFrame("/admin/database"), true);

    // Public pages must keep borders visible
    assert.equal(shouldHideBorderFrame("/"), false);
    assert.equal(shouldHideBorderFrame("/products-services"), false);
    assert.equal(shouldHideBorderFrame("/research-imperatives"), false);
    assert.equal(shouldHideBorderFrame("/cubicon"), false);
    assert.equal(shouldHideBorderFrame("/research-lib"), false);
    assert.equal(shouldHideBorderFrame("/contact"), false);

    // Null and empty boundary cases
    assert.equal(shouldHideBorderFrame(null), false);
    assert.equal(shouldHideBorderFrame(""), false);
  });

  test("Admin Navigation: should feature prominent Upload Asset link to /file-upload", async () => {
    const fs = await import("fs/promises");
    const adminPageCode = await fs.readFile("app/admin/page.tsx", "utf-8");

    // Header must contain the Upload Asset button pointing to /file-upload
    assert.match(adminPageCode, /href="\/file-upload"/);
    assert.match(adminPageCode, /Upload Asset/);

    // Media asset views should contain shortcut link
    assert.match(adminPageCode, /activeTab === "mediaAsset"/);
  });

  test("Authentication Compatibility: admin and file-upload share unified session endpoint", async () => {
    const fs = await import("fs/promises");
    const fileUploadCode = await fs.readFile("app/file-upload/page.tsx", "utf-8");
    const adminCode = await fs.readFile("app/admin/page.tsx", "utf-8");

    // Both pages must target /api/auth/login and /api/auth/me
    assert.match(fileUploadCode, /\/api\/auth\/login/);
    assert.match(fileUploadCode, /\/api\/auth\/me/);
    assert.match(adminCode, /\/api\/auth\/login/);
    assert.match(adminCode, /\/api\/auth\/me/);

    // Both must verify application/json content-type before parsing
    assert.match(fileUploadCode, /contentType\.includes\("application\/json"\)/);
    assert.match(adminCode, /contentType\.includes\("application\/json"\)/);
  });

  test("Modal Scrollability: Create and Edit modals must constrain form flex height so modalBody scrolls", async () => {
    const fs = await import("fs/promises");
    const adminCode = await fs.readFile("app/admin/page.tsx", "utf-8");
    const adminCss = await fs.readFile("app/admin/admin.module.css", "utf-8");

    // Both Create and Edit forms must apply styles.modalForm
    assert.match(adminCode, /onSubmit=\{handleCreateSubmit\}\s+className=\{styles\.modalForm\}/);
    assert.match(adminCode, /onSubmit=\{handleEditSubmit\}\s+className=\{styles\.modalForm\}/);

    // CSS must define .modalForm with flex: 1 and min-height: 0 and .modalBody with overflow-y: auto
    assert.match(adminCss, /\.modalForm[\s\S]*?display:\s*flex[\s\S]*?flex-direction:\s*column[\s\S]*?flex:\s*1[\s\S]*?min-height:\s*0/);
    assert.match(adminCss, /\.modalBody\s*\{[\s\S]*?overflow-y:\s*auto[\s\S]*?flex:\s*1[\s\S]*?min-height:\s*0/);
  });

  test("Incremental Sequence ID: sequenceId is readOnly in UI and auto-incremented by backend on creation", async () => {
    for (const modelKey of ["cubiconTask", "cubiconSession", "cubiconAttempt"]) {
      const seqField = ADMIN_MODEL_REGISTRY[modelKey].fields.find((f) => f.name === "sequenceId");
      assert.ok(seqField, `${modelKey} must define sequenceId field`);
      assert.equal(seqField.readOnly, true, `${modelKey}.sequenceId must be readOnly so user does not set it manually`);
    }

    const headers = await createAdminAuthHeader();

    const createReq1 = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers,
      body: JSON.stringify({
        table: "cubiconTask",
        data: {
          heading: "Incremental Seq Test 1",
          description: "Testing backend incremental sequenceId 1",
          image: "/cubicon-app/arts/Puzzle1.webp",
        },
      }),
    });
    const res1 = await POST(createReq1);
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.success, true);
    assert.equal(typeof body1.record.sequenceId, "number");

    const createReq2 = new Request("http://localhost/api/admin/database", {
      method: "POST",
      headers,
      body: JSON.stringify({
        table: "cubiconTask",
        data: {
          heading: "Incremental Seq Test 2",
          description: "Testing backend incremental sequenceId 2",
          image: "/cubicon-app/arts/Puzzle2.webp",
        },
      }),
    });
    const res2 = await POST(createReq2);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
    assert.equal(body2.record.sequenceId, body1.record.sequenceId + 1);

    // Clean up created tasks and sequences
    await prisma.cubiconTask.deleteMany({
      where: { id: { in: [body1.record.id, body2.record.id] } },
    });
    await prisma.cubiconSequence.deleteMany({
      where: { id: { in: [body1.record.sequenceId, body2.record.sequenceId] } },
    });
  });

  test("Sticky Table Actions Column: Actions header and row cells remain pinned to the right edge", async () => {
    const fs = await import("fs/promises");
    const adminCode = await fs.readFile("app/admin/page.tsx", "utf-8");
    const adminCss = await fs.readFile("app/admin/admin.module.css", "utf-8");

    // Admin table must apply stickyActionTh and stickyActionTd
    assert.match(adminCode, /styles\.stickyActionTh/);
    assert.match(adminCode, /styles\.stickyActionTd/);

    // CSS must define position: sticky and right: 0 for both header and cell
    assert.match(adminCss, /\.stickyActionTh\s*\{[\s\S]*?position:\s*sticky[\s\S]*?right:\s*0/);
    assert.match(adminCss, /\.stickyActionTd\s*\{[\s\S]*?position:\s*sticky[\s\S]*?right:\s*0/);
    assert.match(adminCss, /\.content\s*\{[\s\S]*?min-width:\s*0/);
  });
});
