import { describe, test } from "@effect/vitest";
import { noUnyieldedPromiseInEffectGen } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  runRuleMulti: T.runRuleMulti,
  callOfMember: T.callOfMember,
  callExpr: T.callExpr,
  strLiteral: T.strLiteral,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-unyielded-promise-in-effect-gen", () => {
  test("reports async method call inside Effect.gen without yield*", () => {
    // tickets.put(key, data) inside Effect.gen
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      [
        "CallExpression",
        Testing.callOfMember("tickets", "put", [
          Testing.strLiteral("key"),
          Testing.strLiteral("data"),
        ]),
      ],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Async method calls inside Effect.gen must be wrapped with yield* Effect.tryPromise() or similar",
      },
    ]);
  });

  test("reports async method call inside Effect.fn without yield*", () => {
    // db.write(data) inside Effect.fn
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "fn")],
      [
        "CallExpression",
        Testing.callOfMember("db", "write", [Testing.strLiteral("data")]),
      ],
      ["CallExpression:exit", Testing.callOfMember("Effect", "fn")],
    ]);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Async method calls inside Effect.gen must be wrapped with yield* Effect.tryPromise() or similar",
      },
    ]);
  });

  test("reports fetch() call inside Effect.gen without yield*", () => {
    // service.fetch(url) inside Effect.gen
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      [
        "CallExpression",
        Testing.callOfMember("service", "fetch", [Testing.strLiteral("url")]),
      ],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Async method calls inside Effect.gen must be wrapped with yield* Effect.tryPromise() or similar",
      },
    ]);
  });

  test("reports get() call inside Effect.fnUntraced without yield*", () => {
    // client.get(path) inside Effect.fnUntraced
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "fnUntraced")],
      [
        "CallExpression",
        Testing.callOfMember("client", "get", [Testing.strLiteral("/api")]),
      ],
      ["CallExpression:exit", Testing.callOfMember("Effect", "fnUntraced")],
    ]);
    Testing.expectDiagnostics(result, [
      {
        message:
          "Async method calls inside Effect.gen must be wrapped with yield* Effect.tryPromise() or similar",
      },
    ]);
  });

  test("does not report async method call outside Effect.gen", () => {
    // tickets.put(key, data) — no Effect.gen wrapper
    const result = Testing.runRule(
      noUnyieldedPromiseInEffectGen,
      "CallExpression",
      Testing.callOfMember("tickets", "put", [
        Testing.strLiteral("key"),
        Testing.strLiteral("data"),
      ]),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report non-async method call inside Effect.gen", () => {
    // obj.map(fn) inside Effect.gen — "map" is not in the async set
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      [
        "CallExpression",
        Testing.callOfMember("arr", "map", [Testing.callExpr("fn", [])]),
      ],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report bare function call", () => {
    // doSomething() — not a MemberExpression callee
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["CallExpression", Testing.callExpr("doSomething", [])],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectNoDiagnostics(result);
  });

  test("does not report async method call wrapped with yield*", () => {
    // yield* obj.put(data) — yield* exempts the async call
    const asyncCall = Testing.callOfMember("obj", "put", [
      Testing.strLiteral("data"),
    ]);
    const result = Testing.runRuleMulti(noUnyieldedPromiseInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      [
        "CallExpression",
        {
          ...asyncCall,
          parent: T.yieldExpr(asyncCall, true),
        } as never,
      ],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectNoDiagnostics(result);
  });
});
