import { Context, Data, Effect, Layer, Schema } from "effect";

import { PdfDocument } from "./PdfDocument";

import { getDocumentProxy } from "unpdf";
import { segmentPdfPage } from "./segmentPage";

export class PdfError extends Data.TaggedError("PdfError")<{
  message: string;
  cause: unknown;
}> {}

export class PdfService extends Context.Service<
  PdfService,
  {
    readonly analyze: (
      buffer: Uint8Array,
      options?: {
        sourceName?: string;
      },
    ) => Effect.Effect<typeof PdfDocument.Type, PdfError | Schema.SchemaError>;
  }
>()("PdfService", {
  make: Effect.sync(() => {
    const analyze = Effect.fn(function* (
      buffer: Uint8Array,
      options?: {
        sourceName?: string;
      },
    ) {
      const analyzed = yield* Effect.tryPromise({
        catch: (cause) =>
          new PdfError({
            cause,
            message: `PDF parse failed${options?.sourceName ? ` for ${options.sourceName}` : ""}`,
          }),
        try: async () => {
          const pdf = await getDocumentProxy(new Uint8Array(buffer));
          const pages = await Promise.all(
            Array.from({ length: pdf.numPages }, async (_, i) => {
              const pageNumber = i + 1;
              const page = await pdf.getPage(pageNumber);
              const textContent = await page.getTextContent();
              return segmentPdfPage(pageNumber, Array.isArray(textContent.items) ? textContent.items : []);
            }),
          );

          return {
            blocks: pages.flatMap((page) => page.blocks),
            pageCount: pages.length,
            pages,
            text: pages.map((page) => page.text).join("\n\n"),
          };
        },
      });

      return yield* Schema.decodeEffect(PdfDocument)(analyzed);
    });

    return { analyze } as const;
  }),
}) {
  static Default = Layer.effect(PdfService, PdfService.make);
}
