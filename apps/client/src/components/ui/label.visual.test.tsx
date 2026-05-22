/**
 * label.visual.test.tsx — Visual regression tests for Label variants.
 *
 * Renders all Label variants (Default, WithInput, Disabled) under vitest
 * browser mode and captures a desktop screenshot. Also verifies no overflow
 * at mobile viewport.
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
import { Label } from "./label";
import { Input } from "./input";

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Label visual regression", () => {
	it("renders all variants on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				"div",
				{ className: "flex flex-col gap-3 p-4" },
				React.createElement(Label, { htmlFor: "email" }, "Email"),
				React.createElement(
					"div",
					{ className: "flex flex-col gap-1.5" },
					React.createElement(Label, { htmlFor: "email" }, "Email"),
					React.createElement(Input, {
						id: "email",
						type: "email",
						placeholder: "email@example.com",
					}),
				),
				React.createElement(
					"div",
					{
						className: "group flex flex-col gap-1.5",
						"data-disabled": "true",
					},
					React.createElement(
						Label,
						{ htmlFor: "email-disabled" },
						"Email",
					),
					React.createElement(Input, {
						id: "email-disabled",
						type: "email",
						placeholder: "email@example.com",
						disabled: true,
					}),
				),
			),
		);
		await takeScreenshot("label-all-variants-desktop");
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
				React.createElement(Label, { htmlFor: "email" }, "Email"),
				React.createElement(
					"div",
					{ className: "flex flex-col gap-1.5" },
					React.createElement(Label, { htmlFor: "email" }, "Email"),
					React.createElement(Input, {
						id: "email-mobile",
						type: "email",
						placeholder: "email@example.com",
					}),
				),
				React.createElement(
					"div",
					{
						className: "group flex flex-col gap-1.5",
						"data-disabled": "true",
					},
					React.createElement(
						Label,
						{ htmlFor: "email-disabled-mobile" },
						"Email",
					),
					React.createElement(Input, {
						id: "email-disabled-mobile",
						type: "email",
						placeholder: "email@example.com",
						disabled: true,
					}),
				),
			),
		);

		expect(container).toHaveNoOverflow();
		await page.viewport(1280, 720);
		cleanup();
	});
});
