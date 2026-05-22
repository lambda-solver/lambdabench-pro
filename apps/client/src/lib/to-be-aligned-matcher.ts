/**
 * to-be-aligned-matcher.ts — Custom Vitest matcher `toBeAligned`.
 *
 * Compares two DOM elements' bounding rectangles with 1px tolerance,
 * providing diagnostic messages on which edge(s) are misaligned.
 *
 * Register in a test file:
 * ```ts
 * import { toBeAligned } from "./to-be-aligned-matcher";
 * expect.extend({ toBeAligned });
 * ```
 *
 * @module
 */

import type { MatcherResult } from "vitest";

// ─── Edge comparison helper ───────────────────────────────────────────────────

interface AlignmentEdge {
	readonly name: string;
	readonly actual: number;
	readonly expected: number;
	readonly diff: number;
}

function compareEdges(rectA: DOMRect, rectB: DOMRect): AlignmentEdge[] {
	return [
		{
			name: "top",
			actual: rectA.top,
			expected: rectB.top,
			diff: Math.abs(rectA.top - rectB.top),
		},
		{
			name: "left",
			actual: rectA.left,
			expected: rectB.left,
			diff: Math.abs(rectA.left - rectB.left),
		},
		{
			name: "bottom",
			actual: rectA.bottom,
			expected: rectB.bottom,
			diff: Math.abs(rectA.bottom - rectB.bottom),
		},
		{
			name: "right",
			actual: rectA.right,
			expected: rectB.right,
			diff: Math.abs(rectA.right - rectB.right),
		},
	];
}

function failMessage(edges: AlignmentEdge[], tolerance: number): () => string {
	return () => {
		const failing = edges.filter((e) => e.diff > tolerance);
		const details = failing
			.map(
				(e) =>
					`  - ${e.name}: received=${e.actual}, expected=${e.expected}, diff=${e.diff.toFixed(1)}px (tolerance=${tolerance}px)`,
			)
			.join("\n");
		return `Expected elements to be aligned within ${tolerance}px on all edges, but ${failing.length} edge(s) exceed the tolerance:\n${details}`;
	};
}

function passMessage(edges: AlignmentEdge[]): () => string {
	return () => {
		const maxDiff = Math.max(...edges.map((e) => e.diff));
		return `Expected elements NOT to be aligned, but all edges are within ${maxDiff.toFixed(1)}px of each other`;
	};
}

// ─── Matcher ───────────────────────────────────────────────────────────────────

/**
 * Asserts that two DOM elements have bounding rectangles that align within
 * the given `tolerance` (default 1 px) on all four edges — top, left,
 * bottom, right.
 *
 * @param received - The actual element under test.
 * @param expected - The reference element to compare against.
 * @param tolerance - Maximum allowed absolute pixel difference (default `1`).
 */
export function toBeAligned(
	received: HTMLElement | null,
	expected: HTMLElement | null,
	tolerance: number = 1,
): MatcherResult {
	// Guard: both elements must be non-null
	if (received === null || expected === null) {
		const which =
			received === null && expected === null
				? "both elements are null"
				: received === null
					? "received element is null"
					: "expected element is null";
		return {
			pass: false,
			message: () => `expected both elements to be non-null, but ${which}`,
		};
	}

	const rectA = received.getBoundingClientRect();
	const rectB = expected.getBoundingClientRect();
	const edges = compareEdges(rectA, rectB);

	const failing = edges.filter((e) => e.diff > tolerance);
	const pass = failing.length === 0;

	return {
		pass,
		message: pass ? passMessage(edges) : failMessage(edges, tolerance),
	};
}

// ─── Type augmentation — adds `toBeAligned` to Vitest's `expect` interface ─────

declare module "vitest" {
	interface Assertion<T> {
		toBeAligned(expected: HTMLElement | null, tolerance?: number): void;
	}
}
