export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

const DEFAULT_SECRET = process.env.JWT_SECRET || "buyfacts_super_secret_jwt_key_2026";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Sign a JWT token using HMAC SHA-256 (HS256)
 */
export async function signJWT(
  payload: JWTPayload,
  secret: string = DEFAULT_SECRET,
  expiresInSeconds: number = 86400 // 24 hours
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await globalThis.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(dataToSign)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureString = String.fromCharCode.apply(null, signatureArray);
  const encodedSignature = base64UrlEncode(signatureString);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verify and decode a JWT token using HMAC SHA-256 (HS256)
 */
export async function verifyJWT(
  token: string,
  secret: string = DEFAULT_SECRET
): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = Uint8Array.from(
      Buffer.from(base64UrlDecode(encodedSignature), "binary")
    );

    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes,
      encoder.encode(dataToSign)
    );

    if (!isValid) return null;

    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Expiration check
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired token
    }

    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
