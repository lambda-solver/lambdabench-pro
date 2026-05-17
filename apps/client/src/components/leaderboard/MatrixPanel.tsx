import { fmtModel } from "@/lib/fmt";
import { cn } from "@/lib/utils";
import type { BenchmarkData, BenchmarkTask, Ranking } from "@repo/domain/Benchmark";
import { Array as Arr, Order } from "effect";
import type React from "react";

interface MatrixPanelProps {
  data: BenchmarkData;
  onTaskClick: (task: BenchmarkTask) => void;
}

/**
 * Matrix panel: horizontally scrollable model × task grid.
 * Vertical model headers, ✓/✗ per cell. Row click opens TaskModal.
 */
export function MatrixPanel({ data, onTaskClick }: MatrixPanelProps) {
  const byRightDesc = Order.make<Ranking>((a, b) => b.right > a.right ? 1 : (b.right < a.right ? -1 : 0));
  const sorted = Arr.sort(data.rankings, byRightDesc);

  return (
    <div className="overflow-x-auto py-2">
      <table
        className={cn("border-collapse font-mono text-xs mx-auto")}
        style={{ borderColor: "var(--sol-base2)" }}
      >
        <thead>
          <tr>
            <th
              className="text-left px-[6px] py-[2px] sticky top-0"
              style={{
                background: "var(--sol-base3)",
                borderBottom: "1px solid var(--sol-base1)",
                color: "var(--sol-base01)",
                fontWeight: "normal",
                whiteSpace: "nowrap",
              }}
            >
              problem
            </th>
            {sorted.map((r) => (
              <th
                key={r.model}
                className="sticky top-0"
                style={{
                  background: "var(--sol-base3)",
                  borderBottom: "1px solid var(--sol-base1)",
                  fontWeight: "normal",
                  height: "8em",
                  maxWidth: "1.8em",
                  minWidth: "1.8em",
                  padding: "4px 2px",
                  verticalAlign: "bottom",
                  width: "1.8em",
                }}
              >
                <div
                  style={{
                    color: "var(--sol-blue)",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                    writingMode: "vertical-rl",
                  }}
                >
                  {fmtModel(r.model)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.tasks.map((task) => (
            <tr
              key={task.id}
              className="cursor-pointer"
              style={{ "--hover-bg": "var(--sol-base2)" } as React.CSSProperties}
              onClick={() => onTaskClick(task)}
              onMouseEnter={(e) => {
                for (
                  const td of (
                    e.currentTarget as HTMLTableRowElement
                  ).querySelectorAll("td")
                ) {
                  (td as HTMLTableCellElement).style.background = "var(--sol-base2)";
                }
              }}
              onMouseLeave={(e) => {
                for (
                  const td of (
                    e.currentTarget as HTMLTableRowElement
                  ).querySelectorAll("td")
                ) {
                  (td as HTMLTableCellElement).style.background = "";
                }
              }}
            >
              <td
                className="text-left font-bold pr-[10px] py-[2px] px-[6px]"
                style={{
                  borderBottom: "1px solid var(--sol-base2)",
                  color: "var(--sol-green)",
                  whiteSpace: "nowrap",
                }}
              >
                {task.id}
              </td>
              {sorted.map((r) => {
                const passed = r.tasks[task.id];
                return (
                  <td
                    key={r.model}
                    className="text-center py-[2px] px-[6px]"
                    style={{
                      border: "1px solid var(--sol-base2)",
                      color: passed ? "var(--sol-green)" : "var(--sol-red)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {passed ? "✓" : "✗"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
