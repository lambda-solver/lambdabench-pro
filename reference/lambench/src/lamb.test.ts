import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { inlineRefs, normalize, parse, printNormal, toBinary } from "./lamb";

// ─── helpers ────────────────────────────────────────────────────────────────

function eval_src(src: string): string {
  const book = parse(src);
  const entry = book.has("_") ? "_" : [...book.keys()].at(-1)!;
  const term = { tag: "Ref" as const, name: entry };
  const normal = normalize(term, book);
  return printNormal(normal);
}

function eval_to_bin(src: string): string {
  const book = parse(src);
  const entry = book.has("_") ? "_" : [...book.keys()].at(-1)!;
  const term = { tag: "Ref" as const, name: entry };
  const normal = normalize(term, book);
  const inlined = inlineRefs(normal, book, new Set());
  return toBinary(inlined);
}

// ─── parser tests ───────────────────────────────────────────────────────────

describe("parser", () => {
  test("single definition", () => {
    const book = parse("@main=λx.x");
    expect(book.has("main")).toBe(true);
  });

  test("multiple definitions", () => {
    const book = parse("@true=λt.λf.t\n@false=λt.λf.f");
    expect(book.has("true")).toBe(true);
    expect(book.has("false")).toBe(true);
  });

  test("application with multiple args", () => {
    const book = parse("@main=λf.λx.f(f(x))");
    expect(book.has("main")).toBe(true);
  });

  test("ignores line comments", () => {
    const book = parse("// this is a comment\n@main=λx.x");
    expect(book.has("main")).toBe(true);
  });
});

// ─── normalization tests ─────────────────────────────────────────────────────

describe("normalize", () => {
  test("identity function is already in normal form", () => {
    expect(eval_src("@main=λx.x")).toBe("λa.a");
  });

  test("identity applied reduces", () => {
    expect(eval_src("@main=λx.x\n@_=@main(λa.λb.a)")).toBe("λa.λb.a");
  });

  test("bool not: @not(@false) = true", () => {
    const src = [
      "@true=λt.λf.t",
      "@false=λt.λf.f",
      "@not=λb.λt.λf.b(f,t)",
      "@_=@not(@false)",
    ].join("\n");
    expect(eval_src(src)).toBe("λa.λb.a");
  });

  test("bool not: @not(@true) = false", () => {
    const src = [
      "@true=λt.λf.t",
      "@false=λt.λf.f",
      "@not=λb.λt.λf.b(f,t)",
      "@_=@not(@true)",
    ].join("\n");
    expect(eval_src(src)).toBe("λa.λb.b");
  });

  test("cnat_add(0,0) = λa.λb.b  (Church zero)", () => {
    const src = "@main=λa.λb.λc.λd.a(c,b(c,d))\n@_=@main(λf.λx.x,λf.λx.x)";
    expect(eval_src(src)).toBe("λa.λb.b");
  });

  test("cnat_add(1,1) = λa.λb.a(a(b))  (Church two)", () => {
    const src =
      "@main=λa.λb.λc.λd.a(c,b(c,d))\n@_=@main(λf.λx.f(x),λf.λx.f(x))";
    expect(eval_src(src)).toBe("λa.λb.a(a(b))");
  });

  test("cnat_add(2,3) = Church five", () => {
    const src =
      "@main=λa.λb.λc.λd.a(c,b(c,d))\n@_=@main(λf.λx.f(f(x)),λf.λx.f(f(f(x))))";
    expect(eval_src(src)).toBe("λa.λb.a(a(a(a(a(b)))))");
  });

  test("normalizes under lambda", () => {
    // λx. (λy.y) x  should reduce to  λx.x
    expect(eval_src("@main=λx.(λy.y)(x)")).toBe("λa.a");
  });

  test("K combinator: (λa.λb.a)(x)(y) = x", () => {
    expect(eval_src("@main=(λa.λb.a)(λc.c)(λd.d)")).toBe("λa.a");
  });

  test("references resolved", () => {
    const src = "@k=λa.λb.a\n@_=@k(λx.x)(λy.y)";
    expect(eval_src(src)).toBe("λa.a");
  });
});

// ─── --to-bin tests ──────────────────────────────────────────────────────────

describe("toBinary", () => {
  test("λa.λb.a (K/true) encodes to non-empty bit string", () => {
    const bits = eval_to_bin("@main=λa.λb.a");
    expect(bits.length).toBeGreaterThan(0);
    expect(/^[01]+$/.test(bits)).toBe(true);
  });

  test("λa.λb.b (false) has different encoding than λa.λb.a", () => {
    const trueB = eval_to_bin("@main=λa.λb.a");
    const falseB = eval_to_bin("@main=λa.λb.b");
    expect(trueB).not.toBe(falseB);
  });

  test("λa.λb.a encodes as 0000110", () => {
    // λ(λ(1 in de Bruijn)) = 00 00 1 0  (var at depth 1 = "10")
    // de Bruijn: λλ.1 → 00 00 10
    expect(eval_to_bin("@main=λa.λb.a")).toBe("0000110");
  });

  test("λa.λb.b encodes as 0000010", () => {
    // λ(λ(0 in de Bruijn)) = 00 00 0+1 0 → but var idx 0 = "10"
    // λλ.0 → 00 00 10   wait... idx 0 = "1^1 0" = "10", idx 1 = "1^2 0" = "110"
    // λa.λb.b = λλ.0 → de Bruijn 0 = "10" → 00 00 10 = "000010"
    expect(eval_to_bin("@main=λa.λb.b")).toBe("000010");
  });

  test("identity λa.a encodes correctly", () => {
    const bits = eval_to_bin("@main=λa.a");
    // λ.0 → 00 10 = "0010"
    expect(bits).toBe("0010");
  });
});
