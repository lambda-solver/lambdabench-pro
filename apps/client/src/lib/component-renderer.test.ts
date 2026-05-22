/**
 * component-renderer.test.ts — Tests for the ComponentRenderer helper.
 *
 * Covers mount with light/dark themes, theme toggling, DOM cleanup, and
 * custom container support.
 */
import { afterEach, describe, expect, it } from "@effect/vitest";
import React from "react";
import { ComponentRenderer } from "./component-renderer";

describe("ComponentRenderer", () => {
	let renderer: ComponentRenderer;

	afterEach(async () => {
		renderer?.cleanup();
	});

	it("mounts a component with default light theme", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(
			React.createElement("span", { "data-testid": "child" }, "Hello"),
		);

		const wrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		) as HTMLElement | null;

		expect(wrapper).not.toBeNull();
		expect(wrapper?.className).toBe("light");
		expect(wrapper?.textContent).toBe("Hello");
	});

	it("mounts a component with dark theme", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null, "Dark Content"), {
			theme: "dark",
		});

		const wrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		) as HTMLElement | null;

		expect(wrapper).not.toBeNull();
		expect(wrapper?.className).toBe("dark");
		expect(wrapper?.textContent).toBe("Dark Content");
	});

	it("toggles theme between light and dark", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("p", null, "Toggle Me"));

		expect(renderer.getTheme()).toBe("light");

		renderer.toggleTheme();
		expect(renderer.getTheme()).toBe("dark");

		const wrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		) as HTMLElement | null;
		expect(wrapper?.className).toBe("dark");

		renderer.toggleTheme();
		expect(renderer.getTheme()).toBe("light");
		expect(wrapper?.className).toBe("light");
	});

	it("toggles theme twice returns to original", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null));

		expect(renderer.getTheme()).toBe("light");
		renderer.toggleTheme();
		expect(renderer.getTheme()).toBe("dark");
		renderer.toggleTheme();
		expect(renderer.getTheme()).toBe("light");
	});

	it("cleanup removes container from DOM", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null, "Remove Me"));

		const wrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		);
		expect(wrapper).not.toBeNull();
		expect(document.body.contains(wrapper)).toBe(true);

		renderer.cleanup();

		expect(
			document.querySelector('[data-testid="component-renderer"]'),
		).toBeNull();
	});

	it("cleanup is idempotent (calling twice does not throw)", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null));
		renderer.cleanup();
		expect(() => renderer.cleanup()).not.toThrow();
	});

	it("supports custom container option", async () => {
		const customContainer = document.createElement("section");
		customContainer.id = "custom-host";
		document.body.append(customContainer);

		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null, "In Custom"), {
			container: customContainer,
		});

		const wrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		);
		expect(wrapper).not.toBeNull();
		expect(customContainer.contains(wrapper)).toBe(true);

		renderer.cleanup();

		// Custom container should remain in the DOM after cleanup
		expect(document.getElementById("custom-host")).not.toBeNull();
		customContainer.remove();
	});

	it("mount replaces previous mount cleanly", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null, "First"));

		const firstWrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		);
		expect(firstWrapper?.textContent).toBe("First");

		await renderer.mount(React.createElement("div", null, "Second"));

		// Only one wrapper should exist
		const wrappers = document.querySelectorAll(
			'[data-testid="component-renderer"]',
		);
		expect(wrappers.length).toBe(1);
		expect(wrappers[0]?.textContent).toBe("Second");
	});

	it("getTheme returns 'light' by default before any mount", async () => {
		renderer = new ComponentRenderer();
		expect(renderer.getTheme()).toBe("light");
	});

	it("getTheme respects theme passed via mount options", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null), { theme: "dark" });
		expect(renderer.getTheme()).toBe("dark");
	});

	it("wrapper has data-testid attribute set correctly", async () => {
		renderer = new ComponentRenderer();
		await renderer.mount(React.createElement("div", null));

		const wrapper = document.querySelector(
			'[data-testid="component-renderer"]',
		);
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute("data-testid")).toBe("component-renderer");
	});
});
