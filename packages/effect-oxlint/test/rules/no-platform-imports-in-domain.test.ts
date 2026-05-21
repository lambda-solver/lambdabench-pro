import { describe, test } from "@effect/vitest";
import { noPlatformImportsInDomain } from "../../src/rules/index.js";
import * as T from "effect-oxlint/testing";

const Testing = {
  runRule: T.runRule,
  importDecl: T.importDecl,
  importDeclWithSpecifiers: T.importDeclWithSpecifiers,
  importSpecifier: T.importSpecifier,
  expectNoDiagnostics: T.expectNoDiagnostics,
};

describe("no-platform-imports-in-domain", () => {
  test("does not report platform import when filename is not in domain", () => {
    // The rule checks ctx.filename for "packages/domain/".
    // Since runRule does not set a domain filename, platform imports
    // should NOT trigger a diagnostic (the rule guards on filename).
    const result = Testing.runRule(
      noPlatformImportsInDomain,
      "ImportDeclaration",
      Testing.importDecl("@effect/platform-browser"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report effect core import", () => {
    const result = Testing.runRule(
      noPlatformImportsInDomain,
      "ImportDeclaration",
      Testing.importDecl("effect"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report effect/Effect import", () => {
    const result = Testing.runRule(
      noPlatformImportsInDomain,
      "ImportDeclaration",
      Testing.importDecl("effect/Effect"),
    );
    Testing.expectNoDiagnostics(result);
  });

  test("does not report platform import with specifiers", () => {
    const result = Testing.runRule(
      noPlatformImportsInDomain,
      "ImportDeclaration",
      Testing.importDeclWithSpecifiers("@effect/platform", [
        Testing.importSpecifier("HttpClient"),
      ]),
    );
    Testing.expectNoDiagnostics(result);
  });
});
