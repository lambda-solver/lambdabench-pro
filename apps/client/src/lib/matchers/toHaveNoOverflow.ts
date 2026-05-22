/**
 * toHaveNoOverflow.ts — Custom Vitest matcher for element overflow checking.
 *
 * Provides `toHaveNoOverflow()` matcher and `expectToHaveNoOverflow()` helper
 * for registering it with `expect.extend()`.
 *
 * @module
 */

import type { MatcherResult, MatcherState } from "vitest";
import { expect } from "vitest";

// ─── Type Declaration ──────────────────────────────────────────────────────────

declare module "vitest" {
	interface Assertion<T = any> {
		/** Assert that an element has no overflow (scrollWidth <= clientWidth). */
		toHaveNoOverflow(): void;
	}
}

// ─── Matcher ───────────────────────────────────────────────────────────────────

/**
 * Checks that an element has no overflow (scrollWidth <= clientWidth).
 *
 * @param element - The DOM element to check.
 * @returns A Vitest matcher result with pass/fail status and error message.
 */
export function toHaveNoOverflow(
	this: MatcherState,
	element: HTMLElement,
): MatcherResult {
	const pass = element.scrollWidth <= element.clientWidth;

	return {
		pass,
		message: (): string => {
			if (pass) {
				return (
					`Expected element to have overflow, but it has none` +
					` (scrollWidth: ${element.scrollWidth}, clientWidth: ${element.clientWidth})`
				);
			}
			return (
				`Expected element to have no overflow,` +
				` but scrollWidth (${element.scrollWidth}) > clientWidth (${element.clientWidth})`
			);
		},
	};
}

// ─── Registration Helper ───────────────────────────────────────────────────────

/**
 * Registers the `toHaveNoOverflow` matcher with Vitest's `expect.extend()`.
 *
 * Call this once in a setup file or at the top of a test file before using
 * `expect(element).toHaveNoOverflow()`.
 *
 * @example
 * ```ts
 * import { describe, expect, test } from "vitest";
 * import { expectToHaveNoOverflow } from "./toHaveNoOverflow";
 *
 * expectToHaveNoOverflow();
 *
 * test("element has no overflow", () => {
 *   const el = document.createElement("div");
 *   expect(el).toHaveNoOverflow();
 * });
 * ```
 */
export function expectToHaveNoOverflow(): void {
	expect.extend({ toHaveNoOverflow });
}
