/**
 * visual-test-utils.ts — Utilities for Vitest browser-mode visual regression testing.
 *
 * Provides a React component renderer, viewport presets, and screenshot configuration
 * for use in `*.visual.test.ts` files.
 *
 * @module
 */

import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { expect } from "vitest";

// ─── Viewport Presets ──────────────────────────────────────────────────────────

/**
 * A width/height pair describing a viewport size.
 */
export interface Viewport {
	readonly width: number;
	readonly height: number;
}

/**
 * Named viewport presets for visual regression testing.
 *
 * | Key       | Dimensions | Device        |
 * |-----------|-----------|---------------|
 * | `mobile`  | 375×667   | iPhone SE     |
 * | `tablet`  | 768×1024  | iPad (portrait) |
 * | `desktop` | 1280×720  | HD-ready      |
 */
export const viewports: Record<string, Viewport> = {
	mobile: { width: 375, height: 667 },
	tablet: { width: 768, height: 1024 },
	desktop: { width: 1280, height: 720 },
} as const;

// ─── Component Rendering ───────────────────────────────────────────────────────

/**
 * Returned by {@link renderComponent} — exposes the container and a cleanup
 * function to tear down the rendered tree.
 */
export interface RenderComponentResult {
	/** Unmounts the React root and removes the container from the DOM. */
	readonly cleanup: () => void;
	/** The DOM element the component was rendered into. */
	readonly container: HTMLElement;
}

/**
 * Renders a React element into the DOM for visual testing.
 *
 * Creates a container element (or uses an optional user-supplied one), mounts
 * the component with `ReactDOM.createRoot`, then waits a single animation frame
 * so the browser can flush the initial paint before the caller proceeds.
 *
 * @param element   - The React element to render.
 * @param container - Optional existing element to render into. When omitted,
 *                    a new `<div>` is created and appended to `document.body`.
 * @returns A Promise resolving to a {@link RenderComponentResult} with
 *          `cleanup()` and `container`.
 */
export async function renderComponent(
	element: ReactElement,
	container?: HTMLElement,
): Promise<RenderComponentResult> {
	const rootContainer = container ?? document.createElement("div");

	if (!container) {
		document.body.append(rootContainer);
	}

	const root: Root = createRoot(rootContainer);
	root.render(element);

	// Yield to the browser so the render is painted before any screenshot.
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

	return {
		cleanup: () => {
			root.unmount();
			if (!container && rootContainer.parentNode) {
				rootContainer.remove();
			}
		},
		container: rootContainer,
	};
}

// ─── Screenshot Configuration ──────────────────────────────────────────────────

/**
 * Options that control how ``toMatchScreenshot`` compares the current render
 * against the stored reference image.
 *
 * These map to Vitest / pixelmatch comparator options:
 * - `threshold` → `comparatorOptions.threshold`
 * - `maxDiffPixels` → `comparatorOptions.allowedMismatchedPixels`
 * - `fullPage` → Playwright `page.screenshot({ fullPage })` (passed via
 *   `screenshotOptions`).
 */
export interface ScreenshotConfig {
	/**
	 * Acceptable perceived colour difference between the same pixel in the
	 * captured and reference images. Ranges from `0` (strict) to `1` (very
	 * lenient).  Default `0.2` (20 %).
	 */
	threshold: number;

	/**
	 * Maximum number of pixels that may differ before the comparison fails.
	 * Default `100`.
	 */
	maxDiffPixels: number;

	/**
	 * When `true` the screenshot captures the full scrollable page; when
	 * `false` it is clipped to the viewport.  Default `false`.
	 */
	fullPage: boolean;
}

/**
 * Reasonable default screenshot options for component-level visual regression.
 *
 * - `threshold` — `0.2` (20 % per-pixel tolerance)
 * - `maxDiffPixels` — `100`
 * - `fullPage` — `false` (viewport-only)
 */
export const screenshotDefaults: ScreenshotConfig = {
	threshold: 0.2,
	maxDiffPixels: 100,
	fullPage: false,
};

/**
 * Takes a named screenshot of the current test page and compares it against
 * the stored reference image.
 *
 * The function merges the caller-supplied overrides with
 * {@link screenshotDefaults} before passing them to the Vitest browser-mode
 * `expect(page).toMatchScreenshot()` assertion.
 *
 * **Usage** (inside a `*.visual.test.ts` file):
 *
 * ```ts
 * import { takeScreenshot, viewports } from "@/lib/visual-test-utils";
 *
 * it("renders correctly on desktop", async () => {
 *   await takeScreenshot("my-component-desktop");
 * });
 *
 * it("renders correctly with custom threshold", async () => {
 *   await takeScreenshot("my-component-strict", { threshold: 0.05 });
 * });
 * ```
 *
 * @param name    - A human-readable label for the screenshot, used as the
 *                  reference file name (e.g. `"button-primary"`).
 * @param options - Optional partial overrides for threshold, maxDiffPixels,
 *                  or fullPage.
 */
export async function takeScreenshot(
	name: string,
	options?: Partial<ScreenshotConfig>,
): Promise<void> {
	const { threshold, maxDiffPixels, fullPage } = {
		...screenshotDefaults,
		...options,
	} satisfies ScreenshotConfig;

	await expect(document.body).toMatchScreenshot(name, {
		comparatorOptions: {
			threshold,
			allowedMismatchedPixels: maxDiffPixels,
		},
		screenshotOptions: {
			fullPage,
		},
	});
}
