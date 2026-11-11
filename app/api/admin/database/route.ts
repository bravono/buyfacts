import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";
import { hashPassword } from "@/lib/auth/password";
import {
  ADMIN_MODEL_REGISTRY,
  ModelMetadata,
  ModelFieldDefinition,
} from "@/lib/admin/schemaRegistry";
import {
  buildImportPreview,
  getImportableFields,
  ImportMode,
} from "@/lib/admin/import";
import { parseJsonImport } from "@/lib/admin/jsonImport";

/**
 * Helper to get Prisma client model delegate dynamically.
 */
function getModelDelegate(table: string): any {
  if (!ADMIN_MODEL_REGISTRY[table]) {
    return null;
  }
  return (prisma as any)[table];
}

/**
 * Format fields based on schema type before persisting.
 */
async function cleanInputData(
  meta: ModelMetadata,
  inputData: Record<string, any>,
  isUpdate = false
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const field of meta.fields) {
    // Skip read-only fields on create and update
    if (field.readOnly) continue;

    // Special handling for user password
    if (meta.key === "user" && field.name === "password") {
      const passwordVal = inputData.password;
      if (passwordVal && typeof passwordVal === "string" && passwordVal.trim().length > 0) {
        result.passwordHash = await hashPassword(passwordVal.trim());
      }
      continue;
    }

    const val = inputData[field.name];

    // If undefined or null on update, don't overwrite unless explicitly provided
    if (val === undefined) {
      continue;
    }

    if (val === null || val === "") {
      if (field.type === "number" || field.type === "float") {
        result[field.name] = null;
      } else if (field.type === "boolean") {
        result[field.name] = false;
      } else {
        result[field.name] = field.required ? "" : null;
      }
      continue;
    }

    switch (field.type) {
      case "number": {
        const num = parseInt(String(val), 10);
        result[field.name] = isNaN(num) ? 0 : num;
        break;
      }
      case "float": {
        const fl = parseFloat(String(val));
        result[field.name] = isNaN(fl) ? 0.0 : fl;
        break;
      }
      case "boolean": {
        result[field.name] = val === true || val === "true" || val === 1 || val === "1";
        break;
      }
      case "datetime": {
        result[field.name] = new Date(val);
        break;
      }
      case "json": {
        if (typeof val === "object") {
          result[field.name] = JSON.stringify(val);
        } else {
          result[field.name] = String(val);
        }
        break;
      }
      case "string":
      default: {
        result[field.name] = String(val);
        break;
      }
    }
  }

  return result;
}

/**
 * Sanitize sensitive fields before returning records to the client.
 */
function sanitizeRecord(table: string, record: any): any {
  if (!record) return record;

  if (table === "user") {
    const { passwordHash, ...rest } = record;
    return {
      ...rest,
      passwordStatus: Boolean(passwordHash) ? "[Password Configured]" : "[Not Set]",
    };
  }

  return record;
}

/**
 * Column a batch import can upsert on.
 * Preference: explicit `unique` flag in the registry, then `email`/`slug` string columns.
 */
function resolveImportMatchField(meta: ModelMetadata): ModelFieldDefinition | null {
  const importable = getImportableFields(meta);
  const flagged = importable.find((f) => f.unique);
  if (flagged) return flagged;
  if (meta.idType === "string") {
    const byEmail = importable.find((f) => f.name === "email");
    if (byEmail) return byEmail;
    const bySlug = importable.find((f) => f.name === "slug");
    if (bySlug) return bySlug;
  }
  return null;
}

/**
 * Fields a batch import may write. Read-only columns are excluded, plus the
 * primary key on create (ids are generated) and write-only secrets.
 */
function resolveImportWriteFields(meta: ModelMetadata, mode: ImportMode): ModelFieldDefinition[] {
  return getImportableFields(meta).filter((f) => {
    if (f.type === "masked") return false;
    if (mode === "create" && f.name === meta.idField) return false;
    return true;
  });
}

