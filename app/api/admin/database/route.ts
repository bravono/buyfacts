import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiAuth } from "@/lib/auth/middleware";
import { hashPassword } from "@/lib/auth/password";
import {
  ADMIN_MODEL_REGISTRY,
  ModelMetadata,
  ModelFieldDefinition,
} from "@/lib/admin/schemaRegistry";

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
