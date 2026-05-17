import { describe, test } from "@effect/vitest";
import { Testing } from "effect-oxlint/testing";
import {
  noAsyncAwaitInEffectGen,
  noCatchAll,
  noEffectIterate,
  noForLoopsInEffectGen,
  noLetInEffectGen,
  noPipeAfterEffectFn,
  noTryCatchInEffectGen,
  preferContextService,
  preferEffectFn,
  preferEffectVitest,
  preferTaggedErrorClass,
} from "../../src/rules/index.js";

describe("prefer-effect-fn", () => {
  test("reports plain Effect.gen in export", () => {
    const result = Testing.runRule(
      preferEffectFn,
      "VariableDeclarator",
      Testing.varDecl("fetchUser", Testing.callExpr("Effect", "gen")),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.fn('name')(function* () { ... }) for named exported functions" },
    ]);
  });

  test("ignores non-exported variables", () => {
    const result = Testing.runRule(
      preferEffectFn,
      "VariableDeclarator",
      Testing.varDecl("fetchUser", Testing.callExpr("Effect", "gen")),
    );
    Testing.expectNoDiagnostics(result);
  });
});

describe("no-let-in-effect-gen", () => {
  test("reports let inside Effect.gen", () => {
    const result = Testing.runRule(
      noLetInEffectGen,
      "VariableDeclaration",
      Testing.varDecl("count", Testing.literal(0), { kind: "let" }),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Ref, SynchronizedRef, or Effect.cached instead of let bindings in Effect.gen" },
    ]);
  });
});

describe("no-try-catch-in-effect-gen", () => {
  test("reports try/catch inside Effect.gen", () => {
    const result = Testing.runRule(
      noTryCatchInEffectGen,
      "TryStatement",
      Testing.tryStmt(),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.catchTag or Effect.catch instead of try/catch in Effect.gen" },
    ]);
  });
});

describe("no-async-await-in-effect-gen", () => {
  test("reports await inside Effect.gen", () => {
    const result = Testing.runRule(
      noAsyncAwaitInEffectGen,
      "AwaitExpression",
      Testing.awaitExpr(Testing.callExpr("fetch", "")),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.tryPromise instead of await in Effect.gen" },
    ]);
  });
});

describe("no-pipe-after-effect-fn", () => {
  test("reports .pipe after Effect.fn", () => {
    const effectFn = Testing.callExpr("Effect", "fn");
    const pipeCall = Testing.callExprMember(effectFn, "pipe");
    const result = Testing.runRule(
      noPipeAfterEffectFn,
      "CallExpression",
      pipeCall,
    );
    Testing.expectDiagnostics(result, [
      { message: "Pass operators as additional arguments to Effect.fn instead of .pipe" },
    ]);
  });
});

describe("no-catchall", () => {
  test("reports Effect.catchAll", () => {
    const result = Testing.runRule(
      noCatchAll,
      "MemberExpression",
      Testing.memberExpr("Effect", "catchAll"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Effect.catchAll does not exist in Effect 4 — use Effect.catch" },
    ]);
  });
});

describe("no-effect-iterate", () => {
  test("reports Effect.iterate", () => {
    const result = Testing.runRule(
      noEffectIterate,
      "MemberExpression",
      Testing.memberExpr("Effect", "iterate"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Effect.iterate does not exist in Effect 4 — use Effect.suspend for recursive loops" },
    ]);
  });
});

describe("prefer-context-service", () => {
  test("reports Context.Tag usage", () => {
    const result = Testing.runRule(
      preferContextService,
      "MemberExpression",
      Testing.memberExpr("Context", "Tag"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Context.Service instead of Context.Tag / Context.GenericTag" },
    ]);
  });

  test("reports Effect.Service usage", () => {
    const result = Testing.runRule(
      preferContextService,
      "CallExpression",
      Testing.callExpr("Effect", "Service"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Context.Service instead of Effect.Service (deprecated in v4)" },
    ]);
  });
});

describe("no-for-loops-in-effect-gen", () => {
  test("reports for loop inside Effect.gen", () => {
    const result = Testing.runRule(
      noForLoopsInEffectGen,
      "ForStatement",
      Testing.forStmt(),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.forEach instead of for loops in Effect.gen" },
    ]);
  });
});

describe("prefer-tagged-error-class", () => {
  test("reports Data.TaggedError", () => {
    const result = Testing.runRule(
      preferTaggedErrorClass,
      "MemberExpression",
      Testing.memberExpr("Data", "TaggedError"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Schema.TaggedErrorClass instead of Data.TaggedError for serializable, round-trippable errors" },
    ]);
  });
});

describe("prefer-effect-vitest", () => {
  test("reports it from vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDecl("vitest", ["it", "describe"]),
    );
    Testing.expectDiagnostics(result, [
      { message: "Import it and describe from @effect/vitest instead of vitest" },
    ]);
  });
});
