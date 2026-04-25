/**
 * BuildResults.ts — Reads res/*.txt + tsk/*.tsk + top-models.json,
 * writes apps/client/public/data/results.json (BenchmarkData schema).
 *
 * Replaces reference/lambench/scripts/build-results.ts.
 * Uses Effect FileSystem + Path instead of Node fs/path.
 */

import { Array as Arr, Effect, FileSystem, Option, Path } from "effect";
import type {
  BenchmarkCategory,
  BenchmarkData,
  BenchmarkTask,
  Ranking,
} from "@repo/domain/Benchmark";
import type { TopModel } from "../eval/EvalRunner";

// ─── Paths ───────────────────────────────────────────────────────────────────

const SERVER_ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const REPO_ROOT = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const RES_DIR = `${SERVER_ROOT}/res`;
const TSK_DIR = `${SERVER_ROOT}/tsk`;
const OUT_FILE = `${REPO_ROOT}/apps/client/public/data/results.json`;
const TOP_MODELS_FILE = `${SERVER_ROOT}/top-models.json`;

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskResult = {
  readonly id: string;
  readonly pass: boolean;
  readonly time: number;
  readonly bits?: number | undefined;
  readonly ref?: number | undefined;
};

type RunResult = {
  readonly filename: string;
  readonly timestamp: string;
  readonly model: string;
  readonly right: number;
  readonly total: number;
  readonly tasks: ReadonlyArray<TaskResult>;
  readonly variant: "standard" | "rlm";
  readonly rlmDepth?: number;
  readonly rlmAttempts?: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Parsers ─────────────────────────────────────────────────────────────────

const parseResultFile = (filename: string, text: string): RunResult => {
  const lines = text.split("\n");
  const model = lines.find(l => l.startsWith("model:"))?.slice("model:".length).trim() ?? "unknown";
  const rightMatch = lines.find(l => l.startsWith("right:"))?.match(/right:\s*(\d+)\/(\d+)/);
  const right = rightMatch ? parseInt(rightMatch[1]!) : 0;
  const total = rightMatch ? parseInt(rightMatch[2]!) : 120;

  const variantRaw = lines.find(l => l.startsWith("variant:"))?.slice("variant:".length).trim();
  const variant: "standard" | "rlm" = variantRaw === "rlm" ? "rlm" : "standard";

  const rlmDepthRaw = lines.find(l => l.startsWith("rlm_depth:"))?.slice("rlm_depth:".length).trim();
  const rlmDepth = rlmDepthRaw !== undefined ? parseInt(rlmDepthRaw, 10) : undefined;

  const rlmAttemptsRaw = lines.find(l => l.startsWith("rlm_attempts:"))?.slice("rlm_attempts:".length).trim();
  const rlmAttempts = rlmAttemptsRaw !== undefined ? parseInt(rlmAttemptsRaw, 10) : undefined;

  const tasks: TaskResult[] = lines.flatMap(line => {
    const m = line.match(
      /^- (\w+):\s+\S+\s+(pass|fail)\s+time=([\d.]+)s(?:\s+bits=(\d+))?(?:\s+ref=(\d+))?/,
    );
    if (!m) return [];
    return [{
      id: m[1]!,
      pass: m[2] === "pass",
      time: parseFloat(m[3]!),
      bits: m[4] ? parseInt(m[4]) : undefined,
      ref: m[5] ? parseInt(m[5]) : undefined,
    }];
  });

  const tsMatch = filename.match(/^(\d{4}y\d{2}m\d{2}d\.\d{2}h\d{2}m\d{2}s)/);
  const timestamp = tsMatch ? tsMatch[1]! : filename;

  const result: RunResult = { filename, timestamp, model, right, total, tasks, variant };
  if (rlmDepth !== undefined) Object.assign(result, { rlmDepth });
  if (rlmAttempts !== undefined) Object.assign(result, { rlmAttempts });
  return result;
};

const parseTaskFile = (id: string, text: string): BenchmarkTask => {
  const category = id.split("_")[0] ?? id;
  const sep = text.indexOf("\n---\n");
  const description = sep >= 0 ? text.slice(0, sep).trim() : text.trim();
  const testSection = sep >= 0 ? text.slice(sep + 5).trim() : "";

  const testLines = testSection.split("\n");
  const tests = Array.from({ length: testLines.length }, (_, i) => i).reduce<{
    pairs: Array<{ input: string; expected: string }>;
    skip: boolean;
  }>(
    ({ pairs, skip }, i) => {
      if (skip) return { pairs, skip: false };
      const line = testLines[i]!.trim();
      if (line.startsWith("@main") || line.startsWith("λ")) {
        const next = testLines[i + 1]?.trim();
        if (next?.startsWith("=")) {
          return { pairs: [...pairs, { input: line, expected: next.slice(1).trim() }], skip: true };
        }
      }
      return { pairs, skip: false };
    },
    { pairs: [], skip: false },
  ).pairs;

  return {
    id,
    category,
    categoryName: CATEGORY_NAMES[category] ?? category,
    description,
    testCount: tests.length,
    tests: tests.slice(0, 3),
  };
};

// ─── Loaders ─────────────────────────────────────────────────────────────────

const loadAllResults = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const exists = yield* fs.exists(RES_DIR);
  if (!exists) return [] as ReadonlyArray<RunResult>;
  const files = (yield* fs.readDirectory(RES_DIR)).filter(f => f.endsWith(".txt")).sort();
  return yield* Effect.forEach(files, (f) =>
    fs.readFileString(path.join(RES_DIR, f)).pipe(
      Effect.map(text => parseResultFile(f, text)),
    ),
  );
});

