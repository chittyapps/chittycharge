/**
 * Health Check Handler
 */

import type { Env, HealthResponse } from "../types";
import { SERVICE_NAME, SERVICE_VERSION } from "../config";

export async function handleHealthCheck(
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const response: HealthResponse = {
    status: "healthy",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    stripe_connected: !!env.STRIPE_SECRET_KEY,
    chittyid_connected: !!env.CHITTY_ID_TOKEN,
  };

  return Response.json(response, { headers: corsHeaders });
}
