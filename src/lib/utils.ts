/**
 * Utility functions
 */

import { STRIPE_PERCENTAGE_FEE, STRIPE_FIXED_FEE_CENTS } from "../config";

/**
 * Calculate estimated Stripe processing fee
 * Note: Actual fees vary by card type, volume tier, and international status
 */
export function calculateEstimatedFee(amountCents: number): number {
  return Math.round(amountCents * STRIPE_PERCENTAGE_FEE + STRIPE_FIXED_FEE_CENTS);
}

/**
 * Generate idempotency key for Stripe API calls
 */
export function generateIdempotencyKey(
  operation: string,
  id: string,
  amount: number | null,
  timestamp: number,
): string {
  const amountStr = amount !== null ? amount.toString() : "full";
  const minuteWindow = Math.floor(timestamp / 60000);
  return `${operation}-${id}-${amountStr}-${minuteWindow}`;
}

/**
 * Check if origin matches allowed pattern
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true;
    if (allowed.includes("*")) {
      const pattern = allowed.replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });
}

/**
 * Normalize arbitrary metadata into a string-string record for Stripe metadata
 */
export function normalizeMetadataToStrings(meta: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") out[key] = value;
    else if (typeof value === "number" || typeof value === "boolean") out[key] = String(value);
    else out[key] = JSON.stringify(value);
  }
  return out;
}