/**
 * Sequence existence check shared by create, update and batch import.
 */
async function resolveSequenceId(
  meta: ModelMetadata,
  data: Record<string, any>
): Promise<{ ok: true; sequenceId?: number | null } | { ok: false; error: string }> {
  const hasSequenceId = meta.fields.some((f) => f.name === "sequenceId");
  if (!hasSequenceId) return { ok: true };

  const rawSeqId =
    data.sequenceId !== undefined && data.sequenceId !== null && data.sequenceId !== ""
      ? parseInt(String(data.sequenceId), 10)
      : null;

  if (rawSeqId === null || isNaN(rawSeqId) || rawSeqId <= 0) {
    if (meta.key === "cubiconTask") {
      return {
        ok: false,
        error:
          "Sequence ID is required. Please create a sequence first in 'Cubicon Sequences' to obtain an ID, then assign tasks to that sequence.",
      };
    }
    return { ok: true };
  }

  const existingSequence = await prisma.cubiconSequence.findUnique({
    where: { id: rawSeqId },
    select: { id: true },
  });

  if (!existingSequence) {
    return {
      ok: false,
      error: `Sequence ID ${rawSeqId} does not exist. Please create a sequence first in 'Cubicon Sequences' to obtain an ID, then use that ID for new tasks.`,
    };
  }

  return { ok: true, sequenceId: rawSeqId };
}

/**
 * Batch import (action=bulkCreate)
 *
 * Accepts a parsed CSV payload (`headers` + `rows`), maps the columns to the
 * registered model via lib/admin/import, and writes every valid row.
 * Rows with problems are skipped and reported back with their row numbers so
 * the admin can fix the spreadsheet and re-import only what failed.
 */
