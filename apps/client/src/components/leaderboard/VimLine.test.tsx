import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { TildeLine, VimLine } from "./VimLine";

describe("VimLine", () => {
  test("renders line number as text", async () => {
    const { getByText } = await render(<VimLine n={42}>content</VimLine>);
    await expect.element(getByText("42")).toBeVisible();
  });

  test("renders children in content column", async () => {
    const { getByText } = await render(<VimLine n={1}>hello world</VimLine>);
    await expect.element(getByText("hello world")).toBeVisible();
  });

  test("renders string line number", async () => {
    const { getByText } = await render(<VimLine n="~">tilde line</VimLine>);
    await expect.element(getByText("~")).toBeVisible();
  });

  test("renders empty line when n is null", async () => {
    const { container } = await render(<VimLine n={null} />);
    const lineNum = container.querySelector("span");
    expect(lineNum?.textContent).toBe("");
  });

  test("renders empty line when no children", async () => {
    const { container } = await render(<VimLine n={5} />);
    expect(container.querySelector("div")).toBeTruthy();
  });

  test("applies extra className", async () => {
    const { container } = await render(
      <VimLine n={1} className="custom-cls">text</VimLine>,
    );
    expect(container.querySelector(".custom-cls")).toBeTruthy();
  });
});

describe("TildeLine", () => {
  test("renders ~ character", async () => {
    const { getByText } = await render(<TildeLine />);
    await expect.element(getByText("~")).toBeVisible();
  });
});
