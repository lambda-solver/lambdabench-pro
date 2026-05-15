import type { Meta, StoryObj } from "@storybook/react";
import { createFixtureDecorator } from "@/fixtures/decorator";
import { vimLineFixtures } from "@/fixtures/vimLine";
import { TildeLine, VimLine } from "./VimLine";

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
    createFixtureDecorator(vimLineFixtures, (fixture) => {
      const props = {
        ...(fixture.n !== undefined && { n: fixture.n }),
        ...(fixture.tilde !== undefined && { tilde: fixture.tilde }),
      };
      return (
        <div className="font-mono text-sm p-4">
          {fixture.tilde ? (
            <TildeLine />
          ) : (
            <VimLine {...props}>{fixture.content}</VimLine>
          )}
        </div>
      );
    }),
  ],
} satisfies Meta<typeof VimLine>;

export default meta;
type Story = StoryObj<typeof meta>;

const firstVimFixture = vimLineFixtures[0]!;

export const Default: Story = {
  args: {
    ...(firstVimFixture.n !== undefined && { n: firstVimFixture.n }),
    children: firstVimFixture.content,
  },
};

export const WithLineNumber: Story = {
  args: {
    n: 42,
    children: 'import { Effect } from "effect";',
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
