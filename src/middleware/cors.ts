/**
 * CORS Middleware
 */

import type { Env } from "../types";
import { getAllowedOrigins } from "../config";
import { isOriginAllowed } from "../lib/utils";

export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const allowedOrigins = getAllowedOrigins(env);
  const origin = request.headers.get("Origin") || "";

  const allowOrigin = isOriginAllowed(origin, allowedOrigins) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, ChittyID-Token",
  };
}

export function handleCorsPreflightRequest(corsHeaders: Record<string, string>): Response {
  return new Response(null, { headers: corsHeaders });
}
