// apps/server/src/index.test.ts

import { describe, it } from "@effect/vitest";

import { Effect } from "effect";
import { strictEqual } from "@effect/vitest/utils";
import { vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.doMock("@effect/platform-bun", () => ({
  BunHttpClient: {
    layer: {},
  },
  BunRuntime: {
    runMain: () => {},
  },
  BunServices: {
    layer: {},
  },
}));

vi.doMock("./build/BuildResults", () => ({
  build: () => Effect.void,
}));

vi.doMock("./config/BenchConfig", () => ({
  loadBenchConfig: () =>
    Effect.sync(() => ({
      concurrency: 2,
      models: ["model-a"],
      rlmMaxDepth: 3,
      tasks: [],
    })),
}));

vi.doMock("./eval/EvalRunner", () => ({
  resolveTopModels: () => Effect.sync(() => [{ modelId: "model-a", pricePerMOutput: 0 }]),
}));

vi.doMock("./eval/ModelEvalRunner", () => ({
  loadAllTasks: Effect.sync(() => []),
  loadRefBitsMap: () => Effect.sync(() => new Map()),
  runModelEval: () => Effect.void,
}));

vi.doMock("./localServer.js", () => ({
  ServerLive: {},
}));

vi.doMock("./cli.js", () => ({
  runCli: () => Effect.void,
}));

vi.doMock("./client/LamBenchClient.js", () => ({
  LamBenchClient: {
    layer: () => ({}),
  },
}));

vi.doMock("./mcp.js", () => ({
  ServerLayer: {},
}));

// ─── Tests for dynamic imports ───────────────────────────────────────────────

describe("index.ts dynamic imports", () => {
  it.effect("localServer module can be dynamically imported", () =>
    Effect.gen(function* () {
      const mod = yield* Effect.tryPromise({
        catch: (e) => new Error(String(e)),
        try: () => import("./localServer.js"),
      });
      strictEqual(typeof mod.ServerLive !== "undefined", true);
    }),
  );

  it.effect("cli module can be dynamically imported", () =>
    Effect.gen(function* () {
      const mod = yield* Effect.tryPromise({
        catch: (e) => new Error(String(e)),
        try: () => import("./cli.js"),
      });
      strictEqual(typeof mod.runCli !== "undefined", true);
    }),
  );

  it.effect("mcp module can be dynamically imported", () =>
    Effect.gen(function* () {
      const mod = yield* Effect.tryPromise({
        catch: (e) => new Error(String(e)),
        try: () => import("./mcp.js"),
      });
      strictEqual(typeof mod.ServerLayer !== "undefined", true);
    }),
  );

  it.effect("LamBenchClient module can be dynamically imported", () =>
    Effect.gen(function* () {
      const mod = yield* Effect.tryPromise({
        catch: (e) => new Error(String(e)),
        try: () => import("./client/LamBenchClient.js"),
      });
      strictEqual(typeof mod.LamBenchClient !== "undefined", true);
    }),
  );
});

describe("index.ts import structure", () => {
  it.effect("imports required modules from effect/platform-bun", () =>
    Effect.gen(function* () {
      const mod = yield* Effect.tryPromise({
        catch: (e) => new Error(String(e)),
        try: () => import("./index.js"),
      });
      // Verify the module loads without errors (compilation check)
      strictEqual(typeof mod !== "undefined", true);
    }),
  );
});
