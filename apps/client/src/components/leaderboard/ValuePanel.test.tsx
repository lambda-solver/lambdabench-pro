import type { BenchmarkData } from "@repo/domain/Benchmark";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { ValuePanel } from "./ValuePanel";

function makeData(overrides: Partial<BenchmarkData["rankings"][number]>[]): BenchmarkData {
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    tasks: [],
    categories: [],
    rankings: overrides.map((o, i) => ({
      model: `org/model-${i}`,
      right: 50,
      total: 100,
      pct: "50.0",
      avgTime: 3,
      timestamp: "2026-01-01T00:00:00Z",
      tasks: {},
      taskBits: {},
      taskRefs: {},
      pricePerMOutputTokens: 1,
      ...o,
    })),
  };
}

describe("ValuePanel", () => {
  test("renders the Value heading", async () => {
    const { getByText } = await render(<ValuePanel data={makeData([{}])} />);
    await expect.element(getByText("Value")).toBeVisible();
  });

  test("renders the table header columns", async () => {
    const { getByText } = await render(<ValuePanel data={makeData([{}])} />);
    await expect.element(getByText(/Pass\$/)).toBeVisible();
  });

  test("shows model name (org/ prefix stripped)", async () => {
    const data = makeData([{ model: "org/gpt-4o", pct: "75.0" }]);
    const { getByText } = await render(<ValuePanel data={data} />);
    await expect.element(getByText(/gpt-4o/)).toBeVisible();
  });

  test("shows pass rate percentage", async () => {
    const data = makeData([{ model: "org/x", pct: "62.5", pricePerMOutputTokens: 2 }]);
    const { getByText } = await render(<ValuePanel data={data} />);
    await expect.element(getByText(/62\.5%/)).toBeVisible();
  });

  test("shows N/A for models with price = 0", async () => {
    const data = makeData([{ model: "org/free", pct: "50.0", pricePerMOutputTokens: 0 }]);
    const { getByText } = await render(<ValuePanel data={data} />);
    await expect.element(getByText(/N\/A/)).toBeVisible();
  });

  test("higher pass/dollar model renders first", async () => {
    const data = makeData([
      { model: "org/pricey", pct: "80.0", pricePerMOutputTokens: 20 }, // 4/dollar
      { model: "org/cheap",  pct: "50.0", pricePerMOutputTokens: 1  }, // 50/dollar
    ]);
    const { container } = await render(<ValuePanel data={data} />);
    const text = container.textContent ?? "";
    const posCheap  = text.indexOf("cheap");
    const posPricey = text.indexOf("pricey");
    expect(posCheap).toBeLessThan(posPricey);
  });

  test("renders with empty rankings without crashing", async () => {
    const { container } = await render(<ValuePanel data={makeData([])} />);
    expect(container.querySelector("div")).toBeTruthy();
  });
});
