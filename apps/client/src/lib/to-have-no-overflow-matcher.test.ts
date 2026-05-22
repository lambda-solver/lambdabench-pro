/**
 * to-have-no-overflow-matcher.test.ts — Tests for the toHaveNoOverflow custom matcher.
 *
 * @module
 */

import { beforeAll, describe, expect, it } from "@effect/vitest";
import type { MatcherState } from "vitest";
import {
	expectToHaveNoOverflow,
	toHaveNoOverflow,
} from "./to-have-no-overflow-matcher";

// Register the custom matcher once before any tests
beforeAll(() => {
	expectToHaveNoOverflow();
});

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeElement(scrollWidth: number, clientWidth: number): HTMLElement {
	return { scrollWidth, clientWidth } as unknown as HTMLElement;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("toHaveNoOverflow", () => {
	it("passes when element has no overflow (scrollWidth < clientWidth)", () => {
		const el = makeElement(100, 200);
		expect(el).toHaveNoOverflow();
	});

	it("passes when scrollWidth equals clientWidth (boundary)", () => {
		const el = makeElement(200, 200);
		expect(el).toHaveNoOverflow();
	});

	it("fails when element has horizontal overflow (scrollWidth > clientWidth)", () => {
		const el = makeElement(300, 150);
		expect(() => expect(el).toHaveNoOverflow()).toThrow();
	});

	it("fails with descriptive message including scrollWidth and clientWidth", () => {
		const el = makeElement(300, 150);
		expect(() => expect(el).toHaveNoOverflow()).toThrow(
			/scrollWidth \(300\) > clientWidth \(150\)/,
		);
	});

	it("fails when element is null", () => {
		expect(() => expect(null).toHaveNoOverflow()).toThrow(
			/Expected an HTML element, but received null/,
		);
	});

	it("negated matcher passes when element has overflow", () => {
		const el = makeElement(300, 150);
		expect(el).not.toHaveNoOverflow();
	});

	it("negated matcher fails when element has no overflow", () => {
		const el = makeElement(100, 200);
		expect(() => expect(el).not.toHaveNoOverflow()).toThrow();
	});

	it("handles zero-width element", () => {
		const el = makeElement(0, 0);
		expect(el).toHaveNoOverflow();
	});

	it("handles negative values (should be treated as no overflow)", () => {
		const el = makeElement(-1, 100);
		expect(el).toHaveNoOverflow();
	});

	it("passes with structurally realistic HTMLElement mock", () => {
		// Simulate a real element by including extra properties that
		// a real HTMLElement would have (e.g. offsetWidth, offsetHeight)
		const el = {
			scrollWidth: 200,
			clientWidth: 400,
			offsetWidth: 400,
			offsetHeight: 100,
			tagName: "DIV",
		} as unknown as HTMLElement;
		expect(el).toHaveNoOverflow();
	});

	it("negated matcher fails with descriptive message when element has no overflow", () => {
		const el = makeElement(100, 200);
		expect(() => expect(el).not.toHaveNoOverflow()).toThrow(
			/Expected element to have overflow, but it has none/,
		);
	});

	it("handles very large values (Number.MAX_SAFE_INTEGER boundary)", () => {
		const el = makeElement(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
		expect(el).toHaveNoOverflow();
	});
});

describe("expectToHaveNoOverflow", () => {
	it("registers the matcher and returns void", () => {
		// Should call expect.extend without throwing
		expect(() => expectToHaveNoOverflow()).not.toThrow();
	});
});

describe("toHaveNoOverflow (raw function)", () => {
	it("returns pass:false for null with descriptive message", () => {
		const matcherState = {} as unknown as MatcherState;
		const result = toHaveNoOverflow.call(matcherState, null);
		expect(result.pass).toBe(false);
		expect(result.message()).toMatch(
			/Expected an HTML element, but received null/,
		);
	});
});
