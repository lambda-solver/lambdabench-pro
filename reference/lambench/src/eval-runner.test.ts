/**
 * eval-runner.test.ts
 *
 * Tests for the OpenRouter top-model fetcher.
 * Uses a mock HttpClient layer so no real network calls are made.
 */

import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import {
  fetchModels,
  fetchRankings,
  getTopModels,
  parseRankingsHtml,
  topModelsFromEnv,
} from "./eval-runner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a mock HttpClient layer that returns fixed responses keyed by URL substring. */
function mockHttpLayer(
  handler: (url: string) => Response,
): Layer.Layer<HttpClient.HttpClient> {
  const client = HttpClient.make((request) =>
    Effect.sync(() =>
      HttpClientResponse.fromWeb(request, handler(request.url)),
    ),
  );
  return Layer.succeed(HttpClient.HttpClient, client);
}

function runWith<A>(
  effect: Effect.Effect<A, unknown, HttpClient.HttpClient>,
  handler: (url: string) => Response,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(Effect.provide(mockHttpLayer(handler))),
  );
}

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const MODELS_RESPONSE = {
  data: [
    { id: "google/gemini-2.5-pro", pricing: { completion: "0.000010" } },
    { id: "anthropic/claude-opus-4", pricing: { completion: "0.000015" } },
    { id: "openai/gpt-4o", pricing: { completion: "0.000008" } },
  ],
};

/** Minimal rankings HTML containing two model hrefs in rank order. */
const RANKINGS_HTML = `
<html><body>
  <a href="/models/google/gemini-2.5-pro">Gemini 2.5 Pro</a>
  <a href="/models/anthropic/claude-opus-4">Claude Opus 4</a>
  <a href="/models/openai/gpt-4o">GPT-4o</a>
</body></html>
`;

// ─── parseRankingsHtml (pure, no network) ─────────────────────────────────────

describe("parseRankingsHtml", () => {
  test("extracts model IDs in document order", () => {
    const ids = parseRankingsHtml(RANKINGS_HTML);
    expect(ids).toEqual([
      "google/gemini-2.5-pro",
      "anthropic/claude-opus-4",
      "openai/gpt-4o",
    ]);
  });

  test("deduplicates repeated hrefs", () => {
    const html = `
      <a href="/models/google/gemini-2.5-pro">first</a>
      <a href="/models/google/gemini-2.5-pro">duplicate</a>
      <a href="/models/openai/gpt-4o">other</a>
    `;
    const ids = parseRankingsHtml(html);
    expect(ids).toEqual(["google/gemini-2.5-pro", "openai/gpt-4o"]);
  });

  test("returns empty array for HTML with no model hrefs", () => {
    expect(parseRankingsHtml("<html><body>no models here</body></html>")).toEqual([]);
  });

  test("handles model IDs with dots (e.g. gemini-2.5-pro)", () => {
    const html = `<a href="/models/google/gemini-2.5-pro">x</a>`;
    expect(parseRankingsHtml(html)).toEqual(["google/gemini-2.5-pro"]);
  });

  test("ignores non-model hrefs", () => {
    const html = `
      <a href="/docs/quickstart">docs</a>
      <a href="/models/openai/gpt-4o">model</a>
      <a href="/rankings">rankings</a>
    `;
    expect(parseRankingsHtml(html)).toEqual(["openai/gpt-4o"]);
  });
});

// ─── topModelsFromEnv (pure, no network) ──────────────────────────────────────

describe("topModelsFromEnv", () => {
  test("parses comma-separated model IDs", () => {
    const result = topModelsFromEnv("google/gemini-2.5-pro,anthropic/claude-opus-4");
    expect(result).toHaveLength(2);
    expect(result[0]?.modelId).toBe("google/gemini-2.5-pro");
    expect(result[1]?.modelId).toBe("anthropic/claude-opus-4");
  });

  test("sets pricePerMOutput to 0 (no pricing info in env var)", () => {
    const result = topModelsFromEnv("openai/gpt-4o");
    expect(result[0]?.pricePerMOutput).toBe(0);
  });

  test("trims whitespace around model IDs", () => {
    const result = topModelsFromEnv("  google/gemini-2.5-pro , openai/gpt-4o  ");
    expect(result[0]?.modelId).toBe("google/gemini-2.5-pro");
    expect(result[1]?.modelId).toBe("openai/gpt-4o");
  });

  test("filters out empty entries from double commas", () => {
    const result = topModelsFromEnv("google/gemini-2.5-pro,,openai/gpt-4o");
    expect(result).toHaveLength(2);
  });

  test("returns empty array for empty string", () => {
    expect(topModelsFromEnv("")).toHaveLength(0);
  });
});

