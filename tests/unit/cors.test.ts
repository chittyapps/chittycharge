import { describe, it, expect } from "vitest";
import { getCorsHeaders, handleCorsPreflightRequest } from "../../src/middleware/cors";
import type { Env } from "../../src/types";

function makeEnv(origins?: string): Env {
  return {
    STRIPE_SECRET_KEY: "sk",
    STRIPE_WEBHOOK_SECRET: "whsec",
    CHITTY_ID_TOKEN: "tok",
    HOLDS: {} as any,
    ...(origins ? { ALLOWED_ORIGINS: origins } : {}),
  } as Env;
}

describe("cors middleware", () => {
  it("returns origin when allowed exact match", () => {
    const req = new Request("https://host/", { headers: { Origin: "https://a.com" } });
    const headers = getCorsHeaders(req, makeEnv("https://a.com"));
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://a.com");
  });

  it("returns request origin when '*' configured", () => {
    const req = new Request("https://host/", { headers: { Origin: "https://evil.com" } });
    const headers = getCorsHeaders(req, makeEnv("*"));
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://evil.com");
  });

  it("falls back to first allowed origin when not allowed", () => {
    const req = new Request("https://host/", { headers: { Origin: "https://x.com" } });
    const headers = getCorsHeaders(req, makeEnv("https://a.com, https://b.com"));
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://a.com");
  });

  it("preflight returns response with headers", () => {
    const res = handleCorsPreflightRequest({ "Access-Control-Allow-Origin": "*" });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

