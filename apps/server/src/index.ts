/**
 * index.ts — LamBench Pro server CLI entry point.
 *
 * Usage:
 *   bun src/index.ts eval           # fetch top models → apps/server/top-models.json
 *   bun src/index.ts build          # build apps/client/public/data/results.json
 *   bun src/index.ts eval build     # both in sequence (default)
 *
 * Env (eval command):
 *   OPENROUTER_API_KEY   Required unless DEV_MODE=true or TOP_MODELS is set
 *   TOP_MODELS           Comma-separated fallback model IDs
 *   DEV_MODE             Set to "true" to skip live fetch and use mock models
 *
 * Env (build command):
 *   TOP_MODELS_FILE      Optional path to top-models.json (defaults to apps/server/top-models.json)
 */

import { BunHttpClient, BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem } from "effect";
import { build } from "./build/BuildResults";
import { resolveTopModels } from "./eval/EvalRunner";

// ─── Commands ────────────────────────────────────────────────────────────────

const SERVER_ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TOP_MODELS_FILE = `${SERVER_ROOT}/top-models.json`;

const evalCommand = Effect.gen(function* () {
  const devMode = process.env["DEV_MODE"] === "true";
  const apiKey = process.env["OPENROUTER_API_KEY"];
  const fallbackEnv = process.env["TOP_MODELS"];

  const top = yield* resolveTopModels(devMode, apiKey, fallbackEnv);
  const fs = yield* FileSystem.FileSystem;
  yield* fs.writeFileString(TOP_MODELS_FILE, JSON.stringify(top, null, 2));
  yield* Effect.log(`Written ${top.length} top models → ${TOP_MODELS_FILE}`);
  for (const m of top) {
    yield* Effect.log(`  ${m.modelId}  $${m.pricePerMOutput}/1M`);
  }
});

const buildCommand = Effect.gen(function* () {
  const topModelsPath = process.env["TOP_MODELS_FILE"] ?? TOP_MODELS_FILE;
  yield* build(topModelsPath);
});

// ─── Argument parsing ─────────────────────────────────────────────────────────

const parseArgs = (): ReadonlyArray<"eval" | "build"> => {
  const args = process.argv
    .slice(2)
    .filter((a) => a === "eval" || a === "build") as Array<"eval" | "build">;
  return args.length === 0 ? ["eval", "build"] : args;
};

// ─── Main ────────────────────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const cmds = parseArgs();

  for (const cmd of cmds) {
    yield* Effect.log(`[lambench] Running: ${cmd}`);
    if (cmd === "eval") yield* evalCommand;
    else yield* buildCommand;
  }

  yield* Effect.log("[lambench] Done.");
});

BunRuntime.runMain(
  program.pipe(
    Effect.provide(BunServices.layer),
    Effect.provide(BunHttpClient.layer),
  ),
);
