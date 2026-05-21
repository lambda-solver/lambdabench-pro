import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { buttonFixtures } from "@/fixtures/button";
import { createFixtureDecorator } from "@/fixtures/decorator";

const meta = {
  component: Button,
  decorators: [
    createFixtureDecorator(buttonFixtures, (fixture) => (
      <div className="p-4">
        <Button variant={fixture.variant} size={fixture.size} disabled={fixture.disabled}>
          {fixture.label}
        </Button>
      </div>
    )),
  ],
  parameters: {
    layout: "centered",
    viewport: {
      defaultViewport: "responsive",
    },
  },
  tags: ["autodocs"],
  title: "UI/Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const firstButtonFixture = buttonFixtures[0]!;

export const Default: Story = {
  args: {
    children: firstButtonFixture.label,
    variant: firstButtonFixture.variant,
  },
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

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large", size: "lg" },
};

export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
