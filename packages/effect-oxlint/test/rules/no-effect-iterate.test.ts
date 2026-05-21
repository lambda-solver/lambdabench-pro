import { describe, test } from "@effect/vitest";
import { noEffectIterate } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  memberExpr: T.memberExpr,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-effect-iterate", () => {
  test("reports Effect.iterate member expression", () => {
    const result = Testing.runRule(
      noEffectIterate,
      "MemberExpression",
      Testing.memberExpr("Effect", "iterate"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Effect.iterate does not exist in Effect 4 — use Effect.suspend for recursive loops" },
    ]);
  });

  test("does not report Effect.suspend member expression", () => {
    const result = Testing.runRule(
      noEffectIterate,
      "MemberExpression",
      Testing.memberExpr("Effect", "suspend"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated member expression", () => {
    const result = Testing.runRule(
      noEffectIterate,
      "MemberExpression",
      Testing.memberExpr("Array", "forEach"),
    );
    Testing.expectNoDiagnostics(result);
  });
});
