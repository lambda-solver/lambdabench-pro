import type { BenchmarkData, Ranking } from "@repo/domain/Benchmark";
import { Array as Arr, Order } from "effect";
import { fmtModel } from "@/lib/fmt";
import { BenchmarkRow } from "./BenchmarkRow";
import { TildeLine, VimLine } from "./VimLine";

interface IntelligencePanelProps {
  data: BenchmarkData;
}

export function IntelligencePanel({ data }: IntelligencePanelProps) {
  const byRightDesc = Order.make<Ranking>((a, b) =>
    b.right > a.right ? 1 : b.right < a.right ? -1 : 0,
  );
  const sorted = Arr.sort(data.rankings, byRightDesc);
  const maxNameLen = Math.max(...sorted.map((r) => fmtModel(r.model).length), 10);
  const statWidth = Math.max(...sorted.map((r) => `${r.right}/${r.total}`.length), 5);
  const labelWidth = Math.max(...sorted.map((r) => `${parseFloat(r.pct).toFixed(1)}%`.length), 6);

  let n = 1;

  return (
    <div className="text-[var(--sol-base00)]">
      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="font-bold text-[var(--sol-yellow)]">LamBench</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">-- Lambda Calculus Benchmark for AI</span>
      </VimLine>
      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="font-bold text-[var(--sol-orange)]">Intelligence</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">-- by problems solved</span>
      </VimLine>
      <VimLine n={n++} />

      {sorted.map((r) => {
        const pct = parseFloat(r.pct);
        return (
          <VimLine key={r.model} n={n++}>
            <BenchmarkRow
              name={fmtModel(r.model).padEnd(maxNameLen + 1, " ")}
              pct={pct}
              stat={`${r.right}/${r.total}`}
              label={`${pct.toFixed(1)}%`}
              statWidth={statWidth}
              labelWidth={labelWidth}
            />
          </VimLine>
        );
      })}

      <VimLine n={n++} />
      {Array.from({ length: 8 }).map((_, i) => (
        <TildeLine key={`tilde-${i}`} />
      ))}
    </div>
  );
}
