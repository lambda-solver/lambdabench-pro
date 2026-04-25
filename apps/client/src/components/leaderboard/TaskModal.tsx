import type { BenchmarkTask, Ranking } from "@repo/domain/Benchmark";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { TildeLine, VimLine } from "./VimLine";

interface TaskModalProps {
  task: BenchmarkTask | null;
  rankings: ReadonlyArray<Ranking>;
  onClose: () => void;
}

function fmtModel(model: string): string {
  const parts = model.split("/");
  return parts.slice(1).join("/");
}

/**
 * Vim-inspired modal showing task detail, sample tests, and per-model results.
 * Closes on Escape or overlay click.
 */
export function TaskModal({ task, rankings, onClose }: TaskModalProps) {
  useEffect(() => {
    if (!task) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [task, onClose]);

  if (!task) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center",
        "overflow-y-auto py-16 px-4",
        "bg-[rgba(0,43,54,0.35)]",
      )}
    >
      {/* Backdrop close button — covers the overlay area behind the panel */}
      <button
        type="button"
        aria-label="Close modal"
        className="fixed inset-0 -z-10 cursor-default"
        onClick={onClose}
      />
      <div
        className={cn(
          "w-full max-w-[760px] text-sm",
          "bg-[var(--sol-base3)] border border-[var(--sol-base1)]",
        )}
      >
        {/* Title bar */}
        <div
          className={cn(
            "flex justify-between items-center px-[1ch] leading-[1.8]",
            "bg-[var(--sol-base2)] border-b border-[var(--sol-base1)]",
          )}
        >
          <span className="font-bold text-[var(--sol-base00)]">
            {task.id}.tsk
          </span>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "font-mono bg-transparent border-none cursor-pointer",
              "text-[var(--sol-base01)] hover:text-[var(--sol-red)]",
            )}
          >
            :q
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto p-0 text-[var(--sol-base00)]">
          <VimLine n={1} />
          <VimLine n={2}>
            <span className="font-bold text-[var(--sol-orange)]">
              {task.id}
            </span>
            {"  "}
            <span className="text-[var(--sol-base1)]">{task.categoryName}</span>
          </VimLine>
          <VimLine n={3} />

          {task.description.split("\n").map((line, i) => (
            <VimLine key={`desc-${i}`} n={i + 4}>
              <span className="text-[var(--sol-base1)]">{`-- ${line}`}</span>
            </VimLine>
          ))}

          {(() => {
            let n = 4 + task.description.split("\n").length;
            return (
              <>
                <VimLine n={n++} />
                <VimLine n={n++}>
                  <span className="text-[var(--sol-violet)]">Tests</span>
                  {"  "}
                  <span className="text-[var(--sol-base1)]">
                    ({task.tests.length} of {task.testCount})
                  </span>
                </VimLine>
                <VimLine n={n++} />

                {task.tests.map((t, i) => (
                  <span key={`test-${i}`}>
                    <VimLine n={n++}>
                      <span className="text-[var(--sol-cyan)]">{t.input}</span>
                    </VimLine>
                    <VimLine n={n++}>
                      <span className="text-[var(--sol-green)]">{`= ${t.expected}`}</span>
                    </VimLine>
                    <VimLine n={n++} />
                  </span>
                ))}

                <VimLine n={n++}>
                  <span className="text-[var(--sol-violet)]">
                    Model Results
                  </span>
                </VimLine>
                <VimLine n={n++} />

                {rankings.map((r) => {
                  const passed = r.tasks[task.id];
                  return (
                    <VimLine key={r.model} n={n++}>
                      {passed ? (
                        <span className="text-[var(--sol-green)]">✓</span>
                      ) : (
                        <span className="text-[var(--sol-red)]">✗</span>
                      )}
                      {"  "}
                      {fmtModel(r.model)}
                    </VimLine>
                  );
                })}

                <VimLine n={n++} />
                {Array.from({ length: 4 }).map((_, i) => (
                  <TildeLine key={`tilde-${i}`} />
                ))}
              </>
            );
          })()}
        </div>

        {/* Status line */}
        <div
          className={cn(
            "px-[1ch] leading-[1.8]",
            "bg-[var(--sol-base2)] border-t border-[var(--sol-base1)]",
            "text-[var(--sol-base01)]",
          )}
        >
          {task.id} [RO]
        </div>
      </div>
    </div>
  );
}
