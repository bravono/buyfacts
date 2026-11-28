import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";

const ALLOWED_HOSTS = new Set([
  "s3.buyfacts.com",
  "localhost",
  "127.0.0.1",
]);

const CACHE_DIR = path.join(process.cwd(), ".next", "cache", "cubicon-thumbnails");

function getCacheDir(): string {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return CACHE_DIR;
  } catch {
    const fallback = path.join(process.cwd(), "tmp", "thumbnails");
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
  }
}

export function isAllowedUrl(inputUrl: string): boolean {
  if (!inputUrl || typeof inputUrl !== "string") return false;
  const trimmed = inputUrl.trim();

  // Local relative paths
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl || !rawUrl.trim()) {
      return NextResponse.json(
        { error: "Image URL parameter 'url' is required." },
        { status: 400 }
      );
    }

    const targetUrl = rawUrl.trim();
    if (!isAllowedUrl(targetUrl)) {
      return NextResponse.json(
        { error: "Unauthorized image host or format." },
        { status: 403 }
      );
    }

    const parsedWidth = parseInt(searchParams.get("w") || "160", 10);
    const width = Math.min(600, Math.max(32, isNaN(parsedWidth) ? 160 : parsedWidth));

    const parsedQuality = parseInt(searchParams.get("q") || "75", 10);
    const quality = Math.min(95, Math.max(20, isNaN(parsedQuality) ? 75 : parsedQuality));

    // Compute deterministic cache key
    const hash = crypto
      .createHash("sha256")
      .update(`${targetUrl}_w${width}_q${quality}`)
      .digest("hex");

    const cacheDirectory = getCacheDir();
    const cacheFilePath = path.join(cacheDirectory, `${hash}.webp`);

    // Return cached thumbnail if present
    if (fs.existsSync(cacheFilePath)) {
      try {
        const cachedBuffer = fs.readFileSync(cacheFilePath);
        return new NextResponse(new Uint8Array(cachedBuffer), {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Thumbnail-Cache": "HIT",
          },
        });
      } catch {
        // Fall through to regeneration on read error
      }
    }

    // Load original image buffer
    let inputBuffer: Buffer | null = null;

    if (targetUrl.startsWith("/")) {
      // Local public path
      const localPath = path.join(process.cwd(), "public", targetUrl.replace(/^\/+/, ""));
      if (fs.existsSync(localPath)) {
        inputBuffer = fs.readFileSync(localPath);
      } else {
        return NextResponse.json({ error: "Local image not found." }, { status: 404 });
      }
    } else {
      // Remote S3 or localhost fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // Gracefully redirect to original on fetch error
          return NextResponse.redirect(targetUrl, 302);
        }

        const arrayBuffer = await res.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
      } catch {
        clearTimeout(timeoutId);
        // Fall back to original URL redirect if fetch timed out
        return NextResponse.redirect(targetUrl, 302);
      }
    }

    if (!inputBuffer || inputBuffer.length === 0) {
      return NextResponse.redirect(targetUrl, 302);
    }

    // Process thumbnail with sharp
    const thumbnailBuffer = await sharp(inputBuffer)
      .resize(width, width, {
        fit: "cover",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();

    // Persist to cache
    try {
      fs.writeFileSync(cacheFilePath, thumbnailBuffer);
    } catch {
      // Non-fatal if filesystem cache write fails
    }

    return new NextResponse(new Uint8Array(thumbnailBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Thumbnail-Cache": "MISS",
      },
    });
  } catch (err: any) {
    console.error("[Thumbnail API Error]:", err);
    const fallback = new URL(request.url).searchParams.get("url");
    if (fallback && isAllowedUrl(fallback)) {
      return NextResponse.redirect(fallback, 302);
    }
    return NextResponse.json({ error: "Failed to generate thumbnail." }, { status: 500 });
  }
}
