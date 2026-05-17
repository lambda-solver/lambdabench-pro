import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "bun:sqlite": path.resolve(
        import.meta.dirname,
        "apps/server/test/stubs/bun-sqlite.ts",
      ),
    },
  },
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        "dist/**",
        "e2e/**",
        "**/*.config.*",
        "**/*.d.ts",
        "**/types/**",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "reference/**"],
    globals: true,
  },
});