const latestPerModel = (runs: ReadonlyArray<RunResult>): ReadonlyArray<RunResult> =>
  [
    ...runs
      .reduce<Map<string, RunResult>>(
        (map, run) => map.set(run.model, run),
        new Map<string, RunResult>(),
      )
      .values(),
  ]
    .sort((a, b) => b.right - a.right || a.model.localeCompare(b.model));

const loadAllTasks = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = (yield* fs.readDirectory(TSK_DIR)).filter(f => f.endsWith(".tsk")).sort();
  return yield* Effect.forEach(files, (f) =>
    fs.readFileString(path.join(TSK_DIR, f)).pipe(
      Effect.map(text => parseTaskFile(path.basename(f, ".tsk"), text)),
    ),
  );
});

const loadTopModels = (flagPath?: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const candidates = [flagPath, TOP_MODELS_FILE].filter(Boolean) as string[];
    const found = yield* Effect.forEach(candidates, (p) =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(p);
        if (!exists) return Option.none<Map<string, number>>();
        const text = yield* fs.readFileString(p);
        const data = JSON.parse(text) as TopModel[];
        return Option.some(new Map(data.map((m) => [m.modelId, m.pricePerMOutput])));
      }),
    );
    return Option.getOrElse(
      Option.flatten(Arr.findFirst(found, Option.isSome)),
      () => new Map<string, number>(),
    );
  });

/** Load rankings from the existing results.json, if present. Used as fallback when res/ is empty. */
const loadExistingRankings = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists(OUT_FILE);
  if (!exists) return [] as ReadonlyArray<Ranking>;
  const text = yield* fs.readFileString(OUT_FILE);
  const data = JSON.parse(text) as { rankings?: Ranking[] };
  return (data.rankings ?? []) as ReadonlyArray<Ranking>;
});

// ─── Builder ─────────────────────────────────────────────────────────────────

export const build = Effect.fn("build")(function* (topModelsPath?: string) {
  const fs = yield* FileSystem.FileSystem;

  const runs = yield* loadAllResults;
  const latest = latestPerModel(runs);
  const tasks = yield* loadAllTasks;
  const priceMap = yield* loadTopModels(topModelsPath);

  const categories: BenchmarkCategory[] = Object.entries(CATEGORY_NAMES).map(
    ([id, name]) => ({ id, name }),
  );

  // When no res/ data exists, fall back to the existing results.json rankings
  // so a bare `build` command never wipes committed data.
  if (latest.length === 0) {
    const existing = yield* loadExistingRankings;
    if (existing.length > 0) {
      yield* Effect.log(`No res/ data found — preserving ${existing.length} existing rankings`);
      const data: BenchmarkData = { rankings: existing as Ranking[], tasks, categories, generatedAt: new Date().toISOString() };
      yield* fs.makeDirectory(`${REPO_ROOT}/apps/client/public/data`, { recursive: true });
      yield* fs.writeFileString(OUT_FILE, JSON.stringify(data, null, 2));
      yield* Effect.log(`Written ${existing.length} models · ${tasks.length} tasks → ${OUT_FILE}`);
      return;
    }
    yield* Effect.log("No res/ data and no existing results.json — writing empty rankings");
  }

  const rankings: Ranking[] = latest.map(run => {
    const timed = run.tasks.filter(t => t.time > 0);
    const avgTime = timed.length
      ? Arr.reduce(timed, 0, (s, t) => s + t.time) / timed.length
      : 0;
    const price = priceMap.get(run.model) ?? 0;

    return {
      model: run.model,
      right: run.right,
      total: run.total,
      pct: ((run.right / run.total) * 100).toFixed(1),
      avgTime: Number(avgTime.toFixed(1)),
      timestamp: run.timestamp,
      tasks: Object.fromEntries(run.tasks.map(t => [t.id, t.pass])),
      taskBits: Object.fromEntries(
        run.tasks.filter(t => t.pass && t.bits !== undefined).map(t => [t.id, t.bits!]),
      ),
      taskRefs: Object.fromEntries(
        run.tasks.filter(t => t.ref !== undefined).map(t => [t.id, t.ref!]),
      ),
      pricePerMOutputTokens: price,
      ...(run.variant === "rlm" ? { rlm: true } : {}),
      ...(run.rlmDepth !== undefined ? { rlmDepth: run.rlmDepth } : {}),
      ...(run.rlmAttempts !== undefined ? { rlmAttempts: run.rlmAttempts } : {}),
    };
  });

  const data: BenchmarkData = {
    rankings,
    tasks,
    categories,
    generatedAt: new Date().toISOString(),
  };

  yield* fs.makeDirectory(`${REPO_ROOT}/apps/client/public/data`, { recursive: true });
  yield* fs.writeFileString(OUT_FILE, JSON.stringify(data, null, 2));

  yield* Effect.log(`Written ${rankings.length} models · ${tasks.length} tasks → ${OUT_FILE}`);
  yield* Effect.forEach(rankings, r =>
    Effect.log(`  ${r.model}: ${r.right}/${r.total} (${r.pct}%) price=$${r.pricePerMOutputTokens}/1M`),
  );
});
