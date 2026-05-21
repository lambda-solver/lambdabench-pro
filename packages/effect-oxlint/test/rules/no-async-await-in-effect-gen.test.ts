import { describe, test } from "@effect/vitest";
import { noAsyncAwaitInEffectGen } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRuleMulti: T.runRuleMulti,
  callOfMember: T.callOfMember,
  callExpr: T.callExpr,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

const awaitNode = (argument: unknown) =>
  ({ type: "AwaitExpression" as const, argument }) as never;

describe("no-async-await-in-effect-gen", () => {
  test("reports await expression inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noAsyncAwaitInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["AwaitExpression", awaitNode(Testing.callExpr("fetch", []))],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.tryPromise instead of await in Effect.gen" },
    ]);
  });

  test("reports await expression with null argument", () => {
    const result = Testing.runRuleMulti(noAsyncAwaitInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["AwaitExpression", awaitNode(null)],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.tryPromise instead of await in Effect.gen" },
    ]);
  });

  test("does not report AwaitExpression outside Effect.gen", () => {
    const result = Testing.runRuleMulti(noAsyncAwaitInEffectGen, [
      ["AwaitExpression", awaitNode(Testing.callExpr("fetch", []))],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report regular CallExpression", () => {
    const result = Testing.runRuleMulti(noAsyncAwaitInEffectGen, [
      ["CallExpression", Testing.callExpr("doSomething", [])],
    ]);
    Testing.expectNoDiagnostics(result);
  });
});
