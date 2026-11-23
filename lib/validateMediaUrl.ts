/** Media link fields edited in /admin and /file-upload (Great Eight items and dashboard buttons). */
export const MEDIA_URL_FIELDS = ["seeItUrl", "hearItUrl", "readItUrl"] as const;

export const MEDIA_URL_ERROR =
  "Enter a full URL starting with https:// (or a root path starting with /), not a bare filename.";

/**
 * Returns an error message, or null when the value is acceptable: empty (clears the field),
 * an absolute http(s) URL, or a root-relative path. A bare filename would resolve against
 * the current page and 404.
 */
export function validateMediaUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return MEDIA_URL_ERROR;
  const url = value.trim();
  if (url === "") return null;
  if (url.startsWith("/")) return url.startsWith("//") ? MEDIA_URL_ERROR : null;
  if (!/^https?:\/\//i.test(url)) return MEDIA_URL_ERROR;
  try {
    new URL(url);
    return null;
  } catch {
    return MEDIA_URL_ERROR;
  }
}

/** First media URL error in a record, labelled with its field, or null if all are valid. */
export function findInvalidMediaUrl(data: Record<string, unknown> | null | undefined): string | null {
  if (!data || typeof data !== "object") return null;
  for (const field of MEDIA_URL_FIELDS) {
    const error = validateMediaUrl(data[field]);
    if (error) return `${field}: ${error}`;
  }
  return null;
}
