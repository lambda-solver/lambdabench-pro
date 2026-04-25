#!/usr/bin/env bun

/**
 * lamb.ts — Minimal Lamb lambda-calculus interpreter
 *
 * Serves as a drop-in replacement for the lam / lam-hs binary.
 *
 * Usage:
 *   bun lamb.ts <file.lam>              # normalize @main, print result
 *   bun lamb.ts <file.lam> --to-bin    # print binary lambda encoding (bit string)
 *
 * Lamb syntax:
 *   @name = term          top-level definition
 *   λx.body               lambda abstraction
 *   f(a, b, c)            multi-arg application  ≡ ((f a) b) c
 *   name                  variable
 *   @name                 reference to top-level definition
 */

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem } from "effect";

// ─── AST ────────────────────────────────────────────────────────────────────

type Term =
  | { tag: "Var"; name: string }
  | { tag: "Ref"; name: string }
  | { tag: "Lam"; param: string; body: Term }
  | { tag: "App"; func: Term; arg: Term };

type Book = Map<string, Term>;

// ─── LEXER ───────────────────────────────────────────────────────────────────

type Token =
  | { type: "Lambda" }
  | { type: "Dot" }
  | { type: "LParen" }
  | { type: "RParen" }
  | { type: "Comma" }
  | { type: "Equals" }
  | { type: "At" }
  | { type: "Name"; value: string };

const tokenize = (src: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "λ" || ch === "\\") {
      tokens.push({ type: "Lambda" });
      i++;
      continue;
    }
    if (ch === ".") {
      tokens.push({ type: "Dot" });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LParen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RParen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "Comma" });
      i++;
      continue;
    }
    if (ch === "=") {
      tokens.push({ type: "Equals" });
      i++;
      continue;
    }
    if (ch === "@") {
      tokens.push({ type: "At" });
      i++;
      continue;
    }
    if (/[a-zA-Z0-9_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ type: "Name", value: src.slice(i, j) });
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
};

// ─── PARSER ──────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private consume(): Token {
    return this.tokens[this.pos++];
  }
  private expect(type: Token["type"]): Token {
    const t = this.consume();
    if (t.type !== type)
      throw new Error(`Expected ${type}, got ${t.type} at pos ${this.pos}`);
    return t;
  }

  parseBook(): Book {
    const book: Book = new Map();
    while (this.pos < this.tokens.length) {
      this.expect("At");
      const name = (this.consume() as { type: "Name"; value: string }).value;
      this.expect("Equals");
      const body = this.parseTerm();
      book.set(name, body);
    }
    return book;
  }

  parseTerm(): Term {
    const t = this.peek();
    if (t?.type === "Lambda") {
      this.consume();
      const param = (this.consume() as { type: "Name"; value: string }).value;
      this.expect("Dot");
      const body = this.parseTerm();
      return { tag: "Lam", param, body };
    }
    return this.parseApp();
  }

  parseApp(): Term {
    let func = this.parseAtom();
    while (this.peek()?.type === "LParen") {
      this.consume();
      const arg = this.parseTerm();
      func = { tag: "App", func, arg };
      while (this.peek()?.type === "Comma") {
        this.consume();
        const next = this.parseTerm();
        func = { tag: "App", func, arg: next };
      }
      this.expect("RParen");
    }
    return func;
  }

  parseAtom(): Term {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of input");
    if (t.type === "At") {
      this.consume();
      const name = (this.consume() as { type: "Name"; value: string }).value;
      return { tag: "Ref", name };
    }
    if (t.type === "Name") {
      this.consume();
      return { tag: "Var", name: (t as { type: "Name"; value: string }).value };
    }
    if (t.type === "LParen") {
      this.consume();
      const inner = this.parseTerm();
      this.expect("RParen");
      return inner;
    }
    throw new Error(`Unexpected token: ${t.type}`);
  }
}

const parse = (src: string): Book => {
  const tokens = tokenize(src);
  const parser = new Parser(tokens);
  return parser.parseBook();
};

