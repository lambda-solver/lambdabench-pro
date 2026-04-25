import type { BenchmarkData } from "@repo/domain/Benchmark";
import { fmtModel } from "@/lib/fmt";
import { computeValueEntries } from "@/lib/atoms/benchmark-atom";
import { TildeLine, VimLine } from "./VimLine";

interface ValuePanelProps {
  data: BenchmarkData;
}

/**
 * Value panel: intelligence per dollar.
 * Table: Model | Pass% | Price/1M output tokens | Pass/Dollar
 * Sorted by Pass/Dollar descending.
 *
 * Uses CSS grid for column alignment so colored spans never misalign.
 * Column widths: name=dynamic, pass%=7ch, price=14ch, ppd=11ch
 */
export function ValuePanel({ data }: ValuePanelProps) {
  const entries = computeValueEntries(data);
  const maxName = Math.max(...entries.map((e) => fmtModel(e.model).length), 5);

  // Grid template: name col is fixed ch, rest are fixed
  const gridTemplateColumns = `${maxName}ch 7ch 14ch 11ch`;
  const gridGap = "2ch";

  let n = 1;

  return (
    <div className="text-[var(--sol-base00)]">
      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="font-bold text-[var(--sol-yellow)]">LamBench</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">
          -- Lambda Calculus Benchmark for AI
        </span>
      </VimLine>
      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="font-bold text-[var(--sol-orange)]">Value</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">
          -- intelligence per dollar (higher = better value)
        </span>
      </VimLine>
      <VimLine n={n++} />

      {/* Header */}
      <VimLine n={n++}>
        <div
          className="grid text-[var(--sol-base1)] border-b border-[var(--sol-base1)]"
          style={{ gridTemplateColumns, columnGap: gridGap }}
        >
          <span>Model</span>
          <span>Pass%</span>
          <span>Price/1M out</span>
          <span>Pass/$</span>
        </div>
      </VimLine>

      {entries.map((e) => (
        <VimLine key={e.model} n={n++}>
          <div className="grid" style={{ gridTemplateColumns, columnGap: gridGap }}>
            <span className="text-[var(--sol-blue)]">{fmtModel(e.model)}</span>
            <span className="text-[var(--sol-magenta)]">
              {`${e.passRate.toFixed(1)}%`}
            </span>
            <span
              className={e.pricePerMOutput > 0 ? "text-[var(--sol-cyan)]" : "text-[var(--sol-base1)]"}
            >
              {e.pricePerMOutput > 0
                ? `$${e.pricePerMOutput.toFixed(2)}`
                : "N/A"}
            </span>
            <span
              className={e.pricePerMOutput > 0 ? "text-[var(--sol-green)]" : "text-[var(--sol-base1)]"}
            >
              {e.pricePerMOutput > 0 ? e.passPerDollar.toFixed(3) : "—"}
            </span>
          </div>
        </VimLine>
      ))}

      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="text-[var(--sol-base1)]">
          {"-- pass/dollar = pass_rate% / price_per_1M_output_tokens"}
        </span>
      </VimLine>
      {Array.from({ length: 8 }).map((_, i) => (
        <TildeLine key={`tilde-${i}`} />
      ))}
    </div>
  );
}
