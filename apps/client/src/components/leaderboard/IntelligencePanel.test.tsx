import type { BenchmarkData } from "@repo/domain/Benchmark";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { IntelligencePanel } from "./IntelligencePanel";

function makeData(rankings: BenchmarkData["rankings"]): BenchmarkData {
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    tasks: [],
    categories: [],
    rankings,
  };
}

const twoModels: BenchmarkData["rankings"] = [
  {
    model: "org/model-b",
    right: 50,
    total: 100,
    pct: "50.0",
    avgTime: 4,
    timestamp: "2026-01-01T00:00:00Z",
    tasks: {},
    taskBits: {},
    taskRefs: {},
    pricePerMOutputTokens: 5,
  },
  {
    model: "org/model-a",
    right: 80,
    total: 100,
    pct: "80.0",
    avgTime: 3,
    timestamp: "2026-01-01T00:00:00Z",
    tasks: {},
    taskBits: {},
    taskRefs: {},
    pricePerMOutputTokens: 10,
  },
];

describe("IntelligencePanel", () => {
  test("renders the panel heading", async () => {
    const { getByText } = await render(<IntelligencePanel data={makeData(twoModels)} />);
    await expect.element(getByText("Intelligence")).toBeVisible();
  });

  test("renders both model names (org/ prefix stripped)", async () => {
    const { getByText } = await render(<IntelligencePanel data={makeData(twoModels)} />);
    await expect.element(getByText(/model-a/)).toBeVisible();
    await expect.element(getByText(/model-b/)).toBeVisible();
  });

  test("shows score strings for each model", async () => {
    const { getByText } = await render(<IntelligencePanel data={makeData(twoModels)} />);
    await expect.element(getByText(/80\/100/)).toBeVisible();
    await expect.element(getByText(/50\/100/)).toBeVisible();
  });

  test("model-a (80 right) appears before model-b (50 right) in DOM", async () => {
    const { container } = await render(<IntelligencePanel data={makeData(twoModels)} />);
    const text = container.textContent ?? "";
    const posA = text.indexOf("model-a");
    const posB = text.indexOf("model-b");
    expect(posA).toBeGreaterThan(-1);
    expect(posB).toBeGreaterThan(-1);
    expect(posA).toBeLessThan(posB); // higher score comes first
  });

  test("renders with empty rankings without crashing", async () => {
    const { container } = await render(<IntelligencePanel data={makeData([])} />);
    expect(container.querySelector("div")).toBeTruthy();
  });
});
