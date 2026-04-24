import { cn } from "@/lib/utils";
import { ControlBar } from "@/components/theme-toggle";

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
  muted: boolean;
  onToggleMusic: () => void;
}

/**
 * Sticky top bar — three-column layout:
 *   left spacer (equal width to ControlBar) | centered tabs | ControlBar
 * This keeps the tabs visually centered while controls sit flush right.
 */
export function TabLine({ active, onTabChange, muted, onToggleMusic }: TabLineProps) {
  return (
    <div
      className={cn(
        "flex items-stretch sticky top-0 z-10",
        "bg-[var(--sol-base2)] border-b border-[var(--sol-base1)]",
      )}
    >
      {/* Left spacer — mirrors ControlBar width so tabs stay centered */}
      <div className="flex-1" />

      {/* Centered tabs */}
      <div className="flex items-stretch">
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

      {/* Right controls */}
      <div className="flex-1 flex justify-end">
        <ControlBar muted={muted} onToggleMusic={onToggleMusic} />
      </div>
    </div>
  );
}
