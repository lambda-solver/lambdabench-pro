import type { Meta, StoryObj } from "@storybook/react";
import { VimLine, TildeLine } from "./VimLine";

const meta = {
  title: "Leaderboard/VimLine",
  component: VimLine,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    n: {
      control: "text",
      description: "Line number — pass null for blank gutter",
    },
    tilde: {
      control: "boolean",
      description: "Render as tilde (~) line",
    },
  },
} satisfies Meta<typeof VimLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLineNumber: Story = {
  args: {
    n: 42,
    children: "This is a line of content with line number 42",
  },
};

export const WithoutLineNumber: Story = {
  args: {
    children: "This line has no line number in the gutter",
  },
};

export const Tilde: Story = {
  args: {
    tilde: true,
    children: "~",
  },
};

export const MultipleLines: Story = {
  render: () => (
    <div className="font-mono text-sm">
      <VimLine n={1}>First line of content</VimLine>
      <VimLine n={2}>Second line with more text content here</VimLine>
      <VimLine n={3}>Third line showing the gutter alignment</VimLine>
      <TildeLine />
      <TildeLine />
    </div>
  ),
};

export const WithColoredContent: Story = {
  render: () => (
    <div className="font-mono text-sm">
      <VimLine n={1}>
        <span className="text-[var(--sol-blue)]">model-name</span>
        <span className="mx-2">95/120</span>
      </VimLine>
    </div>
  ),
};
