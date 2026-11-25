import crypto from "crypto";

/**
 * Signs a panel result redirect payload using HMAC-SHA256.
 * Returns the hex signature.
 */
export function signPanelResult(payload: {
  respondentId: string;
  result: "pass" | "fail";
  ts: number;
}): string {
  const secret =
    process.env.PANEL_HMAC_SECRET || "buyfacts_panel_default_secret";
  const message = `${payload.respondentId}|${payload.result}|${payload.ts}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Verifies a panel result signature (for client-side verification utility).
 */
export function verifyPanelResult(payload: {
  respondentId: string;
  result: string;
  ts: number;
  sig: string;
}): boolean {
  const expected = signPanelResult({
    respondentId: payload.respondentId,
    result: payload.result as "pass" | "fail",
    ts: payload.ts,
  });
  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(payload.sig, "hex")
    );
  } catch {
    return false;
  }
}
