/**
 * fixture-import.ts — Re-exports all fixture data for use in visual tests.
 *
 * Re-exports every named export from the fixtures directory and provides
 * helper utilities for looking up individual fixture entries by name.
 *
 * @module
 */

// ─── Re-exports ────────────────────────────────────────────────────────────────

export {
  taskClstMap,
  taskClstRev,
  taskCnatAdd,
  taskCnatMul,
  taskSbinAdd,
  taskSnatAdd,
  allTasks,
  rankingGemini,
  rankingClaude,
  rankingGPT,
  rankingClaudeRlm,
  allRankings,
  leaderboardData,
  benchmarkFixtures,
} from "../fixtures/benchmark";

export { barChartFixtures } from "../fixtures/barChart";
export { vimLineFixtures } from "../fixtures/vimLine";
export { buttonFixtures } from "../fixtures/button";
export { createFixtureDecorator } from "../fixtures/decorator";

// ─── Fixture lookup map ────────────────────────────────────────────────────────

import type {
  BarChartFixture,
  BenchmarkFixture,
  ButtonFixture,
  VimLineFixture,
} from "../fixtures/index";
import { barChartFixtures } from "../fixtures/barChart";
import { benchmarkFixtures } from "../fixtures/benchmark";
import { buttonFixtures } from "../fixtures/button";
import { vimLineFixtures } from "../fixtures/vimLine";

type AnyFixture = BarChartFixture | BenchmarkFixture | ButtonFixture | VimLineFixture;

const fixtureMap: Record<string, AnyFixture> = Object.create(null);

for (const f of benchmarkFixtures) {
  fixtureMap[f.name] = f;
}
for (const f of barChartFixtures) {
  fixtureMap[f.name] = f;
}
for (const f of vimLineFixtures) {
  fixtureMap[f.name] = f;
}
for (const f of buttonFixtures) {
  fixtureMap[f.name] = f;
}

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Array of all available fixture names, derived from every named fixture entry
 * across all fixture modules.
 */
export const fixtureNames: ReadonlyArray<string> = Object.freeze(
  Object.keys(fixtureMap),
);

/**
 * Look up a fixture entry by its `name` field.
 *
 * @param name - The fixture name (case-sensitive).
 * @returns The fixture object if found, or `undefined` when no fixture matches.
 */
export function getFixture(name: string): Record<string, unknown> | undefined {
  return fixtureMap[name] as Record<string, unknown> | undefined;
}
