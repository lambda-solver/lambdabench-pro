import type { BenchmarkData } from "@repo/domain/Benchmark";
import { Array as Arr, Order } from "effect";
import { BarChart } from "./BarChart";
import { TildeLine, VimLine } from "./VimLine";

interface ElegancePanelProps {
  data: BenchmarkData;
}

interface EleganceEntry {
  model: string;
  shorter: number; // mean % shorter than reference (+ = shorter, - = longer)
  passing: number;
  delta: number;
}

function fmtModel(m: string): string {
  return m.split("/").slice(1).join("/");
}

function pad(s: string, n: number): string {
  return s.padEnd(n, " ");
}

function rpad(s: string, n: number): string {
  return s.padStart(n, " ");
}

function fmtShorter(v: number): string {
  return v >= 0 ? `+${v.toFixed(1)}%` : `\u2212${Math.abs(v).toFixed(1)}%`;
}

function computeElegance(data: BenchmarkData): {
  entries: EleganceEntry[];
  mean: number;
} {
  // Collect reference bits per task from all rankings
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
      if (
        r.tasks[t.id] &&
        ref !== undefined &&
        bits !== undefined &&
        bits > 0
      ) {
        sum += 1 - bits / ref;
        passing++;
      }
    }
    return {
      model: r.model,
      shorter: passing ? (sum / passing) * 100 : 0,
      passing,
      delta: 0,
    };
  });

  const scored = entries.filter((e) => e.passing > 0);
  const mean = scored.length
    ? scored.reduce((s, e) => s + e.shorter, 0) / scored.length
    : 0;

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

/**
 * Elegance panel: models ranked by how much shorter their solutions are vs reference.
 * Bar chart axis: –40% (empty) to +30% (full).
 */
export function ElegancePanel({ data }: ElegancePanelProps) {
  const { entries, mean } = computeElegance(data);

  const sorted = Arr.sort(entries, byEleganceDesc);
  const maxName = Math.max(...sorted.map((e) => fmtModel(e.model).length), 10);
  const barLo = -40;
  const barHi = 30;

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
        <span className="font-bold text-[var(--sol-orange)]">Elegance</span>
        {"  "}
        <span className="text-[var(--sol-base1)]">
          -- how much shorter than reference (higher = more elegant)
        </span>
      </VimLine>
      <VimLine n={n++} />

      {sorted.map((e) => {
        const name = fmtModel(e.model);
        const valStr = e.passing
          ? rpad(fmtShorter(e.shorter), 7)
          : rpad("—", 7);
        const barPct = e.passing
          ? Math.max(
              0,
              Math.min(100, ((e.shorter - barLo) * 100) / (barHi - barLo)),
            )
          : 0;
        return (
          <VimLine key={e.model} n={n++}>
            <span className="text-[var(--sol-blue)]">
              {pad(name, maxName + 1)}
            </span>
            <BarChart pct={barPct} />
            {"  "}
            <span className="text-[var(--sol-magenta)]">{valStr}</span>
            {"  "}
            <span className="text-[var(--sol-base1)]">
              ({rpad(String(e.passing), 3)}/{data.tasks.length})
            </span>
          </VimLine>
        );
      })}

      <VimLine n={n++} />
      <VimLine n={n++}>
        <span className="text-[var(--sol-base1)]">{`" mean: `}</span>
        <span className="text-[var(--sol-magenta)]">{fmtShorter(mean)}</span>
        <span className="text-[var(--sol-base1)]">
          {"  shorter than reference"}
        </span>
      </VimLine>

      {Array.from({ length: 8 }).map((_, i) => (
        <TildeLine key={`tilde-${i}`} />
      ))}
    </div>
  );
}
