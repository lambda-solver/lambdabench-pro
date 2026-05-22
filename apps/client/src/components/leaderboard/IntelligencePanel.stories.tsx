import type { BenchmarkData } from "@repo/domain/Benchmark";
import type { Meta, StoryObj } from "@storybook/react";
import { leaderboardData, rankingGemini } from "@/fixtures/benchmark";
import { IntelligencePanel } from "./IntelligencePanel";

const meta = {
	component: IntelligencePanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/IntelligencePanel",
} satisfies Meta<typeof IntelligencePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const singleModelData: BenchmarkData = {
	...leaderboardData,
	rankings: [rankingGemini],
};

const emptyRankingsData: BenchmarkData = {
	...leaderboardData,
	rankings: [],
};

export const Default = {
	args: { data: leaderboardData },
} satisfies Story;

export const SingleModel = {
	args: { data: singleModelData },
} satisfies Story;

export const EmptyRankings = {
	args: { data: emptyRankingsData },
} satisfies Story;
