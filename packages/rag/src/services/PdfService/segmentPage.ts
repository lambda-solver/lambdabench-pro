import { Array, Option, pipe, String } from "effect";
import { normalizeWhitespace } from "../../utils";
import type { PdfBlock, PdfPage } from "./PdfDocument";

const PDF_LINE_Y_TOLERANCE = 2.5;
const PDF_COLUMN_X_TOLERANCE = 12;
const PDF_MIN_COLUMN_GAP = 18;
const PDF_MIN_TABLE_LINES = 3;
const PDF_MIN_SHARED_TABLE_COLUMNS = 3;

type PdfTextItem = {
  readonly str?: unknown;
  readonly transform?: unknown;
  readonly width?: unknown;
  readonly height?: unknown;
};

type PositionedPdfTextItem = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type PdfLine = {
  readonly text: string;
  readonly items: ReadonlyArray<PositionedPdfTextItem>;
  readonly maxGap: number;
};

type PdfTableRegion = {
  readonly startLine: number;
  readonly endLineExclusive: number;
  readonly anchors: ReadonlyArray<number>;
};

type PdfLineSpan = {
  readonly startLine: number;
  readonly endLineExclusive: number;
};

type PageSegment =
  | {
      readonly _tag: "paragraph";
      readonly text: string;
    }
  | {
      readonly _tag: "table";
      readonly text: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toPdfPosition = (
  value: unknown,
): Option.Option<{
  readonly x: number;
  readonly y: number;
}> => {
  if (!globalThis.Array.isArray(value) || value.length < 6) {
    return Option.none();
  }

  const x = value[4];
  const y = value[5];
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return Option.none();
  }

  return Option.some({ x, y });
};

const isPdfTextItem = (item: unknown): item is PdfTextItem =>
  isRecord(item) &&
  "str" in item &&
  "transform" in item &&
  Array.isArray(item["transform"]) &&
  item["transform"].length >= 6;

const toPositionedPdfTextItem = (
  item: unknown,
): Option.Option<PositionedPdfTextItem> => {
  if (!isPdfTextItem(item)) {
    return Option.none();
  }

  const text = typeof item.str === "string" ? item.str : "";
  if (!String.isNonEmpty(String.trim(text))) {
    return Option.none();
  }

  return pipe(
    toPdfPosition(item.transform),
    Option.map((position) => ({
      text,
      x: position.x,
      y: position.y,
      width: isFiniteNumber(item.width) ? item.width : 0,
      height: isFiniteNumber(item.height) ? item.height : 0,
    })),
  );
};

const sortPdfTextItems = (
  items: ReadonlyArray<PositionedPdfTextItem>,
): Array<PositionedPdfTextItem> =>
  [...items].sort((left, right) => {
    if (right.y !== left.y) {
      return right.y - left.y;
    }

    return left.x - right.x;
  });

const getGapBetweenItems = (
  previous: PositionedPdfTextItem,
  current: PositionedPdfTextItem,
) => current.x - (previous.x + previous.width);

const appendLineText = (currentText: string, nextText: string, gap: number) => {
  if (gap >= PDF_MIN_COLUMN_GAP) {
    return `${currentText} | ${String.trim(nextText)}`;
  }

  return /^\s/.test(nextText)
    ? `${currentText}${nextText}`
    : `${currentText} ${nextText}`;
};

const groupAdjacentPdfItems = (
  items: ReadonlyArray<PositionedPdfTextItem>,
): Array<Array<PositionedPdfTextItem>> =>
  sortPdfTextItems(items).reduce<Array<Array<PositionedPdfTextItem>>>(
    (grouped, item) => {
      const currentLine = grouped.at(-1);
      const currentY = currentLine?.at(-1)?.y;

      if (
        !currentLine ||
        currentY === undefined ||
        Math.abs(currentY - item.y) > PDF_LINE_Y_TOLERANCE
      ) {
        grouped.push([item]);
        return grouped;
      }

      currentLine.push(item);
      return grouped;
    },
    [],
  );

