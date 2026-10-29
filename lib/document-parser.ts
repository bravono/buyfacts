import mammoth from "mammoth";

export interface DocxConversionResult {
  success: boolean;
  html?: string;
  warnings?: string[];
  error?: string;
}

/**
 * Checks whether the given URL or filename points to a PDF document.
 */
export function isPdfUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.pdf($|\?|#)/i.test(url) || url.startsWith("data:application/pdf");
}

/**
 * Checks whether the given URL or filename points to a DOCX or DOC document.
 */
export function isDocxUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    /\.(docx|doc)($|\?|#)/i.test(url) ||
    url.startsWith("data:application/vnd.openxmlformats-officedocument") ||
    url.startsWith("data:application/msword")
  );
}

/**
 * Checks whether the given URL points to any document format supported for inline reading.
 */
export function isDocumentUrl(url?: string | null): boolean {
  return isPdfUrl(url) || isDocxUrl(url);
}

/**
 * True when the URL points at a bucket served from an address no outside service can
 * reach: loopback / private-network hosts and plain-http endpoints. Third-party viewers
 * (Microsoft Office Online, Google Docs) cannot fetch these, so they must not be used.
 */
export function isUnreachableForThirdParty(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, "http://localhost");
    if (parsed.protocol === "http:") return true;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Same-origin proxy for reading a document. The browser fetches this route instead of the
 * bucket, so reading a document never depends on the bucket's CORS policy or on a
 * third-party viewer being able to reach the storage host.
 */
export function getDocumentProxyUrl(url: string): string {
  return `/api/document-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Formats a URL for embedding via Microsoft Office Online Web Viewer.
 * Only meaningful for documents hosted somewhere the public internet can reach.
 */
export function getOfficeViewerUrl(url: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

/**
 * Formats a URL for embedding via Google Docs Viewer.
 */
export function getGoogleDocsViewerUrl(url: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

/**
 * Converts a DOCX ArrayBuffer or Node Buffer into semantic HTML using Mammoth.
 */
export async function convertDocxBufferToHtml(
  input: ArrayBuffer | Buffer
): Promise<{ html: string; warnings: string[] }> {
  const isBuffer = typeof Buffer !== "undefined" && Buffer.isBuffer(input);
  const conversionInput = isBuffer
    ? { buffer: input as Buffer }
    : { arrayBuffer: input as ArrayBuffer };

  const result = await mammoth.convertToHtml(conversionInput, {
    ignoreEmptyParagraphs: true,
  });

  const warnings = (result.messages || [])
    .filter((msg) => msg.type === "warning")
    .map((msg) => msg.message);

  return {
    html: result.value,
    warnings,
  };
}

/**
 * Fetches a DOCX file and converts it into HTML.
 *
 * Cross-origin documents are fetched through our own /api/document-proxy route so the
 * read never depends on the storage bucket's CORS configuration — that is what made
 * documents render on localhost but fail on staging, where the origin was not allowed.
 */
export async function fetchAndConvertDocx(url: string): Promise<DocxConversionResult> {
  try {
    const isRelative = !/^https?:\/\//i.test(url);
    const fetchUrl = isRelative ? url : getDocumentProxyUrl(url);

    let response = await fetch(fetchUrl);

    // Proxy unavailable (older deployment) — fall back to a direct cross-origin read.
    if (response.status === 404 && !isRelative) {
      response = await fetch(url);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch document (${response.status} ${response.statusText})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const { html, warnings } = await convertDocxBufferToHtml(arrayBuffer);

    return {
      success: true,
      html,
      warnings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown document conversion error";
    return {
      success: false,
      error: message,
    };
  }
}
