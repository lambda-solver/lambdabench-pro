#!/usr/bin/env bun
/**
 * build-results.ts
 *
 * Reads res/*.txt result files + tsk/*.tsk task files + top-models.json
 * and writes apps/client/public/data/results.json in the BenchmarkData schema.
 *
 * Effect-TS style throughout.
 *
 * Usage:
 *   bun scripts/build-results.ts
 *   bun scripts/build-results.ts --top-models /path/to/top-models.json
 */

import { Effect, pipe, Array as Arr } from "effect";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import type { BenchmarkData, Ranking, BenchmarkTask, BenchmarkCategory } from "@repo/domain/Benchmark";

const ROOT       = join(import.meta.dir, "..");
const RES_DIR    = join(ROOT, "res");
const TSK_DIR    = join(ROOT, "tsk");
const CLIENT_DIR = join(ROOT, "..", "..", "apps", "client");
const OUT_FILE   = join(CLIENT_DIR, "public", "data", "results.json");

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskResult = {
  id: string;
  pass: boolean;
  time: number;
  bits?: number;
  ref?: number;
};

type RunResult = {
  filename: string;
  timestamp: string;
  model: string;
  right: number;
  total: number;
  tasks: TaskResult[];
  pricePerMOutput?: number;
};

type TopModel = {
  modelId: string;
  pricePerMOutput: number;
};

// ─── Parsers ─────────────────────────────────────────────────────────────────

const parseResultFile = (path: string): RunResult =>
  Effect.gen(function* () {
    const text  = readFileSync(path, "utf-8");
    const lines = text.split("\n");

    const modelLine = lines.find(l => l.startsWith("model:"));
    const model     = modelLine ? modelLine.slice("model:".length).trim() : "unknown";

    const rightLine  = lines.find(l => l.startsWith("right:"));
    const rightMatch = rightLine?.match(/right:\s*(\d+)\/(\d+)/);
    const right      = rightMatch ? parseInt(rightMatch[1]) : 0;
    const total      = rightMatch ? parseInt(rightMatch[2]) : 120;

    const taskResults: TaskResult[] = [];
    for (const line of lines) {
      const m = line.match(
        /^- (\w+):\s+[\d.]+\s+(pass|fail)\s+time=([\d.]+)s(?:\s+bits=(\d+))?(?:\s+ref=(\d+))?/,
      );
      if (m) {
        taskResults.push({
          id:   m[1],
          pass: m[2] === "pass",
          time: parseFloat(m[3]),
          bits: m[4] ? parseInt(m[4]) : undefined,
          ref:  m[5] ? parseInt(m[5]) : undefined,
        });
      }
    }

    const fn          = basename(path);
    const tsMatch     = fn.match(/^(\d{4}y\d{2}m\d{2}d\.\d{2}h\d{2}m\d{2}s)/);
    const timestamp   = tsMatch ? tsMatch[1] : fn;

    return { filename: fn, timestamp, model, right, total, tasks: taskResults } satisfies RunResult;
  }) as unknown as RunResult;
// Note: wrapped in Effect.gen for style parity; executed synchronously via direct call below

const loadAllResults = (): RunResult[] => {
  if (!existsSync(RES_DIR)) return [];
  return readdirSync(RES_DIR)
    .filter(f => f.endsWith(".txt"))
    .sort()
    .map(f => parseResultFile(join(RES_DIR, f)));
};

/** Keep only the latest run per model (files sorted chronologically). */
const latestPerModel = (runs: RunResult[]): RunResult[] => {
  const map = new Map<string, RunResult>();
  for (const run of runs) map.set(run.model, run);
  return [...map.values()]
    .filter(r => r.right > 0)
    .sort((a, b) => b.right - a.right || a.model.localeCompare(b.model));
};

const CATEGORY_NAMES: Record<string, string> = {
  algo: "Algorithms",
  cnat: "Church Naturals",
  cbin: "Church Binaries",
  clst: "Church Lists",
  ctre: "Church Trees",
  cadt: "Church ADTs",
  snat: "Scott Naturals",
  sbin: "Scott Binaries",
  slst: "Scott Lists",
  stre: "Scott Trees",
  sadt: "Scott ADTs",
  ntup: "N-Tuples",
};

