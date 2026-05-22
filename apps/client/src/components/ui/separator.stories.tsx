import type { Meta, StoryObj } from "@storybook/react";

import { Separator } from "./separator";

const meta = {
	component: Separator,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/Separator",
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className="w-48">
			<div>Content above</div>
			<Separator />
			<div>Content below</div>
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className="flex h-8 items-center gap-2">
			<span>Left</span>
			<Separator orientation="vertical" />
			<span>Right</span>
		</div>
	),
};

export const WithText: Story = {
	render: () => (
		<div className="w-48">
			<div className="mb-2 text-sm font-medium">Section One</div>
			<p className="text-muted-foreground mb-4 text-xs">
				This is the content of the first section. It describes something
				important.
			</p>
			<Separator />
			<div className="mt-4 mb-2 text-sm font-medium">Section Two</div>
			<p className="text-muted-foreground text-xs">
				This is the content of the second section. It follows after the
				separator.
			</p>
		</div>
	),
};
