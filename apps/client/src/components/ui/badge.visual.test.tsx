/**
 * badge.visual.test.tsx — Visual regression tests for Badge variants.
 *
 * Renders all six Badge variants (Default, Outline, Secondary, Ghost,
 * Destructive, Link) under vitest browser mode and captures a desktop
 * screenshot. Also verifies no overflow at mobile viewport.
 */
import { beforeAll, describe, expect, it } from "@effect/vitest";
import { page } from "@vitest/browser/context";
import React from "react";
import {
	renderComponent,
	takeScreenshot,
	viewports,
} from "@/lib/visual-test-utils";
import { expectToHaveNoOverflow } from "@/lib/to-have-no-overflow-matcher";
import { Badge } from "./badge";

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Badge visual regression", () => {
	it("renders all variants on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				"div",
				{ className: "flex flex-wrap gap-2 p-4" },
				React.createElement(Badge, { variant: "default" }, "Default"),
				React.createElement(Badge, { variant: "outline" }, "Outline"),
				React.createElement(Badge, { variant: "secondary" }, "Secondary"),
				React.createElement(Badge, { variant: "ghost" }, "Ghost"),
				React.createElement(Badge, { variant: "destructive" }, "Destructive"),
				React.createElement(Badge, { variant: "link" }, "Link"),
			),
		);
		await takeScreenshot("badge-all-variants-desktop");
		cleanup();
	});

	it("has no overflow on mobile with all variants", async () => {
		await page.viewport(viewports.mobile.width, viewports.mobile.height);

		const { cleanup, container } = await renderComponent(
			React.createElement(
				"div",
				{
					className: "flex flex-wrap gap-1 p-2",
					style: { maxWidth: `${viewports.mobile.width}px` },
				},
				React.createElement(Badge, { variant: "default" }, "Default"),
				React.createElement(Badge, { variant: "outline" }, "Outline"),
				React.createElement(Badge, { variant: "secondary" }, "Secondary"),
				React.createElement(Badge, { variant: "ghost" }, "Ghost"),
				React.createElement(Badge, { variant: "destructive" }, "Destructive"),
				React.createElement(Badge, { variant: "link" }, "Link"),
			),
		);

		expect(container).toHaveNoOverflow();
		await page.viewport(1280, 720);
		cleanup();
	});
});
