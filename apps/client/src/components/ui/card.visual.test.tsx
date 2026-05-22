/**
 * card.visual.test.tsx — Visual regression tests for Card composition variants.
 *
 * Renders Card sub-components (Card, CardHeader, CardTitle, CardDescription,
 * CardContent, CardFooter) under vitest browser mode and captures desktop
 * screenshots. Also verifies no overflow at mobile viewport.
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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";

beforeAll(() => {
	expectToHaveNoOverflow();
});

describe("Card visual regression", () => {
	it("renders full composition on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				Card,
				{ className: "w-80" },
				React.createElement(
					CardHeader,
					null,
					React.createElement(CardTitle, null, "Card Title"),
					React.createElement(
						CardDescription,
						null,
						"A brief description of the card content.",
					),
				),
				React.createElement(
					CardContent,
					null,
					React.createElement(
						"p",
						null,
						"This is the card content area. You can put any content here.",
					),
				),
				React.createElement(
					CardFooter,
					null,
					React.createElement(
						"span",
						{ className: "text-muted-foreground" },
						"Card footer",
					),
				),
			),
		);
		await takeScreenshot("card-full-composition-desktop");
		cleanup();
	});

	it("renders minimal card on desktop", async () => {
		const { cleanup } = await renderComponent(
			React.createElement(
				Card,
				{ className: "w-80" },
				React.createElement(
					CardContent,
					null,
					React.createElement("p", null, "Minimal card content."),
				),
			),
		);
		await takeScreenshot("card-minimal-desktop");
		cleanup();
	});

	it("renders without overflow at mobile viewport", async () => {
		await page.viewport(viewports.mobile.width, viewports.mobile.height);

		const { cleanup, container } = await renderComponent(
			React.createElement(
				Card,
				{ className: "w-80" },
				React.createElement(
					CardHeader,
					null,
					React.createElement(CardTitle, null, "Card Title"),
					React.createElement(
						CardDescription,
						null,
						"A brief description of the card content.",
					),
				),
				React.createElement(
					CardContent,
					null,
					React.createElement(
						"p",
						null,
						"This is the card content area. You can put any content here.",
					),
				),
				React.createElement(
					CardFooter,
					null,
					React.createElement(
						"span",
						{ className: "text-muted-foreground" },
						"Card footer",
					),
				),
			),
		);

		expect(container).toHaveNoOverflow();
		await page.viewport(1280, 720);
		cleanup();
	});
});
