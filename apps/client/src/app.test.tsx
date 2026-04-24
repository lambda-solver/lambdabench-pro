import type { BenchmarkData } from "@repo/domain/Benchmark";
import { AsyncResult } from "effect/unstable/reactivity";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import App from "./app";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockData: BenchmarkData = {
  generatedAt: "2026-01-01T00:00:00Z",
  tasks: [
    {
      id: "bool_not",
      category: "bool",
      categoryName: "Boolean Logic",
      description: "Implement boolean NOT",
      testCount: 2,
      tests: [
        { input: "not(@true)", expected: "@false" },
        { input: "not(@false)", expected: "@true" },
      ],
    },
  ],
  categories: [{ id: "bool", name: "Boolean Logic" }],
  rankings: [
    {
      model: "openai/gpt-4o",
      right: 1,
      total: 1,
      pct: "100.0",
      avgTime: 3.5,
      timestamp: "2026-01-01T00:00:00Z",
      tasks: { bool_not: true },
      taskBits: { bool_not: 12 },
      taskRefs: { bool_not: 14 },
      pricePerMOutputTokens: 10,
    },
  ],
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@effect/atom-react", () => ({
  useAtomValue: vi.fn(() => AsyncResult.success(mockData)),
}));

vi.mock("@/lib/atoms/benchmark-atom", () => ({
  benchmarkAtom: Symbol("benchmarkAtom"),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("App (leaderboard)", () => {
  test("renders without crashing", async () => {
    const { getByText } = await render(<App />);
    // TabLine is always visible
    await expect.element(getByText("intelligence")).toBeVisible();
  });

  test("shows all 6 tabs", async () => {
    const { getByText } = await render(<App />);
    for (const tab of ["intelligence", "speed", "elegance", "value", "problems", "matrix"]) {
      await expect.element(getByText(tab)).toBeVisible();
    }
  });

  test("statusline shows model and task counts", async () => {
    const { getByText } = await render(<App />);
    await expect.element(getByText(/1 models/)).toBeVisible();
    await expect.element(getByText(/1 tasks/)).toBeVisible();
  });

  test("statusline links to github", async () => {
    const { getByRole } = await render(<App />);
    const link = getByRole("link", { name: /lambench/i });
    await expect.element(link).toBeVisible();
  });

  test("shows loading state when AsyncResult is Initial", async () => {
    const { useAtomValue } = await import("@effect/atom-react");
    vi.mocked(useAtomValue).mockReturnValueOnce(AsyncResult.initial());
    const { getByText } = await render(<App />);
    await expect.element(getByText(/Loading benchmark data/)).toBeVisible();
  });
});
