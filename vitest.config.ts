import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts", "src/action.ts"],
      thresholds: {
        lines: 75,
        functions: 75,
        statements: 75,
        branches: 65
      }
    }
  }
});
