/**
 * Configuration module
 */

import type { Env } from "../types";

export * from "./constants";

export function validateEnv(env: Env): void {
  const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "CHITTY_ID_TOKEN"];
  const missing = required.filter((key) => !env[key as keyof Env]);

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