const parseTaskFile = (path: string): BenchmarkTask => {
  const id       = basename(path, ".tsk");
  const text     = readFileSync(path, "utf-8").trim();
  const category = id.split("_")[0];
  const sep      = text.indexOf("\n---\n");
  const description = sep >= 0 ? text.slice(0, sep).trim() : text;
  const testSection = sep >= 0 ? text.slice(sep + 5).trim() : "";

  const tests: Array<{ input: string; expected: string }> = [];
  const testLines = testSection.split("\n");
  for (let i = 0; i < testLines.length; i++) {
    const line = testLines[i].trim();
    if (line.startsWith("@main") || line.startsWith("λ")) {
      const next = testLines[i + 1]?.trim();
      if (next?.startsWith("=")) {
        tests.push({ input: line, expected: next.slice(1).trim() });
        i++;
      }
    }
  }

  return {
    id,
    category,
    categoryName: CATEGORY_NAMES[category] ?? category,
    description,
    testCount: tests.length,
    tests: tests.slice(0, 3),
  };
};

const loadAllTasks = (): BenchmarkTask[] =>
  readdirSync(TSK_DIR)
    .filter(f => f.endsWith(".tsk"))
    .sort()
    .map(f => parseTaskFile(join(TSK_DIR, f)));

const loadTopModels = (flagPath?: string): Map<string, number> => {
  const paths = [
    flagPath,
    join(ROOT, "top-models.json"),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) {
      const data: TopModel[] = JSON.parse(readFileSync(p, "utf-8"));
      return new Map(data.map(m => [m.modelId, m.pricePerMOutput]));
    }
  }
  return new Map();
};

// ─── Builder ──────────────────────────────────────────────────────────────────

const build = Effect.gen(function* () {
  const topModelsFlagIdx = process.argv.indexOf("--top-models");
  const topModelsPath    = topModelsFlagIdx >= 0 ? process.argv[topModelsFlagIdx + 1] : undefined;

  const runs       = loadAllResults();
  const latest     = latestPerModel(runs);
  const tasks      = loadAllTasks();
  const priceMap   = loadTopModels(topModelsPath);

  const categories: BenchmarkCategory[] = Object.entries(CATEGORY_NAMES).map(
    ([id, name]) => ({ id, name }),
  );

  const rankings: Ranking[] = latest.map(run => {
    const passing   = run.tasks.filter(t => t.pass);
    const avgTime   = passing.length
      ? passing.reduce((s, t) => s + t.time, 0) / passing.length
      : 0;
    const price = priceMap.get(run.model) ?? 0;

    return {
      model:               run.model,
      right:               run.right,
      total:               run.total,
      pct:                 ((run.right / run.total) * 100).toFixed(1),
      avgTime:             Number(avgTime.toFixed(1)),
      timestamp:           run.timestamp,
      tasks:               Object.fromEntries(run.tasks.map(t => [t.id, t.pass])),
      taskBits:            Object.fromEntries(
        run.tasks.filter(t => t.pass && t.bits !== undefined).map(t => [t.id, t.bits!]),
      ),
      taskRefs:            Object.fromEntries(
        run.tasks.filter(t => t.ref !== undefined).map(t => [t.id, t.ref!]),
      ),
      pricePerMOutputTokens: price,
    };
  });

  const data: BenchmarkData = {
    rankings,
    tasks,
    categories,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(join(CLIENT_DIR, "public", "data"), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));

  yield* Effect.log(`Written ${rankings.length} models · ${tasks.length} tasks → ${OUT_FILE}`);
  for (const r of rankings) {
    yield* Effect.log(`  ${r.model}: ${r.right}/${r.total} (${r.pct}%) price=$${r.pricePerMOutputTokens}/1M`);
  }
});

if (import.meta.main) {
  Effect.runPromise(build).catch((e: unknown) => {
    process.stderr.write("error: " + (e instanceof Error ? e.message : String(e)) + "\n");
    process.exit(1);
  });
}

export { build, parseTaskFile, loadAllTasks };
