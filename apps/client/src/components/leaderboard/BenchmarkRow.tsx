import { BarChart } from "./BarChart";

interface BenchmarkRowProps {
  /** Model name, already padEnd to maxName */
  name: string;
  /** Bar fill 0–100 */
  pct: number;
  /** Primary stat (e.g. "1/1", "3.64/min") */
  stat: string;
  /** Secondary label (dimmed, e.g. "100.0%", "(17s avg)") */
  label: string;
  /** Fixed width for stat column in ch — pass max stat width across all rows */
  statWidth: number;
  /** Fixed width for label column in ch — pass max label width across all rows */
  labelWidth: number;
  statColor?: string;
}

/**
 * Shared row layout for Intelligence, Speed, Elegance panels.
 * name (shrink-0, padEnd) | bar (flex-1) | stat (fixed ch) | label (fixed ch)
 * All column widths are fixed so bars start and end at the same x position.
 */
export function BenchmarkRow({
  name,
  pct,
  stat,
  label,
  statWidth,
  labelWidth,
  statColor = "var(--sol-magenta)",
}: BenchmarkRowProps) {
  return (
    <div className="flex items-center min-w-0 flex-1 gap-[1ch]">
      <span className="shrink-0 text-[var(--sol-blue)] whitespace-pre">{name}</span>
      <span className="flex-1 min-w-0">
        <BarChart pct={pct} fluid />
      </span>
      <span
        className="shrink-0 text-right"
        style={{ color: statColor, width: `${statWidth}ch` }}
      >
        {stat}
      </span>
      <span
        className="shrink-0 text-[var(--sol-base1)]"
        style={{ width: `${labelWidth}ch` }}
      >
        {label}
      </span>
    </div>
  );
}
