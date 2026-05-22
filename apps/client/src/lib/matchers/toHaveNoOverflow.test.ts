/**
 * toHaveNoOverflow.test.ts — Tests for the toHaveNoOverflow custom matcher.
 */

import { describe, expect, it } from "@effect/vitest";
import { expectToHaveNoOverflow } from "./toHaveNoOverflow";

// Register the custom matcher before tests
expectToHaveNoOverflow();

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

	it("passes when scrollWidth equals clientWidth", () => {
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

	it("negated matcher passes when element has overflow", () => {
		const el = makeElement(300, 150);
		expect(el).not.toHaveNoOverflow();
	});

	it("negated matcher fails when element has no overflow", () => {
		const el = makeElement(100, 200);
		expect(() => expect(el).not.toHaveNoOverflow()).toThrow();
	});
});
