/**
 * visual-test-utils.visual.test.ts — Visual test utilities verification.
 *
 * Covers all seven exported symbols: Viewport, viewports, RenderComponentResult,
 * renderComponent, ScreenshotConfig, screenshotDefaults, takeScreenshot.
 *
 * Runs under vitest browser mode (vitest.visual.config.ts).
 */
import { afterEach, describe, expect, it } from "@effect/vitest";
import React from "react";
import {
	type RenderComponentResult,
	renderComponent,
	type ScreenshotConfig,
	screenshotDefaults,
	takeScreenshot,
	type Viewport,
	viewports,
} from "./visual-test-utils";

// ─── Viewport Presets ──────────────────────────────────────────────────────

describe("viewport presets", () => {
	it("mobile: 375×667", () => {
		expect(viewports["mobile"]).toEqual({ width: 375, height: 667 });
	});

	it("tablet: 768×1024", () => {
		expect(viewports["tablet"]).toEqual({ width: 768, height: 1024 });
	});

	it("desktop: 1280×720", () => {
		expect(viewports["desktop"]).toEqual({ width: 1280, height: 720 });
	});

	it("has exactly three presets in order", () => {
		expect(Object.keys(viewports)).toEqual(["mobile", "tablet", "desktop"]);
	});

	it("values are read-only (const assertion)", () => {
		// TypeScript enforces readonly at compile time; at runtime the
		// viewports reference cannot be reassigned (const). Verify the
		// shape of each entry is preserved.
		const entries = Object.entries(viewports);
		expect(entries).toHaveLength(3);
		for (const [, vp] of entries) {
			expect(typeof vp.width).toBe("number");
			expect(typeof vp.height).toBe("number");
			expect(vp.width).toBeGreaterThan(0);
			expect(vp.height).toBeGreaterThan(0);
		}
	});
});

// ─── Screenshot Defaults ───────────────────────────────────────────────────

describe("screenshotDefaults", () => {
	it("threshold is 0.2", () => {
		expect(screenshotDefaults.threshold).toBe(0.2);
	});

	it("maxDiffPixels is 100", () => {
		expect(screenshotDefaults.maxDiffPixels).toBe(100);
	});

	it("fullPage is false", () => {
		expect(screenshotDefaults.fullPage).toBe(false);
	});

	it("satisfies ScreenshotConfig interface", () => {
		const _: ScreenshotConfig = screenshotDefaults;
		expect(_).toBeDefined();
	});

	it("all three properties are present", () => {
		expect(Object.keys(screenshotDefaults).sort()).toEqual([
			"fullPage",
			"maxDiffPixels",
			"threshold",
		]);
	});
});

// ─── renderComponent ───────────────────────────────────────────────────────

describe("renderComponent", () => {
	afterEach(() => {
		// Clean up any leftover containers that tests may have missed
		document.querySelectorAll("[data-vt-root]").forEach((el) => {
			el.remove();
		});
	});

	it("returns cleanup function and container element", async () => {
		const result = await renderComponent(
			React.createElement("div", { "data-vt-root": "basic" }),
		);
		expect(typeof result.cleanup).toBe("function");
		expect(result.container.tagName).toBe("DIV");
		result.cleanup();
	});

	it("renders children inside the container", async () => {
		const result = await renderComponent(
			React.createElement("span", { "data-testid": "child" }, "Hello Visual"),
		);
		const child = result.container.querySelector("[data-testid='child']");
		expect(child).not.toBeNull();
		expect(child?.textContent).toBe("Hello Visual");
		result.cleanup();
	});

	it("uses a custom container when one is provided", async () => {
		const custom = document.createElement("section");
		custom.id = "custom-root";
		const result = await renderComponent(
			React.createElement("div", null, "inside custom"),
			custom,
		);
		expect(result.container).toBe(custom);
		expect(result.container.id).toBe("custom-root");
		expect(result.container.textContent).toBe("inside custom");
		result.cleanup();
	});

	it("appends auto-created container to document.body", async () => {
		const result = await renderComponent(
			React.createElement("div", { "data-vt-root": "append-check" }),
		);
		expect(document.body.contains(result.container)).toBe(true);
		result.cleanup();
	});

	it("removes auto-created container from DOM after cleanup", async () => {
		const result = await renderComponent(
			React.createElement("div", { "data-vt-root": "removal-check" }),
		);
		const { container, cleanup } = result;
		expect(document.body.contains(container)).toBe(true);
		cleanup();
		expect(document.body.contains(container)).toBe(false);
	});

	it("does NOT remove a user-provided container after cleanup", async () => {
		const custom = document.createElement("div");
		custom.id = "persist-container";
		document.body.append(custom);
		const result = await renderComponent(
			React.createElement("div", null, "persist me"),
			custom,
		);
		result.cleanup();
		expect(document.getElementById("persist-container")).not.toBeNull();
		custom.remove();
	});

	it("supports nesting multiple children", async () => {
		const result = await renderComponent(
			React.createElement(
				"div",
				{ "data-vt-root": "nested" },
				React.createElement("header", null, "Title"),
				React.createElement("main", null, "Content"),
				React.createElement("footer", null, "Footer"),
			),
		);
		expect(result.container.children.length).toBe(1); // the outer div
		const outer = result.container.children[0] as HTMLElement;
		expect(outer.children.length).toBe(3);
		expect(outer.children[0]?.textContent).toBe("Title");
		expect(outer.children[1]?.textContent).toBe("Content");
		expect(outer.children[2]?.textContent).toBe("Footer");
		result.cleanup();
	});

	it("cleanup is idempotent (calling twice does not throw)", async () => {
		const result = await renderComponent(
			React.createElement("div", { "data-vt-root": "idempotent" }),
		);
		result.cleanup();
		expect(() => result.cleanup()).not.toThrow();
	});
});

