import type { Meta, StoryObj } from "@storybook/react";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

const meta = {
	component: Tooltip,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/Tooltip",
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<span className="text-xs underline decoration-dotted">Hover me</span>
				</TooltipTrigger>
				<TooltipContent>Tooltip content</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const WithDelay: Story = {
	render: () => (
		<TooltipProvider delay={500}>
			<Tooltip>
				<TooltipTrigger>
					<span className="text-xs underline decoration-dotted">
						Hover me (500ms delay)
					</span>
				</TooltipTrigger>
				<TooltipContent>Tooltip content</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const Bottom: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<span className="text-xs underline decoration-dotted">
						Hover me (bottom)
					</span>
				</TooltipTrigger>
				<TooltipContent side="bottom">Tooltip content</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const Right: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<span className="text-xs underline decoration-dotted">
						Hover me (right)
					</span>
				</TooltipTrigger>
				<TooltipContent side="right">Tooltip content</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const DisabledTrigger: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<button
						type="button"
						disabled
						className="rounded-none bg-foreground px-4 py-2 text-xs text-background opacity-50"
					>
						Disabled button
					</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip on disabled element</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};
