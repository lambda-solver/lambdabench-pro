/**
 * textarea.visual.test.tsx — Visual regression tests for Textarea variants.
 *
 * Renders all Textarea variants (Default, WithValue, SmallRows, Disabled,
 * WithLabel) under vitest browser mode and captures a desktop screenshot.
 * Also verifies no overflow at mobile viewport.
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
import { Textarea } from "./textarea";

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Textarea visual regression", () => {
	it("renders all variants on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				"div",
				{ className: "flex flex-col gap-3 p-4 w-96" },
				React.createElement(Textarea, {
					placeholder: "Enter your description...",
				}),
				React.createElement(Textarea, {
					value: "Some text content here...",
				}),
				React.createElement(Textarea, {
					rows: 3,
					placeholder: "Short input...",
				}),
				React.createElement(Textarea, {
					disabled: true,
					value: "Disabled content",
				}),
				React.createElement(
					"div",
					{ className: "flex flex-col gap-1.5 text-xs font-medium" },
					React.createElement(
						"label",
						{ htmlFor: "textarea-visual-label" },
						"Description",
					),
					React.createElement(Textarea, {
						id: "textarea-visual-label",
						placeholder: "Enter your description...",
					}),
				),
			),
		);
		await takeScreenshot("textarea-all-variants-desktop");
		cleanup();
	});

	it("has no overflow on mobile with all variants", async () => {
		await page.viewport(viewports.mobile.width, viewports.mobile.height);

		const { cleanup, container } = await renderComponent(
			React.createElement(
				"div",
				{
					className: "flex flex-col gap-3 p-2",
					style: { maxWidth: `${viewports.mobile.width}px` },
				},
				React.createElement(Textarea, {
					placeholder: "Enter your description...",
				}),
				React.createElement(Textarea, {
					value: "Some text content here...",
				}),
				React.createElement(Textarea, {
					rows: 3,
					placeholder: "Short input...",
				}),
				React.createElement(Textarea, {
					disabled: true,
					value: "Disabled content",
				}),
				React.createElement(
					"div",
					{ className: "flex flex-col gap-1.5 text-xs font-medium" },
					React.createElement(
						"label",
						{ htmlFor: "textarea-visual-label-mobile" },
						"Description",
					),
					React.createElement(Textarea, {
						id: "textarea-visual-label-mobile",
						placeholder: "Enter your description...",
					}),
				),
			),
		);

		expect(container).toHaveNoOverflow();
		await page.viewport(1280, 720);
		cleanup();
	});
});
