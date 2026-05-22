import { describe, expect, it, beforeAll } from "@effect/vitest";
import React from "react";
import { renderComponent, takeScreenshot } from "@/lib/visual-test-utils";
import { expectToHaveNoOverflow } from "@/lib/to-have-no-overflow-matcher";
import { page } from "@vitest/browser/context";
import { Button } from "./button";

beforeAll(() => {
  expectToHaveNoOverflow();
});

describe("Button visual tests", () => {
  it("renders all variants on desktop", async () => {
    const { cleanup, container } = await renderComponent(
      React.createElement(
        "div",
        { className: "flex flex-wrap gap-2 p-4" },
        React.createElement(Button, { variant: "default" }, "Default"),
        React.createElement(Button, { variant: "outline" }, "Outline"),
        React.createElement(Button, { variant: "secondary" }, "Secondary"),
        React.createElement(Button, { variant: "ghost" }, "Ghost"),
        React.createElement(Button, { variant: "destructive" }, "Destructive"),
        React.createElement(Button, { variant: "link" }, "Link"),
      ),
    );
    await takeScreenshot("button-all-variants-desktop");
    cleanup();
  });

  it("renders all sizes on desktop", async () => {
    const { cleanup, container } = await renderComponent(
      React.createElement(
        "div",
        { className: "flex flex-wrap items-center gap-2 p-4" },
        React.createElement(Button, { size: "xs" }, "Extra Small"),
        React.createElement(Button, { size: "sm" }, "Small"),
        React.createElement(Button, { size: "default" }, "Default"),
        React.createElement(Button, { size: "lg" }, "Large"),
      ),
    );
    await takeScreenshot("button-all-sizes-desktop");
    cleanup();
  });

  it("no overflow at mobile viewport", async () => {
    await page.viewport(375, 667);

    const { cleanup, container } = await renderComponent(
      React.createElement(
        "div",
        { className: "flex flex-wrap gap-2 p-4" },
        React.createElement(Button, { variant: "default" }, "Default"),
        React.createElement(Button, { variant: "outline" }, "Outline"),
        React.createElement(Button, { variant: "secondary" }, "Secondary"),
        React.createElement(Button, { variant: "ghost" }, "Ghost"),
        React.createElement(Button, { variant: "destructive" }, "Destructive"),
        React.createElement(Button, { variant: "link" }, "Link"),
      ),
    );

    expect(container).toHaveNoOverflow();
    cleanup();
  });
});
