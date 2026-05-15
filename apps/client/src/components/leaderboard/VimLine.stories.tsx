import type { Meta, StoryObj } from "@storybook/react";
import { VimLine, TildeLine } from "./VimLine";
import { vimLineFixtures } from "@/fixtures/vimLine";
import { createFixtureDecorator } from "@/fixtures/decorator";

const meta = {
  title: "Leaderboard/VimLine",
  component: VimLine,
  parameters: {
    layout: "padded",
    viewport: {
      defaultViewport: "responsive",
    },
  },
  tags: ["autodocs"],
  decorators: [
    createFixtureDecorator(vimLineFixtures, (fixture) => (
      <div className="font-mono text-sm p-4">
        {fixture.tilde ? (
          <TildeLine />
        ) : (
          <VimLine n={fixture.n}>{fixture.content}</VimLine>
        )}
      </div>
    )),
  ],
} satisfies Meta<typeof VimLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    n: vimLineFixtures[0].n,
    children: vimLineFixtures[0].content,
  },
};

export const WithLineNumber: Story = {
  args: {
    n: 42,
    children: "import { Effect } from \"effect\";",
  },
};

export const WithoutLineNumber: Story = {
  args: {
    children: "  const result = yield* service.call();",
  },
};

export const Tilde: Story = {
  args: {
    tilde: true,
    children: "~",
  },
};

export const MultiDigitLine: Story = {
  args: {
    n: 128,
    children:
      'export const processItem = Effect.fn("processItem")(function* (id: string) {',
  },
};

export const EmptyContent: Story = {
  args: {
    n: 7,
    children: "",
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
