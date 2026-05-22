/**
 * fixture-utils.test.ts — Tests for the typed fixture access utility.
 */
import { describe, expect, it } from "@effect/vitest";
import type {
	BarChartFixture,
	BenchmarkFixture,
	ButtonFixture,
	VimLineFixture,
} from "./fixture-utils";
import {
	barChartFixtures,
	benchmarkFixtures,
	buttonFixtures,
	createFixtureDecorator,
	getAllFixtures,
	getFixturesByType,
	leaderboardData,
	vimLineFixtures,
} from "./fixture-utils";

// ─── Type re-export availability (compile-time validated) ──────────────────

describe("fixture-utils — type re-exports", () => {
	it("exports BarChartFixture as a type", () => {
		// If the re-export path is wrong, this file would not compile.
		// Assert that the type-annotated variable is accessible at runtime.
		const _check: BarChartFixture = { name: "test", pct: 50 };
		expect(_check.name).toBe("test");
		expect(_check.pct).toBe(50);
	});

	it("exports BenchmarkFixture as a type", () => {
		const _check: BenchmarkFixture = {
			name: "test",
			data: leaderboardData,
		};
		expect(_check.name).toBe("test");
		expect(_check.data.rankings.length).toBe(4);
	});

	it("exports ButtonFixture as a type", () => {
		const _check: ButtonFixture = {
			label: "Go",
			name: "go",
			variant: "default",
		};
		expect(_check.label).toBe("Go");
		expect(_check.variant).toBe("default");
	});

	it("exports VimLineFixture as a type", () => {
		const _check: VimLineFixture = { name: "test", content: "hello" };
		expect(_check.name).toBe("test");
		expect(_check.content).toBe("hello");
	});
});

// ─── Data re-exports ───────────────────────────────────────────────────────

describe("fixture-utils — data re-exports", () => {
	it("re-exports buttonFixtures with correct length and shape", () => {
		expect(buttonFixtures.length).toBe(10);
		expect(buttonFixtures[0]).toEqual({
			label: "Button",
			name: "default",
			variant: "default",
		});
	});

	it("re-exports barChartFixtures with correct length and shape", () => {
		expect(barChartFixtures.length).toBe(8);
		expect(barChartFixtures[0]).toEqual({
			name: "perfect-score",
			pct: 100,
			width: 28,
		});
	});

	it("re-exports vimLineFixtures with correct length and shape", () => {
		expect(vimLineFixtures.length).toBe(5);
		expect(vimLineFixtures[0]).toEqual({
			content: 'import { Effect } from "effect";',
			n: 42,
			name: "with-line-number",
		});
	});

	it("re-exports benchmarkFixtures with correct length and shape", () => {
		expect(benchmarkFixtures.length).toBe(1);
		expect(benchmarkFixtures[0].name).toBe("Default Leaderboard");
		expect(benchmarkFixtures[0].data).toBe(leaderboardData);
	});

	it("re-exports leaderboardData with expected structure", () => {
		expect(leaderboardData.rankings.length).toBe(4);
		expect(leaderboardData.tasks.length).toBe(6);
		expect(leaderboardData.categories.length).toBe(4);
		expect(leaderboardData.categories[0]).toEqual({
			id: "all",
			name: "All",
		});
	});

	it("re-exports createFixtureDecorator as a function", () => {
		expect(typeof createFixtureDecorator).toBe("function");
	});
});

// ─── getFixturesByType ─────────────────────────────────────────────────────

describe("fixture-utils — getFixturesByType", () => {
	it("returns button fixtures for type 'button'", () => {
		const fixtures = getFixturesByType("button");
		expect(fixtures).toBe(buttonFixtures);
		expect(fixtures.length).toBe(10);
		expect(fixtures[0].variant).toBe("default");
		expect(fixtures[0].label).toBe("Button");
	});

	it("returns barChart fixtures for type 'barChart'", () => {
		const fixtures = getFixturesByType("barChart");
		expect(fixtures).toBe(barChartFixtures);
		expect(fixtures.length).toBe(8);
		expect(fixtures[0].pct).toBe(100);
		expect(fixtures[0].name).toBe("perfect-score");
	});

	it("returns vimLine fixtures for type 'vimLine'", () => {
		const fixtures = getFixturesByType("vimLine");
		expect(fixtures).toBe(vimLineFixtures);
		expect(fixtures.length).toBe(5);
		expect(fixtures[0].content).toBe('import { Effect } from "effect";');
	});

	it("returns benchmark fixtures for type 'benchmark'", () => {
		const fixtures = getFixturesByType("benchmark");
		expect(fixtures).toBe(benchmarkFixtures);
		expect(fixtures.length).toBe(1);
		expect(fixtures[0].name).toBe("Default Leaderboard");
	});

	it("throws for unknown fixture type string", () => {
		expect(() =>
			(getFixturesByType as (type: string) => unknown)("nonexistent"),
		).toThrow("Unknown fixture type: nonexistent");
	});

	it("throws for empty string type", () => {
		expect(() =>
			(getFixturesByType as (type: string) => unknown)(""),
		).toThrow("Unknown fixture type: ");
	});

	it("throws for null (cast to string)", () => {
		expect(() =>
			(getFixturesByType as (type: string) => unknown)(null as unknown as string),
		).toThrow("Unknown fixture type: null");
	});

	it("throws for undefined (cast to string)", () => {
		expect(() =>
			(getFixturesByType as (type: string) => unknown)(undefined as unknown as string),
		).toThrow("Unknown fixture type: undefined");
	});
});

