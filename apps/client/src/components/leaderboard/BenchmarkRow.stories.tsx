import type { Meta, StoryObj } from "@storybook/react";

import { BenchmarkRow } from "./BenchmarkRow";

const meta = {
	component: BenchmarkRow,
	decorators: [
		(Story) => (
			<div className="font-mono text-sm w-96">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "Leaderboard/BenchmarkRow",
} satisfies Meta<typeof BenchmarkRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighScore: Story = {
	args: {
		name: "gemini-2.5-pro  ",
		pct: 83.3,
		stat: "5/6",
		label: "83.3%",
		statWidth: 5,
		labelWidth: 6,
	},
};

export const MidScore: Story = {
	args: {
		name: "gpt-4o       ",
		pct: 66.7,
		stat: "4/6",
		label: "66.7%",
		statWidth: 5,
		labelWidth: 6,
	},
};

export const LowScore: Story = {
	args: {
		name: "nemotron     ",
		pct: 33.3,
		stat: "2/6",
		label: "33.3%",
		statWidth: 5,
		labelWidth: 6,
	},
};

export const SpeedRow: Story = {
	args: {
		name: "gemini-2.5-pro",
		pct: 100,
		stat: "7.32/min",
		label: "(8s avg)",
		statWidth: 8,
		labelWidth: 8,
		statColor: "var(--sol-magenta)",
	},
};

export const ZeroScore: Story = {
	args: {
		name: "minimax      ",
		pct: 0,
		stat: "0/6",
		label: "0.0%",
		statWidth: 5,
		labelWidth: 6,
	},
};

export const CustomColor: Story = {
	args: {
		name: "claude-sonnet",
		pct: 83.3,
		stat: "5/6",
		label: "83.3%",
		statWidth: 5,
		labelWidth: 6,
		statColor: "var(--sol-cyan)",
	},
};
