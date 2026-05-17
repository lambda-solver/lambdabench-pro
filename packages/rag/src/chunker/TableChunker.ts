import type { Chunk, TokenizerError } from "@repo/domain/Chunk";
import { Chunker, Tokenizer } from "@repo/domain/Chunk";
import { Context, Effect, Layer, Schema } from "effect";
import { WordTokenizerLive } from "../tokenizer/DelimTokenizer";
import { isBlank, splitLines } from "./utils";

interface RowSlice {
  text: string;
  startIdx: number;
  endIdx: number;
  rowIndex: number;
}

interface ParsedTable {
  header: string;
  headerColumns: Array<string>;
  rows: Array<RowSlice>;
  footer: string;
}

const detectFormat = (
  input: string,
  format: typeof TableFormat.Type,
): Exclude<typeof TableFormat.Type, "auto"> => {
  if (format !== "auto") return format;
  return input.toLowerCase().includes("<table") ? "html" : "markdown";
};

/* Accepts forms like: | --- | :---: | ---: |*/
const isMarkdownSeparatorRow = (line: string): boolean =>
  /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());

const splitMarkdownTable = (input: string): ParsedTable | null => {
  const lines = splitLines(input);
  if (lines.length < 3) return null;

  for (let i = 1; i < lines.length; i += 1) {
    const headerLine = lines[i - 1];
    const separatorLine = lines[i];
    if (headerLine === undefined || separatorLine === undefined) continue;
    if (!isMarkdownSeparatorRow(separatorLine.text)) continue;

    const dataRows: Array<(typeof lines)[number]> = [];
    let cursor = i + 1;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (!line || line.text.trim().length === 0) break;
      dataRows.push(line);
      cursor += 1;
    }

    if (dataRows.length === 0) continue;

    const headerColumns = headerLine.text
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return {
      footer: "",
      header: `${headerLine.text}${separatorLine.text}`,
      headerColumns,
      rows: dataRows.map(({ text, startIdx, endIdx }, rowIndex) => ({
        endIdx,
        rowIndex,
        startIdx,
        text,
      })),
    };
  }

  return null;
};

const chunkRowsBySize = (
  rows: ReadonlyArray<RowSlice>,
  chunkSize: number,
): Array<Array<RowSlice>> => {
  const groups: Array<Array<RowSlice>> = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    groups.push(rows.slice(i, i + chunkSize));
  }
  return groups;
};

const toRowModeChunk = (
  table: ParsedTable,
  format: Exclude<typeof TableFormat.Type, "auto">,
  mode: typeof TableMode.Type,
): Chunk | null => {
  const first = table.rows.at(0);
  const last = table.rows.at(-1);
  if (!first || !last) return null;
  const tableHasHeader = table.header.trim().length > 0;

  return {
    endIdx: last.endIdx,
    metadata: {
      isTable: true,
      tableFormat: format,
      tableHasHeader,
      tableMode: mode,
      tableRowCount: table.rows.length,
      tableRowEnd: last.rowIndex,
      tableRowStart: first.rowIndex,
      ...(table.headerColumns.length > 0
        ? { tableColumns: table.headerColumns }
        : {}),
    },
    startIdx: first.startIdx,
    text: `${table.header}${table.rows.map((r) => r.text).join("")}${table.footer}`,
    tokenCount: table.rows.length,
  };
};

const findHtmlRowsInRange = (
  input: string,
  startIdx: number,
  endIdx: number,
): Array<RowSlice> => {
  const rows: Array<RowSlice> = [];
  const lower = input.toLowerCase();
  let cursor = startIdx;
  let rowIndex = 0;

  while (cursor < endIdx) {
    const trStart = lower.indexOf("<tr", cursor);
    if (trStart === -1 || trStart >= endIdx) break;

    const trOpenEnd = lower.indexOf(">", trStart);
    if (trOpenEnd === -1 || trOpenEnd >= endIdx) break;

    const trCloseStart = lower.indexOf("</tr>", trOpenEnd + 1);
    if (trCloseStart === -1) break;

    const trEnd = trCloseStart + "</tr>".length;
    if (trEnd > endIdx) break;

    rows.push({
      endIdx: trEnd,
      rowIndex,
      startIdx: trStart,
      text: input.slice(trStart, trEnd),
    });
    rowIndex += 1;
    cursor = trEnd;
  }

  return rows;
};

const splitHtmlTable = (input: string): ParsedTable | null => {
  const lower = input.toLowerCase();

  const tableStart = lower.indexOf("<table");
  if (tableStart === -1) return null;
  const tableOpenEnd = lower.indexOf(">", tableStart);
  if (tableOpenEnd === -1) return null;
  const tableCloseStart = lower.indexOf("</table>", tableOpenEnd + 1);
  if (tableCloseStart === -1) return null;
  const tableEnd = tableCloseStart + "</table>".length;

  const tbodyOpenStart = lower.indexOf("<tbody", tableOpenEnd + 1);
  let rowSearchStart = tableOpenEnd + 1;
  let rowSearchEnd = tableCloseStart;

  if (tbodyOpenStart !== -1 && tbodyOpenStart < tableCloseStart) {
    const tbodyOpenEnd = lower.indexOf(">", tbodyOpenStart);
    if (tbodyOpenEnd === -1 || tbodyOpenEnd > tableCloseStart) return null;
    rowSearchStart = tbodyOpenEnd + 1;
    const tbodyCloseStart = lower.indexOf("</tbody>", rowSearchStart);
    rowSearchEnd = tbodyCloseStart === -1 || tbodyCloseStart > tableCloseStart
      ? tableCloseStart
      : tbodyCloseStart;
  }

  const rows = findHtmlRowsInRange(input, rowSearchStart, rowSearchEnd);
  if (rows.length === 0) return null;
  const first = rows.at(0);
  const last = rows.at(-1);
  if (!first || !last) return null;
  return {
    footer: input.slice(last.endIdx, tableEnd),
    header: input.slice(tableStart, first.startIdx),
    headerColumns: [],
    rows,
  };
};
const TableMode = Schema.Literals(["row", "token"]);
const TableFormat = Schema.Literals(["markdown", "html", "auto"]);

