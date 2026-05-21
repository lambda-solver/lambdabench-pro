import { describe, test } from "@effect/vitest";
import { noPipeAfterEffectFn } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  callOfMember: T.callOfMember,
  id: T.id,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-pipe-after-effect-fn", () => {
  test("reports .pipe() called on Effect.fn()", () => {
    // Build: Effect.fn("name")(fn).pipe(operator)
    const effectFnCall = Testing.callOfMember("Effect", "fn");
    const pipeMemberExpr = {
      type: "MemberExpression" as const,
      object: effectFnCall,
      property: Testing.id("pipe"),
      computed: false,
      optional: false,
    };
    const pipeCallExpr = {
      type: "CallExpression" as const,
      callee: pipeMemberExpr,
      arguments: [],
    } as never;
    const result = Testing.runRule(noPipeAfterEffectFn, "CallExpression", pipeCallExpr);
    Testing.expectDiagnostics(result, [
      { message: "Pass operators as additional arguments to Effect.fn instead of .pipe" },
    ]);
  });

  test("does not report .pipe() called on non-Effect.fn", () => {
    // Build: someObj.pipe(operator) where someObj is not Effect.fn()
    const plainCall = Testing.callOfMember("SomeService", "make");
    const pipeMemberExpr = {
      type: "MemberExpression" as const,
      object: plainCall,
      property: Testing.id("pipe"),
      computed: false,
      optional: false,
    };
    const pipeCallExpr = {
      type: "CallExpression" as const,
      callee: pipeMemberExpr,
      arguments: [],
    } as never;
    const result = Testing.runRule(noPipeAfterEffectFn, "CallExpression", pipeCallExpr);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report regular CallExpression without pipe", () => {
    const result = Testing.runRule(
      noPipeAfterEffectFn,
      "CallExpression",
      Testing.callOfMember("Effect", "fn"),
    );
    Testing.expectNoDiagnostics(result);
  });
});
