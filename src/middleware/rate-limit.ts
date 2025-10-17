/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiting for single worker instances
 */

import type { RateLimitEntry } from "../types";
import { RateLimitError } from "../lib/errors";
import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from "../config";

// In-memory store (survives for worker lifetime)
const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_REQUESTS) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new RateLimitError(
        "Rate limit exceeded. Maximum 10 requests per minute. Please try again later.",
        retryAfter,
      );
    }
    entry.count++;
  } else {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
  }

  // Cleanup expired entries
  cleanupExpiredEntries(now);
}

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRateLimitKey(request: Request): string {
  return request.headers.get("ChittyID-Token") || "anonymous";
}
