import { describe, test } from "@effect/vitest";
import { noForLoopsInEffectGen } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRuleMulti: T.runRuleMulti,
  forStmt: T.forStmt,
  callOfMember: T.callOfMember,
  callExpr: T.callExpr,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-for-loops-in-effect-gen", () => {
  test("reports for statement inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noForLoopsInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["ForStatement", Testing.forStmt()],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.forEach instead of for loops in Effect.gen" },
    ]);
  });

  test("does not report ForStatement outside Effect.gen", () => {
    const result = Testing.runRuleMulti(noForLoopsInEffectGen, [
      ["ForStatement", Testing.forStmt()],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report regular CallExpression", () => {
    const result = Testing.runRuleMulti(noForLoopsInEffectGen, [
      ["CallExpression", Testing.callExpr("doSomething", [])],
    ]);
    Testing.expectNoDiagnostics(result);
  });
});