// ─── EVALUATOR ───────────────────────────────────────────────────────────────

const subst = (term: Term, name: string, value: Term): Term => {
  switch (term.tag) {
    case "Var":
      return term.name === name ? value : term;
    case "Ref":
      return term;
    case "Lam":
      if (term.param === name) return term;
      if (freeVars(value).has(term.param)) {
        const fresh = freshen(term.param, freeVars(value));
        const renamed = subst(term.body, term.param, {
          tag: "Var",
          name: fresh,
        });
        return { tag: "Lam", param: fresh, body: subst(renamed, name, value) };
      }
      return {
        tag: "Lam",
        param: term.param,
        body: subst(term.body, name, value),
      };
    case "App":
      return {
        tag: "App",
        func: subst(term.func, name, value),
        arg: subst(term.arg, name, value),
      };
  }
};

const freeVars = (term: Term): Set<string> => {
  switch (term.tag) {
    case "Var":
      return new Set([term.name]);
    case "Ref":
      return new Set();
    case "Lam": {
      const s = freeVars(term.body);
      s.delete(term.param);
      return s;
    }
    case "App": {
      const a = freeVars(term.func);
      for (const v of freeVars(term.arg)) a.add(v);
      return a;
    }
  }
};

const SUFFIXES = "abcdefghijklmnopqrstuvwxyz".split("");

const freshen = (base: string, used: Set<string>): string => {
  for (const s of SUFFIXES) {
    if (!used.has(base + s)) return base + s;
  }
  let i = 0;
  while (used.has(base + i)) i++;
  return base + String(i);
};

const MAX_STEPS = 10_000_000;

const normalize = (term: Term, book: Book, steps = { n: 0 }): Term => {
  if (steps.n++ > MAX_STEPS)
    throw new Error("Reduction limit exceeded (possible infinite loop)");
  switch (term.tag) {
    case "Var":
      return term;
    case "Ref": {
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined reference: @${term.name}`);
      return normalize(def, book, steps);
    }
    case "Lam":
      return {
        tag: "Lam",
        param: term.param,
        body: normalize(term.body, book, steps),
      };
    case "App": {
      const func = normalizeWHNF(term.func, book, steps);
      if (func.tag === "Lam") {
        const reduced = subst(func.body, func.param, term.arg);
        return normalize(reduced, book, steps);
      }
      return {
        tag: "App",
        func: normalize(func, book, steps),
        arg: normalize(term.arg, book, steps),
      };
    }
  }
};

const normalizeWHNF = (term: Term, book: Book, steps: { n: number }): Term => {
  if (steps.n++ > MAX_STEPS) throw new Error("Reduction limit exceeded");
  switch (term.tag) {
    case "Var":
    case "Lam":
      return term;
    case "Ref": {
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined reference: @${term.name}`);
      return normalizeWHNF(def, book, steps);
    }
    case "App": {
      const func = normalizeWHNF(term.func, book, steps);
      if (func.tag === "Lam") {
        const reduced = subst(func.body, func.param, term.arg);
        return normalizeWHNF(reduced, book, steps);
      }
      return { tag: "App", func, arg: term.arg };
    }
  }
};

// ─── PRINTER ─────────────────────────────────────────────────────────────────

const varName = (idx: number): string => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  if (idx < 26) return letters[idx];
  return letters[Math.floor(idx / 26) - 1] + letters[idx % 26];
};

interface PrintCtx {
  scope: Map<string, number>;
  counter: { n: number };
}

