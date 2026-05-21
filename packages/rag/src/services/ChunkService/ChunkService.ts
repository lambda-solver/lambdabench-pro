import { Array, Context, Effect, Layer, Option, String, pipe } from "effect";
import type { Chunk, TokenizerError } from "@repo/domain/Chunk";
import type { PdfBlock, PdfDocument } from "../PdfService/PdfDocument";
import type { Record, Schema } from "effect";
import { getFileExtension, normalizeWhitespace, resolveMimeTypeForFile } from "../../utils";

import { CharacterTokenizerLive } from "../../tokenizer/DelimTokenizer";

import { FastChunker } from "../../chunker/FastChunker";
import type { PdfError } from "../PdfService/PdfService";
import { PdfService } from "../PdfService/PdfService";
import { RecursiveChunker } from "../../chunker/RecursiveChunker";
import { SentenceChunker } from "../../chunker/SentenceChunker";
import { TableChunker } from "../../chunker/TableChunker";
import { TokenChunker } from "../../chunker/TokenChunker";

const FAST_CHUNK_THRESHOLD_CHARS = 100_000;

type ChunkStrategy = "fast" | "sentence" | "token" | "recursive" | "table";

interface ChunkEntry {
  text: string;
  pageNumber?: number;
  pageCount?: number;
  metadata?: Record<string, unknown> | undefined;
}

interface MarkdownSegment {
  kind: "text" | "table";
  text: string;
}

const looksLikeMarkdownTable = (text: string): boolean => {
  const hasPipeRow = /^\s*\|.*\|\s*$/m.test(text);
  const hasSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/m.test(text);
  return hasPipeRow && hasSeparator;
};

const isMarkdownTableSeparatorLine = (line: string): boolean =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

const isPipeLine = (line: string): boolean => /^\s*\|.*\|\s*$/.test(line);

const toChunkEntries = (
  chunks: ReadonlyArray<Chunk>,
  metadata?: { pageNumber?: number; pageCount?: number },
  baseMetadata?: Record<string, unknown>,
): Array<ChunkEntry> =>
  pipe(
    chunks,
    Array.map((chunk) => ({
      ...chunk,
      text: String.trim(chunk.text),
    })),
    Array.filter((chunk) => String.isNonEmpty(chunk.text)),
    Array.map((chunk) =>
      Object.assign(
        { text: chunk.text },
        metadata,
        {
          metadata: {
            ...baseMetadata,
            chunkCharEnd: chunk.endIdx,
            chunkCharStart: chunk.startIdx,
            chunkTokenCount: chunk.tokenCount,
            ...chunk.metadata,
          },
        },
      ),
    ),
  );

const decodeTextFile = (fileName: string, buffer: Uint8Array) => {
  const extension = getFileExtension(fileName);
  const decoder = new TextDecoder("utf-8");

  switch (extension) {
    case ".txt":
    case ".md":
    case ".csv": {
      return Effect.succeed(decoder.decode(buffer));
    }
    default: {
      return Effect.fail(new Error(`Unsupported file type: ${fileName}`));
    }
  }
};

export class ChunkService extends Context.Service<
  ChunkService,
  {
    readonly chunkFile: (
      fileName: string,
      buffer: Uint8Array,
    ) => Effect.Effect<
      Array<{
        text: string;
        pageNumber?: number;
        pageCount?: number;
        metadata?: Record<string, unknown> | undefined;
      }>,
      Error | PdfError | Schema.SchemaError | TokenizerError
    >;
    readonly chunkText: (
      fileName: string,
      text: string,
    ) => Effect.Effect<
      Array<{
        text: string;
        pageNumber?: number;
        pageCount?: number;
        metadata?: Record<string, unknown> | undefined;
      }>,
      Schema.SchemaError | TokenizerError
    >;
    readonly resolveMimeTypeForFile: (fileName: string) => string;
  }
