import { useLayoutEffect, useState } from "react";
import { useMusicPlayer } from "@/lib/useMusicPlayer";
import { cn } from "@/lib/utils";

/**
 * Inline control bar rendered inside the sticky TabLine row (right side).
 * Contains: theme toggle + music mute toggle.
 * Styled to match the TabLine bg/border, no floating card.
 */
export function ControlBar() {
  const [isDark, setIsDark] = useState(false);
  const { muted, toggle: toggleMusic } = useMusicPlayer();

  useLayoutEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  const handleThemeToggle = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle("dark", nextIsDark);
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
  };

  return (
    <div className="flex items-center gap-[1ch] px-[1ch]">
      {/* Music toggle */}
      <button
        type="button"
        onClick={toggleMusic}
        title={muted ? "Unmute music" : "Mute music"}
        className={cn(
          "font-mono text-sm leading-[1.8] px-[1ch] cursor-pointer border-none",
          "transition-colors bg-transparent",
          muted
            ? "text-[var(--sol-base1)]"
            : "text-[var(--sol-cyan,var(--sol-blue))]",
          "hover:text-[var(--sol-base00)]",
        )}
      >
        {muted ? "♪off" : "♪on"}
      </button>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={handleThemeToggle}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "font-mono text-sm leading-[1.8] px-[1ch] cursor-pointer border-none",
          "transition-colors bg-transparent",
          "text-[var(--sol-base01)] hover:text-[var(--sol-base00)]",
        )}
      >
        {isDark ? "light" : "dark"}
      </button>
    </div>
  );
}

/** @deprecated Use ControlBar instead */
export const ThemeToggle = ControlBar;
