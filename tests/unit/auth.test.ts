import { describe, it, expect } from "vitest";
import { authenticateRequest } from "../../src/middleware/auth";
import type { Env } from "../../src/types";

const env: Env = {
  STRIPE_SECRET_KEY: "sk",
  STRIPE_WEBHOOK_SECRET: "whsec",
  CHITTY_ID_TOKEN: "secret123",
  HOLDS: {} as any,
};

describe("auth middleware", () => {
  it("authenticates with correct token", () => {
    const req = new Request("https://host/api", { headers: { "ChittyID-Token": "secret123" } });
    expect(() => authenticateRequest(req, env)).not.toThrow();
  });

  it("throws when missing or invalid token", () => {
    const reqMissing = new Request("https://host/api");
    const reqInvalid = new Request("https://host/api", { headers: { "ChittyID-Token": "nope" } });
    expect(() => authenticateRequest(reqMissing, env)).toThrowError(/Unauthorized/);
    expect(() => authenticateRequest(reqInvalid, env)).toThrowError(/Unauthorized/);
  });
});

