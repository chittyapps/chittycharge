/**
 * Configuration module
 */

import type { Env } from "../types";

export * from "./constants";

export function validateEnv(env: Env): void {
  // Only validate critical bindings - secrets checked when used
  if (!env.HOLDS) {
    throw new Error("Missing required binding: HOLDS (KV Namespace)");
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