async function handleBulkCreate(body: any) {
  const { table, mode: rawMode, dryRun } = body;
  const mode: ImportMode = rawMode === "upsert" ? "upsert" : "create";
  let { headers, rows } = body;
  let typedRows: Array<Record<string, unknown>> | undefined;

  // JSON payloads (array of records, or { records: [...] }) are flattened to
  // the same header/row shape so the rest of the pipeline is unchanged.
  if (typeof body?.json === "string" && body.json.trim() !== "") {
    try {
      const parsedJson = parseJsonImport(body.json);
      headers = parsedJson.headers;
      rows = parsedJson.rows;
      typedRows = parsedJson.typedRows;
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err?.message || "Could not parse the JSON payload." },
        { status: 400 }
      );
    }
  }

  if (!table || !ADMIN_MODEL_REGISTRY[table]) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid table '${table}'. Must be one of the registered models.`,
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json(
      { success: false, error: "CSV headers are required. Upload a file with a header row." },
      { status: 400 }
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { success: false, error: "The uploaded file contains no data rows." },
      { status: 400 }
    );
  }

  const meta = ADMIN_MODEL_REGISTRY[table];
  const delegate = getModelDelegate(table);
  if (!delegate) {
    return NextResponse.json(
      { success: false, error: `No database model found for '${table}'.` },
      { status: 400 }
    );
  }

  const preview = buildImportPreview(meta, headers, rows, mode, typedRows);
  const writeFields = resolveImportWriteFields(meta, mode);
  const writeFieldNames = new Set(writeFields.map((f) => f.name));
  const matchField = mode === "upsert" ? resolveImportMatchField(meta) : null;

  const failures: Array<{ rowNumber: number; errors: string[] }> = [];
  const created: Array<Record<string, any>> = [];
  const updated: Array<Record<string, any>> = [];

  if (preview.missingRequired.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Missing required column(s): ${preview.missingRequired.join(", ")}. Add them to the header row and try again.`,
        preview: summarizePreview(preview),
      },
      { status: 400 }
    );
  }

  if (mode === "upsert" && !matchField) {
    return NextResponse.json(
      {
        success: false,
        error: `'${meta.displayName}' has no unique column to match on, so update-or-create import is not available for this table. Use 'Insert only'.`,
      },
      { status: 400 }
    );
  }

  for (const row of preview.rows) {
    if (row.errors.length > 0) {
      failures.push({ rowNumber: row.rowNumber, errors: row.errors });
      continue;
    }

    // Keep only writable fields
    const inputData: Record<string, any> = {};
    for (const [key, value] of Object.entries(row.data)) {
      if (writeFieldNames.has(key)) inputData[key] = value;
    }

    if (Object.keys(inputData).length === 0) {
      failures.push({ rowNumber: row.rowNumber, errors: ["Row has no importable values."] });
      continue;
    }

    const sequenceCheck = await resolveSequenceId(meta, inputData);
    if (!sequenceCheck.ok) {
      failures.push({ rowNumber: row.rowNumber, errors: [sequenceCheck.error] });
      continue;
    }
    if (sequenceCheck.sequenceId) inputData.sequenceId = sequenceCheck.sequenceId;

    let cleanedData: Record<string, any>;
    try {
      cleanedData = await cleanInputData(meta, inputData, mode === "upsert");
    } catch (err: any) {
      failures.push({
        rowNumber: row.rowNumber,
        errors: [err?.message || "Failed to normalize row values."],
      });
      continue;
    }

    if (dryRun) {
      created.push(cleanedData);
      continue;
    }

    try {
      let existing: any = null;

      if (matchField) {
        const matchValue = cleanedData[matchField.name];
        if (matchValue !== undefined && matchValue !== null && matchValue !== "") {
          existing = await delegate.findFirst({ where: { [matchField.name]: matchValue } });
        }
      } else if (mode === "create") {
        // Guard against duplicate primary keys when the CSV supplies ids
        const idValue = cleanedData[meta.idField];
        if (idValue !== undefined && idValue !== null && idValue !== "") {
          existing = await delegate.findFirst({ where: { [meta.idField]: idValue } });
          if (existing) {
            failures.push({
              rowNumber: row.rowNumber,
              errors: [`A record with ${meta.idField} '${idValue}' already exists.`],
            });
            continue;
          }
        }
      }

      if (existing && matchField) {
        const patch: Record<string, any> = { ...cleanedData };
        delete patch[matchField.name];
        const record = await delegate.update({
          where: { [meta.idField]: existing[meta.idField] },
          data: patch,
        });
        updated.push(sanitizeRecord(table, record));
      } else {
        const record = await delegate.create({ data: cleanedData });
        created.push(sanitizeRecord(table, record));
      }
    } catch (err: any) {
      failures.push({
        rowNumber: row.rowNumber,
        errors: [err?.message || "Failed to write this row."],
      });
    }
  }

  const failedCount = failures.length;
  const writtenCount = created.length + updated.length;

  return NextResponse.json({
    success: failedCount === 0,
    partial: failedCount > 0 && writtenCount > 0,
    message:
      failedCount === 0
        ? `${writtenCount} row(s) imported into '${meta.displayName}'.`
        : `${writtenCount} row(s) imported, ${failedCount} row(s) skipped in '${meta.displayName}'.`,
    table,
    mode,
    matchField: matchField ? matchField.name : null,
    importedCount: writtenCount,
    createdCount: created.length,
    updatedCount: updated.length,
    failedCount,
    failures,
    preview: summarizePreview(preview),
    sample: dryRun ? created.slice(0, 5) : [...created, ...updated].slice(0, 5),
  });
}

/**
 * Trim the preview payload sent back to the browser.
 */
function summarizePreview(preview: ReturnType<typeof buildImportPreview>) {
  return {
    headers: preview.headers,
    totalRows: preview.rows.length,
    validCount: preview.validCount,
    invalidCount: preview.invalidCount,
    unmappedHeaders: preview.unmappedHeaders,
    missingRequired: preview.missingRequired,
    issues: preview.issues.slice(0, 100),
  };
}

/**
 * GET Handler
 * - action=summary: returns counts across all 17 tables and overview stats
 * - action=table: returns paginated, searchable, sorted records for a single model
 */
