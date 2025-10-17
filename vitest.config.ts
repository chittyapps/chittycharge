import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.config.ts",
        "**/*.d.ts",
        "tests/**",
        "src/index.ts",
        "src/lib/router.ts",
        "src/services/**",
        "src/handlers/**",
        "src/types/**",
      ],
    },
  },
});
