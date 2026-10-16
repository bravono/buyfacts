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
 * Formats a URL for embedding via Microsoft Office Online Web Viewer.
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
 * Fetches a remote or relative DOCX file and converts it into HTML.
 */
export async function fetchAndConvertDocx(url: string): Promise<DocxConversionResult> {
  try {
    const response = await fetch(url);
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