export async function GET(request: Request) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "summary";

    // 1. Summary action
    if (action === "summary") {
      const counts: Record<string, number> = {};
      let totalRecords = 0;

      const keys = Object.keys(ADMIN_MODEL_REGISTRY);
      await Promise.all(
        keys.map(async (key) => {
          try {
            const delegate = (prisma as any)[key];
            if (delegate && typeof delegate.count === "function") {
              const count = await delegate.count();
              counts[key] = count;
              totalRecords += count;
            } else {
              counts[key] = 0;
            }
          } catch {
            counts[key] = 0;
          }
        })
      );

      // Category aggregation
      const categoryCounts: Record<string, number> = {};
      for (const [key, meta] of Object.entries(ADMIN_MODEL_REGISTRY)) {
        categoryCounts[meta.category] =
          (categoryCounts[meta.category] || 0) + (counts[key] || 0);
      }

      // Recent activity sample
      const [recentInquiries, recentFeedback, recentSessions, recentMedia] =
        await Promise.all([
          prisma.contactInquiry.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
          }),
          prisma.feedbackSubmission.findMany({
            take: 5,
            orderBy: { id: "desc" },
          }),
          prisma.cubiconSession.findMany({
            take: 5,
            orderBy: { id: "desc" },
          }),
          prisma.mediaAsset.findMany({
            take: 5,
            orderBy: { uploadedAt: "desc" },
          }),
        ]);

      return NextResponse.json({
        success: true,
        summary: {
          counts,
          totalRecords,
          categoryCounts,
          modelCount: keys.length,
          recentActivity: {
            inquiries: recentInquiries,
            feedback: recentFeedback,
            sessions: recentSessions,
            media: recentMedia,
          },
        },
      });
    }

    // 2. Table action
    if (action === "table") {
      const table = searchParams.get("table");
      if (!table || !ADMIN_MODEL_REGISTRY[table]) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid table '${table}'. Must be one of the registered models.`,
          },
          { status: 400 }
        );
      }

      const meta = ADMIN_MODEL_REGISTRY[table];
      const delegate = getModelDelegate(table);

      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "25", 10))
      );
      const search = (searchParams.get("search") || "").trim();
      const sortBy = searchParams.get("sortBy") || meta.defaultSortField;
      const sortOrder =
        searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

      const where: any = {};
      if (search && meta.searchableFields.length > 0) {
        where.OR = meta.searchableFields.map((field) => ({
          [field]: { contains: search },
        }));
      }

      const orderBy: any = {};
      // Verify sortBy is a valid field
      const validField = meta.fields.some((f) => f.name === sortBy);
      if (validField) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy[meta.defaultSortField] = meta.defaultSortOrder;
      }

      const [rawRecords, totalCount] = await Promise.all([
        delegate.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        delegate.count({ where }),
      ]);

      const records = rawRecords.map((r: any) => sanitizeRecord(table, r));

      return NextResponse.json({
        success: true,
        table,
        records,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        metadata: meta,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'summary' or 'table'." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[admin/database GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to query database." },
      { status: 500 }
    );
  }
}

/**
 * POST Handler
 * - Creates a new record for any registered model
 */
export async function POST(request: Request) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Batch import path: a CSV payload (headers + rows) instead of a single record.
    if (body?.action === "bulkCreate" || (Array.isArray(body?.rows) && !body?.data)) {
      return await handleBulkCreate(body);
    }

    const { table, data } = body;

    if (!table || !ADMIN_MODEL_REGISTRY[table]) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid table '${table}'. Must be one of the registered models.`,
        },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Record data object is required." },
        { status: 400 }
      );
    }

    const meta = ADMIN_MODEL_REGISTRY[table];
    const delegate = getModelDelegate(table);

    // Validate required fields
    for (const field of meta.fields) {
      if (field.required && !field.readOnly) {
        if (data[field.name] === undefined || data[field.name] === null || data[field.name] === "") {
          return NextResponse.json(
            { success: false, error: `Field '${field.label}' is required.` },
            { status: 400 }
          );
        }
      }
    }

    const cleanedData = await cleanInputData(meta, data, false);

    // Sequence ID verification and association:
    // When creating tasks or sessions, associate them with an existing sequence instead of auto-creating new sequence IDs.
    const sequenceCheck = await resolveSequenceId(meta, data);
    if (!sequenceCheck.ok) {
      return NextResponse.json(
        { success: false, error: sequenceCheck.error },
        { status: 400 }
      );
    }
    if (sequenceCheck.sequenceId) {
      cleanedData.sequenceId = sequenceCheck.sequenceId;
    }

    const created = await delegate.create({ data: cleanedData });
    const sanitized = sanitizeRecord(table, created);

    return NextResponse.json({
      success: true,
      message: `Record created successfully in '${meta.displayName}'.`,
      record: sanitized,
    });
  } catch (err: any) {
    console.error("[admin/database POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create record." },
      { status: 500 }
    );
  }
}

