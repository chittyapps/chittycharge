/**
 * Configuration module
 */

import type { Env } from "../types";

export * from "./constants";

const REQUIRED_ENV_VARS: (keyof Env)[] = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CHITTY_ID_TOKEN",
];

export function validateEnv(env: Env): void {
  if (!env.HOLDS) {
    throw new Error("Missing required binding: HOLDS (KV Namespace)");
  }

  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["https://chitty.cc", "https://*.chitty.cc"];
}

export function getCurrency(env: Env): string {
  return env.CURRENCY || "usd";
}
