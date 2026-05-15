import { useState, useEffect, useCallback } from "react";
import type { StoryContext, StoryFn } from "@storybook/react";

/**
 * Decorator that adds keyboard fixture switching to stories.
 *
 * Keys:
 *   1..N      switch fixture
 *   j / k     next / previous fixture
 *   r         force re-render (remount component)
 *   q / esc   reset to first fixture
 */
export function createFixtureDecorator<T>(
  fixtures: readonly T[],
  renderFixture: (fixture: T) => React.ReactNode,
) {
  return function FixtureDecorator(
    Story: StoryFn,
    context: StoryContext,
  ) {
    const [fixtureIdx, setFixtureIdx] = useState(0);
    const [remountKey, setRemountKey] = useState(0);

    const currentFixture = fixtures[fixtureIdx] ?? fixtures[0];

    const nextFixture = useCallback(() => {
      setFixtureIdx((i) => (i + 1) % fixtures.length);
    }, []);

    const prevFixture = useCallback(() => {
      setFixtureIdx((i) => (i - 1 + fixtures.length) % fixtures.length);
    }, []);

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        // Only handle when not typing in an input
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          // 1..N switch fixture
          if (/^[1-9]$/.test(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            if (idx < fixtures.length) {
              e.preventDefault();
              setFixtureIdx(idx);
            }
            return;
          }

          // j / k navigate
          if (e.key === "j" || e.key === "ArrowDown") {
            e.preventDefault();
            nextFixture();
            return;
          }
          if (e.key === "k" || e.key === "ArrowUp") {
            e.preventDefault();
            prevFixture();
            return;
          }

          // r re-render
          if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            setRemountKey((k) => k + 1);
            return;
          }

          // q / esc reset
          if (e.key === "q" || e.key === "Escape") {
            e.preventDefault();
            setFixtureIdx(0);
            return;
          }
        }
      };

      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [nextFixture, prevFixture]);

    // Show fixture info bar
    const fixtureName =
      currentFixture &&
      typeof currentFixture === "object" &&
      "name" in currentFixture
        ? String(currentFixture.name)
        : `Fixture ${fixtureIdx + 1}`;

    return (
      <div key={remountKey} className="relative">
        <div className="mb-4 p-2 bg-[var(--sol-base2)] text-[var(--sol-base00)] font-mono text-xs border border-[var(--sol-base1)]">
          <span className="text-[var(--sol-blue)] font-bold">
            {fixtureIdx + 1}/{fixtures.length}
          </span>{" "}
          <span className="text-[var(--sol-green)]">{fixtureName}</span>
          <span className="ml-4 text-[var(--sol-base1)]">
            [1-{Math.min(9, fixtures.length)}] switch [j/k] nav [r] re-render [q]
            reset
          </span>
        </div>
        <Story {...context} />
        {renderFixture(currentFixture)}
      </div>
    );
  };
}
