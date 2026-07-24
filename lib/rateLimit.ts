/**
 * Lightweight in-memory sliding-window rate limiter. Good enough for a
 * single Vercel instance / dev; for multi-instance production deployments,
 * swap the Map for a shared store (Upstash Redis, etc.) behind this same
 * function signature. Protects the Claude/Deepgram-calling routes from
 * runaway cost/abuse without adding any new infra dependency yet.
 */
const buckets = new Map<string, number[]>();

/** Best-effort client IP from the headers Vercel/most proxies set. */
export function getClientIp(req: { headers: Headers }): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - timestamps[0]);
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true };
}
