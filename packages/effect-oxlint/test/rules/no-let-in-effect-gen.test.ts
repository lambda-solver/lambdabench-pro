import { describe, test } from "@effect/vitest";
import { noLetInEffectGen } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRuleMulti: T.runRuleMulti,
  callOfMember: T.callOfMember,
  varDecl: T.varDecl,
  numLiteral: T.numLiteral,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-let-in-effect-gen", () => {
  test("reports let variable declaration inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noLetInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["VariableDeclaration", Testing.varDecl("let", "count", Testing.numLiteral(0))],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Ref, SynchronizedRef, or Effect.cached instead of let bindings in Effect.gen" },
    ]);
  });

  test("does not report const variable declaration inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noLetInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["VariableDeclaration", Testing.varDecl("const", "count", Testing.numLiteral(0))],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report var variable declaration", () => {
    const result = Testing.runRuleMulti(noLetInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["VariableDeclaration", Testing.varDecl("var", "count", Testing.numLiteral(0))],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report let variable declaration outside Effect.gen", () => {
    const result = Testing.runRuleMulti(noLetInEffectGen, [
      ["VariableDeclaration", Testing.varDecl("let", "count", Testing.numLiteral(0))],
    ]);
    Testing.expectNoDiagnostics(result);
  });
});
