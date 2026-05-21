import { describe, test } from "@effect/vitest";
import { noVitestExpectForEffect } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  id: T.id,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

const expectCall = (args: ReadonlyArray<unknown>) =>
  ({
    type: "CallExpression" as const,
    callee: Testing.id("expect"),
    arguments: args,
  }) as never;

describe("no-vitest-expect-for-effect", () => {
  test("reports expect() with Effect variable name", () => {
    const callNode = expectCall([Testing.id("myEffect")]);
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Use @effect/vitest/utils assertions (strictEqual, assertTrue, etc.) instead of vitest expect for Effect values",
      },
    ]);
  });

  test("reports expect() with layer variable name", () => {
    const callNode = expectCall([Testing.id("myLayer")]);
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Use @effect/vitest/utils assertions (strictEqual, assertTrue, etc.) instead of vitest expect for Effect values",
      },
    ]);
  });

  test("reports expect() with result variable name", () => {
    const callNode = expectCall([Testing.id("testResult")]);
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Use @effect/vitest/utils assertions (strictEqual, assertTrue, etc.) instead of vitest expect for Effect values",
      },
    ]);
  });

  test("reports expect() with program variable name", () => {
    const callNode = expectCall([Testing.id("myProgram")]);
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Use @effect/vitest/utils assertions (strictEqual, assertTrue, etc.) instead of vitest expect for Effect values",
      },
    ]);
  });

  test("does not report expect() with non-Effect variable name", () => {
    const callNode = expectCall([Testing.id("plainValue")]);
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report expect() with non-effect identifier", () => {
    const callNode = expectCall([Testing.id("count")]);
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report non-expect call", () => {
    const callNode = {
      type: "CallExpression" as const,
      callee: Testing.id("someFn"),
      arguments: [Testing.id("myEffect")],
    } as never;
    const result = Testing.runRule(noVitestExpectForEffect, "CallExpression", callNode);
    Testing.expectNoDiagnostics(result);
  });
});
