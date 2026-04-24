import { Schema } from "effect";

export const PdfParagraphBlock = Schema.TaggedStruct("paragraph", {
  id: Schema.String,
  pageNumber: Schema.Number,
  readingOrder: Schema.Number,
  text: Schema.String,
});

export const PdfTableBlock = Schema.TaggedStruct("table", {
  id: Schema.String,
  pageNumber: Schema.Number,
  readingOrder: Schema.Number,
  text: Schema.String,
});

export const PdfBlock = Schema.Union([PdfParagraphBlock, PdfTableBlock]);
export type PdfBlock = Schema.Schema.Type<typeof PdfBlock>;

export const PdfPage = Schema.Struct({
  pageNumber: Schema.Number,
  text: Schema.String,
  blocks: Schema.Array(PdfBlock),
});
export type PdfPage = Schema.Schema.Type<typeof PdfPage>;

export const PdfDocument = Schema.Struct({
  text: Schema.String,
  pageCount: Schema.Number,
  pages: Schema.Array(PdfPage),
  blocks: Schema.Array(PdfBlock),
});
export type PdfDocument = Schema.Schema.Type<typeof PdfDocument>;
