import { describe, it, expect } from "vitest";
import { validateEnv, getAllowedOrigins, getCurrency } from "../../src/config";
import type { Env } from "../../src/types";

describe("config", () => {
  it("validateEnv throws on missing vars", () => {
    const env = { HOLDS: {} } as unknown as Env;
    expect(() => validateEnv(env)).toThrow(/Missing required environment variables/);
  });

  it("validateEnv passes with required vars", () => {
    const env = {
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      CHITTY_ID_TOKEN: "token",
      HOLDS: {} as any,
    } as Env;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("getAllowedOrigins uses env and trims", () => {
    const env = {
      STRIPE_SECRET_KEY: "sk",
      STRIPE_WEBHOOK_SECRET: "whsec",
      CHITTY_ID_TOKEN: "tok",
      HOLDS: {} as any,
      ALLOWED_ORIGINS: " https://a.com , https://*.b.com",
    } as Env;
    expect(getAllowedOrigins(env)).toEqual([
      "https://a.com",
      "https://*.b.com",
    ]);
  });

  it("getAllowedOrigins returns defaults when missing", () => {
    const env = {
      STRIPE_SECRET_KEY: "sk",
      STRIPE_WEBHOOK_SECRET: "whsec",
      CHITTY_ID_TOKEN: "tok",
      HOLDS: {} as any,
    } as Env;
    expect(getAllowedOrigins(env)).toEqual([
      "https://chitty.cc",
      "https://*.chitty.cc",
    ]);
  });

  it("getCurrency returns env value or default", () => {
    const envUSD = {
      STRIPE_SECRET_KEY: "sk",
      STRIPE_WEBHOOK_SECRET: "whsec",
      CHITTY_ID_TOKEN: "tok",
      HOLDS: {} as any,
      CURRENCY: "eur",
    } as Env;
    expect(getCurrency(envUSD)).toBe("eur");

    const envDefault = {
      STRIPE_SECRET_KEY: "sk",
      STRIPE_WEBHOOK_SECRET: "whsec",
      CHITTY_ID_TOKEN: "tok",
      HOLDS: {} as any,
    } as Env;
    expect(getCurrency(envDefault)).toBe("usd");
  });
});

