import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { TabLine } from "./TabLine";

const meta = {
	component: TabLine,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	title: "Leaderboard/TabLine",
} satisfies Meta<typeof TabLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IntelligenceActive: Story = {
	args: {
		active: "intelligence",
		muted: false,
		onTabChange: fn(),
		onToggleMusic: fn(),
	},
};

export const SpeedActive: Story = {
	args: {
		active: "speed",
		muted: false,
		onTabChange: fn(),
		onToggleMusic: fn(),
	},
};

export const ProblemsActive: Story = {
	args: {
		active: "problems",
		muted: false,
		onTabChange: fn(),
		onToggleMusic: fn(),
	},
};

export const MatrixActive: Story = {
	args: {
		active: "matrix",
		muted: false,
		onTabChange: fn(),
		onToggleMusic: fn(),
	},
};

export const Muted: Story = {
	args: {
		active: "intelligence",
		muted: true,
		onTabChange: fn(),
		onToggleMusic: fn(),
	},
};
