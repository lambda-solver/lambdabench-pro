import { describe, it } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect } from "effect";
import { ApiError, LamBenchClient } from "./LamBenchClient.js";

describe("LamBenchClient", () => {
  it.effect("layer constructs without errors", () =>
    Effect.sync(() => {
      const layer = LamBenchClient.layer("http://localhost:9000");
      assertTrue(layer !== null);
    }),
  );

  it.effect("ApiError has correct _tag", () =>
    Effect.sync(() => {
      const error = new ApiError("test");
      strictEqual(error._tag, "ApiError");
      strictEqual(error.cause, "test");
    }),
  );
});
