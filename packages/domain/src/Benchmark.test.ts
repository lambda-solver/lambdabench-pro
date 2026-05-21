import { BatchJob, EvalResult, ModelConfig } from "./Benchmark";
import { describe, expect, it } from "vitest";

import { Schema } from "effect";

describe("EvalResult schema", () => {
  it("decodes a valid eval result", () => {
    const input = {
      bits: 128,
      elapsedMs: 1234,
      errors: [],
      model: "openai/gpt-4",
      pass: true,
      score: 1.0,
      submission: "λa.λb.a(b)",
      taskId: "cnat_add",
      timestamp: "2024-01-01T00:00:00Z",
      variant: "standard" as const,
    };
    const result = Schema.decodeUnknownSync(EvalResult)(input);
    expect(result).toEqual({
      bits: 128,
      elapsedMs: 1234,
      errors: [],
      model: "openai/gpt-4",
      pass: true,
      score: 1.0,
      submission: "λa.λb.a(b)",
      taskId: "cnat_add",
      timestamp: "2024-01-01T00:00:00Z",
      variant: "standard",
    });
  });

  it("decodes eval result with errors array", () => {
    const input = {
      bits: 0,
      elapsedMs: 5000,
      errors: ["timeout", "wrong result"],
      model: "google/gemini-pro",
      pass: false,
      score: 0.0,
      submission: "",
      taskId: "bool_and",
      timestamp: "2024-01-02T00:00:00Z",
      variant: "rlm" as const,
    };
    const result = Schema.decodeUnknownSync(EvalResult)(input);
    expect(result.errors).toEqual(["timeout", "wrong result"]);
    expect(result.pass).toBe(false);
  });

  it("rejects invalid variant values", () => {
    const input = {
      bits: 128,
      elapsedMs: 1234,
      errors: [],
      model: "openai/gpt-4",
      pass: true,
      score: 1.0,
      submission: "λa.λb.a(b)",
      taskId: "cnat_add",
      timestamp: "2024-01-01T00:00:00Z",
      variant: "invalid",
    };
    expect(() => Schema.decodeUnknownSync(EvalResult)(input)).toThrow();
  });
});

describe("BatchJob schema", () => {
  it("decodes a valid batch job", () => {
    const input = {
      completedTasks: 3,
      createdAt: "2024-01-01T00:00:00Z",
      id: "job-001",
      results: [],
      status: "running" as const,
      totalTasks: 10,
    };
    const result = Schema.decodeUnknownSync(BatchJob)(input);
    expect(result).toEqual({
      completedTasks: 3,
      createdAt: "2024-01-01T00:00:00Z",
      id: "job-001",
      results: [],
      status: "running",
      totalTasks: 10,
    });
  });

  it("handles optional completedAt field when present", () => {
    const input = {
      completedAt: "2024-01-01T01:00:00Z",
      completedTasks: 5,
      createdAt: "2024-01-01T00:00:00Z",
      id: "job-002",
      results: [
        {
          bits: 128,
          elapsedMs: 1234,
          errors: [],
          model: "openai/gpt-4",
          pass: true,
          score: 1.0,
          submission: "λa.λb.a(b)",
          taskId: "cnat_add",
          timestamp: "2024-01-01T00:00:00Z",
          variant: "standard" as const,
        },
      ],
      status: "completed" as const,
      totalTasks: 5,
    };
    const result = Schema.decodeUnknownSync(BatchJob)(input);
    expect(result.completedAt).toBe("2024-01-01T01:00:00Z");
    expect(result.results).toHaveLength(1);
  });

  it("handles optional completedAt field when absent", () => {
    const input = {
      completedTasks: 0,
      createdAt: "2024-01-01T00:00:00Z",
      id: "job-003",
      results: [],
      status: "queued" as const,
      totalTasks: 8,
    };
    const result = Schema.decodeUnknownSync(BatchJob)(input);
    expect(result.completedAt).toBeUndefined();
  });

  it("rejects invalid status values", () => {
    const input = {
      completedTasks: 0,
      createdAt: "2024-01-01T00:00:00Z",
      id: "job-004",
      results: [],
      status: "cancelled",
      totalTasks: 5,
    };
    expect(() => Schema.decodeUnknownSync(BatchJob)(input)).toThrow();
  });
});

describe("ModelConfig schema", () => {
  it("decodes a valid model config", () => {
    const input = {
      displayName: "GPT-4",
      id: "openai/gpt-4",
      isActive: true,
      pricePerMOutput: 30.0,
      provider: "openrouter" as const,
    };
    const result = Schema.decodeUnknownSync(ModelConfig)(input);
    expect(result).toEqual({
      displayName: "GPT-4",
      id: "openai/gpt-4",
      isActive: true,
      pricePerMOutput: 30.0,
      provider: "openrouter",
    });
  });

  it("applies isActive default true when missing", () => {
    const input = {
      id: "google/gemini-pro",
      provider: "openrouter" as const,
    };
    const result = Schema.decodeUnknownSync(ModelConfig)(input);
    expect(result.isActive).toBe(true);
    expect(result.displayName).toBeUndefined();
    expect(result.pricePerMOutput).toBeUndefined();
  });

  it("rejects invalid provider values", () => {
    const input = {
      id: "some-model",
      provider: "anthropic",
    };
    expect(() => Schema.decodeUnknownSync(ModelConfig)(input)).toThrow();
  });
});
