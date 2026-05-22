import type { BenchmarkData } from "@repo/domain/Benchmark";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { leaderboardData } from "@/fixtures/benchmark";
import { ProblemsPanel } from "./ProblemsPanel";

const meta = {
	component: ProblemsPanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/ProblemsPanel",
} satisfies Meta<typeof ProblemsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		data: leaderboardData,
		onTaskClick: fn(),
	},
};

const encodingTasks = leaderboardData.tasks.filter(
	(t) => t.category === "encoding",
);
const encodingCategories = leaderboardData.categories.filter(
	(c) => c.id === "encoding",
);

export const SingleTaskCategory: Story = {
	args: {
		data: {
			...leaderboardData,
			tasks: encodingTasks,
			categories: encodingCategories,
		} satisfies BenchmarkData,
		onTaskClick: fn(),
	},
};
