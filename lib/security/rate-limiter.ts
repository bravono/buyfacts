/**
 * Rate Limiter Utility (Section 13)
 *
 * Implements in-memory sliding-window rate limiting for public endpoints:
 * - Forms & registrations
 * - Share referrals
 * - Feedback submissions
 * - Verification link resends
 */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  contact: { maxRequests: 5, windowSeconds: 600 }, // 5 requests per 10 minutes
  founding_client: { maxRequests: 5, windowSeconds: 600 },
  share: { maxRequests: 5, windowSeconds: 600 },
  feedback: { maxRequests: 10, windowSeconds: 600 },
  verify_resend: { maxRequests: 3, windowSeconds: 900 }, // 3 resends per 15 minutes
};

/**
 * Checks whether an incoming request from an IP/identifier exceeds the rate limit.
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  customConfig?: RateLimitConfig
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const config = customConfig || RATE_LIMIT_CONFIGS[action] || { maxRequests: 10, windowSeconds: 600 };
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Filter out timestamps outside the active sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = entry.timestamps[0];
    const resetSeconds = Math.ceil((oldestTimestamp + config.windowSeconds * 1000 - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  // Record this request
  entry.timestamps.push(now);

  const remaining = config.maxRequests - entry.timestamps.length;
  return {
    allowed: true,
    remaining,
    resetSeconds: config.windowSeconds,
  };
}

/**
 * Extracts a client IP from standard Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Clears rate limit store (used in testing).
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
}
