import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { allRankings, taskCnatAdd } from "@/fixtures/benchmark";
import { TaskModal } from "./TaskModal";

const meta = {
	component: TaskModal,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/TaskModal",
} satisfies Meta<typeof TaskModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
	args: { task: taskCnatAdd, rankings: allRankings, onClose: fn() },
};

export const Closed: Story = {
	args: { task: null, rankings: allRankings, onClose: fn() },
};
