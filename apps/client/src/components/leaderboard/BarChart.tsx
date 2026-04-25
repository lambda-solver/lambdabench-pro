import { cn } from "@/lib/utils";

interface BarChartProps {
  /** Percentage 0–100 */
  pct: number;
  /** Width in characters (fixed mode, default 28). Ignored when fluid=true. */
  width?: number;
  /**
   * Fluid mode: fills the parent flex-1 cell entirely using a CSS gradient bar.
   * The parent must be a flex container with flex-1 on this element's wrapper.
   */
  fluid?: boolean;
  className?: string;
}

/**
 * Bar chart using Solarized color thresholds.
 *
 * fixed mode (default): renders a string of █ glyphs at a fixed character width.
 * fluid mode: renders a CSS gradient bar that fills its flex-1 parent cell.
 *
 * ≥70% → green, ≥45% → blue, ≥20% → yellow, else → red.
 */
export function BarChart({ pct, width = 28, fluid = false, className }: BarChartProps) {
  const color =
    pct >= 70
      ? "var(--sol-green)"
      : pct >= 45
        ? "var(--sol-blue)"
        : pct >= 20
          ? "var(--sol-yellow)"
          : "var(--sol-red)";

  if (fluid) {
    return (
      <span
        className={cn("block w-full self-center", className)}
        style={{
          height: "0.7em",
          background: `linear-gradient(to right, ${color} ${pct}%, color-mix(in srgb, ${color} 25%, transparent) ${pct}%)`,
          borderRadius: "1px",
        }}
      />
    );
  }

  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const colorClass =
    pct >= 70
      ? "text-[var(--sol-green)]"
      : pct >= 45
        ? "text-[var(--sol-blue)]"
        : pct >= 20
          ? "text-[var(--sol-yellow)]"
          : "text-[var(--sol-red)]";
  const style = { verticalAlign: "top", lineHeight: "inherit" } as const;

  return (
    <span className={cn(colorClass, className)}>
      <span style={style}>{"█".repeat(filled)}</span>
      <span style={{ ...style, opacity: 0.25 }}>{"█".repeat(empty)}</span>
    </span>
  );
}
