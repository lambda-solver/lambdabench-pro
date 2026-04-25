/// <reference types="vitest/config" />
import path from "node:path"
import { defineProject } from "vitest/config"

export default defineProject({
  resolve: {
    alias: {
      bun: path.resolve(import.meta.dirname, "test/stubs/bun.ts"),
    },
  },
  test: {
    name: "server",
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
})
