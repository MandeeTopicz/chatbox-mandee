/**
 * In-memory sliding window rate limiter.
 *
 * Each key tracks an array of timestamps. On check, expired entries (older than
 * windowMs) are pruned. If the remaining count >= maxRequests, the request is
 * denied with a 429.
 *
 * This is per-process — resets on server restart. For production, replace with
 * Redis or Upstash.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}, 300_000)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInMs: number
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const resetInMs = oldestInWindow + windowMs - now
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, resetInMs),
    }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetInMs: 0,
  }
}

// Convenience limits
export const CHAT_LIMIT = { maxRequests: 60, windowMs: 60_000 } // 60/min
export const TOOL_LIMIT = { maxRequests: 30, windowMs: 60_000 } // 30/min
