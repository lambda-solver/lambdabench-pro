/**
 * index.ts — LamBench Pro server CLI entry point.
 *
 * Usage:
 *   bun src/index.ts eval           # fetch top models → apps/server/top-models.json
 *   bun src/index.ts run            # run standard + λ-RLM eval → res/*.txt
 *   bun src/index.ts build          # build apps/client/public/data/results.json
 *   bun src/index.ts eval run build # full pipeline
 *
 * Env (eval command):
 *   OPENROUTER_API_KEY   Required unless DEV_MODE=true or TOP_MODELS is set
 *   TOP_MODELS           Comma-separated fallback model IDs
 *   DEV_MODE             Set to "true" to skip live fetch and use mock models
 *
 * Env (run command):
 *   OPENROUTER_API_KEY   Required for LLM calls
 *   LLM_MODEL            Model to evaluate (default: minimax/minimax-m2.5:free)
 *   RLM_MAX_DEPTH        λ-RLM self-correction depth (default: 3)
 *   TOP_MODELS_FILE      Optional path to top-models.json
 *
 * Env (build command):
 *   TOP_MODELS_FILE      Optional path to top-models.json
 */

import { BunHttpClient, BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Layer } from "effect";
import { build } from "./build/BuildResults";
import { resolveTopModels } from "./eval/EvalRunner";
import {
  loadAllTasks,
  loadRefBitsMap,
  runModelEval,
} from "./eval/ModelEvalRunner";
import { makeOpenRouterLayer } from "./llm/OpenRouterClient";
import type { TopModel } from "./eval/EvalRunner";

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
  yield* Effect.forEach(top, (m) => Effect.log(`  ${m.modelId}  $${m.pricePerMOutput}/1M`), {
    concurrency: 1,
  });
});

const buildCommand = Effect.gen(function* () {
  const topModelsPath = process.env["TOP_MODELS_FILE"] ?? TOP_MODELS_FILE;
  yield* build(topModelsPath);
});

const runCommand = Effect.gen(function* () {
  const topModelsPath = process.env["TOP_MODELS_FILE"] ?? TOP_MODELS_FILE;
  const fs = yield* FileSystem.FileSystem;

  // Load top-models.json
  const topModelsText = yield* fs.readFileString(topModelsPath);
  const topModels = JSON.parse(topModelsText) as ReadonlyArray<TopModel>;

  yield* Effect.log(`[lambench] Running eval for ${topModels.length} model(s)`);

  // Load tasks + reference bits once, share across all models
  // TASKS=cnat_add,cnat_mul — optional comma-separated filter for smoke testing
  const taskFilter = process.env["TASKS"]?.split(",").map((s) => s.trim()).filter(Boolean);
  const allTasks = yield* loadAllTasks;
  const tasks = taskFilter ? allTasks.filter((t) => taskFilter.includes(t.id)) : allTasks;
  yield* Effect.log(`[lambench] Tasks: ${tasks.map((t) => t.id).join(", ")}`);
  const refBitsMap = yield* loadRefBitsMap();

  // Evaluate each model sequentially (rate-limit friendly)
  yield* Effect.forEach(
    topModels,
    (model) => runModelEval(model, tasks, refBitsMap),
    { concurrency: 1 },
  );
});

// ─── Argument parsing ─────────────────────────────────────────────────────────

const parseArgs = (): ReadonlyArray<"eval" | "run" | "build"> => {
  const args = process.argv
    .slice(2)
    .filter((a) => a === "eval" || a === "run" || a === "build") as Array<
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
  yield* Effect.forEach(parseArgs(), runCmd, { concurrency: 1 });
  yield* Effect.log("[lambench] Done.");
});

const appLayer = Layer.mergeAll(
  BunServices.layer,
  BunHttpClient.layer,
  makeOpenRouterLayer(
    process.env["LLM_MODEL"] ?? "minimax/minimax-m2.5:free",
  ).pipe(Layer.provide(BunHttpClient.layer)),
);

BunRuntime.runMain(program.pipe(Effect.provide(appLayer)));
