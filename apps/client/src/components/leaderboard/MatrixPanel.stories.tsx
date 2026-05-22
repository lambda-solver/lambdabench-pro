import type { BenchmarkData } from "@repo/domain/Benchmark";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { leaderboardData, rankingGemini } from "@/fixtures/benchmark";
import { MatrixPanel } from "./MatrixPanel";

const meta = {
	component: MatrixPanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/MatrixPanel",
} satisfies Meta<typeof MatrixPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const singleModelData: BenchmarkData = {
	...leaderboardData,
	rankings: [rankingGemini],
};

export const Default: Story = {
	args: { data: leaderboardData, onTaskClick: fn() },
};

export const SingleModel: Story = {
	args: { data: singleModelData, onTaskClick: fn() },
};
