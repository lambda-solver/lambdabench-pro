import type { Meta, StoryObj } from "@storybook/react";

import { ResponseCard } from "./response-card";

const meta = {
	component: ResponseCard,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/ResponseCard",
} satisfies Meta<typeof ResponseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {
	args: {
		title: "Response",
		state: "completed",
		children: "Task completed successfully with all checks passing.",
	},
};

export const Loading: Story = {
	args: {
		title: "Response",
		state: "loading",
		children: "Processing your request...",
	},
};

export const WithError: Story = {
	args: {
		title: "Response",
		state: "error",
		children: "Failed to process: network timeout exceeded.",
	},
};

export const WithoutState: Story = {
	args: {
		title: "Response",
		children: "No status information available.",
	},
};

export const CustomTitle: Story = {
	args: {
		title: "Execution Log",
		state: "completed",
		children:
			"All 42 test cases passed. Average response time: 1.2ms. Memory usage: 64 MB. No warnings or errors detected.",
	},
};
