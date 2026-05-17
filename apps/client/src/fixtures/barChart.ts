import type { BarChartFixture } from "./index";

export const barChartFixtures: ReadonlyArray<BarChartFixture> = [
  {
    name: "perfect-score",
    pct: 100,
    width: 28,
  },
  {
    name: "high-score",
    pct: 85,
    width: 28,
  },
  {
    name: "medium-score",
    pct: 55,
    width: 28,
  },
  {
    name: "low-score",
    pct: 15,
    width: 28,
  },
  {
    name: "zero-score",
    pct: 0,
    width: 28,
  },
  {
    fluid: true,
    name: "fluid-mode",
    pct: 65,
  },
  {
    name: "narrow-width",
    pct: 42,
    width: 15,
  },
  {
    name: "wide-width",
    pct: 73,
    width: 40,
  },
];
