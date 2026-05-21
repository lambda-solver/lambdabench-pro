import { describe, test } from "@effect/vitest";
import { noStringCatchTag } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  callOfMember: T.callOfMember,
  callExpr: T.callExpr,
  strLiteral: T.strLiteral,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-string-catchtag", () => {
  test("reports Effect.catchTag with string literal", () => {
    // Effect.catchTag("EmailError", handler)
    const node = Testing.callOfMember("Effect", "catchTag", [
      Testing.strLiteral("EmailError"),
      Testing.callExpr("handler", []),
    ]);
    const result = Testing.runRule(noStringCatchTag, "CallExpression", node);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Avoid string literals in catchTag. Use typed error classes (Schema.TaggedErrorClass) for type-safe error handling.",
      },
    ]);
  });

  test("reports Effect.catchTags with string literal", () => {
    // Effect.catchTags({ "EmailError": handler })
    const node = Testing.callOfMember("Effect", "catchTags", [
      Testing.strLiteral("EmailError"),
      Testing.callExpr("handler", []),
    ]);
    const result = Testing.runRule(noStringCatchTag, "CallExpression", node);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Avoid string literals in catchTag. Use typed error classes (Schema.TaggedErrorClass) for type-safe error handling.",
      },
    ]);
  });

  test("does not report Effect.catchTag with class reference", () => {
    // Effect.catchTag(EmailError, handler)
    const node = Testing.callOfMember("Effect", "catchTag", [
      Testing.callExpr("EmailError", []),
      Testing.callExpr("handler", []),
    ]);
    const result = Testing.runRule(noStringCatchTag, "CallExpression", node);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report Effect.catch with string argument (only catchTag checked)", () => {
    // Effect.catch("EmailError", handler)
    const node = Testing.callOfMember("Effect", "catch", [
      Testing.strLiteral("EmailError"),
      Testing.callExpr("handler", []),
    ]);
    const result = Testing.runRule(noStringCatchTag, "CallExpression", node);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated Effect call", () => {
    // Effect.gen(fn)
    const node = Testing.callOfMember("Effect", "gen", [Testing.callExpr("fn", [])]);
    const result = Testing.runRule(noStringCatchTag, "CallExpression", node);
    Testing.expectNoDiagnostics(result);
  });
});