// ─── getAllFixtures ────────────────────────────────────────────────────────

describe("fixture-utils — getAllFixtures", () => {
	it("returns all fixture arrays keyed by component name", () => {
		const all = getAllFixtures();
		expect(Object.keys(all)).toEqual(["button", "barChart", "vimLine", "benchmark"]);
	});

	it('returns button fixtures under the "button" key', () => {
		const all = getAllFixtures();
		expect(all.button).toBe(buttonFixtures);
		expect(all.button.length).toBe(10);
	});

	it('returns barChart fixtures under the "barChart" key', () => {
		const all = getAllFixtures();
		expect(all.barChart).toBe(barChartFixtures);
		expect(all.barChart.length).toBe(8);
	});

	it('returns vimLine fixtures under the "vimLine" key', () => {
		const all = getAllFixtures();
		expect(all.vimLine).toBe(vimLineFixtures);
		expect(all.vimLine.length).toBe(5);
	});

	it('returns benchmark fixtures under the "benchmark" key', () => {
		const all = getAllFixtures();
		expect(all.benchmark).toBe(benchmarkFixtures);
		expect(all.benchmark.length).toBe(1);
	});

	it("returns the same reference as direct imports for all keys", () => {
		const all = getAllFixtures();
		expect(all.button).toBe(buttonFixtures);
		expect(all.barChart).toBe(barChartFixtures);
		expect(all.vimLine).toBe(vimLineFixtures);
		expect(all.benchmark).toBe(benchmarkFixtures);
	});
});

// ─── Property-based / Invariant tests ──────────────────────────────────────

describe("fixture-utils — invariants", () => {
	it("getFixturesByType and getAllFixtures return same references for every key", () => {
		const all = getAllFixtures();
		const types = ["button", "barChart", "vimLine", "benchmark"] as const;
		for (const type of types) {
			const byType = getFixturesByType(type);
			const fromAll = all[type];
			expect(byType).toBe(fromAll);
		}
	});

	it("every FixtureTypeKey maps to a non-empty array", () => {
		const all = getAllFixtures();
		for (const key of Object.keys(all) as Array<keyof typeof all>) {
			expect(all[key].length).toBeGreaterThanOrEqual(1);
		}
	});
});

// ─── Data integrity ────────────────────────────────────────────────────────

describe("fixture-utils — data integrity", () => {
	it("every button fixture has required fields with correct types", () => {
		expect(buttonFixtures.length).toBe(10);
		for (const fixture of buttonFixtures) {
			expect(typeof fixture.name).toBe("string");
			expect(typeof fixture.label).toBe("string");
			expect(["default", "outline", "secondary", "ghost", "destructive", "link"]).toContain(fixture.variant);
		}
	});

	it("every barChart fixture has required fields with correct types", () => {
		expect(barChartFixtures.length).toBe(8);
		for (const fixture of barChartFixtures) {
			expect(typeof fixture.name).toBe("string");
			expect(typeof fixture.pct).toBe("number");
			expect(fixture.pct).toBeGreaterThanOrEqual(0);
			expect(fixture.pct).toBeLessThanOrEqual(100);
		}
	});

	it("every vimLine fixture has required fields", () => {
		expect(vimLineFixtures.length).toBe(5);
		for (const fixture of vimLineFixtures) {
			expect(typeof fixture.name).toBe("string");
			expect(typeof fixture.content).toBe("string");
		}
	});

	it("every benchmark fixture has required fields", () => {
		expect(benchmarkFixtures.length).toBe(1);
		for (const fixture of benchmarkFixtures) {
			expect(typeof fixture.name).toBe("string");
			expect(fixture.data.rankings.length).toBe(4);
			expect(fixture.data.tasks.length).toBe(6);
			expect(fixture.data.categories.length).toBe(4);
		}
	});

	it("all leaderboardData rankings have required fields", () => {
		for (const ranking of leaderboardData.rankings) {
			expect(typeof ranking.model).toBe("string");
			expect(typeof ranking.right).toBe("number");
			expect(typeof ranking.total).toBe("number");
			expect(typeof ranking.avgTime).toBe("number");
		}
	});
});
