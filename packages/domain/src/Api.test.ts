import { BatchEvalRequest, HealthStatus, SingleEvalRequest } from "./Api";
import { describe, expect, it } from "vitest";

import { Schema } from "effect";

describe("SingleEvalRequest schema", () => {
  it("decodes a valid request with all fields", () => {
    const input = {
      maxTokens: 2048,
      model: "openai/gpt-4",
      provider: "opencode-go" as const,
      rlmMaxDepth: 5,
      task: "cnat_add",
      variant: "rlm" as const,
    };
    const result = Schema.decodeUnknownSync(SingleEvalRequest)(input);
    expect(result).toEqual({
      maxTokens: 2048,
      mode: "direct",
      model: "openai/gpt-4",
      provider: "opencode-go",
      rlmMaxDepth: 5,
      task: "cnat_add",
      variant: "rlm",
    });
  });

  it("applies defaults when optional fields are missing", () => {
    const input = {
      model: "google/gemini-pro",
      task: "bool_and",
    };
    const result = Schema.decodeUnknownSync(SingleEvalRequest)(input);
    expect(result).toEqual({
      maxTokens: 4096,
      mode: "direct",
      model: "google/gemini-pro",
      provider: "openrouter",
      rlmMaxDepth: 3,
      task: "bool_and",
      variant: "standard",
    });
  });

  it("rejects invalid variant values", () => {
    const input = {
      model: "openai/gpt-4",
      task: "cnat_add",
      variant: "invalid",
    };
    expect(() => Schema.decodeUnknownSync(SingleEvalRequest)(input)).toThrow();
  });

  it("rejects invalid provider values", () => {
    const input = {
      model: "openai/gpt-4",
      provider: "unknown",
      task: "cnat_add",
    };
    expect(() => Schema.decodeUnknownSync(SingleEvalRequest)(input)).toThrow();
  });
});

describe("BatchEvalRequest schema", () => {
  it("decodes a valid batch request", () => {
    const input = {
      concurrency: 4,
      models: ["openai/gpt-4", "google/gemini-pro"],
      tasks: ["cnat_add", "bool_and"],
      variant: "standard" as const,
    };
    const result = Schema.decodeUnknownSync(BatchEvalRequest)(input);
    expect(result).toEqual({
      concurrency: 4,
      mode: "both",
      models: ["openai/gpt-4", "google/gemini-pro"],
      tasks: ["cnat_add", "bool_and"],
      variant: "standard",
    });
  });

  it("applies defaults for tasks, variant, and concurrency", () => {
    const input = {
      models: ["openai/gpt-4"],
    };
    const result = Schema.decodeUnknownSync(BatchEvalRequest)(input);
    expect(result).toEqual({
      concurrency: 2,
      mode: "both",
      models: ["openai/gpt-4"],
      tasks: [],
      variant: "both",
    });
  });
});

describe("HealthStatus schema", () => {
  it("decodes valid health status", () => {
    const input = {
      db: "connected" as const,
      status: "ok" as const,
      uptimeSeconds: 1234,
      version: "1.0.0",
    };
    const result = Schema.decodeUnknownSync(HealthStatus)(input);
    expect(result).toEqual({
      db: "connected",
      status: "ok",
      uptimeSeconds: 1234,
      version: "1.0.0",
    });
  });

  it("decodes degraded health status", () => {
    const input = {
      db: "disconnected" as const,
      status: "degraded" as const,
      uptimeSeconds: 0,
      version: "1.0.0",
    };
    const result = Schema.decodeUnknownSync(HealthStatus)(input);
    expect(result).toEqual({
      db: "disconnected",
      status: "degraded",
      uptimeSeconds: 0,
      version: "1.0.0",
    });
  });

  it("rejects invalid status values", () => {
    const input = {
      db: "connected",
      status: "down",
      uptimeSeconds: 1234,
      version: "1.0.0",
    };
    expect(() => Schema.decodeUnknownSync(HealthStatus)(input)).toThrow();
  });

  it("rejects invalid db values", () => {
    const input = {
      db: "error",
      status: "ok",
      uptimeSeconds: 1234,
      version: "1.0.0",
    };
    expect(() => Schema.decodeUnknownSync(HealthStatus)(input)).toThrow();
  });
});
