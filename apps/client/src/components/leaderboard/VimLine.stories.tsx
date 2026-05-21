import type { Meta, StoryObj } from "@storybook/react";
import { TildeLine, VimLine } from "./VimLine";

import { createFixtureDecorator } from "@/fixtures/decorator";
import { vimLineFixtures } from "@/fixtures/vimLine";

const meta = {
  component: VimLine,
  decorators: [
    createFixtureDecorator(vimLineFixtures, (fixture) => {
      const props = {
        ...(fixture.n !== undefined && { n: fixture.n }),
        ...(fixture.tilde !== undefined && { tilde: fixture.tilde }),
      };
      return (
        <div className="font-mono text-sm p-4">
          {fixture.tilde ? <TildeLine /> : <VimLine {...props}>{fixture.content}</VimLine>}
        </div>
      );
    }),
  ],
  parameters: {
    layout: "padded",
    viewport: {
      defaultViewport: "responsive",
    },
  },
  tags: ["autodocs"],
  title: "Leaderboard/VimLine",
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
    children: 'import { Effect } from "effect";',
    n: 42,
  },
};

export const WithoutLineNumber: Story = {
  args: {
    children: "  const result = yield* service.call();",
  },
};

export const Tilde: Story = {
  args: {
    children: "~",
    tilde: true,
  },
};

export const MultiDigitLine: Story = {
  args: {
    children: 'export const processItem = Effect.fn("processItem")(function* (id: string) {',
    n: 128,
  },
};

export const EmptyContent: Story = {
  args: {
    children: "",
    n: 7,
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