const summarizePdfLine = (
  lineItems: ReadonlyArray<PositionedPdfTextItem>,
): PdfLine => {
  const itemsByX = [...lineItems].sort((left, right) => left.x - right.x);

  const maxGap = itemsByX.reduce((largestGap, item, index) => {
    const previous = itemsByX[index - 1];
    return previous
      ? Math.max(largestGap, getGapBetweenItems(previous, item))
      : largestGap;
  }, 0);

  const text = itemsByX.reduce((lineText, item, index) => {
    const previous = itemsByX[index - 1];
    if (!previous) {
      return item.text;
    }

    return appendLineText(
      lineText,
      item.text,
      getGapBetweenItems(previous, item),
    );
  }, "");

  return {
    items: itemsByX,
    maxGap,
    text: normalizeWhitespace(text),
  };
};

const groupPdfLines = (
  items: ReadonlyArray<PositionedPdfTextItem>,
): Array<PdfLine> => groupAdjacentPdfItems(items).map(summarizePdfLine);

const getSharedPdfAnchors = (lines: ReadonlyArray<PdfLine>): Array<number> => {
  const counts = new Map<number, number>();

  for (const line of lines) {
    const anchors = new Set(
      line.items.map(
        (item) =>
          Math.round(item.x / PDF_COLUMN_X_TOLERANCE) * PDF_COLUMN_X_TOLERANCE,
      ),
    );
    for (const anchor of anchors) {
      counts.set(anchor, (counts.get(anchor) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(
      ([, count]) =>
        count >= Math.max(PDF_MIN_TABLE_LINES, Math.ceil(lines.length * 0.6)),
    )
    .map(([anchor]) => anchor)
    .sort((left, right) => left - right);
};

const findCandidateLineSpans = (
  lines: ReadonlyArray<PdfLine>,
): Array<PdfLineSpan> => {
  const spans: Array<PdfLineSpan> = [];
  let startLine: number | undefined;

  for (const [index, line] of lines.entries()) {
    if (line.items.length >= 2 && line.maxGap >= PDF_MIN_COLUMN_GAP) {
      startLine ??= index;
      continue;
    }

    if (startLine !== undefined) {
      spans.push({ startLine, endLineExclusive: index });
      startLine = undefined;
    }
  }

  if (startLine !== undefined) {
    spans.push({ startLine, endLineExclusive: lines.length });
  }

  return spans;
};

const toPdfTableBlock = (
  lines: ReadonlyArray<PdfLine>,
  span: PdfLineSpan,
): Option.Option<PdfTableRegion> => {
  const blockLines = lines.slice(span.startLine, span.endLineExclusive);
  if (blockLines.length < PDF_MIN_TABLE_LINES) {
    return Option.none();
  }

  const anchors = getSharedPdfAnchors(blockLines);
  if (anchors.length < PDF_MIN_SHARED_TABLE_COLUMNS) {
    return Option.none();
  }

  return Option.some({ ...span, anchors });
};

const findPdfTableBlocks = (
  lines: ReadonlyArray<PdfLine>,
): Array<PdfTableRegion> =>
  findCandidateLineSpans(lines).flatMap((span) =>
    Array.fromOption(toPdfTableBlock(lines, span)),
  );

const findAnchorIndex = (
  anchors: ReadonlyArray<number>,
  item: PositionedPdfTextItem,
) => {
  const matchingAnchorIndex = anchors.reduce(
    (currentIndex, anchor, anchorIndex) =>
      item.x >= anchor - PDF_COLUMN_X_TOLERANCE ? anchorIndex : currentIndex,
    -1,
  );

  return matchingAnchorIndex === -1 ? 0 : matchingAnchorIndex;
};

const lineToMarkdownRow = (
  line: PdfLine,
  anchors: ReadonlyArray<number>,
): Array<string> => {
  const cells = anchors.map(() => "");

  for (const item of line.items) {
    const anchorIndex = findAnchorIndex(anchors, item);
    const previous = cells[anchorIndex] ?? "";
    cells[anchorIndex] =
      previous.length === 0 ? item.text : `${previous} ${item.text}`;
  }

  return cells.map((cell) => normalizeWhitespace(cell));
};

const pdfTableBlockToMarkdown = (
  lines: ReadonlyArray<PdfLine>,
  anchors: ReadonlyArray<number>,
): string => {
  const rows = lines
    .map((line) => lineToMarkdownRow(line, anchors))
    .filter((row) => row.some((cell) => String.isNonEmpty(cell)));

  const header = rows[0] ?? [];
  const body = rows.slice(1);
  if (header.length === 0 || body.length === 0) return "";

  const separator = header.map(() => "---");
  const markdownRows = [header, separator, ...body].map(
    (row) => `| ${row.join(" | ")} |`,
  );

  return `${markdownRows.join("\n")}\n`;
};

const toParagraphSegment = (
  lines: ReadonlyArray<PdfLine>,
): Option.Option<PageSegment> => {
  const text = normalizeWhitespace(lines.map((line) => line.text).join("\n"));
  return String.isNonEmpty(text)
    ? Option.some({ _tag: "paragraph", text })
    : Option.none();
};

const toTableSegment = (
  lines: ReadonlyArray<PdfLine>,
  anchors: ReadonlyArray<number>,
): Option.Option<PageSegment> => {
  const text = pdfTableBlockToMarkdown(lines, anchors);
  return String.isNonEmpty(String.trim(text))
    ? Option.some({ _tag: "table", text })
    : Option.none();
};

const toPageSegments = (
  lines: ReadonlyArray<PdfLine>,
  blocks: ReadonlyArray<PdfTableRegion>,
): Array<PageSegment> => {
  const { cursor, segments } = blocks.reduce<{
    cursor: number;
    segments: Array<PageSegment>;
  }>(
    (state, block) => {
      const paragraphSegment = toParagraphSegment(
        lines.slice(state.cursor, block.startLine),
      );
      const tableLines = lines.slice(block.startLine, block.endLineExclusive);
      const tableSegment = toTableSegment(tableLines, block.anchors);
      const contentSegment = Option.isSome(tableSegment)
        ? tableSegment
        : toParagraphSegment(tableLines);

      return {
        cursor: block.endLineExclusive,
        segments: [
          ...state.segments,
          ...Array.fromOption(paragraphSegment),
          ...Array.fromOption(contentSegment),
        ],
      };
    },
    { cursor: 0, segments: [] },
  );

  return [
    ...segments,
    ...Array.fromOption(toParagraphSegment(lines.slice(cursor))),
  ];
};

const toPageBlocks = (
  pageNumber: number,
  segments: ReadonlyArray<PageSegment>,
): Array<PdfBlock> =>
  segments.flatMap((segment, readingOrder) => {
    const block =
      segment._tag === "table"
        ? toTableBlock(pageNumber, readingOrder, segment.text)
        : toParagraphBlock(pageNumber, readingOrder, segment.text);

    return Array.fromOption(block);
  });

const toParagraphBlock = (
  pageNumber: number,
  readingOrder: number,
  text: string,
): Option.Option<PdfBlock> => {
  const normalizedText = normalizeWhitespace(text);
  if (!String.isNonEmpty(normalizedText)) return Option.none();

  return Option.some({
    _tag: "paragraph",
    id: `page-${pageNumber}-block-${readingOrder}`,
    pageNumber,
    readingOrder,
    text: normalizedText,
  });
};

const toTableBlock = (
  pageNumber: number,
  readingOrder: number,
  text: string,
): Option.Option<PdfBlock> => {
  if (!String.isNonEmpty(String.trim(text))) return Option.none();

  return Option.some({
    _tag: "table",
    id: `page-${pageNumber}-block-${readingOrder}`,
    pageNumber,
    readingOrder,
    text,
  });
};

export const segmentPdfPage = (
  pageNumber: number,
  items: ReadonlyArray<unknown>,
): PdfPage => {
  const pdfItems = items.flatMap((item) =>
    Array.fromOption(toPositionedPdfTextItem(item)),
  );
  const lines = groupPdfLines(pdfItems).filter((line) =>
    String.isNonEmpty(line.text),
  );

  if (lines.length === 0) {
    return {
      pageNumber,
      text: "",
      blocks: [],
    };
  }

  const blocks = findPdfTableBlocks(lines);
  const segments =
    blocks.length === 0
      ? Array.fromOption(toParagraphSegment(lines))
      : toPageSegments(lines, blocks);
  const pageBlocks = toPageBlocks(pageNumber, segments);

  return {
    pageNumber,
    text: pageBlocks.map((block) => block.text).join("\n\n"),
    blocks: pageBlocks,
  };
};
