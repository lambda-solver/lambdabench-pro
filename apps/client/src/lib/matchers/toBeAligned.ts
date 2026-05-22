/**
 * toBeAligned.ts — Custom Vitest matcher for element alignment checking.
 *
 * Provides `toBeAligned()` matcher and `expectToBeAligned()` helper
 * for registering it with `expect.extend()`.
 *
 * @module
 */

import type { MatcherResult, MatcherState } from "vitest";
import { expect } from "vitest";

// ─── Type Declaration ──────────────────────────────────────────────────────────

declare module "vitest" {
	interface Assertion<T = any> {
		/** Assert that two elements have aligned bounding rects (within 1px tolerance). */
		toBeAligned(expected: HTMLElement): void;
	}
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface RectLike {
	readonly top: number;
	readonly left: number;
	readonly right: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Formats a rect-like object into a human-readable string for error messages.
 */
function formatRect(rect: RectLike): string {
	return `{top: ${rect.top}, left: ${rect.left}, right: ${rect.right}, bottom: ${rect.bottom}, width: ${rect.width}, height: ${rect.height}}`;
}

/**
 * The pixel tolerance used for alignment comparison.
 */
const TOLERANCE = 1;

/**
 * Checks whether every numeric property of two rects is within tolerance.
 */
function rectsAreAligned(received: RectLike, expected: RectLike): boolean {
	return (
		Math.abs(received.top - expected.top) <= TOLERANCE &&
		Math.abs(received.left - expected.left) <= TOLERANCE &&
		Math.abs(received.right - expected.right) <= TOLERANCE &&
		Math.abs(received.bottom - expected.bottom) <= TOLERANCE &&
		Math.abs(received.width - expected.width) <= TOLERANCE &&
		Math.abs(received.height - expected.height) <= TOLERANCE
	);
}

// ─── Matcher ───────────────────────────────────────────────────────────────────

/**
 * Checks that two elements have aligned bounding rects (within 1px tolerance).
 *
 * @param received - The DOM element whose rect to check.
 * @param expected - The DOM element to compare against.
 * @returns A Vitest matcher result with pass/fail status and error message.
 */
export function toBeAligned(
	this: MatcherState,
	received: HTMLElement,
	expected: HTMLElement,
): MatcherResult {
	const receivedRect = received.getBoundingClientRect();
	const expectedRect = expected.getBoundingClientRect();

	const pass = rectsAreAligned(receivedRect, expectedRect);

	return {
		pass,
		message: (): string => {
			if (pass) {
				return (
					`Expected elements not to be aligned, but their bounding rects match (tolerance: ${TOLERANCE}px)\n` +
					`  Rect: ${formatRect(receivedRect)}`
				);
			}
			return (
				`Expected elements to be aligned, but their bounding rects differ (tolerance: ${TOLERANCE}px)\n` +
				`  Received: ${formatRect(receivedRect)}\n` +
				`  Expected: ${formatRect(expectedRect)}`
			);
		},
	};
}

// ─── Registration Helper ───────────────────────────────────────────────────────

/**
 * Registers the `toBeAligned` matcher with Vitest's `expect.extend()`.
 *
 * Call this once in a setup file or at the top of a test file before using
 * `expect(elementA).toBeAligned(elementB)`.
 *
 * @example
 * ```ts
 * import { describe, expect, test } from "@effect/vitest";
 * import { expectToBeAligned } from "./toBeAligned";
 *
 * expectToBeAligned();
 *
 * test("elements are aligned", () => {
 *   const elA = document.createElement("div");
 *   const elB = document.createElement("div");
 *   expect(elA).toBeAligned(elB);
 * });
 * ```
 */
export function expectToBeAligned(): void {
	expect.extend({ toBeAligned });
}
