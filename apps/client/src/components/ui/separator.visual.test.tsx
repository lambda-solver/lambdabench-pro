/**
 * separator.visual.test.tsx — Visual regression tests for Separator variants.
 *
 * Renders all three Separator variants (Default, Vertical, WithText) under
 * vitest browser mode and captures a desktop screenshot. Also verifies no
 * overflow at mobile viewport.
 */
import { beforeAll, describe, expect, it } from "@effect/vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import { expectToHaveNoOverflow } from "@/lib/to-have-no-overflow-matcher";
import {
	renderComponent,
	takeScreenshot,
	viewports,
} from "@/lib/visual-test-utils";
import { Separator } from "./separator";

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Separator visual regression", () => {
	it("renders all variants on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				"div",
				{ className: "space-y-8 p-4" },
				// Default — horizontal separator between two content blocks
				React.createElement(
					"div",
					{ className: "w-48" },
					React.createElement("span", null, "Content above"),
					React.createElement(Separator, null),
					React.createElement("span", null, "Content below"),
				),
				// Vertical — vertical separator in a flex row
				React.createElement(
					"div",
					{ className: "flex h-8 items-center gap-2" },
					React.createElement("span", null, "Left"),
					React.createElement(Separator, { orientation: "vertical" }),
					React.createElement("span", null, "Right"),
				),
				// WithText — horizontal separator between two content sections
				React.createElement(
					"div",
					{ className: "w-48" },
					React.createElement(
						"div",
						{ className: "mb-2 text-sm font-medium" },
						"Section One",
					),
					React.createElement(
						"p",
						{ className: "text-muted-foreground mb-4 text-xs" },
						"This is the content of the first section.",
					),
					React.createElement(Separator, null),
					React.createElement(
						"div",
						{ className: "mt-4 mb-2 text-sm font-medium" },
						"Section Two",
					),
					React.createElement(
						"p",
						{ className: "text-muted-foreground text-xs" },
						"This is the content of the second section.",
					),
				),
			),
		);
		await takeScreenshot("separator-all-variants-desktop");
		cleanup();
	});

	it("has no overflow on mobile with all variants", async () => {
		await page.viewport(viewports.mobile.width, viewports.mobile.height);

		const { cleanup, container } = await renderComponent(
			React.createElement(
				"div",
				{
					className: "space-y-6 p-2",
					style: { maxWidth: `${viewports.mobile.width}px` },
				},
				// Default — horizontal separator between two content blocks
				React.createElement(
					"div",
					{ className: "w-48" },
					React.createElement("span", null, "Content above"),
					React.createElement(Separator, null),
					React.createElement("span", null, "Content below"),
				),
				// Vertical — vertical separator in a flex row
				React.createElement(
					"div",
					{ className: "flex h-8 items-center gap-2" },
					React.createElement("span", null, "Left"),
					React.createElement(Separator, { orientation: "vertical" }),
					React.createElement("span", null, "Right"),
				),
				// WithText — horizontal separator between two content sections
				React.createElement(
					"div",
					{ className: "w-48" },
					React.createElement(
						"div",
						{ className: "mb-2 text-sm font-medium" },
						"Section One",
					),
					React.createElement(
						"p",
						{ className: "text-muted-foreground mb-4 text-xs" },
						"This is the content of the first section.",
					),
					React.createElement(Separator, null),
					React.createElement(
						"div",
						{ className: "mt-4 mb-2 text-sm font-medium" },
						"Section Two",
					),
					React.createElement(
						"p",
						{ className: "text-muted-foreground text-xs" },
						"This is the content of the second section.",
					),
				),
			),
		);

		expect(container).toHaveNoOverflow();
		await page.viewport(1280, 720);
		cleanup();
	});
});
