import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "./input";

const meta = {
	component: Input,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/Input",
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { placeholder: "Enter text..." },
};

export const WithValue: Story = {
	args: { value: "Prefilled text" },
};

export const Password: Story = {
	args: { type: "password", placeholder: "Enter password..." },
};

export const Disabled: Story = {
	args: { disabled: true, value: "Disabled input" },
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex flex-col gap-1.5 text-xs font-medium">
			<label htmlFor="story-input">Username</label>
			<Input id="story-input" placeholder="Enter username..." />
		</div>
	),
};

export const File: Story = {
	args: { type: "file" },
};

export const Email: Story = {
	args: { type: "email", placeholder: "email@example.com" },
};
