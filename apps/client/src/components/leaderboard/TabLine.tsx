import { cn } from "@/lib/utils";

export type TabId = "intelligence" | "speed" | "elegance" | "value" | "problems" | "matrix";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "intelligence", label: ":intelligence" },
  { id: "speed",        label: ":speed"        },
  { id: "elegance",     label: ":elegance"     },
  { id: "value",        label: ":value"        },
  { id: "problems",     label: ":problems"     },
  { id: "matrix",       label: ":matrix"       },
];

interface TabLineProps {
  active: TabId;
  onTabChange: (tab: TabId) => void;
}

/**
 * Sticky top tab strip, Vim-style.
 * Renders tab buttons using Solarized tokens.
 */
export function TabLine({ active, onTabChange }: TabLineProps) {
  return (
    <div
      className={cn(
        "flex justify-center sticky top-0 z-10",
        "bg-[var(--sol-base2)] border-b border-[var(--sol-base1)]",
      )}
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={cn(
            "font-mono text-sm px-[2ch] leading-[1.8] cursor-pointer border-none",
            "transition-colors",
            active === id
              ? "bg-[var(--sol-base3)] text-[var(--sol-base00)] font-bold"
              : "bg-[var(--sol-base2)] text-[var(--sol-base01)] hover:bg-[var(--sol-base3)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
