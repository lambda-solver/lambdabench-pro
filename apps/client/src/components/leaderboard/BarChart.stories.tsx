import type { Meta, StoryObj } from "@storybook/react";
import { BarChart } from "./BarChart";

const meta = {
  title: "Leaderboard/BarChart",
  component: BarChart,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    pct: {
      control: { type: "range", min: 0, max: 100 },
      description: "Percentage 0–100",
    },
    width: {
      control: { type: "range", min: 10, max: 50 },
      description: "Width in characters (fixed mode)",
    },
    fluid: {
      control: "boolean",
      description: "Fluid mode fills parent flex-1 cell",
    },
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighScore: Story = {
  args: {
    pct: 85,
    width: 28,
  },
};

export const MediumScore: Story = {
  args: {
    pct: 55,
    width: 28,
  },
};

export const LowScore: Story = {
  args: {
    pct: 15,
    width: 28,
  },
};

export const Fluid: Story = {
  args: {
    pct: 65,
    fluid: true,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: {
    pct: 42,
    width: 15,
  },
};

export const Wide: Story = {
  args: {
    pct: 73,
    width: 40,
  },
};
