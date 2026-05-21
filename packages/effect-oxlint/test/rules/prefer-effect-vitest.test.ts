import { describe, test } from "@effect/vitest";
import { preferEffectVitest } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  importDecl: T.importDecl,
  importDeclWithSpecifiers: T.importDeclWithSpecifiers,
  importSpecifier: T.importSpecifier,
  expectDiagnostics: T.expectDiagnostics,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("prefer-effect-vitest", () => {
  test("reports importing it from vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("vitest", [Testing.importSpecifier("it")]),
    );
    Testing.expectDiagnostics(result, [
      { message: "Import it and describe from @effect/vitest instead of vitest" },
    ]);
  });

  test("reports importing describe from vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("vitest", [Testing.importSpecifier("describe")]),
    );
    Testing.expectDiagnostics(result, [
      { message: "Import it and describe from @effect/vitest instead of vitest" },
    ]);
  });

  test("reports importing it and describe from vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("vitest", [
        Testing.importSpecifier("it"),
        Testing.importSpecifier("describe"),
      ]),
    );
    Testing.expectDiagnostics(result, [
      { message: "Import it and describe from @effect/vitest instead of vitest" },
    ]);
  });

  test("does not report importing test from vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("vitest", [Testing.importSpecifier("test")]),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report importing from vitest without specifiers", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDecl("vitest"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report importing it from @effect/vitest", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("@effect/vitest", [Testing.importSpecifier("it")]),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report unrelated import", () => {
    const result = Testing.runRule(
      preferEffectVitest,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("effect", [Testing.importSpecifier("Effect")]),
    );
    Testing.expectNoDiagnostics(result);
  });
});
