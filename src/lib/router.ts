/**
 * Router - handles request routing to appropriate handlers
 */

import type { Env } from "../types";
import { NotFoundError } from "./errors";
import { handleHealthCheck } from "../handlers/health.handler";
import { createHold, getHoldStatus, captureHold, cancelHold } from "../handlers/holds.handler";
import { handleWebhook } from "../handlers/webhook.handler";

export async function routeRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Health check
  if (path === "/health" && method === "GET") {
    return handleHealthCheck(env, corsHeaders);
  }

  // Webhook handler (no auth required)
  if (path === "/webhook" && method === "POST") {
    return handleWebhook(request, env);
  }

  // API routes (auth required - handled by middleware)

  // POST /api/holds - Create hold
  if (path === "/api/holds" && method === "POST") {
    return createHold(request, env, corsHeaders);
  }

  // GET /api/holds/:id - Get hold status
  if (path.startsWith("/api/holds/") && method === "GET") {
    const holdId = path.split("/")[3];
    if (!holdId || holdId.includes("/")) {
      throw new NotFoundError();
    }
    return getHoldStatus(holdId, env, corsHeaders);
  }

  // POST /api/holds/:id/capture - Capture hold
  if (path.match(/^\/api\/holds\/[^/]+\/capture$/) && method === "POST") {
    const holdId = path.split("/")[3];
    return captureHold(holdId, request, env, corsHeaders);
  }

  // POST /api/holds/:id/cancel - Cancel hold
  if (path.match(/^\/api\/holds\/[^/]+\/cancel$/) && method === "POST") {
    const holdId = path.split("/")[3];
    return cancelHold(holdId, env, corsHeaders);
  }

  // No route matched
  throw new NotFoundError();
}
