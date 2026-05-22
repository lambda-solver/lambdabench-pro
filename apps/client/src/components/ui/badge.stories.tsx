import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";

const meta = {
	component: Badge,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/Badge",
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { children: "Badge", variant: "default" },
};

export const Outline: Story = {
	args: { children: "Outline", variant: "outline" },
};

export const Secondary: Story = {
	args: { children: "Secondary", variant: "secondary" },
};

export const Ghost: Story = {
	args: { children: "Ghost", variant: "ghost" },
};

export const Destructive: Story = {
	args: { children: "Destructive", variant: "destructive" },
};

export const Link: Story = {
	args: { children: "Link", variant: "link" },
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">Default</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="ghost">Ghost</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="link">Link</Badge>
		</div>
	),
};
