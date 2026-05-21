import { describe, test } from "@effect/vitest";
import { preferContextService } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  memberExpr: T.memberExpr,
  callOfMember: T.callOfMember,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("prefer-context-service", () => {
  test("reports Context.Tag member expression", () => {
    const result = Testing.runRule(
      preferContextService,
      "MemberExpression",
      Testing.memberExpr("Context", "Tag"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Context.Service instead of Context.Tag / Context.GenericTag" },
    ]);
  });

  test("reports Context.GenericTag member expression", () => {
    const result = Testing.runRule(
      preferContextService,
      "MemberExpression",
      Testing.memberExpr("Context", "GenericTag"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Context.Service instead of Context.Tag / Context.GenericTag" },
    ]);
  });

  test("reports Effect.Service call expression", () => {
    const result = Testing.runRule(
      preferContextService,
      "CallExpression",
      Testing.callOfMember("Effect", "Service"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Context.Service instead of Effect.Service (deprecated in v4)" },
    ]);
  });

  test("does not report Context.Service member expression", () => {
    const result = Testing.runRule(
      preferContextService,
      "MemberExpression",
      Testing.memberExpr("Context", "Service"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated member expression", () => {
    const result = Testing.runRule(
      preferContextService,
      "MemberExpression",
      Testing.memberExpr("Effect", "gen"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated call expression", () => {
    const result = Testing.runRule(
      preferContextService,
      "CallExpression",
      Testing.callOfMember("Effect", "fn"),
    );
    Testing.expectNoDiagnostics(result);
  });
});
