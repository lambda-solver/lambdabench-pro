/**
 * to-be-aligned-matcher.test.ts — Unit tests for the `toBeAligned` custom
 * vitest matcher.
 *
 * Uses `@effect/vitest` imports and registers the matcher in a `beforeAll`
 * hook. Runs in vitest Node mode (happy-dom).
 */
import { beforeAll, describe, expect, it } from "@effect/vitest";
import { toBeAligned } from "./to-be-aligned-matcher";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Override `getBoundingClientRect` on an element to return a controlled rect.
 * Defaults all DOMRect fields to `0`, then applies partial overrides.
 */
function stubRect(el: HTMLElement, rect: Partial<DOMRect>): void {
	el.getBoundingClientRect = () => {
		const defaults = {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			toJSON(): Record<string, unknown> {
				return {};
			},
		} satisfies Record<string, unknown>;
		return { ...defaults, ...rect } as unknown as DOMRect;
	};
}

// ─── Suite ─────────────────────────────────────────────────────────────────────

describe("toBeAligned", () => {
	beforeAll(() => {
		expect.extend({ toBeAligned });
	});

	// ── Pass cases ────────────────────────────────────────────────────────────

	it("passes when elements have identical bounding rects", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 100, left: 50, bottom: 200, right: 300 });

		expect(elA).toBeAligned(elB);
	});

	it("passes when elements are offset within the 1px tolerance", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		// Exactly 1 px gap — boundary of tolerance
		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 101, left: 49, bottom: 201, right: 299 });

		expect(elA).toBeAligned(elB);
	});

	it("passes with custom tolerance of 5px when offset is 3px", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 103, left: 50, bottom: 200, right: 300 });

		expect(elA).toBeAligned(elB, 5);
	});

	// ── Fail cases ────────────────────────────────────────────────────────────

	it("fails when elements are offset beyond the 1px tolerance", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 103, left: 50, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(elB);
	});

	it("fails when only one edge is misaligned", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		// Only the left edge is off by 10px
		stubRect(elB, { top: 100, left: 60, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(elB);
	});

	it("fails with custom tolerance of 2px when offset is 3px", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 103, left: 50, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(elB, 2);
	});

	it("fails when all four edges are misaligned", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 110, left: 60, bottom: 210, right: 310 });

		expect(elA).not.toBeAligned(elB);
	});

	// ── Null guards ───────────────────────────────────────────────────────────

	it("fails when received element is null", () => {
		const elB = document.createElement("div");
		stubRect(elB, { top: 100, left: 50, bottom: 200, right: 300 });

		expect(null).not.toBeAligned(elB);
	});

	it("fails when expected element is null", () => {
		const elA = document.createElement("div");
		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(null);
	});

	it("fails when both elements are null", () => {
		expect(null).not.toBeAligned(null);
	});

	// ── Tolerance edge cases ──────────────────────────────────────────────────

	it("passes with tolerance of 0 when elements are pixel-perfect", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 100, left: 50, bottom: 200, right: 300 });

		expect(elA).toBeAligned(elB, 0);
	});

	it("fails with tolerance of 0 when elements differ by any amount", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 100, left: 50.5, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(elB, 0);
	});

	it("passes with tolerance of Infinity regardless of offset", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 5000, left: 9999, bottom: 9999, right: 99999 });

		expect(elA).toBeAligned(elB, Infinity);
	});

	it("fails with negative tolerance even for identical elements", () => {
		// diff >= 0 is always > negative, so all edges always fail
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 100, left: 50, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(elB, -1);
	});

	it("passes with NaN tolerance as NaN comparisons always return false", () => {
		// diff > NaN is always false, so no edge exceeds tolerance
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 9999, left: 9999, bottom: 9999, right: 99999 });

		expect(elA).toBeAligned(elB, NaN);
	});

	it("passes with fractional pixel differences within default tolerance", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 100.4, left: 50.3, bottom: 200.1, right: 300.2 });

		expect(elA).toBeAligned(elB);
	});

	it("fails when fractional pixel difference exceeds default tolerance", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 100, left: 50, bottom: 200, right: 300 });
		stubRect(elB, { top: 101.5, left: 50, bottom: 200, right: 300 });

		expect(elA).not.toBeAligned(elB);
	});

	it("handles zero-sized elements (all rect values at origin)", () => {
		const elA = document.createElement("div");
		const elB = document.createElement("div");

		stubRect(elA, { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });
		stubRect(elB, { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });

		expect(elA).toBeAligned(elB);
	});
});
