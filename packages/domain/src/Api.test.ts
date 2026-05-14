import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { BatchEvalRequest, HealthStatus, SingleEvalRequest } from "./Api";

describe("SingleEvalRequest schema", () => {
  it("decodes a valid request with all fields", () => {
    const input = {
      model: "openai/gpt-4",
      task: "cnat_add",
      variant: "rlm" as const,
      provider: "opencode-go" as const,
      maxTokens: 2048,
      rlmMaxDepth: 5,
    };
    const result = Schema.decodeUnknownSync(SingleEvalRequest)(input);
    expect(result).toEqual({
      model: "openai/gpt-4",
      task: "cnat_add",
      variant: "rlm",
      provider: "opencode-go",
      maxTokens: 2048,
      rlmMaxDepth: 5,
    });
  });

  it("applies defaults when optional fields are missing", () => {
    const input = {
      model: "google/gemini-pro",
      task: "bool_and",
    };
    const result = Schema.decodeUnknownSync(SingleEvalRequest)(input);
    expect(result).toEqual({
      model: "google/gemini-pro",
      task: "bool_and",
      variant: "standard",
      provider: "openrouter",
      maxTokens: 4096,
      rlmMaxDepth: 3,
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
      task: "cnat_add",
      provider: "unknown",
    };
    expect(() => Schema.decodeUnknownSync(SingleEvalRequest)(input)).toThrow();
  });
});

describe("BatchEvalRequest schema", () => {
  it("decodes a valid batch request", () => {
    const input = {
      models: ["openai/gpt-4", "google/gemini-pro"],
      tasks: ["cnat_add", "bool_and"],
      variant: "standard" as const,
      concurrency: 4,
    };
    const result = Schema.decodeUnknownSync(BatchEvalRequest)(input);
    expect(result).toEqual({
      models: ["openai/gpt-4", "google/gemini-pro"],
      tasks: ["cnat_add", "bool_and"],
      variant: "standard",
      concurrency: 4,
    });
  });

  it("applies defaults for tasks, variant, and concurrency", () => {
    const input = {
      models: ["openai/gpt-4"],
    };
    const result = Schema.decodeUnknownSync(BatchEvalRequest)(input);
    expect(result).toEqual({
      models: ["openai/gpt-4"],
      tasks: [],
      variant: "both",
      concurrency: 2,
    });
  });
});

describe("HealthStatus schema", () => {
  it("decodes valid health status", () => {
    const input = {
      status: "ok" as const,
      version: "1.0.0",
      db: "connected" as const,
      uptimeSeconds: 1234,
    };
    const result = Schema.decodeUnknownSync(HealthStatus)(input);
    expect(result).toEqual({
      status: "ok",
      version: "1.0.0",
      db: "connected",
      uptimeSeconds: 1234,
    });
  });

  it("decodes degraded health status", () => {
    const input = {
      status: "degraded" as const,
      version: "1.0.0",
      db: "disconnected" as const,
      uptimeSeconds: 0,
    };
    const result = Schema.decodeUnknownSync(HealthStatus)(input);
    expect(result).toEqual({
      status: "degraded",
      version: "1.0.0",
      db: "disconnected",
      uptimeSeconds: 0,
    });
  });

  it("rejects invalid status values", () => {
    const input = {
      status: "down",
      version: "1.0.0",
      db: "connected",
      uptimeSeconds: 1234,
    };
    expect(() => Schema.decodeUnknownSync(HealthStatus)(input)).toThrow();
  });

  it("rejects invalid db values", () => {
    const input = {
      status: "ok",
      version: "1.0.0",
      db: "error",
      uptimeSeconds: 1234,
    };
    expect(() => Schema.decodeUnknownSync(HealthStatus)(input)).toThrow();
  });
});
