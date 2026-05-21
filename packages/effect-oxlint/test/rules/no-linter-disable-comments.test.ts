import { describe, test } from "@effect/vitest";
import { noLinterDisableComments } from "../../src/rules/index.js";

import * as T from "effect-oxlint/testing";

// Bridge helpers — adapted from test/rules/index.test.ts
const Testing = {
  runRule: T.runRule,
  program: T.program,
  comment: T.comment,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-linter-disable-comments", () => {
  test("reports // oxlint-disable-next-line comment", () => {
    const comment = Testing.comment("Line", " oxlint-disable-next-line no-console");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("reports /* oxlint-disable */ block comment", () => {
    const comment = Testing.comment("Block", " oxlint-disable ");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("reports // eslint-disable-next-line comment", () => {
    const comment = Testing.comment("Line", " eslint-disable-next-line no-console");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("reports /* eslint-disable */ block comment", () => {
    const comment = Testing.comment("Block", " eslint-disable ");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("reports // tslint-disable comment", () => {
    const comment = Testing.comment("Line", " tslint-disable:no-console");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("reports // biome-ignore comment", () => {
    const comment = Testing.comment("Line", " biome-ignore lint: noConsole");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("reports // stylelint-disable comment", () => {
    const comment = Testing.comment("Line", " stylelint-disable-next-line");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("does not report normal comments", () => {
    const comment = Testing.comment("Line", " This is just a normal comment about linting");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report program with no comments", () => {
    const program = Testing.program([], []);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated comment mentioning 'disable'", () => {
    const comment = Testing.comment("Line", " TODO: disable this feature flag later");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectNoDiagnostics(result);
  });
});
