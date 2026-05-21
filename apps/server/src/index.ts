/**
 * index.ts — LamBench Pro server CLI entry point.
 *
 * Usage:
 *   bun src/index.ts eval           # fetch top models → apps/server/top-models.json
 *   bun src/index.ts run            # run standard + λ-RLM eval → res/*.txt
 *   bun src/index.ts build          # build apps/client/public/data/results.json
 *   bun src/index.ts eval run build # full pipeline
 *   bun src/index.ts server         # launch HTTP API server
 *   bun src/index.ts cli <command>  # run CLI commands
 *   bun src/index.ts mcp            # launch MCP server
 *
 * Config (bench.config.json — committed, edit to change benchmark settings):
 *   models       — model IDs to evaluate
 *   rlmMaxDepth  — λ-RLM self-correction depth (default 3)
 *   tasks        — task ID filter; empty array = all tasks
 *
 * Env (.env — secrets only, never commit):
 *   OPENROUTER_API_KEY   Required for all LLM calls
 *
 * Env (eval command only):
 *   DEV_MODE             Set to "true" to skip live fetch and use mock models
 *   TOP_MODELS           Comma-separated fallback model IDs (overrides eval fetch)
 */

import { BunHttpClient, BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Layer } from "effect";
import { loadAllTasks, loadRefBitsMap, runModelEval } from "./eval/ModelEvalRunner";

import type { TopModel } from "./eval/EvalRunner";

import { build } from "./build/BuildResults";
import { loadBenchConfig } from "./config/BenchConfig";
import { resolveTopModels } from "./eval/EvalRunner";

// ─── Commands ────────────────────────────────────────────────────────────────

const SERVER_ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TOP_MODELS_FILE = `${SERVER_ROOT}/top-models.json`;

const evalCommand = Effect.gen(function* () {
  const devMode = process.env.DEV_MODE === "true";
  const apiKey = process.env.OPENROUTER_API_KEY;
  const fallbackEnv = process.env.TOP_MODELS;

  const top = yield* resolveTopModels(devMode, apiKey, fallbackEnv);
  const fs = yield* FileSystem.FileSystem;
  yield* fs.writeFileString(TOP_MODELS_FILE, JSON.stringify(top, null, 2));
  yield* Effect.log(`Written ${top.length} top models → ${TOP_MODELS_FILE}`);
  yield* Effect.forEach(top, (m) => Effect.log(`  ${m.modelId}  $${m.pricePerMOutput}/1M`), {
    concurrency: 1,
  });
});

const buildCommand = Effect.gen(function* () {
  yield* build(TOP_MODELS_FILE);
});

const runCommand = Effect.gen(function* () {
  const config = yield* loadBenchConfig();

  yield* Effect.log(
    `[lambench] Config: ${config.models.length} model(s), rlmMaxDepth=${config.rlmMaxDepth}, concurrency=${config.concurrency}, tasks=${
      config.tasks.length === 0 ? "all" : config.tasks.join(",")
    }`,
  );

  // Build TopModel list from config.models (price unknown at this point — 0)
  const topModels: ReadonlyArray<TopModel> = config.models.map((modelId) => ({
    modelId,
    pricePerMOutput: 0,
  }));

  // Load tasks + reference bits once, share across all models
  const allTasks = yield* loadAllTasks;
  const tasks = config.tasks.length > 0 ? allTasks.filter((t) => config.tasks.includes(t.id)) : allTasks;
  yield* Effect.log(`[lambench] Tasks: ${tasks.map((t) => t.id).join(", ")}`);
  const refBitsMap = yield* loadRefBitsMap();

  // Evaluate each model sequentially (rate-limit friendly)
  yield* Effect.forEach(
    topModels,
    (model) => runModelEval(model, tasks, refBitsMap, config.rlmMaxDepth, config.concurrency),
    { concurrency: 1 },
  );
});

// ─── Argument parsing ─────────────────────────────────────────────────────────

const parseArgs = (): ReadonlyArray<"eval" | "run" | "build"> => {
  const args = process.argv.slice(2).filter((a) => a === "eval" || a === "run" || a === "build") as Array<
    "eval" | "run" | "build"
  >;
  // Default: run + build only — eval fetches live rankings and overwrites
  // top-models.json; run it explicitly when you want to refresh the model list.
  return args.length === 0 ? ["run", "build"] : args;
};

// ─── Main ────────────────────────────────────────────────────────────────────

const runCmd = (cmd: "eval" | "run" | "build") =>
  Effect.gen(function* () {
    yield* Effect.log(`[lambench] Running: ${cmd}`);
    if (cmd === "eval") yield* evalCommand;
    else if (cmd === "run") yield* runCommand;
    else yield* buildCommand;
  });

const program = Effect.gen(function* () {
  const mode = process.argv[2];

  if (mode === "server") {
    const { ServerLive } = yield* Effect.tryPromise({
      catch: (e) => new Error(String(e)),
      try: () => import("./localServer.js"),
    });
    yield* ServerLive.pipe(Layer.launch);
  } else if (mode === "cli") {
    const { runCli } = yield* Effect.tryPromise({
      catch: (e) => new Error(String(e)),
      try: () => import("./cli.js"),
    });
    const { LamBenchClient } = yield* Effect.tryPromise({
      catch: (e) => new Error(String(e)),
      try: () => import("./client/LamBenchClient.js"),
    });
    const cliArgs = process.argv.slice(3);
    const baseUrl = process.env.LAMBENCH_API_URL ?? "http://127.0.0.1:9000";
    yield* runCli(cliArgs).pipe(Effect.provide(LamBenchClient.layer(baseUrl)));
  } else if (mode === "mcp") {
    const { ServerLayer } = yield* Effect.tryPromise({
      catch: (e) => new Error(String(e)),
      try: () => import("./mcp.js"),
    });
    yield* ServerLayer.pipe(Layer.launch);
  } else {
    yield* Effect.forEach(parseArgs(), runCmd, { concurrency: 1 });
    yield* Effect.log("[lambench] Done.");
  }
});

// LanguageModel is provided per-model inside runModelEval — not needed here.
const appLayer = Layer.mergeAll(BunServices.layer, BunHttpClient.layer);

BunRuntime.runMain(program.pipe(Effect.provide(appLayer)));
