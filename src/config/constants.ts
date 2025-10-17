/**
 * Application constants
 */

export const RATE_LIMIT_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

export const KV_TTL_30_DAYS = 2592000; // 30 days in seconds
export const CAPTURE_ATTEMPT_WINDOW_MS = 300000; // 5 minutes

export const MIN_HOLD_AMOUNT_CENTS = 50; // $0.50 USD

export const SERVICE_VERSION = "1.0.0";
export const SERVICE_NAME = "chittycharge";

export const CHITTYID_SERVICE_URL = "https://id.chitty.cc";
export const CHITTYID_MINT_ENDPOINT = "/v1/mint";

// Stripe estimated processing fee calculation
export const STRIPE_PERCENTAGE_FEE = 0.029; // 2.9%
export const STRIPE_FIXED_FEE_CENTS = 30; // $0.30

// Tiered hold limits
export const HOLD_LIMITS = {
  NEW_GUEST: 250000, // $2,500
  VERIFIED_GUEST: 500000, // $5,000
  PREMIUM_PROPERTY: 1000000, // $10,000
} as const;

export const TIER_LIMITS_DISPLAY = {
  NEW_GUEST: "$2,500",
  VERIFIED_GUEST: "$5,000",
  PREMIUM_PROPERTY: "$10,000",
} as const;
