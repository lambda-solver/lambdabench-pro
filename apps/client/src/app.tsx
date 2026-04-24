import { AsyncResult } from "effect/unstable/reactivity";
import { useAtomValue } from "@effect/atom-react";
import { useState } from "react";
import { benchmarkAtom } from "@/lib/atoms/benchmark-atom";
import { TabLine, type TabId } from "@/components/leaderboard/TabLine";
import { IntelligencePanel } from "@/components/leaderboard/IntelligencePanel";
import { SpeedPanel } from "@/components/leaderboard/SpeedPanel";
import { ElegancePanel } from "@/components/leaderboard/ElegancePanel";
import { ValuePanel } from "@/components/leaderboard/ValuePanel";
import { ProblemsPanel } from "@/components/leaderboard/ProblemsPanel";
import { MatrixPanel } from "@/components/leaderboard/MatrixPanel";
import { TaskModal } from "@/components/leaderboard/TaskModal";
import { useMusicPlayer } from "@/lib/useMusicPlayer";
import type { BenchmarkTask } from "@repo/domain/Benchmark";
import { cn } from "@/lib/utils";

function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-screen text-[var(--sol-base1)]">
      <span className="animate-pulse">Loading benchmark data...</span>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen text-[var(--sol-red)]">
      <div className="text-center">
        <div className="font-bold mb-2">Failed to load benchmark data</div>
        <div className="text-sm text-[var(--sol-base1)]">{message}</div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("intelligence");
  const [selectedTask, setSelectedTask] = useState<BenchmarkTask | null>(null);
  const result = useAtomValue(benchmarkAtom);

  // Hoisted here so the 10s timer starts immediately on page load,
  // independent of whether benchmark data has finished loading.
  const { muted, toggle: toggleMusic } = useMusicPlayer();

  return AsyncResult.match(result, {
    onInitial: () => <LoadingView />,
    onFailure: (e) => (
      <ErrorView message={String((e as { cause?: unknown }).cause ?? e)} />
    ),
    onSuccess: (s) => {
      const data = s.value;

      return (
        <div
          className={cn(
            "relative flex flex-col min-h-screen font-mono text-sm",
            "bg-[var(--sol-base3)] text-[var(--sol-base00)]",
          )}
        >
          {/* Vim-style tabline (with ControlBar embedded on the right) — sticky top */}
          <TabLine
            active={activeTab}
            onTabChange={setActiveTab}
            muted={muted}
            onToggleMusic={toggleMusic}
          />

          {/* Buffer — each panel is pre-computed, hidden via display:none for instant switching */}
          <div className="flex-1 max-w-[820px] w-full mx-auto border-x border-[var(--sol-base2)]">
            <div style={{ display: activeTab === "intelligence" ? "block" : "none" }}>
              <IntelligencePanel data={data} />
            </div>
            <div style={{ display: activeTab === "speed" ? "block" : "none" }}>
              <SpeedPanel data={data} />
            </div>
            <div style={{ display: activeTab === "elegance" ? "block" : "none" }}>
              <ElegancePanel data={data} />
            </div>
            <div style={{ display: activeTab === "value" ? "block" : "none" }}>
              <ValuePanel data={data} />
            </div>
            <div style={{ display: activeTab === "problems" ? "block" : "none" }}>
              <ProblemsPanel data={data} onTaskClick={setSelectedTask} />
            </div>
            <div style={{ display: activeTab === "matrix" ? "block" : "none" }}>
              <MatrixPanel data={data} onTaskClick={setSelectedTask} />
            </div>
          </div>

          {/* Statusline — sticky bottom */}
          <div
            className={cn(
              "sticky bottom-0 z-10 flex justify-between px-[1ch] leading-[1.8]",
              "bg-[var(--sol-base2)] border-t border-[var(--sol-base1)]",
              "text-[var(--sol-base01)] text-xs",
            )}
          >
            <span>
              <a
                href="https://github.com/VictorTaelin/lambench"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--sol-blue)] hover:underline"
              >
                github.com/VictorTaelin/lambench
              </a>
            </span>
            <span>
              {data.rankings.length} models · {data.tasks.length} tasks ·{" "}
              {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : ""}
            </span>
          </div>

          {/* Task detail modal */}
          <TaskModal
            task={selectedTask}
            rankings={data.rankings}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      );
    },
  });
}

export default App;
