/**
 * LamCodeExtractor.ts — Extract lambda calculus code from raw LLM output.
 *
 * Pure function — no Effect, no I/O. Fully unit-testable.
 */

/** Find the index of the first @helper block that precedes @main, walking up. */
const helperBlockStart = (lines: ReadonlyArray<string>, mainIdx: number): number =>
  mainIdx === 0 || !lines[mainIdx - 1]!.trim().startsWith("@")
    ? mainIdx
    : helperBlockStart(lines, mainIdx - 1);

/**
 * Collect all lines from blockStart until the first blank line after @main.
 * Uses Array.from + slice instead of a for loop — pure accumulation.
 */
const collectBlock = (
  lines: ReadonlyArray<string>,
  blockStart: number,
  mainIdx: number,
): ReadonlyArray<string> => {
  const afterBlock = lines
    .slice(blockStart)
    .findIndex((l, i) => l.trim() === "" && blockStart + i > mainIdx);
  const end = afterBlock === -1 ? lines.length : blockStart + afterBlock;
  return lines.slice(blockStart, end);
};

/**
 * Extract a lambda calculus expression from raw LLM output.
 *
 * Tries extraction strategies in priority order:
 *   1. Content inside a ```lambda ... ``` or ```lam ... ``` fence (case-insensitive).
 *   2. First line matching `@main =` in the raw text, including any preceding
 *      helper `@def` lines and trailing non-blank continuation lines.
 *   3. Trimmed raw string as a fallback.
 *
 * Returns a trimmed string ready to pass to the lam interpreter.
 */
export const extractLamCode = (raw: string): string => {
  // 1. Code fence: ```lambda or ```lam
  const fenceMatch = raw.match(/```(?:lambda|lam)\r?\n([\s\S]*?)```/i);
  if (fenceMatch?.[1] !== undefined) return fenceMatch[1].trim();

  // 2. Bare @main = ... line, with optional preceding @helper definitions
  const lines = raw.split("\n");
  const mainIdx = lines.findIndex((l) => /^@main\s*=/.test(l.trim()));
  if (mainIdx !== -1) {
    const blockStart = helperBlockStart(lines, mainIdx);
    return collectBlock(lines, blockStart, mainIdx).join("\n").trim();
  }

  // 3. Fallback: return the trimmed raw string
  return raw.trim();
};
