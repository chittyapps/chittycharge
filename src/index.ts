/**
 * ChittyCharge - Authorization Hold Service
 *
 * Part of the ChittyPay ecosystem for ChittyOS.
 * Handles authorization holds (temporary card holds) using Stripe PaymentIntents.
 *
 * Refactored architecture:
 * - Modular structure with clear separation of concerns
 * - Service layer for external integrations (Stripe, ChittyID)
 * - Middleware for cross-cutting concerns (CORS, auth, rate limiting)
 * - Handlers for business logic
 * - Comprehensive error handling
 *
 * Future evolution: Full ChittyPay integration with Mercury Bank for instant payouts,
 * call sign based payments, and cross-border wallet support.
 */

import type { Env } from "./types";
import { validateEnv } from "./config";
import { errorToResponse } from "./lib/errors";
import { getCorsHeaders, handleCorsPreflightRequest } from "./middleware/cors";
import { authenticateRequest } from "./middleware/auth";
import { checkRateLimit, getRateLimitKey } from "./middleware/rate-limit";
import { routeRequest } from "./lib/router";

export { Env };

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      // Validate environment variables
      validateEnv(env);

      // Generate CORS headers
      const corsHeaders = getCorsHeaders(request, env);

      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return handleCorsPreflightRequest(corsHeaders);
      }

      const url = new URL(request.url);

      // Public routes (no auth required)
      const publicRoutes = ["/health", "/webhook"];
      const isPublicRoute = publicRoutes.some((route) => url.pathname === route);

      if (!isPublicRoute) {
        // Authenticate API requests
        authenticateRequest(request, env);

        // Rate limiting
        const rateLimitKey = getRateLimitKey(request);
        checkRateLimit(rateLimitKey);
      }

      // Route request to appropriate handler
      return await routeRequest(request, env, corsHeaders);
    } catch (error) {
      // Centralized error handling
      const corsHeaders = getCorsHeaders(request, env);
      return errorToResponse(error, corsHeaders);
    }
  },
};
