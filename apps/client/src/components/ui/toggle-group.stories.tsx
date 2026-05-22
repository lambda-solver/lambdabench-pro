import type { Meta, StoryObj } from "@storybook/react";
import { Bold, Italic, Underline } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = {
	component: ToggleGroup,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/ToggleGroup",
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<ToggleGroup multiple defaultValue={["bold"]}>
			<ToggleGroupItem value="bold" aria-label="Bold">
				<Bold className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic">
				<Italic className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline">
				<Underline className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const SingleSelection: Story = {
	render: () => (
		<ToggleGroup defaultValue={["bold"]}>
			<ToggleGroupItem value="bold" aria-label="Bold">
				<Bold className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic">
				<Italic className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline">
				<Underline className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Outline: Story = {
	render: () => (
		<ToggleGroup variant="outline" multiple defaultValue={["underline"]}>
			<ToggleGroupItem value="bold" aria-label="Bold">
				<Bold className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic">
				<Italic className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline">
				<Underline className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Small: Story = {
	render: () => (
		<ToggleGroup size="sm" multiple defaultValue={["italic"]}>
			<ToggleGroupItem value="bold" aria-label="Bold">
				<Bold className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic">
				<Italic className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline">
				<Underline className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<ToggleGroup orientation="vertical" multiple defaultValue={["bold"]}>
			<ToggleGroupItem value="bold" aria-label="Bold">
				<Bold className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic">
				<Italic className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline">
				<Underline className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const WithSpacing: Story = {
	render: () => (
		<ToggleGroup spacing={2} multiple defaultValue={["bold", "underline"]}>
			<ToggleGroupItem value="bold" aria-label="Bold">
				<Bold className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic">
				<Italic className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline">
				<Underline className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};
