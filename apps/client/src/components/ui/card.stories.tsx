import type { Meta, StoryObj } from "@storybook/react";

import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";

const meta = {
	component: Card,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/Card",
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
			</CardHeader>
			<CardContent>
				<p>This is the card content area. You can put any content here.</p>
			</CardContent>
			<CardFooter>
				<span className="text-muted-foreground">Card footer</span>
			</CardFooter>
		</Card>
	),
};

export const WithDescription: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>
					A brief description of the card content below.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Cards with descriptions provide additional context for the user.</p>
			</CardContent>
			<CardFooter>
				<span className="text-muted-foreground">Card footer</span>
			</CardFooter>
		</Card>
	),
};

export const Small: Story = {
	render: () => (
		<Card size="sm" className="w-80">
			<CardHeader>
				<CardTitle>Small Card</CardTitle>
				<CardDescription>
					Compact card variant with reduced spacing.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					This card uses the &quot;sm&quot; size prop for a more compact layout.
				</p>
			</CardContent>
			<CardFooter>
				<span className="text-muted-foreground">Card footer</span>
			</CardFooter>
		</Card>
	),
};

export const WithAction: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>
					Card with an action button in the header.
				</CardDescription>
				<CardAction>
					<span className="cursor-pointer text-xs text-[var(--sol-blue)] hover:underline">
						Action
					</span>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p>
					Action elements appear in the top-right corner of the card header.
				</p>
			</CardContent>
			<CardFooter>
				<span className="text-muted-foreground">Card footer</span>
			</CardFooter>
		</Card>
	),
};

export const AllVariants: Story = {
	parameters: {
		layout: "fullscreen",
	},
	render: () => (
		<div className="flex flex-wrap items-start gap-6 p-8">
			<Card className="w-72">
				<CardHeader>
					<CardTitle>Default</CardTitle>
					<CardDescription>Standard card with default sizing.</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Default card content for general use.</p>
				</CardContent>
				<CardFooter>
					<span className="text-muted-foreground">Footer</span>
				</CardFooter>
			</Card>
			<Card size="sm" className="w-72">
				<CardHeader>
					<CardTitle>Small</CardTitle>
					<CardDescription>Compact card with reduced spacing.</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Small card content for compact layouts.</p>
				</CardContent>
				<CardFooter>
					<span className="text-muted-foreground">Footer</span>
				</CardFooter>
			</Card>
		</div>
	),
};