/**
 * PUT Handler
 * - Updates an existing record for any registered model
 */
export async function PUT(request: Request) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { table, id, data } = body;

    if (!table || !ADMIN_MODEL_REGISTRY[table]) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid table '${table}'. Must be one of the registered models.`,
        },
        { status: 400 }
      );
    }

    if (id === undefined || id === null) {
      return NextResponse.json(
        { success: false, error: "Record 'id' is required for updates." },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Record data object is required." },
        { status: 400 }
      );
    }

    const meta = ADMIN_MODEL_REGISTRY[table];
    const delegate = getModelDelegate(table);

    const parsedId = meta.idType === "int" ? parseInt(String(id), 10) : String(id);
    const cleanedData = await cleanInputData(meta, data, true);

    if (meta.fields.some((f) => f.name === "sequenceId") && cleanedData.sequenceId) {
      const existingSequence = await prisma.cubiconSequence.findUnique({
        where: { id: cleanedData.sequenceId },
        select: { id: true },
      });
      if (!existingSequence) {
        return NextResponse.json(
          {
            success: false,
            error: `Sequence ID ${cleanedData.sequenceId} does not exist. Please specify a valid Sequence ID.`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await delegate.update({
      where: { [meta.idField]: parsedId },
      data: cleanedData,
    });

    const sanitized = sanitizeRecord(table, updated);

    return NextResponse.json({
      success: true,
      message: `Record updated successfully in '${meta.displayName}'.`,
      record: sanitized,
    });
  } catch (err: any) {
    console.error("[admin/database PUT] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update record." },
      { status: 500 }
    );
  }
}

/**
 * DELETE Handler
 * - Deletes a record from any registered model
 */
export async function DELETE(request: Request) {
  try {
    const auth = await validateApiAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get("table");
    const idParam = searchParams.get("id");

    let table = tableParam;
    let id: any = idParam;

    // Support payload via query params or JSON body
    if (!table || !id) {
      const body = await request.json().catch(() => ({}));
      table = body.table || table;
      id = body.id !== undefined ? body.id : id;
    }

    if (!table || !ADMIN_MODEL_REGISTRY[table]) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid table '${table}'. Must be one of the registered models.`,
        },
        { status: 400 }
      );
    }

    if (id === undefined || id === null) {
      return NextResponse.json(
        { success: false, error: "Record 'id' is required for deletion." },
        { status: 400 }
      );
    }

    const meta = ADMIN_MODEL_REGISTRY[table];
    const delegate = getModelDelegate(table);
    const parsedId = meta.idType === "int" ? parseInt(String(id), 10) : String(id);

    await delegate.delete({
      where: { [meta.idField]: parsedId },
    });

    return NextResponse.json({
      success: true,
      message: `Record ${parsedId} deleted from '${meta.displayName}'.`,
      deletedId: parsedId,
    });
  } catch (err: any) {
    console.error("[admin/database DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete record." },
      { status: 500 }
    );
  }
}
