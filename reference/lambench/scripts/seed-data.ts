#!/usr/bin/env bun
/**
 * seed-data.ts
 *
 * Generates a mock results.json for local development.
 * Run: bun reference/lambench/scripts/seed-data.ts
 * from the monorepo root.
 *
 * Effect-TS style throughout.
 */

import { Effect } from "effect";
import { writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import type { BenchmarkData, Ranking, BenchmarkTask, BenchmarkCategory } from "@repo/domain/Benchmark";

const ROOT       = join(import.meta.dir, "..");
const TSK_DIR    = join(ROOT, "tsk");
const CLIENT_DIR = join(ROOT, "..", "..", "apps", "client");
const OUT_FILE   = join(CLIENT_DIR, "public", "data", "results.json");

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

// ─── Mock data helpers ────────────────────────────────────────────────────────

/** Build a mock pass map: model A passes ~70% of tasks, model B passes ~45% */
const mockPassMap = (taskIds: string[], passRate: number): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  taskIds.forEach((id, i) => {
    result[id] = (i % 100) < passRate * 100;
  });
  return result;
};

const mockBitsMap = (passMap: Record<string, boolean>, baseBits: number): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const [id, pass] of Object.entries(passMap)) {
    if (pass) result[id] = baseBits + Math.floor(Math.random() * 200);
  }
  return result;
};

const mockRefsMap = (passMap: Record<string, boolean>, refBits: number): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const id of Object.keys(passMap)) {
    result[id] = refBits;
  }
  return result;
};

// ─── Load real task list from tsk/ ───────────────────────────────────────────

const loadTaskIds = (): string[] =>
  readdirSync(TSK_DIR)
    .filter(f => f.endsWith(".tsk"))
    .sort()
    .map(f => f.replace(".tsk", ""));

// ─── Seeder ───────────────────────────────────────────────────────────────────

const seed = Effect.gen(function* () {
  const taskIds = loadTaskIds();

  const tasks: BenchmarkTask[] = taskIds.map(id => ({
    id,
    category: id.split("_")[0],
    categoryName: CATEGORY_NAMES[id.split("_")[0]] ?? id.split("_")[0],
    description: `Mock description for ${id}. This is seed data for local development.`,
    testCount: 10,
    tests: [
      { input: `@main(λf.λx.x, λf.λx.x)`, expected: `λa.λb.b` },
      { input: `@main(λf.λx.f(x), λf.λx.x)`, expected: `λa.λb.a(b)` },
    ],
  }));

  const categories: BenchmarkCategory[] = Object.entries(CATEGORY_NAMES).map(
    ([id, name]) => ({ id, name }),
  );

  // Model A: top model (high pass rate, moderate price)
  const passMapA  = mockPassMap(taskIds, 0.842);
  const rightA    = Object.values(passMapA).filter(Boolean).length;
  const bitsA     = mockBitsMap(passMapA, 400);
  const refsA     = mockRefsMap(passMapA, 420);
  const rankingA: Ranking = {
    model:                "openrouter/google/gemini-2.5-pro",
    right:                rightA,
    total:                taskIds.length,
    pct:                  ((rightA / taskIds.length) * 100).toFixed(1),
    avgTime:              12.5,
    timestamp:            "2026y04m21d.10h00m00s",
    tasks:                passMapA,
    taskBits:             bitsA,
    taskRefs:             refsA,
    pricePerMOutputTokens: 10.0,
  };

  // Model B: second model (lower pass rate, cheaper)
  const passMapB  = mockPassMap(taskIds, 0.467);
  const rightB    = Object.values(passMapB).filter(Boolean).length;
  const bitsB     = mockBitsMap(passMapB, 500);
  const refsB     = mockRefsMap(passMapB, 420);
  const rankingB: Ranking = {
    model:                "openrouter/anthropic/claude-opus-4",
    right:                rightB,
    total:                taskIds.length,
    pct:                  ((rightB / taskIds.length) * 100).toFixed(1),
    avgTime:              18.3,
    timestamp:            "2026y04m21d.10h00m00s",
    tasks:                passMapB,
    taskBits:             bitsB,
    taskRefs:             refsB,
    pricePerMOutputTokens: 15.0,
  };

  const data: BenchmarkData = {
    rankings: [rankingA, rankingB],
    tasks,
    categories,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(join(CLIENT_DIR, "public", "data"), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));

  yield* Effect.log(`Seed data written to ${OUT_FILE}`);
  yield* Effect.log(`  Model A: ${rightA}/${taskIds.length} tasks passed`);
  yield* Effect.log(`  Model B: ${rightB}/${taskIds.length} tasks passed`);
});

if (import.meta.main) {
  Effect.runPromise(seed).catch((e: unknown) => {
    process.stderr.write("error: " + (e instanceof Error ? e.message : String(e)) + "\n");
    process.exit(1);
  });
}

export { seed };
