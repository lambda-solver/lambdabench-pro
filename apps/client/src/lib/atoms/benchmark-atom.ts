import type { BenchmarkData, ValueEntry } from "@repo/domain/Benchmark";
import { BenchmarkData as BenchmarkDataSchema } from "@repo/domain/Benchmark";
import { Array as Arr, Effect, Order, Schema } from "effect";
import { HttpClient } from "effect/unstable/http";
import { runtime } from "../atom";

// ─── Data URL ─────────────────────────────────────────────────────────────────

const resultsUrl = (): string => {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalized = base.endsWith("/") ? base : base + "/";
  return `${normalized}data/results.json`;
};

// ─── Derived: Value entries (pass rate / price per 1M output) ─────────────────

const byPassPerDollarDesc = Order.make<ValueEntry>((a, b) => {
  if (b.passPerDollar > a.passPerDollar) return 1;
  if (b.passPerDollar < a.passPerDollar) return -1;
  return 0;
});

export const computeValueEntries = (data: BenchmarkData): ReadonlyArray<ValueEntry> =>
  Arr.sort(
    data.rankings.map(r => ({
      model: r.model,
      passRate: parseFloat(r.pct),
      pricePerMOutput: r.pricePerMOutputTokens,
      passPerDollar:
        r.pricePerMOutputTokens > 0
          ? parseFloat(r.pct) / r.pricePerMOutputTokens
          : 0,
    })),
    byPassPerDollarDesc,
  );

// ─── Atom ─────────────────────────────────────────────────────────────────────

/**
 * Fetches and decodes the benchmark results JSON.
 * Returns BenchmarkData on success.
 *
 * Usage in components:
 *   const result = useAtomValue(benchmarkAtom)
 *   AsyncResult.match(result, {
 *     onInitial: () => <Loading />,
 *     onFailure: (e) => <Error />,
 *     onSuccess: (data) => <Leaderboard data={data.value} />,
 *   })
 */
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.get(resultsUrl());
    const body = yield* response.json;
    const data = yield* Schema.decodeUnknownEffect(BenchmarkDataSchema)(body);
    return data;
  }),
);
