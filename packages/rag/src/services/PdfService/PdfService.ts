import { Data, Effect, Layer, Schema, ServiceMap } from "effect";
import { getDocumentProxy } from "unpdf";
import { PdfDocument, type PdfPage } from "./PdfDocument";
import { segmentPdfPage } from "./segmentPage";

export class PdfError extends Data.TaggedError("PdfError")<{
  message: string;
  cause: unknown;
}> {}

export class PdfService extends ServiceMap.Service<PdfService>()("PdfService", {
  make: Effect.gen(function* () {
    const analyze = Effect.fn(function* (
      buffer: Uint8Array,
      options?: {
        sourceName?: string;
      },
    ) {
      const analyzed = yield* Effect.tryPromise({
        try: async () => {
          const pdf = await getDocumentProxy(new Uint8Array(buffer));
          const pages: Array<PdfPage> = [];

          for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber += 1
          ) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            pages.push(
              segmentPdfPage(
                pageNumber,
                Array.isArray(textContent.items) ? textContent.items : [],
              ),
            );
          }

          return {
            text: pages.map((page) => page.text).join("\n\n"),
            pageCount: pages.length,
            pages,
            blocks: pages.flatMap((page) => page.blocks),
          };
        },
        catch: (cause) =>
          new PdfError({
            message: `PDF parse failed${options?.sourceName ? ` for ${options.sourceName}` : ""}`,
            cause,
          }),
      });

      return yield* Schema.decodeEffect(PdfDocument)(analyzed);
    });

    return { analyze } as const;
  }),
}) {
  static Default = Layer.effect(PdfService, PdfService.make);
}
