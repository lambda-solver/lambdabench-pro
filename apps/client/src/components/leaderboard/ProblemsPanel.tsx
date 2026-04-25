import type { BenchmarkData, BenchmarkTask } from "@repo/domain/Benchmark";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TildeLine, VimLine } from "./VimLine";

interface ProblemsPanelProps {
  data: BenchmarkData;
  onTaskClick: (task: BenchmarkTask) => void;
}

function rpad(s: string, n: number): string {
  return s.padStart(n, " ");
}

function pad(s: string, n: number): string {
  return s.padEnd(n, " ");
}

/**
 * Problems panel: filterable task list with pass/fail dots per model.
 * Clicking a task row opens the TaskModal.
 */
export function ProblemsPanel({ data, onTaskClick }: ProblemsPanelProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredTasks =
    activeFilter === "all"
      ? data.tasks
      : data.tasks.filter((t) => t.category === activeFilter);

  return (
    <div className="text-[var(--sol-base00)]">
      {/* Filter row */}
      <VimLine n="">
        <span className="text-[var(--sol-base1)]">" filter: </span>
        {[{ id: "all", name: "all" }, ...data.categories].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveFilter(cat.id)}
            className={cn(
              "font-mono text-sm bg-transparent border-none cursor-pointer mr-[1ch] p-0",
              activeFilter === cat.id
                ? "text-[var(--sol-yellow)] font-bold"
                : "text-[var(--sol-base1)] hover:text-[var(--sol-base00)]",
            )}
          >
            {cat.id}
          </button>
        ))}
      </VimLine>
      <VimLine n="" />

      {/* Task list */}
      {filteredTasks.map((task, i) => {
        const dots = data.rankings.map((r) =>
          r.tasks[task.id] ? (
            <span key={r.model} className="text-[var(--sol-green)]">
              ●
            </span>
          ) : (
            <span key={r.model} className="text-[var(--sol-red)]">
              ●
            </span>
          ),
        );

        const desc = task.description.split("\n")[0] ?? "";
        const truncated = desc.length > 60 ? desc.slice(0, 57) + "..." : desc;

        return (
          <button
            key={task.id}
            type="button"
            className="w-full text-left cursor-pointer group"
            onClick={() => onTaskClick(task)}
          >
            <VimLine
              n={rpad(String(i + 1), 3)}
              className="group-hover:bg-[var(--sol-base2)]"
            >
              <span className="text-[var(--sol-green)]">
                {pad(task.id, 10)}
              </span>
              {"  "}
              {dots}
              {"  "}
              <span className="text-[var(--sol-base1)]">{truncated}</span>
            </VimLine>
          </button>
        );
      })}

      {Array.from({ length: 5 }).map((_, i) => (
        <TildeLine key={`tilde-${i}`} />
      ))}
    </div>
  );
}
