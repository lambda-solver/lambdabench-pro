import { Schema } from "effect";

export const IncludeDelim = Schema.NullOr(Schema.Literals(["prev", "next"]));
export type IncludeDelim = typeof IncludeDelim.Type;

export const TextSpan = Schema.Struct({
  endIdx: Schema.Number,
  startIdx: Schema.Number,
  text: Schema.String,
});

export const isBlank = (text: string): boolean => text.trim().length === 0;

export const buildDelimiterPattern = (delimiters: ReadonlyArray<string>): RegExp =>
  new RegExp(
    [...delimiters]
      .toSorted((a, b) => b.length - a.length)
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
      .join("|"),
    "g",
  );

export const findDelimiterSpans = (text: string, pattern: RegExp): Array<typeof TextSpan.Type> =>
  [...text.matchAll(pattern)].flatMap((match) => {
    const raw = match[0];
    const startIdx = match.index;
    if (raw === undefined || startIdx === undefined) return [];
    return [{ endIdx: startIdx + raw.length, startIdx, text: raw }];
  });

export const splitTextByMatches = (
  text: string,
  matches: ReadonlyArray<typeof TextSpan.Type>,
  includeDelim: IncludeDelim,
): Array<typeof TextSpan.Type> => {
  if (matches.length === 0) {
    return text.length === 0 ? [] : [{ endIdx: text.length, startIdx: 0, text }];
  }

  const parts: Array<typeof TextSpan.Type> = [];

  switch (includeDelim) {
    case "prev": {
      let cursor = 0;
      for (const match of matches) {
        parts.push({
          endIdx: match.endIdx,
          startIdx: cursor,
          text: text.slice(cursor, match.endIdx),
        });
        cursor = match.endIdx;
      }
      if (cursor < text.length) {
        parts.push({
          endIdx: text.length,
          startIdx: cursor,
          text: text.slice(cursor),
        });
      }
      break;
    }
    case "next": {
      const first = matches[0];
      if (first !== undefined) {
        parts.push({
          endIdx: first.startIdx,
          startIdx: 0,
          text: text.slice(0, first.startIdx),
        });
      }
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        if (current === undefined) continue;
        const next = matches[i + 1];
        const endIdx = next?.startIdx ?? text.length;
        parts.push({
          endIdx,
          startIdx: current.startIdx,
          text: text.slice(current.startIdx, endIdx),
        });
      }
      break;
    }
    default: {
      let cursor = 0;
      for (const match of matches) {
        parts.push({
          endIdx: match.startIdx,
          startIdx: cursor,
          text: text.slice(cursor, match.startIdx),
        });
        cursor = match.endIdx;
      }
      if (cursor <= text.length) {
        parts.push({
          endIdx: text.length,
          startIdx: cursor,
          text: text.slice(cursor),
        });
      }
    }
  }

  return parts.filter((part) => part.text.length > 0);
};

export const splitLines = (input: string): Array<typeof TextSpan.Type> => {
  const lines: Array<typeof TextSpan.Type> = [];
  let cursor = 0;

  while (cursor < input.length) {
    const newlineIdx = input.indexOf("\n", cursor);
    const endIdx = newlineIdx === -1 ? input.length : newlineIdx + 1;
    lines.push({
      endIdx,
      startIdx: cursor,
      text: input.slice(cursor, endIdx),
    });
    cursor = endIdx;
  }

  return lines;
};