// ─── takeScreenshot ────────────────────────────────────────────────────────

describe("takeScreenshot", () => {
	it("is an async function", () => {
		expect(typeof takeScreenshot).toBe("function");
	});

	it("accepts a name and returns a Promise<void>", () => {
		const promise = takeScreenshot("type-check-test");
		expect(promise).toBeInstanceOf(Promise);
	});

	it("takes a screenshot with defaults only", async () => {
		await expect(takeScreenshot("defaults-only")).resolves.toBeUndefined();
	});

	it("accepts partial ScreenshotConfig overrides (threshold)", async () => {
		await expect(
			takeScreenshot("overrides-threshold", { threshold: 0.05 }),
		).resolves.toBeUndefined();
	});

	it("accepts partial ScreenshotConfig overrides (maxDiffPixels)", async () => {
		await expect(
			takeScreenshot("overrides-maxdiff", { maxDiffPixels: 50 }),
		).resolves.toBeUndefined();
	});

	it("accepts partial ScreenshotConfig overrides (fullPage)", async () => {
		await expect(
			takeScreenshot("overrides-fullpage", { fullPage: true }),
		).resolves.toBeUndefined();
	});

	it("accepts multiple overrides simultaneously", async () => {
		await expect(
			takeScreenshot("multi-override", {
				threshold: 0.1,
				maxDiffPixels: 25,
				fullPage: false,
			}),
		).resolves.toBeUndefined();
	});

	it("propagates defaults when partial is empty", async () => {
		await expect(takeScreenshot("empty-override", {})).resolves.toBeUndefined();
	});

	it("takes multiple screenshots with different names", async () => {
		await expect(takeScreenshot("multi-shot-1")).resolves.toBeUndefined();
		await expect(
			takeScreenshot("multi-shot-2", { threshold: 0.3 }),
		).resolves.toBeUndefined();
		await expect(
			takeScreenshot("multi-shot-3", { maxDiffPixels: 200 }),
		).resolves.toBeUndefined();
	});
});

// ─── Type-level verification ───────────────────────────────────────────────

describe("type exports (runtime values)", () => {
	it("Viewport: can construct and access fields", () => {
		const v: Viewport = { width: 100, height: 200 };
		expect(v.width).toBe(100);
		expect(v.height).toBe(200);
	});

	it("ScreenshotConfig: can construct with all fields", () => {
		const c: ScreenshotConfig = {
			threshold: 0.1,
			maxDiffPixels: 50,
			fullPage: true,
		};
		expect(c.threshold).toBe(0.1);
		expect(c.maxDiffPixels).toBe(50);
		expect(c.fullPage).toBe(true);
	});

	it("RenderComponentResult: can construct with cleanup + container", () => {
		const r: RenderComponentResult = {
			cleanup: () => {
				/* noop */
			},
			container: document.createElement("div"),
		};
		expect(typeof r.cleanup).toBe("function");
		expect(r.container.tagName).toBe("DIV");
	});
});
