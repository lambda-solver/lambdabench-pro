import type { BenchmarkData } from "@repo/domain/Benchmark";
import type { Meta, StoryObj } from "@storybook/react";
import { leaderboardData } from "@/fixtures/benchmark";
import { ElegancePanel } from "./ElegancePanel";

const meta = {
	component: ElegancePanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/ElegancePanel",
} satisfies Meta<typeof ElegancePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		data: leaderboardData as BenchmarkData,
	},
};
