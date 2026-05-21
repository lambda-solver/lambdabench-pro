import { defineProject } from "vitest/config";
import path from "node:path";

export default defineProject({
  resolve: {
    alias: {
      bun: path.resolve(import.meta.dirname, "test/stubs/bun.ts"),
      "bun:sqlite": path.resolve(import.meta.dirname, "test/stubs/bun-sqlite.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    name: "server",
  },
});
