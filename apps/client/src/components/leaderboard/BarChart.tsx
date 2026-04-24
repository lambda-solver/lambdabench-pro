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
 * Both filled and empty use the same █ glyph to guarantee identical
 * vertical metrics. Empty portion is dimmed via opacity.
 * ≥70% → green, ≥45% → blue, ≥20% → yellow, else → red.
 */
export function BarChart({ pct, width = 28, className }: BarChartProps) {
  const filled = Math.round((pct / 100) * width);
  const empty  = width - filled;

  const colorClass =
    pct >= 70 ? "text-[var(--sol-green)]"
    : pct >= 45 ? "text-[var(--sol-blue)]"
    : pct >= 20 ? "text-[var(--sol-yellow)]"
    : "text-[var(--sol-red)]";

  const style = { verticalAlign: "top", lineHeight: "inherit" } as const;

  return (
    <span className={cn(colorClass, className)}>
      <span style={style}>{"█".repeat(filled)}</span>
      <span style={{ ...style, opacity: 0.25 }}>{"█".repeat(empty)}</span>
    </span>
  );
}
