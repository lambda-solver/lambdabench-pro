import { cn } from "@/lib/utils";

interface BarChartProps {
  /** Percentage 0–100 */
  pct: number;
  /** Width in characters */
  width?: number;
  className?: string;
}

/**
 * ASCII block bar chart using Solarized color thresholds.
 * ≥70% → green, ≥45% → blue, ≥20% → yellow, else → red.
 */
export function BarChart({ pct, width = 28, className }: BarChartProps) {
  const filled  = Math.round((pct / 100) * width);
  const empty   = width - filled;
  const filledS = "█".repeat(filled);
  const emptyS  = "░".repeat(empty);

  const colorClass =
    pct >= 70 ? "text-[var(--sol-green)]"
    : pct >= 45 ? "text-[var(--sol-blue)]"
    : pct >= 20 ? "text-[var(--sol-yellow)]"
    : "text-[var(--sol-red)]";

  return (
    <span className={cn("inline-flex items-center leading-none", className)}>
      <span className={colorClass} style={{ lineHeight: 1 }}>{filledS}</span>
      <span className="text-[var(--sol-base1)]" style={{ lineHeight: 1 }}>{emptyS}</span>
    </span>
  );
}
