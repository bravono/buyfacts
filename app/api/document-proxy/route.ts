import { NextRequest, NextResponse } from "next/server";
import {
  isDocxUrl,
  isPdfUrl,
  isUnreachableForThirdParty,
} from "@/lib/document-parser";

/**
 * Same-origin document proxy.
 *
 * The player reads documents (READ IT / the primary link when it is a document) by fetching
 * THIS route rather than the storage bucket directly. Two problems that used to appear only
 * on staging disappear:
 *
 *   1. CORS — the browser never makes a cross-origin request, so a bucket CORS policy that
 *      lists localhost but not the staging origin can no longer break document reading.
 *   2. Third-party viewers — Microsoft Office Online / Google Docs cannot fetch a bucket on
 *      loopback, a private network or plain http. We detect those cases and answer with a
 *      clear message instead of letting the viewer show its generic "URL is not valid or the
 *      document is not publicly accessible" error.
 *
 * Only document URLs are proxied, and only http(s) — this is not a general-purpose fetcher.
 */

/** Hosts we are allowed to reach: the configured storage host, plus public http(s). */
function isAllowedTarget(target: URL): boolean {
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;

  // Never proxy to our own API surface (avoids loops and self-referential requests).
  if (target.pathname.startsWith("/api/")) return false;

  const host = target.hostname.toLowerCase();
  if (host === "metadata.google.internal") return false;
  if (/^(169\.254|0\.0\.0\.0)/.test(host)) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const rawUrl = new URL(req.url).searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl, new URL(req.url).origin);
  } catch {
    return NextResponse.json({ error: `Invalid URL: ${rawUrl}` }, { status: 400 });
  }

  if (!isAllowedTarget(target)) {
    return NextResponse.json(
      { error: `Refusing to proxy ${target.toString()}` },
      { status: 400 }
    );
  }

  if (!isDocxUrl(target.toString()) && !isPdfUrl(target.toString())) {
    return NextResponse.json(
      { error: "Only .docx/.doc and .pdf documents can be proxied" },
      { status: 415 }
    );
  }

  // Documents on a host the public internet cannot reach: say so plainly.
  if (isUnreachableForThirdParty(target.toString())) {
    return NextResponse.json(
      {
        error:
          `This document is hosted at ${target.host}, which is not reachable from the ` +
          `public internet. Set MINIO_PUBLIC_URL to the public bucket URL ` +
          `(for example https://s3.buyfacts.com) and save the link again.`,
        unreachable: true,
      },
      { status: 502 }
    );
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "*/*" },
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      // A 404 means the link itself is wrong — say so, because that is what the user has
      // to fix (it is a data problem, not a server problem).
      const fileName = target.pathname.split("/").pop();
      if (upstream.status === 404) {
        return NextResponse.json(
          {
            error:
              `The file "${fileName}" does not exist in storage. This link points at a ` +
              `missing file — paste the correct URL for this document.`,
            missingFile: true,
            missingKey: target.pathname.replace(/^\//, ""),
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error:
            `Storage returned ${upstream.status} ${upstream.statusText} for ${fileName}`,
        },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") ||
      (isPdfUrl(target.toString())
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Inline so the PDF iframe renders it instead of downloading it.
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
        "X-Document-Proxy-Source": target.host,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    return NextResponse.json(
      { error: `Could not reach storage: ${message}` },
      { status: 502 }
    );
  }
}
