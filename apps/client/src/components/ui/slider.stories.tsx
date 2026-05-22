import type { Meta, StoryObj } from "@storybook/react";
import { Slider } from "./slider";

const meta = {
	component: Slider,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/Slider",
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { defaultValue: [50], className: "w-48" },
};

export const Range: Story = {
	args: { defaultValue: [25, 75], className: "w-48" },
};

export const MinMax: Story = {
	args: { min: 0, max: 200, defaultValue: [100], className: "w-48" },
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: [40], className: "w-48" },
};