>()("ChunkService", {
  make: Effect.gen(function* () {
    const fastChunker = yield* FastChunker;
    const sentenceChunker = yield* SentenceChunker;
    const tokenChunker = yield* TokenChunker;
    const recursiveChunker = yield* RecursiveChunker;
    const tableChunker = yield* TableChunker;
    const pdfService = yield* PdfService;

    const chunkWithStrategy = (
      strategy: ChunkStrategy,
      text: string,
    ): Effect.Effect<Array<Chunk>, Schema.SchemaError | TokenizerError> => {
      switch (strategy) {
        case "fast": {
          return fastChunker.chunk(text);
        }
        case "sentence": {
          return sentenceChunker.chunk(text);
        }
        case "token": {
          return tokenChunker.chunk(text);
        }
        case "recursive": {
          return recursiveChunker.chunk(text);
        }
        case "table": {
          return tableChunker.chunk(text);
        }
      }
    };

    const splitMarkdownSegments = (text: string): Array<MarkdownSegment> => {
      const lines = text.split("\n");
      const segments: Array<MarkdownSegment> = [];
      const proseBuffer: Array<string> = [];

      const flushProse = () => {
        if (proseBuffer.length === 0) return;
        segments.push({ kind: "text", text: proseBuffer.join("\n") });
        proseBuffer.length = 0;
      };

      for (let index = 0; index < lines.length; index += 1) {
        const header = lines[index] ?? "";
        const separator = lines[index + 1] ?? "";
        const isTableStart = isPipeLine(header) && isMarkdownTableSeparatorLine(separator);

        if (!isTableStart) {
          proseBuffer.push(header);
          continue;
        }

        flushProse();

        const tableLines = [header, separator];
        index += 2;

        while (index < lines.length && isPipeLine(lines[index] ?? "")) {
          tableLines.push(lines[index] ?? "");
          index += 1;
        }

        segments.push({
          kind: "table",
          text: `${tableLines.join("\n")}\n`,
        });

        index -= 1;
      }

      flushProse();

      return segments.filter((segment) => String.isNonEmpty(String.trim(segment.text)));
    };

    const selectStrategy = (extension: string, normalizedText: string): Option.Option<ChunkStrategy> => {
      switch (extension) {
        case ".csv": {
          return Option.some("token");
        }
        case ".md": {
          return Option.some(looksLikeMarkdownTable(normalizedText) ? "table" : "recursive");
        }
        case ".pdf":
        case ".txt": {
          return Option.some(normalizedText.length >= FAST_CHUNK_THRESHOLD_CHARS ? "fast" : "sentence");
        }
        default: {
          return Option.none();
        }
      }
    };

    const chunkMarkdownText = (
      normalizedText: string,
    ): Effect.Effect<Array<ChunkEntry>, Schema.SchemaError | TokenizerError> =>
      Effect.gen(function* () {
        const segments = splitMarkdownSegments(normalizedText);
        const allEntries = yield* Effect.forEach(segments, (segment) =>
          segment.kind === "table"
            ? Effect.map(chunkWithStrategy("table", segment.text), (chunks) =>
                toChunkEntries(chunks, undefined, { chunkStrategy: "table" }),
              )
            : Effect.map(chunkWithStrategy("recursive", segment.text), (chunks) =>
                toChunkEntries(chunks, undefined, {
                  chunkStrategy: "recursive",
                }),
              ),
        );

        return allEntries.flat();
      });

    const chunkNormalizedText = (
      extension: string,
      normalizedText: string,
    ): Effect.Effect<Array<ChunkEntry>, Schema.SchemaError | TokenizerError> =>
      pipe(
        selectStrategy(extension, normalizedText),
        Option.match({
          onNone: () => Effect.succeed([] as Array<ChunkEntry>),
          onSome: (strategy) =>
            Effect.map(chunkWithStrategy(strategy, normalizedText), (chunks) =>
              toChunkEntries(chunks, undefined, {
                chunkStrategy: strategy,
              }),
            ),
        }),
      );

    const chunkPdfBlock = (block: PdfBlock): Effect.Effect<Array<ChunkEntry>, Schema.SchemaError | TokenizerError> => {
      if (block._tag === "table") {
        return Effect.map(chunkWithStrategy("table", block.text), (chunks) =>
          toChunkEntries(
            chunks,
            { pageNumber: block.pageNumber },
            {
              chunkStrategy: "table",
              pdfBlockType: "table",
              pdfSegmentKind: "table",
            },
          ),
        );
      }

      return Effect.map(chunkNormalizedText(".pdf", normalizeWhitespace(block.text)), (entries) =>
        entries.map((entry) => ({
          ...entry,
          metadata: {
            ...entry.metadata,
            pdfBlockType: "paragraph",
            pdfSegmentKind: "text",
          },
          pageNumber: block.pageNumber,
        })),
      );
    };

    const chunkPdfDocument = (
      document: PdfDocument,
    ): Effect.Effect<Array<ChunkEntry>, Schema.SchemaError | TokenizerError> => {
      if (document.blocks.length === 0) {
        return chunkNormalizedText(".pdf", normalizeWhitespace(document.text));
      }

      return Effect.forEach(document.blocks, (block) => chunkPdfBlock(block)).pipe(
        Effect.map((blocksWithChunks) =>
          blocksWithChunks.flat().map((entry) =>
            Object.assign({}, entry, { pageCount: document.pageCount }),
          ),
        ),
      );
    };

    const chunkText = Effect.fn(function* (fileName: string, text: string) {
      const extension = getFileExtension(fileName);
      const baseChunks: Array<ChunkEntry> = yield* ((): Effect.Effect<
        Array<ChunkEntry>,
        Schema.SchemaError | TokenizerError
      > => {
        switch (extension) {
          case ".csv":
          case ".txt":
          case ".pdf": {
            return chunkNormalizedText(extension, normalizeWhitespace(text));
          }
          case ".md": {
            return chunkMarkdownText(normalizeWhitespace(text));
          }
          default: {
            return Effect.succeed([] as Array<ChunkEntry>);
          }
        }
      })();

      return baseChunks.map((chunk, index) =>
        Object.assign({}, chunk, {
          metadata: {
            chunkCount: baseChunks.length,
            chunkIndex: index,
            fileExt: getFileExtension(fileName),
            mimeType: resolveMimeTypeForFile(fileName),
            sourceFile: fileName,
            ...chunk.metadata,
            ...(chunk.pageNumber !== undefined ? { pageNumber: chunk.pageNumber } : {}),
            ...(chunk.pageCount !== undefined ? { pageCount: chunk.pageCount } : {}),
          },
        }),
      );
    });

    const chunkFile = Effect.fn(function* (fileName: string, buffer: Uint8Array) {
      const extension = getFileExtension(fileName);

      switch (extension) {
        case ".pdf": {
          const document = yield* pdfService.analyze(buffer, {
            sourceName: fileName,
          });
          return yield* chunkPdfDocument(document);
        }
        case ".txt":
        case ".md":
        case ".csv": {
          const text = yield* decodeTextFile(fileName, buffer);
          return yield* chunkText(fileName, text);
        }
        default: {
          return [] as Array<ChunkEntry>;
        }
      }
    });

    return {
      chunkFile,
      chunkText,
      resolveMimeTypeForFile,
    } as const;
  }),
}) {
  static Default = Layer.effect(ChunkService, ChunkService.make).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        PdfService.Default,
        Layer.effect(FastChunker, FastChunker.make),
        Layer.effect(SentenceChunker, SentenceChunker.make),
        Layer.effect(TokenChunker, TokenChunker.make),
        Layer.effect(RecursiveChunker, RecursiveChunker.make),
        Layer.effect(TableChunker, TableChunker.make),
      ).pipe(Layer.provide(CharacterTokenizerLive)),
    ),
  );
}
