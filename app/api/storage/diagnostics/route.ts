import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth/middleware";
import {
  getMinioClient,
  getMinioBucket,
  applyBucketCorsPolicy,
  getBucketCorsPolicy,
  getAllowedOrigins,
} from "@/lib/minio";
import { prisma } from "@/lib/prisma";

/**
 * Storage diagnostics (admin only).
 *
 * GET  — reports what the deployment is actually using: the public URL prefix, the CORS
 *        origins the bucket currently allows versus the origins this deployment expects,
 *        and every dashboard button link that points somewhere the public internet cannot
 *        reach (localhost / private IP / plain http). Those are the links that work on a
 *        developer machine and fail on staging.
 *
 * POST — re-applies the CORS policy (origins from MINIO_ALLOWED_ORIGINS plus defaults),
 *        so a missing staging origin can be fixed from the app rather than by hand.
 */

interface LinkProblem {
  id: string;
  field: "mediaUrl" | "seeItUrl" | "hearItUrl" | "readItUrl";
  url: string;
  reason: string;
}

function unreachableReason(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "not an absolute URL";
  }
  if (parsed.protocol === "http:") {
    return "plain http — third-party viewers and most browsers refuse it";
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return "loopback host — only reachable on the machine that saved it";
  }
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return "private network address — not reachable from the internet";
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await validateApiAuth(req);
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized: Admin access required." },
      { status: 401 }
    );
  }

  const s3Client = getMinioClient();
  const bucket = getMinioBucket();
  const expectedOrigins = getAllowedOrigins();
  const currentRules = await getBucketCorsPolicy(s3Client, bucket);
  const currentOrigins = (currentRules || []).flatMap((rule) => rule.origins);

  const missingOrigins = expectedOrigins.filter(
    (origin) => !currentOrigins.includes("*") && !currentOrigins.includes(origin)
  );

  const buttons = await prisma.dashboardButton.findMany({
    select: {
      id: true,
      label: true,
      mediaUrl: true,
      seeItUrl: true,
      hearItUrl: true,
      readItUrl: true,
    },
    orderBy: { id: "asc" },
  });

  const problems: LinkProblem[] = [];
  for (const button of buttons) {
    for (const field of ["mediaUrl", "seeItUrl", "hearItUrl", "readItUrl"] as const) {
      const value = button[field];
      if (!value) continue;
      const reason = unreachableReason(value);
      if (reason) {
        problems.push({ id: button.id, field, url: value, reason });
      }
    }
  }

  return NextResponse.json({
    success: true,
    storage: {
      bucket,
      publicUrl: process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || "(not set)",
      endpoint: process.env.MINIO_ENDPOINT || "(not set)",
      cors: {
        currentOrigins,
        expectedOrigins,
        missingOrigins,
        ok: missingOrigins.length === 0,
        readable: currentRules !== null,
      },
    },
    buttonLinks: {
      total: buttons.length,
      problems,
      ok: problems.length === 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await validateApiAuth(req);
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized: Admin access required." },
      { status: 401 }
    );
  }

  const s3Client = getMinioClient();
  const bucket = getMinioBucket();
  await applyBucketCorsPolicy(s3Client, bucket);

  const rules = await getBucketCorsPolicy(s3Client, bucket);

  return NextResponse.json({
    success: true,
    bucket,
    appliedOrigins: rules ? rules.flatMap((rule) => rule.origins) : getAllowedOrigins(),
  });
}
