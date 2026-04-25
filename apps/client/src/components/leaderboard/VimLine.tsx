import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface VimLineProps {
  /** Line number — pass null or undefined for tilde (~) lines */
  n?: number | string | null;
  children?: ReactNode;
  className?: string;
  tilde?: boolean;
}

/**
 * A single line in the Vim-style buffer.
 * Renders a line-number column (ln) and a content column (lc).
 */
export function VimLine({
  n,
  children,
  className,
  tilde = false,
}: VimLineProps) {
  return (
    <div
      className={cn(
        "flex min-h-[1.5em]",
        tilde && "text-[var(--sol-blue)]",
        className,
      )}
    >
      <span
        className={cn(
          "w-[4ch] shrink-0 pr-[1ch] text-right select-none",
          tilde ? "text-[var(--sol-blue)]" : "text-[var(--sol-base1)]",
        )}
      >
        {n == null ? "" : String(n)}
      </span>
      <span className="flex-1 pr-[1ch] whitespace-pre-wrap break-words">
        {children}
      </span>
    </div>
  );
}

/** Tilde line — rendered as `~` in the line-number gutter */
export function TildeLine() {
  return <VimLine tilde>~</VimLine>;
}
