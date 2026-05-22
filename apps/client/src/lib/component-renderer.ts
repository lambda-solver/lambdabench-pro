/**
 * component-renderer.ts — Mounts React components in browser test environment
 * with dark/light theme toggle support.
 *
 * @module
 */

import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options for {@link ComponentRenderer.mount}.
 */
export interface RenderOptions {
	/** Initial theme for the render. Defaults to `"light"`. */
	readonly theme?: "light" | "dark";

	/**
	 * Optional container element to render into. When provided, the wrapper
	 * `<div>` (with `data-testid="component-renderer"`) is appended inside
	 * this element instead of `document.body`.
	 */
	readonly container?: HTMLElement;
}

// ─── Component Renderer ───────────────────────────────────────────────────────

/**
 * Mounts React elements in a browser test environment with theme support.
 *
 * Every call to {@link mount} creates a wrapper `<div>` with
 * `data-testid="component-renderer"` and applies a `"light"` or `"dark"` CSS
 * class for theme-scoped testing.
 *
 * @example
 * ```ts
 * const renderer = new ComponentRenderer();
 * renderer.mount(React.createElement(MyComponent), { theme: "dark" });
 *
 * // Toggle theme at runtime
 * renderer.toggleTheme();
 * console.log(renderer.getTheme()); // "light"
 *
 * // Full cleanup
 * renderer.cleanup();
 * ```
 */
export class ComponentRenderer {
	private root: Root | null = null;
	private wrapper: HTMLElement | null = null;
	private currentTheme: "light" | "dark" = "light";

	/**
	 * Renders a React element into the DOM.
	 *
	 * If a previous render is still mounted, it is automatically cleaned up
	 * before the new render.
	 *
	 * @param element - The React element to render.
	 * @param options - Optional render configuration (theme, container).
	 */
	async mount(element: ReactElement, options?: RenderOptions): Promise<void> {
		// Tear down any previous mount
		this.cleanup();

		const theme = options?.theme ?? "light";
		this.currentTheme = theme;

		const wrapper = document.createElement("div");
		wrapper.dataset.testid = "component-renderer";
		wrapper.className = theme;

		if (options?.container) {
			options.container.append(wrapper);
		} else {
			document.body.append(wrapper);
		}

		this.wrapper = wrapper;
		this.root = createRoot(wrapper);
		this.root.render(element);

		// Flush React 18's async createRoot render before assertions
		await new Promise(resolve => setTimeout(resolve, 0));
	}

	/**
	 * Toggles the current theme between `"light"` and `"dark"`.
	 *
	 * Updates the CSS class on the wrapper element so descendant styles
	 * respond to the theme change.
	 */
	toggleTheme(): void {
		this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
		if (this.wrapper) {
			this.wrapper.className = this.currentTheme;
		}
	}

	/**
	 * Returns the current theme (`"light"` or `"dark"`).
	 */
	getTheme(): "light" | "dark" {
		return this.currentTheme;
	}

	/**
	 * Unmounts the React root and removes the wrapper `<div>` from the DOM.
	 *
	 * Safe to call multiple times — subsequent calls are no-ops once the
	 * renderer has already been cleaned up.
	 */
	cleanup(): void {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		if (this.wrapper?.parentNode) {
			this.wrapper.remove();
		}
		this.wrapper = null;
		this.currentTheme = "light";
	}
}
