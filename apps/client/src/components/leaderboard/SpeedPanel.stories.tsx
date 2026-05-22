import type { BenchmarkData } from "@repo/domain/Benchmark";
import type { Meta, StoryObj } from "@storybook/react";
import { leaderboardData, rankingGemini } from "@/fixtures/benchmark";
import { SpeedPanel } from "./SpeedPanel";

const meta = {
	component: SpeedPanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/SpeedPanel",
} satisfies Meta<typeof SpeedPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		data: leaderboardData,
	},
};

const singleModelData: BenchmarkData = {
	...leaderboardData,
	rankings: [rankingGemini],
};

export const SingleModel: Story = {
	args: {
		data: singleModelData,
	},
};
