import { describe, test } from "@effect/vitest";
import { noTryCatchInEffectGen } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRuleMulti: T.runRuleMulti,
  tryStmt: T.tryStmt,
  callOfMember: T.callOfMember,
  callExpr: T.callExpr,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-try-catch-in-effect-gen", () => {
  test("reports try/catch inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noTryCatchInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["TryStatement", Testing.tryStmt()],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.catchTag or Effect.catch instead of try/catch in Effect.gen" },
    ]);
  });

  test("does not report TryStatement outside Effect.gen", () => {
    const result = Testing.runRuleMulti(noTryCatchInEffectGen, [
      ["TryStatement", Testing.tryStmt()],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report regular CallExpression", () => {
    const result = Testing.runRuleMulti(noTryCatchInEffectGen, [
      ["CallExpression", Testing.callExpr("doSomething", [])],
    ]);
    Testing.expectNoDiagnostics(result);
  });
});
