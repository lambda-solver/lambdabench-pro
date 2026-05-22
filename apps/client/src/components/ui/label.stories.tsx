import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
	component: Label,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/Label",
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "Email",
		htmlFor: "email",
	},
};

export const WithInput: Story = {
	render: () => (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor="email">Email</Label>
			<Input id="email" type="email" placeholder="email@example.com" />
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="group flex flex-col gap-1.5" data-disabled="true">
			<Label htmlFor="email-disabled">Email</Label>
			<Input
				id="email-disabled"
				type="email"
				placeholder="email@example.com"
				disabled
			/>
		</div>
	),
};
