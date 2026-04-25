import type { BenchmarkData } from "@repo/domain/Benchmark";
import { computeValueEntries } from "@/lib/atoms/benchmark-atom";
import { TildeLine, VimLine } from "./VimLine";

interface ValuePanelProps {
  data: BenchmarkData;
}

function fmtModel(m: string): string {
  return m.split("/").slice(1).join("/");
}

/**
 * Value panel: intelligence per dollar.
 * Table: Model | Pass% | Price/1M output tokens | Pass/Dollar
 * Sorted by Pass/Dollar descending.
 */
export function ValuePanel({ data }: ValuePanelProps) {
  const entries = computeValueEntries(data);
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

      {/* Table header — col widths: name=28 pass%=7 price=14 ppd=9 */}
      <VimLine n={n++}>
        <span className="text-[var(--sol-base1)]">
          {"Model                         Pass%   Price/1M out   Pass/$"}
        </span>
      </VimLine>
      <VimLine n={n++}>
        <span className="text-[var(--sol-base1)]">{"─".repeat(62)}</span>
      </VimLine>

      {entries.map((e) => {
        const name = fmtModel(e.model).padEnd(30, " ");
        const passRate = `${e.passRate.toFixed(1)}%`.padStart(5, " ");
        const price =
          e.pricePerMOutput > 0
            ? `$${e.pricePerMOutput.toFixed(2)}`.padStart(13, " ")
            : "          N/A";
        const ppd =
          e.pricePerMOutput > 0
            ? e.passPerDollar.toFixed(3).padStart(8, " ")
            : "       —";

        return (
          <VimLine key={e.model} n={n++}>
            <span className="text-[var(--sol-blue)]">{name}</span>
            <span className="text-[var(--sol-magenta)]">{passRate}</span>
            <span className="text-[var(--sol-cyan)]">{price}</span>
            <span className="text-[var(--sol-green)]">{`   ${ppd}`}</span>
          </VimLine>
        );
      })}

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
