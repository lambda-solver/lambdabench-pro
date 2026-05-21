import { describe, test } from "@effect/vitest";
import { noCatchAll } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  memberExpr: T.memberExpr,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-catchall", () => {
  test("reports Effect.catchAll member expression", () => {
    const result = Testing.runRule(
      noCatchAll,
      "MemberExpression",
      Testing.memberExpr("Effect", "catchAll"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Effect.catchAll does not exist in Effect 4 — use Effect.catch" },
    ]);
  });

  test("does not report Effect.catch member expression", () => {
    const result = Testing.runRule(
      noCatchAll,
      "MemberExpression",
      Testing.memberExpr("Effect", "catch"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated member expression", () => {
    const result = Testing.runRule(
      noCatchAll,
      "MemberExpression",
      Testing.memberExpr("Array", "map"),
    );
    Testing.expectNoDiagnostics(result);
  });
});
