import type { Meta, StoryObj } from "@storybook/react";

import { Textarea } from "./textarea";

const meta = {
	component: Textarea,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/Textarea",
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: "Enter your description...",
	},
};

export const WithValue: Story = {
	args: {
		value: "Some text content here...",
	},
};

export const SmallRows: Story = {
	args: {
		rows: 3,
		placeholder: "Short input...",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		value: "Disabled content",
	},
};

export const WithLabel: Story = {
	render: (args) => (
		<div className="flex flex-col gap-1.5">
			<label
				htmlFor="story-textarea"
				className="text-xs font-medium text-foreground"
			>
				Description
			</label>
			<Textarea id="story-textarea" {...args} />
		</div>
	),
	args: {
		placeholder: "Enter your description...",
	},
};
