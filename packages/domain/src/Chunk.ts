import { Context, Data, Schema } from "effect";
import type { Effect } from "effect";

export class ChunkError extends Data.TaggedError("ChunkError")<{
  message: string;
  cause?: unknown;
}> {}
export class TokenizerError extends Data.TaggedError("TokenizerError")<{
  message: string;
  cause?: unknown;
}> {}

export const Chunk = Schema.Struct({
  endIdx: Schema.Number,
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  startIdx: Schema.Number,
  text: Schema.String,
  tokenCount: Schema.Number,
});

export type Chunk = typeof Chunk.Type;

export class Tokenizer extends Context.Service<
  Tokenizer,
  {
    encode: (text: string) => Effect.Effect<ReadonlyArray<number>>;
    decode: (
      tokens: ReadonlyArray<number>,
    ) => Effect.Effect<string, TokenizerError>;
    countTokens: (text: string) => Effect.Effect<number>;
  }
>()("Tokenizer") {}

export class Chunker extends Context.Service<
  Chunker,
  {
    readonly name: string;
    chunk: (
      text: string,
    ) => Effect.Effect<Array<Chunk>, Schema.SchemaError | TokenizerError>;
  }
>()("Chunker") {}
