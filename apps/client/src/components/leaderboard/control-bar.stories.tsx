import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ControlBar } from "@/components/theme-toggle";

const meta = {
	component: ControlBar,
	decorators: [
		(Story) => (
			<div className="bg-[var(--sol-base2)] p-2">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "Leaderboard/ControlBar",
} satisfies Meta<typeof ControlBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unmuted: Story = {
	args: {
		muted: false,
		onToggleMusic: fn(),
	},
};

export const Muted: Story = {
	args: {
		muted: true,
		onToggleMusic: fn(),
	},
};
