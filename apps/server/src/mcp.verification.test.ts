// apps/server/src/mcp.verification.test.ts

import { resolve } from "node:path";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import { describe, it } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, FileSystem, Layer } from "effect";

const platformLayer = NodeFileSystem.layer;

describe("mcp.ts source verification", () => {
  it.effect("evalSingle handler spreads maxTokens, rlmMaxDepth, and mode", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const mcpPath = resolve(new URL(".", import.meta.url).pathname, "mcp.ts");
      const content = yield* fs.readFileString(mcpPath);

      // Verify the fields exist in the evalSingle call
      assertTrue(content.includes("maxTokens: 4096"));
      assertTrue(content.includes("rlmMaxDepth: 3"));
      assertTrue(content.includes("mode: input.mode"));

      // Verify they are in the evalSingle call context
      const evalSingleMatch = content.match(
        /client\.evalSingle\(\{[\s\S]*?\}\)/,
      );
      strictEqual(evalSingleMatch !== null, true);
      const evalSingleBlock = evalSingleMatch![0];
      assertTrue(evalSingleBlock.includes("maxTokens: 4096"));
      assertTrue(evalSingleBlock.includes("rlmMaxDepth: 3"));
      assertTrue(evalSingleBlock.includes("mode: input.mode"));
    }).pipe(Effect.provide(platformLayer)),
  );
});
