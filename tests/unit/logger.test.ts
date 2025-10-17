import { describe, it, expect, vi } from "vitest";
import * as logger from "../../src/lib/logger";

describe("logger", () => {
  it("logs info, warn, error without throwing", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => logger.info("hello", { a: 1 })).not.toThrow();
    expect(() => logger.warn("be careful", 123)).not.toThrow();
    expect(() => logger.error("oops", new Error("e"))).not.toThrow();

    expect(logSpy).toHaveBeenCalledWith("hello", { a: 1 });
    expect(warnSpy).toHaveBeenCalledWith("be careful", 123);
    expect(errorSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

