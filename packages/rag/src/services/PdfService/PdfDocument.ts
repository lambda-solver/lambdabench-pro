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
  blocks: Schema.Array(PdfBlock),
  pageNumber: Schema.Number,
  text: Schema.String,
});
export type PdfPage = Schema.Schema.Type<typeof PdfPage>;

export const PdfDocument = Schema.Struct({
  blocks: Schema.Array(PdfBlock),
  pageCount: Schema.Number,
  pages: Schema.Array(PdfPage),
  text: Schema.String,
});
export type PdfDocument = Schema.Schema.Type<typeof PdfDocument>;
