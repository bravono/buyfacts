/**
 * Secret scrubbing for the operational log.
 *
 * Nothing reaches the LogEvent table before passing through here: passwords,
 * bearer tokens, HMAC signatures, API keys and one-time verification tokens are
 * replaced with "[redacted]", and long strings are truncated so a single event
 * can never bloat a row.
 */

export const REDACTED = "[redacted]";

/** Keys whose values are never stored, at any depth. */
const SENSITIVE_KEYS = new Set(
  [
    "password",
    "passwordhash",
    "newpassword",
    "currentpassword",
    "confirmpassword",
    "passwordconfirm",
    "token",
    "authtoken",
    "accesstoken",
    "refreshtoken",
    "resettoken",
    "resettokenhash",
    "verificationtoken",
    "verificationSessionId",
    "sig",
    "signature",
    "secret",
    "totpsecret",
    "apikey",
    "api_key",
    "authorization",
    "cookie",
    "setcookie",
    "set-cookie",
    "cardnumber",
    "cvv",
    "cvc",
    "hmac",
    "privatekey",
    "sessiontoken",
    "jwt",
  ].map((k) => k.toLowerCase())
);

const MAX_STRING = 500;
const MAX_DEPTH = 4;
const MAX_ARRAY = 20;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.replace(/[-_\s]/g, "").toLowerCase());
}

/** Truncate a string to a sane length, marking that it was cut. */
export function truncate(value: string, max = MAX_STRING): string {
  if (typeof value !== "string") return value;
  return value.length > max ? `${value.slice(0, max)}…[${value.length - max} chars trimmed]` : value;
}

/**
 * Deep-copy a value with sensitive keys masked and strings truncated.
 * Cycles and depth are bounded so a hostile object cannot hang the logger.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return typeof value === "bigint" ? value.toString() : value;
  }
  if (typeof value === "function" || typeof value === "symbol") return "[unserializable]";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      stack: value.stack ? truncate(value.stack, 4000) : undefined,
    };
  }
  if (depth >= MAX_DEPTH) return "[depth limit]";
  if (typeof value === "object") {
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);

    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY).map((v) => redact(v, depth + 1, seen));
      if (value.length > MAX_ARRAY) items.push(`…[${value.length - MAX_ARRAY} more]`);
      return items;
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1, seen);
    }
    return out;
  }
  return "[unserializable]";
}

/**
 * Redact a free-text message. Catches secrets that arrive inside a string
 * rather than as a key (bearer tokens, sig= query params, emails are kept).
 */
export function redactMessage(message: string): string {
  return truncate(
    String(message)
      .replace(/(bearer\s+)[A-Za-z0-9._\-]+/gi, `$1${REDACTED}`)
      .replace(/(sig=)[A-Za-z0-9]+/gi, `$1${REDACTED}`)
      .replace(/(token=)[A-Za-z0-9._\-]+/gi, `$1${REDACTED}`)
      .replace(/(re_[A-Za-z0-9]{16,})/g, REDACTED)
  );
}
