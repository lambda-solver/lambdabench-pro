import type { Meta, StoryObj } from "@storybook/react";

import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "./field";
import { Input } from "./input";

const meta = {
	component: Field,
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "responsive",
		},
	},
	tags: ["autodocs"],
	title: "UI/Field",
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Field className="w-72">
			<FieldLabel htmlFor="email">Email</FieldLabel>
			<FieldContent>
				<Input id="email" type="email" placeholder="email@example.com" />
				<FieldDescription>We&apos;ll never share your email.</FieldDescription>
			</FieldContent>
		</Field>
	),
};

export const WithError: Story = {
	render: () => (
		<Field className="w-72">
			<FieldLabel htmlFor="email">Email</FieldLabel>
			<FieldContent>
				<Input id="email" type="email" placeholder="email@example.com" />
				<FieldDescription>We&apos;ll never share your email.</FieldDescription>
			</FieldContent>
			<FieldError>This field is required</FieldError>
		</Field>
	),
};

export const Horizontal: Story = {
	render: () => (
		<Field className="w-96" orientation="horizontal">
			<FieldLabel htmlFor="name">Full Name</FieldLabel>
			<FieldContent>
				<Input id="name" placeholder="Enter your name" />
				<FieldDescription>
					This will be displayed on your profile.
				</FieldDescription>
			</FieldContent>
		</Field>
	),
};

export const WithFieldSet: Story = {
	render: () => (
		<FieldSet className="w-96">
			<FieldLegend>Preferences</FieldLegend>
			<Field orientation="horizontal">
				<FieldLabel htmlFor="newsletter">Newsletter</FieldLabel>
				<FieldContent>
					<Input id="newsletter" type="email" placeholder="email@example.com" />
					<FieldDescription>Receive weekly updates.</FieldDescription>
				</FieldContent>
			</Field>
			<Field orientation="horizontal">
				<FieldLabel htmlFor="notifications">Notifications</FieldLabel>
				<FieldContent>
					<Input
						id="notifications"
						type="email"
						placeholder="notify@example.com"
					/>
					<FieldDescription>
						Get notified about important changes.
					</FieldDescription>
				</FieldContent>
			</Field>
		</FieldSet>
	),
};

export const WithFieldErrorArray: Story = {
	render: () => (
		<Field className="w-72">
			<FieldLabel htmlFor="password">Password</FieldLabel>
			<FieldContent>
				<Input id="password" type="password" placeholder="Enter password" />
				<FieldDescription>Must be at least 8 characters.</FieldDescription>
			</FieldContent>
			<FieldError
				errors={[
					{ message: "Password must be at least 8 characters" },
					{ message: "Password must contain a number" },
				]}
			/>
		</Field>
	),
};
