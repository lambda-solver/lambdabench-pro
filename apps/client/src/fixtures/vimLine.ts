import type { VimLineFixture } from "./index";

export const vimLineFixtures: readonly VimLineFixture[] = [
  {
    name: "with-line-number",
    n: 42,
    content: 'import { Effect } from "effect";',
  },
  {
    name: "without-line-number",
    content: "  const result = yield* service.call();",
  },
  {
    name: "tilde-line",
    tilde: true,
    content: "~",
  },
  {
    name: "multi-digit-line",
    n: 128,
    content:
      'export const processItem = Effect.fn("processItem")(function* (id: string) {',
  },
  {
    name: "empty-content",
    n: 7,
    content: "",
  },
];
