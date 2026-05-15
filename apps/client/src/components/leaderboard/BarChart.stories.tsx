import type { Meta, StoryObj } from "@storybook/react";
import { barChartFixtures } from "@/fixtures/barChart";
import { createFixtureDecorator } from "@/fixtures/decorator";
import { BarChart } from "./BarChart";

const meta = {
  title: "Leaderboard/BarChart",
  component: BarChart,
  parameters: {
    layout: "centered",
    viewport: {
      defaultViewport: "responsive",
    },
  },
  tags: ["autodocs"],
  decorators: [
    createFixtureDecorator(barChartFixtures, (fixture) => (
      <div className="p-4">
        {fixture.fluid ? (
          <div className="w-64">
            <BarChart pct={fixture.pct} fluid />
          </div>
        ) : (
          <BarChart
            pct={fixture.pct}
            {...(fixture.width !== undefined && { width: fixture.width })}
          />
        )}
      </div>
    )),
  ],
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const firstBarFixture = barChartFixtures[0]!;

// Default story renders the first fixture
export const Default: Story = {
  args: {
    pct: firstBarFixture.pct,
    ...(firstBarFixture.width !== undefined && {
      width: firstBarFixture.width,
    }),
  },
};

// Individual fixture stories for visual regression testing
export const PerfectScore: Story = {
  args: { pct: 100, width: 28 },
};

export const HighScore: Story = {
  args: { pct: 85, width: 28 },
};

export const MediumScore: Story = {
  args: { pct: 55, width: 28 },
};

export const LowScore: Story = {
  args: { pct: 15, width: 28 },
};

export const ZeroScore: Story = {
  args: { pct: 0, width: 28 },
};

export const Fluid: Story = {
  args: { pct: 65, fluid: true },
};

export const Narrow: Story = {
  args: { pct: 42, width: 15 },
};

export const Wide: Story = {
  args: { pct: 73, width: 40 },
};
