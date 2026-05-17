/**
 * LamCodeExtractor.test.ts — Pure unit tests.
 */

import { describe, expect, it } from "vitest";
import { extractLamCode } from "./LamCodeExtractor";

describe("extractLamCode", () => {
  it("extracts content from ```lambda fence", () => {
    const raw = "Here is your answer:\n```lambda\n@main = λf.λx.f(x)\n```\nDone.";
    expect(extractLamCode(raw)).toBe("@main = λf.λx.f(x)");
  });

  it("extracts content from ```lam fence", () => {
    const raw = "Solution:\n```lam\n@main = λa.λb.a(b)\n```";
    expect(extractLamCode(raw)).toBe("@main = λa.λb.a(b)");
  });

  it("fence extraction is case-insensitive", () => {
    const raw = "```LAM\n@main = λf.x\n```";
    expect(extractLamCode(raw)).toBe("@main = λf.x");
  });

  it("extracts bare @main = line from prose", () => {
    const raw = "The answer is:\n\n@main = λf.λx.f(f(x))\n\nThat's it.";
    expect(extractLamCode(raw)).toBe("@main = λf.λx.f(f(x))");
  });

  it("includes helper @defs before @main", () => {
    const raw = "Here:\n@add = λa.λb.λf.λx.a(f)(b(f)(x))\n@main = @add\nDone.";
    const result = extractLamCode(raw);
    expect(result).toContain("@add");
    expect(result).toContain("@main");
  });

  it("returns trimmed raw when no fence and no @main line", () => {
    const raw = "  I don't know how to solve this.  ";
    expect(extractLamCode(raw)).toBe("I don't know how to solve this.");
  });

  it("ignores ```python fences (not lambda/lam)", () => {
    const raw = "```python\nprint('hello')\n```\n@main = λf.λx.x";
    expect(extractLamCode(raw)).toContain("@main");
  });
});
