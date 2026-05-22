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

const badgeVariants = [
	"default",
	"outline",
	"secondary",
	"ghost",
	"destructive",
	"link",
] as const;

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Badge visual regression", () => {
	it("renders all variants on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				"div",
				{ className: "flex flex-wrap gap-2 p-4" },
				...badgeVariants.map((variant) =>
					React.createElement(
						Badge,
						{ key: variant, variant },
						capitalize(variant),
					),
				),
			),
		);
		await takeScreenshot("badge-all-variants-desktop");
		cleanup();
	});

	it("has no overflow on mobile with all variants", async () => {
		await page.viewport(viewports.mobile.width, viewports.mobile.height);
		let cleanup: (() => void) | undefined;
		try {
			const result = await renderComponent(
				React.createElement(
					"div",
					{
						className: "flex flex-wrap gap-1 p-2",
						style: { maxWidth: `${viewports.mobile.width}px` },
					},
					...badgeVariants.map((variant) =>
						React.createElement(
							Badge,
							{ key: variant, variant },
							capitalize(variant),
						),
					),
				),
			);
			cleanup = result.cleanup;
			expect(result.container).toHaveNoOverflow();
		} finally {
			await page.viewport(viewports.desktop.width, viewports.desktop.height);
			cleanup?.();
		}
	});
});