const printTerm = (term: Term, ctx: PrintCtx, needsParens = false): string => {
  switch (term.tag) {
    case "Var": {
      const idx = ctx.scope.get(term.name);
      if (idx === undefined) return term.name;
      return varName(idx);
    }
    case "Ref":
      return "@" + term.name;
    case "Lam": {
      const idx = ctx.counter.n++;
      const newScope = new Map(ctx.scope);
      newScope.set(term.param, idx);
      const inner = printTerm(term.body, {
        scope: newScope,
        counter: ctx.counter,
      });
      const paramName = varName(idx);
      const s = `λ${paramName}.${inner}`;
      return needsParens ? `(${s})` : s;
    }
    case "App": {
      const args: Term[] = [];
      let cur: Term = term;
      while (cur.tag === "App") {
        args.unshift(cur.arg);
        cur = cur.func;
      }
      const func = printTerm(cur, ctx, false);
      const argStrs = args.map((a) => printTerm(a, ctx, false));
      return `${func}(${argStrs.join(",")})`;
    }
  }
};

const printNormal = (term: Term): string =>
  printTerm(term, { scope: new Map(), counter: { n: 0 } });

// ─── BINARY ENCODING (--to-bin) ──────────────────────────────────────────────

type DeBruijn =
  | { tag: "Idx"; index: number }
  | { tag: "DLam"; body: DeBruijn }
  | { tag: "DApp"; func: DeBruijn; arg: DeBruijn };

const toDeBruijn = (term: Term, env: string[]): DeBruijn => {
  switch (term.tag) {
    case "Var": {
      const idx = env.indexOf(term.name);
      if (idx === -1)
        throw new Error(`Unbound variable in binary encoding: ${term.name}`);
      return { tag: "Idx", index: idx };
    }
    case "Ref":
      throw new Error(
        `Ref @${term.name} must be inlined before binary encoding`,
      );
    case "Lam":
      return { tag: "DLam", body: toDeBruijn(term.body, [term.param, ...env]) };
    case "App":
      return {
        tag: "DApp",
        func: toDeBruijn(term.func, env),
        arg: toDeBruijn(term.arg, env),
      };
  }
};

const encodeBLC = (term: DeBruijn): string => {
  switch (term.tag) {
    case "Idx":
      return "1".repeat(term.index + 1) + "0";
    case "DLam":
      return "00" + encodeBLC(term.body);
    case "DApp":
      return "01" + encodeBLC(term.func) + encodeBLC(term.arg);
  }
};

const toBinary = (term: Term): string => encodeBLC(toDeBruijn(term, []));

const inlineRefs = (term: Term, book: Book, visited: Set<string>): Term => {
  switch (term.tag) {
    case "Var":
      return term;
    case "Ref": {
      if (visited.has(term.name))
        throw new Error(`Recursive ref @${term.name} cannot be binary-encoded`);
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined ref @${term.name}`);
      return inlineRefs(def, book, new Set([...visited, term.name]));
    }
    case "Lam":
      return { ...term, body: inlineRefs(term.body, book, visited) };
    case "App":
      return {
        ...term,
        func: inlineRefs(term.func, book, visited),
        arg: inlineRefs(term.arg, book, visited),
      };
  }
};

// ─── MAIN (Effect) ───────────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const rawArgs = process.argv.slice(2);
  const args = rawArgs.filter((a) => !a.startsWith("--"));
  const flags = rawArgs.filter((a) => a.startsWith("--"));
  const toBin = flags.includes("--to-bin");

  if (args.length === 0) {
    process.stderr.write("usage: bun lamb.ts <file.lam> [--to-bin]\n");
    process.exit(1);
  }

  const src = yield* fs.readFileString(args[0], "utf-8");
  const book = parse(src);

  const entry = book.has("_")
    ? "_"
    : book.has("main")
      ? "main"
      : [...book.keys()].at(-1);
  if (!entry) throw new Error("No definitions found in file");

  const term: Term = { tag: "Ref", name: entry };
  const normal = normalize(term, book);

  if (toBin) {
    const inlined = inlineRefs(normal, book, new Set());
    const bits = toBinary(inlined);
    process.stdout.write(bits + "\n");
  } else {
    process.stdout.write(printNormal(normal) + "\n");
  }
});

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)), {
    disableErrorReporting: true,
  });
}

export type { Book, Term };
export { inlineRefs, normalize, parse, printNormal, toBinary };
