import type { BenchmarkData } from "@repo/domain/Benchmark";
import { Array as Arr, Order } from "effect";
import { fmtModel } from "@/lib/fmt";
import { BenchmarkRow } from "./BenchmarkRow";
import { TildeLine, VimLine } from "./VimLine";

interface SpeedPanelProps {
  data: BenchmarkData;
}

export function SpeedPanel({ data }: SpeedPanelProps) {
  const entries = data.rankings
    .filter((r) => r.avgTime > 0)
    .map((r) => ({ model: r.model, tpm: 60 / r.avgTime, avgTime: r.avgTime }));

  const byTPMDesc = Order.make<{ model: string; tpm: number; avgTime: number }>(
    (a, b) => (b.tpm > a.tpm ? 1 : b.tpm < a.tpm ? -1 : 0),
  );
  const sorted = Arr.sort(entries, byTPMDesc);
  const maxTPM = sorted.length > 0 ? (sorted[0]?.tpm ?? 1) : 1;
  const maxName = Math.max(...sorted.map((e) => fmtModel(e.model).length), 10);
  const statWidth = Math.max(...sorted.map((e) => `${e.tpm.toFixed(2)}/min`.length), 8);
  const labelWidth = Math.max(...sorted.map((e) => `(${e.avgTime.toFixed(0)}s avg)`.length), 8);

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
        <span className="font-bold text-[var(--sol-orange)]">Speed</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">-- tasks solved per minute (higher = faster)</span>
      </VimLine>
      <VimLine n={n++} />

      {sorted.map((e) => {
        const pct = (e.tpm / maxTPM) * 100;
        return (
          <VimLine key={e.model} n={n++}>
            <BenchmarkRow
              name={fmtModel(e.model).padEnd(maxName + 1, " ")}
              pct={pct}
              stat={`${e.tpm.toFixed(2)}/min`}
              label={`(${e.avgTime.toFixed(0)}s avg)`}
              statWidth={statWidth}
              labelWidth={labelWidth}
            />
          </VimLine>
        );
      })}

      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="text-[var(--sol-base1)]">
          -- Wall-clock time per passing task (model + interpreter)
        </span>
      </VimLine>
      {Array.from({ length: 8 }).map((_, i) => (
        <TildeLine key={`tilde-${i}`} />
      ))}
    </div>
  );
}
