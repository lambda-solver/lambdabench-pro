import type { BenchmarkData } from "@repo/domain/Benchmark";
import { Array as Arr } from "effect";
import { BarChart } from "./BarChart";
import { TildeLine, VimLine } from "./VimLine";

interface IntelligencePanelProps {
  data: BenchmarkData;
}

function fmtModel(model: string): string {
  return model.split("/").slice(1).join("/");
}

function pad(s: string, n: number): string {
  return s.padEnd(n, " ");
}

function rpad(s: string, n: number): string {
  return s.padStart(n, " ");
}

/**
 * Intelligence panel: models ranked by problems solved (pass rate).
 */
export function IntelligencePanel({ data }: IntelligencePanelProps) {
  const sorted = Arr.sort(
    data.rankings,
    { compare: (a, b) => b.right - a.right },
  );

  const maxNameLen = Math.max(...sorted.map(r => fmtModel(r.model).length), 10);

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
        const name   = fmtModel(r.model);
        const pct    = parseFloat(r.pct);
        const score  = `${r.right}/${r.total}`;
        const pctStr = rpad(`${pct.toFixed(1)}%`, 6);

        return (
          <VimLine key={r.model} n={n++}>
            <span className="text-[var(--sol-blue)]">{pad(name, maxNameLen + 1)}</span>
            <BarChart pct={pct} />
            {"  "}
            <span className="text-[var(--sol-magenta)]">{rpad(score, 7)}</span>
            {"  "}
            <span className="text-[var(--sol-base1)]">{pctStr}</span>
          </VimLine>
        );
      })}

      <VimLine n={n++} />
      {Array.from({ length: 8 }).map((_, i) => <TildeLine key={i} />)}
    </div>
  );
}
