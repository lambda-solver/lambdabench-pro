// Fixture system for component preview — inspired by motel's storybook approach.
// Each fixture exercises one rendering branch so we can iterate without
// real data or backend traffic.

export interface BarChartFixture {
  readonly name: string;
  readonly pct: number;
  readonly width?: number;
  readonly fluid?: boolean;
}

export interface VimLineFixture {
  readonly name: string;
  readonly n?: number | string | null;
  readonly content: string;
  readonly tilde?: boolean;
}

export interface ButtonFixture {
  readonly name: string;
  readonly variant: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  readonly size?: "default" | "xs" | "sm" | "lg" | "icon";
  readonly disabled?: boolean;
  readonly label: string;
}

export interface BenchmarkFixture {
  readonly name: string;
  readonly data: import("@repo/domain/Benchmark").BenchmarkData;
}
