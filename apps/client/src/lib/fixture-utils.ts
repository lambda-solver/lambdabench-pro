/**
 * fixture-utils.ts — Typed fixture access utility for visual tests.
 *
 * Re-exports all fixture type interfaces and data arrays from `@/fixtures/`
 * and provides typed helper functions for looking up fixture data by component.
 *
 * Usage:
 * ```ts
 * import { getFixturesByType, getAllFixtures } from "@/lib/fixture-utils";
 * import type { ButtonFixture } from "@/lib/fixture-utils";
 *
 * const buttons = getFixturesByType("button");
 * const all = getAllFixtures();
 * ```
 *
 * @module
 */

// ─── Re-export type interfaces ────────────────────────────────────────────────

export type {
	BarChartFixture,
	BenchmarkFixture,
	ButtonFixture,
	VimLineFixture,
} from "@/fixtures/index";

// ─── Re-export fixture data arrays ────────────────────────────────────────────

export { barChartFixtures } from "@/fixtures/barChart";
export { benchmarkFixtures, leaderboardData } from "@/fixtures/benchmark";
export { buttonFixtures } from "@/fixtures/button";
export { createFixtureDecorator } from "@/fixtures/decorator";
export { vimLineFixtures } from "@/fixtures/vimLine";

// ─── Internal imports for lookup helpers ──────────────────────────────────────

import { barChartFixtures } from "@/fixtures/barChart";
import { benchmarkFixtures } from "@/fixtures/benchmark";
import { buttonFixtures } from "@/fixtures/button";
import type {
	BarChartFixture,
	BenchmarkFixture,
	ButtonFixture,
	VimLineFixture,
} from "@/fixtures/index";
import { vimLineFixtures } from "@/fixtures/vimLine";

// ─── Type map ─────────────────────────────────────────────────────────────────

/**
 * Maps each supported component name to its fixture entry type.
 */
export interface FixtureTypeMap {
	readonly button: ButtonFixture;
	readonly barChart: BarChartFixture;
	readonly vimLine: VimLineFixture;
	readonly benchmark: BenchmarkFixture;
}

/**
 * A key that selects a component from {@link FixtureTypeMap}.
 */
export type FixtureTypeKey = keyof FixtureTypeMap;

// ─── All-fixtures record type ─────────────────────────────────────────────────

/**
 * Record of every fixture array, keyed by component name.
 */
export type AllFixtures = {
	readonly [K in FixtureTypeKey]: ReadonlyArray<FixtureTypeMap[K]>;
};

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Retrieve fixture data for a specific component type.
 *
 * @example
 * ```ts
 * const buttons = getFixturesByType("button");
 * // buttons: ReadonlyArray<ButtonFixture>
 * ```
 *
 * @param type - The component type key.
 * @returns The typed fixture array for the requested component.
 */
export function getFixturesByType<T extends FixtureTypeKey>(
	type: T,
): ReadonlyArray<FixtureTypeMap[T]> {
	switch (type) {
		case "button":
			return buttonFixtures as ReadonlyArray<FixtureTypeMap[T]>;
		case "barChart":
			return barChartFixtures as ReadonlyArray<FixtureTypeMap[T]>;
		case "vimLine":
			return vimLineFixtures as ReadonlyArray<FixtureTypeMap[T]>;
		case "benchmark":
			return benchmarkFixtures as ReadonlyArray<FixtureTypeMap[T]>;
		default:
			throw new Error(`Unknown fixture type: ${type}`);
	}
}

/**
 * Retrieve all fixture arrays keyed by component name.
 *
 * @example
 * ```ts
 * const all = getAllFixtures();
 * all.button       // ReadonlyArray<ButtonFixture>
 * all.barChart     // ReadonlyArray<BarChartFixture>
 * all.vimLine      // ReadonlyArray<VimLineFixture>
 * all.benchmark    // ReadonlyArray<BenchmarkFixture>
 * ```
 *
 * @returns A record mapping each component name to its fixture array.
 */
export function getAllFixtures(): AllFixtures {
	return {
		button: buttonFixtures,
		barChart: barChartFixtures,
		vimLine: vimLineFixtures,
		benchmark: benchmarkFixtures,
	};
}
