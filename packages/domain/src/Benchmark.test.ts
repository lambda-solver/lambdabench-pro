import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { BatchJob, EvalResult, ModelConfig } from "./Benchmark";

describe("EvalResult schema", () => {
  it("decodes a valid eval result", () => {
    const input = {
      taskId: "cnat_add",
      model: "openai/gpt-4",
      variant: "standard" as const,
      pass: true,
      bits: 128,
      score: 1.0,
      errors: [],
      elapsedMs: 1234,
      submission: "λa.λb.a(b)",
      timestamp: "2024-01-01T00:00:00Z",
    };
    const result = Schema.decodeUnknownSync(EvalResult)(input);
    expect(result).toEqual({
      taskId: "cnat_add",
      model: "openai/gpt-4",
      variant: "standard",
      pass: true,
      bits: 128,
      score: 1.0,
      errors: [],
      elapsedMs: 1234,
      submission: "λa.λb.a(b)",
      timestamp: "2024-01-01T00:00:00Z",
    });
  });

  it("decodes eval result with errors array", () => {
    const input = {
      taskId: "bool_and",
      model: "google/gemini-pro",
      variant: "rlm" as const,
      pass: false,
      bits: 0,
      score: 0.0,
      errors: ["timeout", "wrong result"],
      elapsedMs: 5000,
      submission: "",
      timestamp: "2024-01-02T00:00:00Z",
    };
    const result = Schema.decodeUnknownSync(EvalResult)(input);
    expect(result.errors).toEqual(["timeout", "wrong result"]);
    expect(result.pass).toBe(false);
  });

  it("rejects invalid variant values", () => {
    const input = {
      taskId: "cnat_add",
      model: "openai/gpt-4",
      variant: "invalid",
      pass: true,
      bits: 128,
      score: 1.0,
      errors: [],
      elapsedMs: 1234,
      submission: "λa.λb.a(b)",
      timestamp: "2024-01-01T00:00:00Z",
    };
    expect(() => Schema.decodeUnknownSync(EvalResult)(input)).toThrow();
  });
});

describe("BatchJob schema", () => {
  it("decodes a valid batch job", () => {
    const input = {
      id: "job-001",
      status: "running" as const,
      createdAt: "2024-01-01T00:00:00Z",
      totalTasks: 10,
      completedTasks: 3,
      results: [],
    };
    const result = Schema.decodeUnknownSync(BatchJob)(input);
    expect(result).toEqual({
      id: "job-001",
      status: "running",
      createdAt: "2024-01-01T00:00:00Z",
      totalTasks: 10,
      completedTasks: 3,
      results: [],
    });
  });

  it("handles optional completedAt field when present", () => {
    const input = {
      id: "job-002",
      status: "completed" as const,
      createdAt: "2024-01-01T00:00:00Z",
      completedAt: "2024-01-01T01:00:00Z",
      totalTasks: 5,
      completedTasks: 5,
      results: [
        {
          taskId: "cnat_add",
          model: "openai/gpt-4",
          variant: "standard" as const,
          pass: true,
          bits: 128,
          score: 1.0,
          errors: [],
          elapsedMs: 1234,
          submission: "λa.λb.a(b)",
          timestamp: "2024-01-01T00:00:00Z",
        },
      ],
    };
    const result = Schema.decodeUnknownSync(BatchJob)(input);
    expect(result.completedAt).toBe("2024-01-01T01:00:00Z");
    expect(result.results).toHaveLength(1);
  });

  it("handles optional completedAt field when absent", () => {
    const input = {
      id: "job-003",
      status: "queued" as const,
      createdAt: "2024-01-01T00:00:00Z",
      totalTasks: 8,
      completedTasks: 0,
      results: [],
    };
    const result = Schema.decodeUnknownSync(BatchJob)(input);
    expect(result.completedAt).toBeUndefined();
  });

  it("rejects invalid status values", () => {
    const input = {
      id: "job-004",
      status: "cancelled",
      createdAt: "2024-01-01T00:00:00Z",
      totalTasks: 5,
      completedTasks: 0,
      results: [],
    };
    expect(() => Schema.decodeUnknownSync(BatchJob)(input)).toThrow();
  });
});

describe("ModelConfig schema", () => {
  it("decodes a valid model config", () => {
    const input = {
      id: "openai/gpt-4",
      provider: "openrouter" as const,
      displayName: "GPT-4",
      pricePerMOutput: 30.0,
      isActive: true,
    };
    const result = Schema.decodeUnknownSync(ModelConfig)(input);
    expect(result).toEqual({
      id: "openai/gpt-4",
      provider: "openrouter",
      displayName: "GPT-4",
      pricePerMOutput: 30.0,
      isActive: true,
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
