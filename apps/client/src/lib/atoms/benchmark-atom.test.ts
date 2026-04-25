import type { BenchmarkData, Ranking } from "@repo/domain/Benchmark";
import { describe, expect, test } from "vitest";
import { computeValueEntries } from "./benchmark-atom";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRanking(overrides: Partial<Ranking> & { model: string }): Ranking {
  return {
    right: 1,
    total: 10,
    pct: "10.0",
    avgTime: 5,
    timestamp: "2026-01-01T00:00:00Z",
    tasks: {},
    taskBits: {},
    taskRefs: {},
    pricePerMOutputTokens: 1,
    ...overrides,
  };
}

function makeData(rankings: Ranking[]): BenchmarkData {
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    tasks: [],
    categories: [],
    rankings,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("computeValueEntries", () => {
  test("sorts by passPerDollar descending", () => {
    const data = makeData([
      makeRanking({
        model: "org/cheap",
        pct: "50.0",
        pricePerMOutputTokens: 1,
      }), // 50/$
      makeRanking({
        model: "org/pricey",
        pct: "80.0",
        pricePerMOutputTokens: 10,
      }), // 8/$
      makeRanking({ model: "org/mid", pct: "60.0", pricePerMOutputTokens: 2 }), // 30/$
    ]);
    const entries = computeValueEntries(data);
    expect(entries[0]?.model).toBe("org/cheap");
    expect(entries[1]?.model).toBe("org/mid");
    expect(entries[2]?.model).toBe("org/pricey");
  });

  test("sets passPerDollar to 0 when price is 0", () => {
    const data = makeData([
      makeRanking({
        model: "org/free",
        pct: "100.0",
        pricePerMOutputTokens: 0,
      }),
    ]);
    const entries = computeValueEntries(data);
    expect(entries[0]?.passPerDollar).toBe(0);
  });

  test("computes passPerDollar correctly", () => {
    const data = makeData([
      makeRanking({ model: "org/a", pct: "50.0", pricePerMOutputTokens: 5 }),
    ]);
    const entries = computeValueEntries(data);
    // passRate = 50.0, price = 5, ratio = 10.0
    expect(entries[0]?.passPerDollar).toBeCloseTo(10, 5);
  });

  test("returns empty array for no rankings", () => {
    expect(computeValueEntries(makeData([]))).toHaveLength(0);
  });

  test("maps model names through", () => {
    const data = makeData([makeRanking({ model: "openai/gpt-4o" })]);
    expect(computeValueEntries(data)[0]?.model).toBe("openai/gpt-4o");
  });

  test("passRate is parsed from pct string", () => {
    const data = makeData([
      makeRanking({ model: "org/x", pct: "72.5", pricePerMOutputTokens: 1 }),
    ]);
    expect(computeValueEntries(data)[0]?.passRate).toBeCloseTo(72.5, 5);
  });
});
