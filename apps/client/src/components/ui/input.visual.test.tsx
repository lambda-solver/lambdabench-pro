/**
 * input.visual.test.tsx — Visual regression tests for Input variants.
 *
 * Renders all Input variants (Default, WithValue, Password, Disabled, WithLabel,
 * File, Email) under vitest browser mode and captures a desktop screenshot.
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
import { Input } from "./input";

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Input visual regression", () => {
	it("renders all variants on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				"div",
				{ className: "flex flex-col gap-3 p-4 w-96" },
				React.createElement(Input, { placeholder: "Enter text..." }),
				React.createElement(Input, { value: "Prefilled text" }),
				React.createElement(Input, {
					type: "password",
					placeholder: "Enter password...",
				}),
				React.createElement(Input, { disabled: true, value: "Disabled input" }),
				React.createElement(
					"div",
					{ className: "flex flex-col gap-1.5 text-xs font-medium" },
					React.createElement(
						"label",
						{ htmlFor: "input-visual-label" },
						"Username",
					),
					React.createElement(Input, {
						id: "input-visual-label",
						placeholder: "Enter username...",
					}),
				),
				React.createElement(Input, { type: "file" }),
				React.createElement(Input, {
					type: "email",
					placeholder: "email@example.com",
				}),
			),
		);
		await takeScreenshot("input-all-variants-desktop");
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
				React.createElement(Input, { placeholder: "Enter text..." }),
				React.createElement(Input, { value: "Prefilled text" }),
				React.createElement(Input, {
					type: "password",
					placeholder: "Enter password...",
				}),
				React.createElement(Input, { disabled: true, value: "Disabled input" }),
				React.createElement(
					"div",
					{ className: "flex flex-col gap-1.5 text-xs font-medium" },
					React.createElement(
						"label",
						{ htmlFor: "input-visual-label-mobile" },
						"Username",
					),
					React.createElement(Input, {
						id: "input-visual-label-mobile",
						placeholder: "Enter username...",
					}),
				),
				React.createElement(Input, { type: "file" }),
				React.createElement(Input, {
					type: "email",
					placeholder: "email@example.com",
				}),
			),
		);

		expect(container).toHaveNoOverflow();
		await page.viewport(1280, 720);
		cleanup();
	});
});
