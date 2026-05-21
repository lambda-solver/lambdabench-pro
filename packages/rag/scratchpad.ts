import { Effect } from "effect";
import { RagService } from "./src";

const main = Effect.gen(function* () {
  yield* Effect.log("Hello, Rag Scratchpad!");
  const rag = yield* RagService;

  // Example usage of RagService
  const collectionName = "testCollection";
  const documents = [
    "The capital of France is Paris.",
    "The largest planet in our solar system is Jupiter.",
    "The Great Wall of China is visible from space.",
  ];
  const ids = ["doc1", "doc2", "doc3"];

  const inputResult = yield* rag.ingest({
    collection: collectionName,
    documents,
    ids,
  });
  yield* Effect.log(`Ingest result: ${JSON.stringify(inputResult)}`);

  const query = "What is the capital of France?";

  const outputResults = yield* rag.retrieve({
    collection: collectionName,
    queries: [query],
    topK: 2,
  });

  yield* Effect.log(`Retrieval results: ${JSON.stringify(outputResults)}`);

  // List documents in the collection
  const listedDocuments = yield* rag.listDocuments({
    collection: collectionName,
    limit: 2,
  });

  yield* Effect.log(`Listed documents: ${JSON.stringify(listedDocuments.documents)}`);
});

Effect.runPromise(main.pipe(Effect.provide(RagService.Default))).catch((error) => {
  process.stderr.write(`Error in Rag Scratchpad: ${String(error)}\n`);
  process.exit(1);
});
