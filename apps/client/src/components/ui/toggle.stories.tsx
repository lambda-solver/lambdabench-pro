import type { Meta, StoryObj } from "@storybook/react";
import { Bold, Italic } from "lucide-react";

import { Toggle } from "./toggle";

const meta = {
	component: Toggle,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/Toggle",
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: (
			<>
				<Bold />
				Bold
			</>
		),
		defaultPressed: false,
	},
};

export const Pressed: Story = {
	args: {
		children: (
			<>
				<Bold />
				Bold
			</>
		),
		defaultPressed: true,
	},
};

export const Outline: Story = {
	args: {
		children: (
			<>
				<Italic />
				Italic
			</>
		),
		variant: "outline",
		defaultPressed: false,
	},
};

export const OutlinePressed: Story = {
	args: {
		children: (
			<>
				<Italic />
				Italic
			</>
		),
		variant: "outline",
		defaultPressed: true,
	},
};

export const Small: Story = {
	args: {
		children: (
			<>
				<Bold />
				Bold
			</>
		),
		size: "sm",
		defaultPressed: false,
	},
};

export const Large: Story = {
	args: {
		children: (
			<>
				<Bold />
				Bold
			</>
		),
		size: "lg",
		defaultPressed: false,
	},
};

export const Disabled: Story = {
	args: {
		children: (
			<>
				<Bold />
				Bold
			</>
		),
		disabled: true,
		defaultPressed: false,
	},
};
