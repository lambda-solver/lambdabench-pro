import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { FastChunker } from "../../chunker/FastChunker";
import { RecursiveChunker } from "../../chunker/RecursiveChunker";
import { SentenceChunker } from "../../chunker/SentenceChunker";
import { TableChunker } from "../../chunker/TableChunker";
import { TokenChunker } from "../../chunker/TokenChunker";
import { CharacterTokenizerLive } from "../../tokenizer/DelimTokenizer";
import type { PdfDocument } from "../PdfService/PdfDocument";
import { PdfService } from "../PdfService/PdfService";
import { ChunkService } from "./ChunkService";

const pdfFixture: PdfDocument = {
  text: "Executive summary before the table.\n\n| metric | score |\n| --- | --- |\n| Accuracy | 98 |\n| Recall | 94 |\n\nFollow-up paragraph after the table.",
  pageCount: 2,
  pages: [
    {
      pageNumber: 1,
      text: "Executive summary before the table.\n\n| metric | score |\n| --- | --- |\n| Accuracy | 98 |\n| Recall | 94 |",
      blocks: [
        {
          _tag: "paragraph" as const,
          id: "page-1-block-0",
          pageNumber: 1,
          readingOrder: 0,
          text: "Executive summary before the table.",
        },
        {
          _tag: "table" as const,
          id: "page-1-block-1",
          pageNumber: 1,
          readingOrder: 1,
          text: `| metric | score |
| --- | --- |
| Accuracy | 98 |
| Recall | 94 |
`,
        },
      ],
    },
    {
      pageNumber: 2,
      text: "Follow-up paragraph after the table.",
      blocks: [
        {
          _tag: "paragraph" as const,
          id: "page-2-block-0",
          pageNumber: 2,
          readingOrder: 0,
          text: "Follow-up paragraph after the table.",
        },
      ],
    },
  ],
  blocks: [
    {
      _tag: "paragraph" as const,
      id: "page-1-block-0",
      pageNumber: 1,
      readingOrder: 0,
      text: "Executive summary before the table.",
    },
    {
      _tag: "table" as const,
      id: "page-1-block-1",
      pageNumber: 1,
      readingOrder: 1,
      text: `| metric | score |
| --- | --- |
| Accuracy | 98 |
| Recall | 94 |
`,
    },
    {
      _tag: "paragraph" as const,
      id: "page-2-block-0",
      pageNumber: 2,
      readingOrder: 0,
      text: "Follow-up paragraph after the table.",
    },
  ],
};

describe("ChunkService table strategy routing", () => {
  it.effect("routes markdown table content to table chunker behavior", () =>
    Effect.gen(function* () {
      const service = yield* ChunkService;
      const markdownTable = `| name | score |
| --- | --- |
| Ada | 91 |
| Lin | 88 |
| Sam | 95 |
| Mia | 90 |
`;
      const chunks = yield* service.chunkText("grades.md", markdownTable);
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.text).toContain("| name | score |");
        expect(chunk.text).toContain("| --- | --- |");
      }
    }).pipe(Effect.provide(ChunkService.Default)),
  );
  it.effect("routes non-table markdown to recursive strategy behavior", () =>
    Effect.gen(function* () {
      const service = yield* ChunkService;
      const markdownDoc = `# Intro
This is normal markdown prose.
- item one
- item two
`;
      const chunks = yield* service.chunkText("notes.md", markdownDoc);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some((c) => c.text.includes("| --- |"))).toBe(false);
    }).pipe(Effect.provide(ChunkService.Default)),
  );

  it.effect("chunks mixed markdown prose and table segments in order", () =>
    Effect.gen(function* () {
      const service = yield* ChunkService;
      const mixedMarkdown = `# Weekly report

Intro paragraph before table.

| name | score |
| --- | --- |
| Ada | 91 |
| Lin | 88 |

Notes after first table.

| item | status |
| --- | --- |
| Parser | done |
| Tests | pending |

Final summary paragraph.
`;

      const chunks = yield* service.chunkText(
        "weekly-report.md",
        mixedMarkdown,
      );

      expect(chunks.length).toBeGreaterThan(0);

      const chunkTexts = chunks.map((chunk) => chunk.text);

      expect(
        chunkTexts.some((text) =>
          text.includes("Intro paragraph before table."),
        ),
      ).toBe(true);
      expect(
        chunkTexts.some((text) => text.includes("Notes after first table.")),
      ).toBe(true);
      expect(
        chunkTexts.some((text) => text.includes("Final summary paragraph.")),
      ).toBe(true);

      expect(chunkTexts.some((text) => text.includes("| name | score |"))).toBe(
        true,
      );
      expect(
        chunkTexts.some((text) => text.includes("| item | status |")),
      ).toBe(true);

      const firstTableChunkIndex = chunkTexts.findIndex((text) =>
        text.includes("| name | score |"),
      );
      const secondTableChunkIndex = chunkTexts.findIndex((text) =>
        text.includes("| item | status |"),
      );

      expect(firstTableChunkIndex).toBeGreaterThanOrEqual(0);
      expect(secondTableChunkIndex).toBeGreaterThan(firstTableChunkIndex);
    }).pipe(Effect.provide(ChunkService.Default)),
  );

  it.effect("chunks pdf page segments with table metadata preserved", () =>
    Effect.gen(function* () {
      const service = yield* ChunkService;
      const chunks = yield* service
        .chunkFile("report.pdf", new Uint8Array([1, 2, 3]))
        .pipe(
          Effect.provide(
            Layer.succeed(PdfService, {
              analyze: () => Effect.succeed(pdfFixture),
            }),
          ),
        );

      const getMetadata = (index: number) =>
        chunks[index]?.metadata as Record<string, unknown> | undefined;

      expect(chunks.length).toBeGreaterThan(1);

      expect(
        chunks.some(
          (chunk, index) =>
            chunk.pageNumber === 1 &&
            getMetadata(index)?.["pdfBlockType"] === "paragraph" &&
            chunk.text.includes("Executive summary before the table."),
        ),
      ).toBe(true);

      expect(
        chunks.some(
          (chunk, index) =>
            chunk.pageNumber === 1 &&
            getMetadata(index)?.["pdfBlockType"] === "table" &&
            getMetadata(index)?.["chunkStrategy"] === "table" &&
            chunk.text.includes("| metric | score |"),
        ),
      ).toBe(true);

      expect(
        chunks.some(
          (chunk, index) =>
            chunk.pageNumber === 2 &&
            getMetadata(index)?.["pdfBlockType"] === "paragraph" &&
            chunk.text.includes("Follow-up paragraph after the table."),
        ),
      ).toBe(true);
    }).pipe(
      Effect.provide(
        Layer.effect(ChunkService, ChunkService.make).pipe(
          Layer.provideMerge(
            Layer.mergeAll(
              Layer.succeed(PdfService, {
                analyze: () => Effect.succeed(pdfFixture),
              }),
              Layer.effect(FastChunker, FastChunker.make),
              Layer.effect(SentenceChunker, SentenceChunker.make),
              Layer.effect(TokenChunker, TokenChunker.make),
              Layer.effect(RecursiveChunker, RecursiveChunker.make),
              Layer.effect(TableChunker, TableChunker.make),
            ).pipe(Layer.provide(CharacterTokenizerLive)),
          ),
        ),
      ) as any,
    ),
  );
});
