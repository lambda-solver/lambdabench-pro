import { describe, test } from "@effect/vitest";
import { noServiceBind } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  callOfMember: T.callOfMember,
  chainedMemberExpr: T.chainedMemberExpr,
  id: T.id,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-service-bind", () => {
  test("reports .bind() call on chained service object", () => {
    // CallExpression: Cloudflare.R2Bucket.bind(Tickets)
    const callee = Testing.chainedMemberExpr("Cloudflare", "R2Bucket", "bind");
    const node = {
      type: "CallExpression" as const,
      callee,
      arguments: [Testing.id("Tickets")],
    } as never;
    const result = Testing.runRule(noServiceBind, "CallExpression", node);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Avoid .bind() on service objects with PascalCase identifiers. Use Context.Service with Layer for dependency injection instead.",
      },
    ]);
  });

  test("reports simple .bind() call with PascalCase arg", () => {
    // CallExpression: someService.bind(PascalCaseService)
    const node = Testing.callOfMember("someService", "bind", [
      Testing.id("PascalCaseService"),
    ]);
    const result = Testing.runRule(noServiceBind, "CallExpression", node);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Avoid .bind() on service objects with PascalCase identifiers. Use Context.Service with Layer for dependency injection instead.",
      },
    ]);
  });

  test("does not report Function.prototype.bind with 'this' argument", () => {
    // CallExpression: fn.bind(this) — Function.prototype.bind, not service binding
    const node = Testing.callOfMember("fn", "bind", [Testing.id("this")]);
    const result = Testing.runRule(noServiceBind, "CallExpression", node);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report non-bind method calls", () => {
    // CallExpression: Effect.pipe(args)
    const node = Testing.callOfMember("Effect", "pipe", []);
    const result = Testing.runRule(noServiceBind, "CallExpression", node);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report bare function calls", () => {
    // CallExpression: doSomething()
    const node = T.callExpr("doSomething", []);
    const result = Testing.runRule(noServiceBind, "CallExpression", node);
    Testing.expectNoDiagnostics(result);
  });
});
