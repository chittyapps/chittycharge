/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from "vitest";
import {
  calculateEstimatedFee,
  generateIdempotencyKey,
  isOriginAllowed,
} from "../../src/lib/utils";

describe("calculateEstimatedFee", () => {
  it("should calculate correct fee for $100", () => {
    const fee = calculateEstimatedFee(10000); // $100 in cents
    expect(fee).toBe(320); // $3.20 (2.9% + $0.30)
  });

  it("should calculate correct fee for $10", () => {
    const fee = calculateEstimatedFee(1000); // $10 in cents
    expect(fee).toBe(59); // $0.59 (2.9% + $0.30)
  });

  it("should handle minimum amount", () => {
    const fee = calculateEstimatedFee(50); // $0.50 in cents
    expect(fee).toBe(31); // $0.31
  });
});

describe("generateIdempotencyKey", () => {
  it("should generate consistent keys for same input", () => {
    const timestamp = 1704067200000; // Fixed timestamp
    const key1 = generateIdempotencyKey("capture", "pi_123", 1000, timestamp);
    const key2 = generateIdempotencyKey("capture", "pi_123", 1000, timestamp);
    expect(key1).toBe(key2);
  });

  it("should generate different keys for different amounts", () => {
    const timestamp = 1704067200000;
    const key1 = generateIdempotencyKey("capture", "pi_123", 1000, timestamp);
    const key2 = generateIdempotencyKey("capture", "pi_123", 2000, timestamp);
    expect(key1).not.toBe(key2);
  });

  it("should handle null amount for full capture", () => {
    const timestamp = 1704067200000;
    const key = generateIdempotencyKey("capture", "pi_123", null, timestamp);
    expect(key).toContain("full");
  });
});

describe("isOriginAllowed", () => {
  it("should allow exact match", () => {
    const allowed = isOriginAllowed("https://chitty.cc", [
      "https://chitty.cc",
      "https://example.com",
    ]);
    expect(allowed).toBe(true);
  });

  it("should allow wildcard subdomain", () => {
    const allowed = isOriginAllowed("https://app.chitty.cc", ["https://*.chitty.cc"]);
    expect(allowed).toBe(true);
  });

  it("should allow all origins with *", () => {
    const allowed = isOriginAllowed("https://anything.com", ["*"]);
    expect(allowed).toBe(true);
  });

  it("should reject non-matching origin", () => {
    const allowed = isOriginAllowed("https://evil.com", ["https://chitty.cc"]);
    expect(allowed).toBe(false);
  });
});
