import type { BenchmarkData } from "@repo/domain/Benchmark";
import { Array as Arr, Order } from "effect";
import { fmtModel } from "@/lib/fmt";
import { BenchmarkRow } from "./BenchmarkRow";
import { TildeLine, VimLine } from "./VimLine";

interface ElegancePanelProps {
  data: BenchmarkData;
}

interface EleganceEntry {
  model: string;
  shorter: number;
  passing: number;
  delta: number;
}

function fmtShorter(v: number): string {
  return v >= 0 ? `+${v.toFixed(1)}%` : `\u2212${Math.abs(v).toFixed(1)}%`;
}

function computeElegance(data: BenchmarkData): { entries: EleganceEntry[]; mean: number } {
  const refs: Record<string, number> = {};
  for (const r of data.rankings) {
    for (const [tid, bits] of Object.entries(r.taskRefs)) {
      if (refs[tid] === undefined) refs[tid] = bits;
    }
  }

  const entries: EleganceEntry[] = data.rankings.map((r) => {
    let sum = 0;
    let passing = 0;
    for (const t of data.tasks) {
      const ref = refs[t.id];
      const bits = r.taskBits[t.id];
      if (r.tasks[t.id] && ref !== undefined && bits !== undefined && bits > 0) {
        sum += 1 - bits / ref;
        passing++;
      }
    }
    return { model: r.model, shorter: passing ? (sum / passing) * 100 : 0, passing, delta: 0 };
  });

  const scored = entries.filter((e) => e.passing > 0);
  const mean = scored.length ? scored.reduce((s, e) => s + e.shorter, 0) / scored.length : 0;
  for (const e of entries) {
    e.delta = e.passing > 0 ? e.shorter - mean : 0;
  }
  return { entries, mean };
}

const byEleganceDesc = Order.make<EleganceEntry>((a, b) => {
  if (a.passing === 0 && b.passing === 0) return 0;
  if (a.passing === 0) return 1;
  if (b.passing === 0) return -1;
  return b.shorter > a.shorter ? 1 : b.shorter < a.shorter ? -1 : 0;
});

export function ElegancePanel({ data }: ElegancePanelProps) {
  const { entries, mean } = computeElegance(data);
  const sorted = Arr.sort(entries, byEleganceDesc);
  const maxName = Math.max(...sorted.map((e) => fmtModel(e.model).length), 10);
  const statWidth = Math.max(...sorted.map((e) => (e.passing ? fmtShorter(e.shorter).length : 1)), 4);
  const labelWidth = Math.max(...sorted.map((e) => `(${e.passing}/${data.tasks.length})`.length), 6);
  const barLo = -40;
  const barHi = 30;

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
        <span className="font-bold text-[var(--sol-orange)]">Elegance</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">
          -- how much shorter than reference (higher = more elegant)
        </span>
      </VimLine>
      <VimLine n={n++} />

      {sorted.map((e) => {
        const barPct = e.passing
          ? Math.max(0, Math.min(100, ((e.shorter - barLo) * 100) / (barHi - barLo)))
          : 0;
        return (
          <VimLine key={e.model} n={n++}>
            <BenchmarkRow
              name={fmtModel(e.model).padEnd(maxName + 1, " ")}
              pct={barPct}
              stat={e.passing ? fmtShorter(e.shorter) : "—"}
              label={`(${e.passing}/${data.tasks.length})`}
              statWidth={statWidth}
              labelWidth={labelWidth}
            />
          </VimLine>
        );
      })}

      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="text-[var(--sol-base1)]">{"-- mean: "}</span>
        <span className="text-[var(--sol-magenta)]">{fmtShorter(mean)}</span>
        <span className="text-[var(--sol-base1)]">{"  shorter than reference"}</span>
      </VimLine>
      {Array.from({ length: 8 }).map((_, i) => (
        <TildeLine key={`tilde-${i}`} />
      ))}
    </div>
  );
}
