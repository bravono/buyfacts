import crypto from "crypto";

/**
 * Base32 (RFC 4648, no padding) — the encoding authenticator apps use for TOTP secrets.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
/** How many periods before/after "now" are accepted (clock drift). */
const DRIFT_WINDOWS = 1;

/** Generate a new 160-bit TOTP secret, base32 encoded. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);

  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTotp(secret: string, at: number = Date.now()): string {
  const counter = Math.floor(at / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(base32Decode(secret), counter);
}

/**
 * Constant-time verification with a ±1 period drift window.
 */
export function verifyTotp(
  secret: string | null | undefined,
  token: string | null | undefined,
  at: number = Date.now()
): boolean {
  if (!secret || !token) return false;
  const clean = String(token).replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;

  let decoded: Buffer;
  try {
    decoded = base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(at / 1000 / TOTP_PERIOD_SECONDS);
  let match = false;
  for (let drift = -DRIFT_WINDOWS; drift <= DRIFT_WINDOWS; drift += 1) {
    const candidate = hotp(decoded, counter + drift);
    // Always compare every window so timing does not reveal which one matched.
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) {
      match = true;
    }
  }
  return match;
}

/** otpauth:// URI for the QR code an authenticator app scans. */
export function buildOtpAuthUri(params: {
  secret: string;
  email: string;
  issuer?: string;
}): string {
  const issuer = params.issuer || "BuyFacts Admin";
  const label = encodeURIComponent(`${issuer}:${params.email}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
