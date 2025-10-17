/**
 * Unit tests for error handling
 */

import { describe, it, expect } from "vitest";
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ConflictError,
  errorToResponse,
} from "../../src/lib/errors";

describe("Custom Error Classes", () => {
  it("should create ValidationError with 400 status", () => {
    const error = new ValidationError("Invalid input");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Invalid input");
  });

  it("should create AuthenticationError with 401 status", () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
  });

  it("should create RateLimitError with 429 status", () => {
    const error = new RateLimitError("Too many requests", 60);
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60);
  });

  it("should create NotFoundError with 404 status", () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
  });

  it("should create ConflictError with 409 status", () => {
    const error = new ConflictError("Duplicate resource");
    expect(error.statusCode).toBe(409);
  });
});

describe("errorToResponse", () => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*" };

  it("should handle RateLimitError with Retry-After header", async () => {
    const error = new RateLimitError("Too many requests", 60);
    const response = errorToResponse(error, corsHeaders);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");

    const body = await response.json();
    expect(body).toHaveProperty("error", "Too many requests");
  });

  it("should handle ValidationError", async () => {
    const error = new ValidationError("Invalid amount");
    const response = errorToResponse(error, corsHeaders);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("error", "Invalid amount");
  });

  it("should handle generic Error", async () => {
    const error = new Error("Something went wrong");
    const response = errorToResponse(error, corsHeaders);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toHaveProperty("error", "Something went wrong");
  });

  it("should handle unknown error type", async () => {
    const error = "string error";
    const response = errorToResponse(error, corsHeaders);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toHaveProperty("error", "Internal server error");
  });
});
