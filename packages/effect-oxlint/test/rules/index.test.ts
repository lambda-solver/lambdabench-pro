import { describe, test } from "@effect/vitest";
import {
  noAsyncAwaitInEffectGen,
  noCatchAll,
  noEffectIterate,
  noForLoopsInEffectGen,
  noLetInEffectGen,
  noLinterDisableComments,
  noPipeAfterEffectFn,
  noPlatformImportsInDomain,
  noTryCatchInEffectGen,
  noVitestExpectForEffect,
  preferContextService,
  preferEffectVitest,
} from "../../src/rules/index.js";

import * as T from "effect-oxlint/testing";

// Bridge helpers: the testing module exports individual functions (runRule,
// varDecl, etc.) rather than a `Testing` namespace. The local wrappers below
// adapt the module to the `Testing.*` API used in these tests.

const literal = (value: unknown) => {
  if (typeof value === "string") return T.strLiteral(value);
  if (typeof value === "number") return T.numLiteral(value);
  if (typeof value === "boolean") return T.boolLiteral(value);
  return T.strLiteral(String(value));
};

const awaitExpr = (argument?: unknown) =>
  ({ type: "AwaitExpression" as const, argument: argument ?? null }) as never;

const callExprMember = (obj: unknown, prop: string) =>
  ({
    type: "CallExpression" as const,
    callee: { type: "MemberExpression" as const, object: obj, property: T.id(prop), computed: false, optional: false },
    arguments: [],
  }) as never;

const varDecl = (nameOrKind: string, init?: unknown, opts?: { kind?: string }) => {
  const kind = (typeof opts?.kind === "string" ? opts.kind : "const") as "const" | "let" | "var";
  // When called with 2 args the test uses (name, init); with 3 args (name, init, { kind }).
  return T.varDecl(kind, nameOrKind, init);
};

const importDecl = (source: string, specifiers?: readonly string[]) => {
  if (specifiers?.length) {
    return T.importDeclWithSpecifiers(
      source,
      specifiers.map((s) => T.importSpecifier(s)),
    );
  }
  return T.importDecl(source);
};

const expectCall = (args: ReadonlyArray<unknown>) =>
  ({
    type: "CallExpression" as const,
    callee: T.id("expect"),
    arguments: args,
  }) as never;

const Testing = {
  runRule: T.runRule,
  runRuleMulti: T.runRuleMulti,
  varDecl,
  callExpr: T.callExpr,
  callOfMember: T.callOfMember,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
  literal,
  tryStmt: T.tryStmt,
  awaitExpr,
  callExprMember,
  memberExpr: T.memberExpr,
  forStmt: T.forStmt,
  importDecl,
  program: T.program,
  comment: T.comment,
  expectCall,
};

describe("no-async-await-in-effect-gen", () => {
  test("reports await inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noAsyncAwaitInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["AwaitExpression", Testing.awaitExpr(Testing.callExpr("fetch", [""]))],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.tryPromise instead of await in Effect.gen" },
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

describe("no-for-loops-in-effect-gen", () => {
  test("reports for loop inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noForLoopsInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["ForStatement", Testing.forStmt()],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.forEach instead of for loops in Effect.gen" },
    ]);
  });
});

describe("no-let-in-effect-gen", () => {
  test("reports let inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noLetInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["VariableDeclaration", Testing.varDecl("count", Testing.literal(0), { kind: "let" })],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Ref, SynchronizedRef, or Effect.cached instead of let bindings in Effect.gen" },
    ]);
  });
});

describe("no-linter-disable-comments", () => {
  test("reports // oxlint-disable-next-line comment", () => {
    const comment = Testing.comment("Line", " oxlint-disable-next-line no-console");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectDiagnostics(result, [
      { message: "Do not disable linter rules with comments. Fix the underlying issue instead." },
    ]);
  });

  test("does not report normal comments", () => {
    const comment = Testing.comment("Line", " This is just a normal comment");
    const program = Testing.program([], [comment]);
    const result = Testing.runRule(noLinterDisableComments, "Program", program);
    Testing.expectNoDiagnostics(result);
  });
});

describe("no-pipe-after-effect-fn", () => {
  test("reports .pipe after Effect.fn", () => {
    const effectFn = Testing.callOfMember("Effect", "fn");
    const pipeCall = Testing.callExprMember(effectFn, "pipe");
    const result = Testing.runRule(noPipeAfterEffectFn, "CallExpression", pipeCall);
    Testing.expectDiagnostics(result, [
      { message: "Pass operators as additional arguments to Effect.fn instead of .pipe" },
    ]);
  });
});

describe("no-platform-imports-in-domain", () => {
  test("does not report platform import outside domain", () => {
    // The rule checks ctx.filename for "packages/domain/" — since runRule
    // does not set a domain filename, the guard prevents reporting.
    const result = Testing.runRule(
      noPlatformImportsInDomain,
      "ImportDeclaration",
      Testing.importDecl("@effect/platform-browser"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report core effect import", () => {
    const result = Testing.runRule(
      noPlatformImportsInDomain,
      "ImportDeclaration",
      Testing.importDecl("effect"),
    );
    Testing.expectNoDiagnostics(result);
  });
});

describe("no-try-catch-in-effect-gen", () => {
  test("reports try/catch inside Effect.gen", () => {
    const result = Testing.runRuleMulti(noTryCatchInEffectGen, [
      ["CallExpression", Testing.callOfMember("Effect", "gen")],
      ["TryStatement", Testing.tryStmt()],
      ["CallExpression:exit", Testing.callOfMember("Effect", "gen")],
    ]);
    Testing.expectDiagnostics(result, [
      { message: "Use Effect.catchTag or Effect.catch instead of try/catch in Effect.gen" },
    ]);
  });
});

describe("no-vitest-expect-for-effect", () => {
  test("reports expect(myEffect)", () => {
    const result = Testing.runRule(
      noVitestExpectForEffect,
      "CallExpression",
      Testing.expectCall([T.id("myEffect")]),
    );
    Testing.expectDiagnostics(result, [
      {
        message:
          "Use @effect/vitest/utils assertions (strictEqual, assertTrue, etc.) instead of vitest expect for Effect values",
      },
    ]);
  });

  test("does not report expect(plainValue)", () => {
    const result = Testing.runRule(
      noVitestExpectForEffect,
      "CallExpression",
      Testing.expectCall([T.id("plainValue")]),
    );
    Testing.expectNoDiagnostics(result);
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
      Testing.callOfMember("Effect", "Service"),
    );
    Testing.expectDiagnostics(result, [
      { message: "Use Context.Service instead of Effect.Service (deprecated in v4)" },
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

  test("does not report test-only from vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDecl("vitest", ["test", "expect"]),
    );
    Testing.expectNoDiagnostics(result);
  });
});