const TableChunkerConfigSchema = Schema.Struct({
  chunkSize: Schema.Number.check(Schema.isGreaterThan(0)),
  format: TableFormat,
  mode: TableMode,
});

export type TableChunkerConfig = typeof TableChunkerConfigSchema.Type;

export const TableChunkerConfig = Context.Reference<TableChunkerConfig>(
  "TableChunkerConfig",
  {
    defaultValue: () => ({
      chunkSize: 3,
      format: "auto",
      mode: "row",
    }),
  },
);

export class TableChunker extends Context.Service<
  TableChunker,
  Chunker["Service"]
>()("TableChunker", {
  make: Effect.gen(function*() {
    const tokenizer = yield* Tokenizer;
    const config = yield* TableChunkerConfig;
    const { chunkSize, format, mode } = yield* Schema.decodeEffect(
      TableChunkerConfigSchema,
    )(config);

    const toTokenModeChunks = (
      table: ParsedTable,
      chunkSize: number,
      format: Exclude<typeof TableFormat.Type, "auto">,
    ): Effect.Effect<Array<Chunk>, TokenizerError> =>
      Effect.gen(function*() {
        const header = yield* tokenizer.countTokens(table.header);
        const footer = table.footer.length > 0
          ? yield* tokenizer.countTokens(table.footer)
          : 0;

        const baseTokens = header + footer;
        const chunks: Array<Chunk> = [];
        let currentRows: Array<RowSlice> = [];
        let currentTokens = 0;

        const flushCurrent = Effect.fn(function*() {
          if (currentRows.length === 0) return;
          const first = currentRows[0];
          const last = currentRows[currentRows.length - 1];
          if (!first || !last) return;
          const tableHasHeader = table.header.trim().length > 0;
          const chunkText = table.header
            + currentRows.map((row) => row.text).join("")
            + table.footer;
          chunks.push({
            endIdx: last.endIdx,
            metadata: {
              isTable: true,
              tableFormat: format,
              tableHasHeader,
              tableMode: mode,
              tableRowCount: currentRows.length,
              tableRowEnd: last.rowIndex,
              tableRowStart: first.rowIndex,
              ...(table.headerColumns.length > 0
                ? { tableColumns: table.headerColumns }
                : {}),
            },
            startIdx: first.startIdx,
            text: chunkText,
            tokenCount: baseTokens + currentTokens,
          });
          currentRows = [];
          currentTokens = 0;
        });

        for (const row of table.rows) {
          const rowTokens = yield* tokenizer.countTokens(row.text);
          const wouldExceed = baseTokens + currentTokens + rowTokens > chunkSize;
          // If current chunk already has rows and next row would exceed budget, flush.
          if (wouldExceed && currentRows.length > 0) {
            yield* flushCurrent();
          }
          // Always add at least one row, even if it alone exceeds chunk size.
          currentRows.push(row);
          currentTokens += rowTokens;
        }
        yield* flushCurrent();
        return chunks;
      });

    const chunk = Effect.fn("TableChunker.chunk")(function*(input: string) {
      if (isBlank(input)) return [];
      const narrowFormat = detectFormat(input, format);
      const parsed = narrowFormat === "markdown"
        ? splitMarkdownTable(input)
        : splitHtmlTable(input);
      if (!parsed) return [];
      switch (narrowFormat) {
        case "html": {
          switch (mode) {
            case "row": {
              const rowGroups = chunkRowsBySize(parsed.rows, chunkSize);
              return rowGroups.flatMap((rows) => {
                const built = toRowModeChunk(
                  {
                    footer: parsed.footer,
                    header: parsed.header,
                    headerColumns: parsed.headerColumns,
                    rows,
                  },
                  narrowFormat,
                  mode,
                );
                return built ? [built] : [];
              });
            }
            case "token": {
              return yield* toTokenModeChunks(parsed, chunkSize, narrowFormat);
            }
            default: {
              return [];
            }
          }
        }
        case "markdown": {
          switch (mode) {
            case "row": {
              const rowGroups = chunkRowsBySize(parsed.rows, chunkSize);
              return rowGroups.flatMap((rows) => {
                const build = toRowModeChunk(
                  {
                    footer: parsed.footer,
                    header: parsed.header,
                    headerColumns: parsed.headerColumns,
                    rows,
                  },
                  narrowFormat,
                  mode,
                );
                return build ? [build] : [];
              });
            }
            case "token": {
              return yield* toTokenModeChunks(parsed, chunkSize, narrowFormat);
            }
          }
        }
      }
    });

    return { chunk, name: "table" };
  }),
}) {}

export const TableChunkerLive = Layer.effect(Chunker)(TableChunker.make).pipe(
  Layer.provide(WordTokenizerLive),
);
