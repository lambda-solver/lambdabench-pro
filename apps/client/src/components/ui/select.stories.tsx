import type { Meta, StoryObj } from "@storybook/react";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select";

const meta = {
	component: SelectTrigger,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/Select",
} satisfies Meta<typeof SelectTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Select defaultValue="react">
			<SelectTrigger className="w-48">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="react">React</SelectItem>
				<SelectItem value="vue">Vue</SelectItem>
				<SelectItem value="svelte">Svelte</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithGroups: Story = {
	render: () => (
		<Select defaultValue="react">
			<SelectTrigger className="w-48">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Frontend</SelectLabel>
					<SelectItem value="react">React</SelectItem>
					<SelectItem value="vue">Vue</SelectItem>
					<SelectItem value="svelte">Svelte</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Backend</SelectLabel>
					<SelectItem value="node">Node.js</SelectItem>
					<SelectItem value="python">Python</SelectItem>
					<SelectItem value="go">Go</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Small: Story = {
	render: () => (
		<Select defaultValue="react">
			<SelectTrigger size="sm" className="w-48">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="react">React</SelectItem>
				<SelectItem value="vue">Vue</SelectItem>
				<SelectItem value="svelte">Svelte</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select defaultValue="react">
			<SelectTrigger disabled className="w-48">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="react">React</SelectItem>
				<SelectItem value="vue">Vue</SelectItem>
				<SelectItem value="svelte">Svelte</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithPlaceholder: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Pick a framework" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="react">React</SelectItem>
				<SelectItem value="vue">Vue</SelectItem>
				<SelectItem value="svelte">Svelte</SelectItem>
			</SelectContent>
		</Select>
	),
};
