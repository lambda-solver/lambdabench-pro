import { Config, Context, Data, Effect, Layer, Option } from "effect";

import { ChromaClient } from "chromadb";
import type { ChromaClient as ChromaSdkClient } from "chromadb";

export class ChromaError extends Data.TaggedError("ChromaError")<{
  cause: unknown;
}> {}

const ChromaConfig = Config.all({
  headersJson: Config.option(Config.string("CHROMA_HEADERS_JSON")),
  host: Config.option(Config.string("CHROMA_HOST")),
  port: Config.option(Config.number("CHROMA_PORT")),
  url: Config.option(Config.string("CHROMA_URL")),
});

export class ChromaService extends Context.Service<
  ChromaService,
  {
    client: ChromaSdkClient;
    use: <A>(fn: (client: ChromaSdkClient) => Promise<A>) => Effect.Effect<A, ChromaError>;
  }
>()("ChromaService", {
  make: Effect.gen(function* () {
    const config = yield* ChromaConfig;
    const url = Option.getOrUndefined(config.url);
    const host = Option.getOrUndefined(config.host);
    const port = Option.getOrUndefined(config.port);
    const headersJson = Option.getOrUndefined(config.headersJson);

    const headers = headersJson ? JSON.parse(headersJson) : undefined;

    yield* Effect.log(
      `[ChromaService] Using endpoint: ${url ? `url=${url}` : `host=${host ?? "localhost"} port=${port ?? 8000}`}`,
    );

    const client = yield* Effect.try({
      catch: (cause) => new ChromaError({ cause }),
      try: () =>
        url
          ? new ChromaClient({ headers, path: url })
          : new ChromaClient({
              headers,
              host: host ?? "localhost",
              port: port ?? 8000,
            }),
    });

    const use = <A>(fn: (client: ChromaSdkClient) => Promise<A>) =>
      Effect.tryPromise({
        catch: (cause) => new ChromaError({ cause }),
        try: () => fn(client),
      }).pipe(
        Effect.tapError((error) =>
          Effect.logError(`[ChromaService] ${fn.name || "use"} failed: ${String(error.cause)}`),
        ),
        Effect.withSpan(`chroma.${fn.name || "use"}`),
      );

    return { client, use } as const;
  }),
}) {
  static Default = Layer.effect(ChromaService)(ChromaService.make);
}
