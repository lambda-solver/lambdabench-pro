/**
 * LlmPrompts.test.ts — Pure unit tests, no Effect runtime needed.
 */

import { describe, it } from "vitest";
import { expect } from "vitest";
import type { Task } from "../check/Check";
import {
  buildRetryPrompt,
  buildSolvePrompt,
  buildTaskDetectionProbe,
} from "./LlmPrompts";

// ─── Fixture ─────────────────────────────────────────────────────────────────

const task: Task = {
  id: "cnat_add",
  desc: "Add two Church nats. Return A + B.",
  tests: [
    { expr: "@main(λf.λx.x, λf.λx.x)", want: "λa.λb.b" },
    { expr: "@main(λf.λx.f(x), λf.λx.f(x))", want: "λa.λb.a(a(b))" },
  ],
};

// ─── buildSolvePrompt ─────────────────────────────────────────────────────────

describe("buildSolvePrompt", () => {
  it("includes task description", () => {
    expect(buildSolvePrompt(task)).toContain("Add two Church nats");
  });

  it("includes all test expr strings", () => {
    const prompt = buildSolvePrompt(task);
    expect(prompt).toContain("@main(λf.λx.x, λf.λx.x)");
    expect(prompt).toContain("@main(λf.λx.f(x), λf.λx.f(x))");
  });

  it("includes all test want strings", () => {
    const prompt = buildSolvePrompt(task);
    expect(prompt).toContain("λa.λb.b");
    expect(prompt).toContain("λa.λb.a(a(b))");
  });

  it("instructs reply with @main =", () => {
    expect(buildSolvePrompt(task)).toContain("@main = ");
  });
});

// ─── buildRetryPrompt ─────────────────────────────────────────────────────────

describe("buildRetryPrompt", () => {
  it("contains prior attempt", () => {
    const prompt = buildRetryPrompt(task, "@main = λa.λb.a", [
      "error: wrong result",
    ]);
    expect(prompt).toContain("@main = λa.λb.a");
  });

  it("contains all error strings", () => {
    const errors = ["error: got λa.λb.a got λa.λb.b", "error: timeout"];
    const prompt = buildRetryPrompt(task, "@main = λa.λb.a", errors);
    expect(prompt).toContain(errors[0]);
    expect(prompt).toContain(errors[1]);
  });

  it("still includes task description", () => {
    expect(
      buildRetryPrompt(task, "@main = λa.λb.a", []),
    ).toContain("Add two Church nats");
  });
});

// ─── buildTaskDetectionProbe ──────────────────────────────────────────────────

describe("buildTaskDetectionProbe", () => {
  it("contains all 7 numbered menu options", () => {
    const probe = buildTaskDetectionProbe("Add two church nats", 120);
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      expect(probe).toContain(`${n}.`);
    }
  });

  it("includes length=n in metadata", () => {
    const probe = buildTaskDetectionProbe("hello", 42);
    expect(probe).toContain("length=42");
  });

  it("includes preview in metadata", () => {
    const probe = buildTaskDetectionProbe("Add two church nats", 99);
    expect(probe).toContain("Add two church nats");
  });
});
