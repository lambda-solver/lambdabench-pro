import type { Meta, StoryObj } from "@storybook/react";
import { leaderboardData } from "@/fixtures/benchmark";
import { ValuePanel } from "./ValuePanel";

const meta = {
	component: ValuePanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/ValuePanel",
} satisfies Meta<typeof ValuePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default = {
	args: { data: leaderboardData },
} satisfies Story;