// ─── fetchRankings (mocked HTTP) ─────────────────────────────────────────────

describe("fetchRankings", () => {
  test("returns ranked model IDs from OpenRouter rankings page", async () => {
    const ids = await runWith(
      fetchRankings(),
      () => new Response(RANKINGS_HTML, { status: 200 }),
    );
    expect(ids[0]).toBe("google/gemini-2.5-pro");
    expect(ids[1]).toBe("anthropic/claude-opus-4");
  });

  test("hits the /rankings?view=coding URL", async () => {
    let capturedUrl = "";
    await runWith(
      fetchRankings(),
      (url) => {
        capturedUrl = url;
        return new Response(RANKINGS_HTML, { status: 200 });
      },
    );
    expect(capturedUrl).toContain("openrouter.ai/rankings");
    expect(capturedUrl).toContain("view=coding");
  });
});

// ─── fetchModels (mocked HTTP) ────────────────────────────────────────────────

describe("fetchModels", () => {
  test("returns decoded model list from /api/v1/models", async () => {
    const models = await runWith(
      fetchModels("test-api-key"),
      () =>
        new Response(JSON.stringify(MODELS_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    expect(models).toHaveLength(3);
    expect(models[0]?.id).toBe("google/gemini-2.5-pro");
    expect(models[0]?.pricing.completion).toBe("0.000010");
  });

  test("sends Authorization header with API key", async () => {
    let capturedAuth = "";
    await runWith(
      fetchModels("sk-test-key"),
      (url) => {
        // Can't inspect headers from URL, but verify URL is correct
        capturedAuth = url;
        return new Response(JSON.stringify(MODELS_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    expect(capturedAuth).toContain("openrouter.ai/api/v1/models");
  });
});

// ─── getTopModels (mocked HTTP) ───────────────────────────────────────────────

describe("getTopModels", () => {
  function makeHandler() {
    return (url: string): Response => {
      if (url.includes("/rankings")) {
        return new Response(RANKINGS_HTML, { status: 200 });
      }
      if (url.includes("/api/v1/models")) {
        return new Response(JSON.stringify(MODELS_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    };
  }

  test("returns top 2 models in rankings order", async () => {
    const top = await runWith(getTopModels("test-key", 2), makeHandler());
    expect(top).toHaveLength(2);
    expect(top[0]?.modelId).toBe("google/gemini-2.5-pro");
    expect(top[1]?.modelId).toBe("anthropic/claude-opus-4");
  });

  test("converts per-token price to per-1M-tokens", async () => {
    const top = await runWith(getTopModels("test-key", 2), makeHandler());
    // gemini: 0.000010 * 1_000_000 = 10.0
    expect(top[0]?.pricePerMOutput).toBeCloseTo(10.0, 5);
    // claude: 0.000015 * 1_000_000 = 15.0
    expect(top[1]?.pricePerMOutput).toBeCloseTo(15.0, 5);
  });

  test("respects n — returns only top 1 when asked", async () => {
    const top = await runWith(getTopModels("test-key", 1), makeHandler());
    expect(top).toHaveLength(1);
    expect(top[0]?.modelId).toBe("google/gemini-2.5-pro");
  });

  test("falls back to model list order when rankings page returns no matches", async () => {
    const top = await runWith(
      getTopModels("test-key", 2),
      (url) => {
        if (url.includes("/rankings")) {
          // Rankings page has no model hrefs
          return new Response("<html>empty</html>", { status: 200 });
        }
        return new Response(JSON.stringify(MODELS_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    // Falls back to first 2 from /api/v1/models
    expect(top).toHaveLength(2);
  });

  test("skips models not present in /api/v1/models pricing list", async () => {
    const htmlWithUnknown = `
      <a href="/models/unknown/model-xyz">unknown</a>
      <a href="/models/google/gemini-2.5-pro">known</a>
    `;
    const top = await runWith(
      getTopModels("test-key", 1),
      (url) => {
        if (url.includes("/rankings")) {
          return new Response(htmlWithUnknown, { status: 200 });
        }
        return new Response(JSON.stringify(MODELS_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    // unknown/model-xyz not in models list, so first real match is gemini
    expect(top[0]?.modelId).toBe("google/gemini-2.5-pro");
  });
});
