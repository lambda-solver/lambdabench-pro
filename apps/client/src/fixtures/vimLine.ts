import type { VimLineFixture } from "./index";

export const vimLineFixtures: ReadonlyArray<VimLineFixture> = [
  {
    content: 'import { Effect } from "effect";',
    n: 42,
    name: "with-line-number",
  },
  {
    content: "  const result = yield* service.call();",
    name: "without-line-number",
  },
  {
    content: "~",
    name: "tilde-line",
    tilde: true,
  },
  {
    content: 'export const processItem = Effect.fn("processItem")(function* (id: string) {',
    n: 128,
    name: "multi-digit-line",
  },
  {
    content: "",
    n: 7,
    name: "empty-content",
  },
];
