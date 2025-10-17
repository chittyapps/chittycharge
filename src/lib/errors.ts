/**
 * Custom error classes for ChittyCharge
 */
import * as logger from "./logger";
export class ChittyChargeError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ChittyChargeError";
  }
}

export class ValidationError extends ChittyChargeError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ChittyChargeError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends ChittyChargeError {
  constructor(
    message: string,
    public retryAfter: number,
  ) {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends ChittyChargeError {
  constructor(message: string = "Not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ChittyChargeError {
  constructor(message: string, details?: unknown) {
    super(message, 409, details);
    this.name = "ConflictError";
  }
}

export function errorToResponse(error: unknown, corsHeaders: Record<string, string>): Response {
  if (error instanceof RateLimitError) {
    return Response.json(
      {
        error: error.message,
        details: error.details,
      },
      {
        status: error.statusCode,
        headers: {
          ...corsHeaders,
          "Retry-After": error.retryAfter.toString(),
        },
      },
    );
  }

  if (error instanceof ChittyChargeError) {
    return Response.json(
      {
        error: error.message,
        details: error.details,
      },
      {
        status: error.statusCode,
        headers: corsHeaders,
      },
    );
  }

  logger.error("Unexpected error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";

  return Response.json({ error: message }, { status: 500, headers: corsHeaders });
}
