/**
 * toBeAligned.test.ts — Tests for the toBeAligned custom matcher.
 */

import { describe, expect, it } from "@effect/vitest";
import { expectToBeAligned } from "./toBeAligned";

// Register the custom matcher before tests
expectToBeAligned();

// ─── Fixtures ──────────────────────────────────────────────────────────────────

interface RectInit {
	readonly top?: number;
	readonly left?: number;
	readonly right?: number;
	readonly bottom?: number;
	readonly width?: number;
	readonly height?: number;
}

function makeElement(rect: RectInit): HTMLElement {
	const defaultRect = {
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
	};
	return {
		getBoundingClientRect: () =>
			({ ...defaultRect, ...rect, toJSON() {} }) as DOMRect,
	} as unknown as HTMLElement;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("toBeAligned", () => {
	it("passes when elements have identical bounding rects", () => {
		const elA = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		const elB = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		expect(elA).toBeAligned(elB);
	});

	it("passes when bounding rects differ within 1px tolerance", () => {
		const elA = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		const elB = makeElement({
			top: 10.5,
			left: 20.3,
			right: 200.7,
			bottom: 100.2,
			width: 180.4,
			height: 89.7,
		});
		expect(elA).toBeAligned(elB);
	});

	it("fails when bounding rects differ beyond 1px tolerance", () => {
		const elA = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		const elB = makeElement({
			top: 12,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		expect(() => expect(elA).toBeAligned(elB)).toThrow();
	});

	it("fails with descriptive message including actual and expected rect values", () => {
		const elA = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		const elB = makeElement({
			top: 10,
			left: 30,
			right: 210,
			bottom: 100,
			width: 180,
			height: 90,
		});
		expect(() => expect(elA).toBeAligned(elB)).toThrow(
			/Expected elements to be aligned[\s\S]*Received:.*left: 20[\s\S]*Expected:.*left: 30/,
		);
	});

	it("negated matcher passes when elements are not aligned", () => {
		const elA = makeElement({
			top: 0,
			left: 0,
			right: 100,
			bottom: 100,
			width: 100,
			height: 100,
		});
		const elB = makeElement({
			top: 10,
			left: 10,
			right: 110,
			bottom: 110,
			width: 100,
			height: 100,
		});
		expect(elA).not.toBeAligned(elB);
	});

	it("negated matcher fails when elements are aligned", () => {
		const elA = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		const elB = makeElement({
			top: 10,
			left: 20,
			right: 200,
			bottom: 100,
			width: 180,
			height: 90,
		});
		expect(() => expect(elA).not.toBeAligned(elB)).toThrow();
	});
});
