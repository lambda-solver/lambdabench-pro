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

import { readFileSync } from "fs";

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

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    // skip whitespace
    if (/\s/.test(ch)) { i++; continue; }
    // skip line comments
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "λ" || ch === "\\") { tokens.push({ type: "Lambda" }); i++; continue; }
    if (ch === ".") { tokens.push({ type: "Dot" }); i++; continue; }
    if (ch === "(") { tokens.push({ type: "LParen" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "RParen" }); i++; continue; }
    if (ch === ",") { tokens.push({ type: "Comma" }); i++; continue; }
    if (ch === "=") { tokens.push({ type: "Equals" }); i++; continue; }
    if (ch === "@") { tokens.push({ type: "At" }); i++; continue; }
    // name: letters, digits, underscore
    if (/[a-zA-Z0-9_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ type: "Name", value: src.slice(i, j) });
      i = j;
      continue;
    }
    // skip unknown chars (e.g. unicode lambda was already handled above)
    i++;
  }
  return tokens;
}

// ─── PARSER ──────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expect(type: Token["type"]): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type} at pos ${this.pos}`);
    return t;
  }

  /** Parse a whole .lam file: zero or more @name = term */
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

  /** Parse a term (lowest precedence = lambda, then application) */
  parseTerm(): Term {
    const t = this.peek();
    if (t?.type === "Lambda") {
      this.consume(); // λ
      const param = (this.consume() as { type: "Name"; value: string }).value;
      this.expect("Dot");
      const body = this.parseTerm();
      return { tag: "Lam", param, body };
    }
    return this.parseApp();
  }

  /** Parse application: atom (atom)* */
  parseApp(): Term {
    let func = this.parseAtom();
    // while next token is '(', consume argument list
    while (this.peek()?.type === "LParen") {
      this.consume(); // (
      const arg = this.parseTerm();
      func = { tag: "App", func, arg };
      // handle multi-arg  f(a, b, c) => ((f a) b) c
      while (this.peek()?.type === "Comma") {
        this.consume(); // ,
        const next = this.parseTerm();
        func = { tag: "App", func, arg: next };
      }
      this.expect("RParen");
    }
    return func;
  }

  /** Parse an atom: variable, @ref, or parenthesised term */
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

function parse(src: string): Book {
  const tokens = tokenize(src);
  const parser = new Parser(tokens);
  return parser.parseBook();
}

// ─── EVALUATOR ───────────────────────────────────────────────────────────────
//
// Normal-order (call-by-name) beta reduction with explicit substitution.
// We inline Ref definitions eagerly on first encounter to avoid infinite loops
// while still handling recursive definitions via lazy thunks.
//
// Strategy: reduce the leftmost-outermost redex first (normal order).
// This guarantees termination for all terms that have a normal form.

/** Substitute `name` → `value` throughout `term`, avoiding capture. */
function subst(term: Term, name: string, value: Term): Term {
  switch (term.tag) {
    case "Var":
      return term.name === name ? value : term;
    case "Ref":
      return term;
    case "Lam":
      if (term.param === name) return term; // shadowed
      // avoid variable capture
      if (freeVars(value).has(term.param)) {
        const fresh = freshen(term.param, freeVars(value));
        const renamed = subst(term.body, term.param, { tag: "Var", name: fresh });
        return { tag: "Lam", param: fresh, body: subst(renamed, name, value) };
      }
      return { tag: "Lam", param: term.param, body: subst(term.body, name, value) };
    case "App":
      return { tag: "App", func: subst(term.func, name, value), arg: subst(term.arg, name, value) };
  }
}

function freeVars(term: Term): Set<string> {
  switch (term.tag) {
    case "Var": return new Set([term.name]);
    case "Ref": return new Set();
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
}

const SUFFIXES = "abcdefghijklmnopqrstuvwxyz".split("");

function freshen(base: string, used: Set<string>): string {
  let candidate = base + "_";
  for (const s of SUFFIXES) {
    if (!used.has(base + s)) return base + s;
  }
  let i = 0;
  while (used.has(base + i)) i++;
  return base + String(i);
}

const MAX_STEPS = 10_000_000;

/**
 * Fully normalize a term to beta-normal form (normal-order strategy).
 * Normal order: reduce the leftmost-outermost redex first, including under lambdas.
 */
function normalize(term: Term, book: Book, steps = { n: 0 }): Term {
  if (steps.n++ > MAX_STEPS) throw new Error("Reduction limit exceeded (possible infinite loop)");
  switch (term.tag) {
    case "Var":
      return term;
    case "Ref": {
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined reference: @${term.name}`);
      return normalize(def, book, steps);
    }
    case "Lam":
      // Normalize under lambda (needed for full normal form)
      return { tag: "Lam", param: term.param, body: normalize(term.body, book, steps) };
    case "App": {
      // Reduce function to WHNF first, then check for beta redex
      const func = normalizeWHNF(term.func, book, steps);
      if (func.tag === "Lam") {
        // Beta reduction: substitute arg, then continue normalizing
        const reduced = subst(func.body, func.param, term.arg);
        return normalize(reduced, book, steps);
      }
      // func is stuck (Var or irreducible App) — normalize both sides fully
      return {
        tag: "App",
        func: normalize(func, book, steps),
        arg: normalize(term.arg, book, steps),
      };
    }
  }
}

/** Reduce to weak head normal form: reduce until the head is a Lam or stuck Var/App. */
function normalizeWHNF(term: Term, book: Book, steps: { n: number }): Term {
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
}

// ─── PRINTER ─────────────────────────────────────────────────────────────────
//
// Print normal form with canonical variable names (a, b, c, ...).
// All bound variables are renamed in order of first occurrence (depth-first).

function varName(idx: number): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  if (idx < 26) return letters[idx];
  return letters[Math.floor(idx / 26) - 1] + letters[idx % 26];
}

interface PrintCtx {
  scope: Map<string, number>; // varname -> canonical index
  counter: { n: number };
}

function printTerm(term: Term, ctx: PrintCtx, needsParens = false): string {
  switch (term.tag) {
    case "Var": {
      const idx = ctx.scope.get(term.name);
      if (idx === undefined) {
        // free variable — keep original name
        return term.name;
      }
      return varName(idx);
    }
    case "Ref":
      return "@" + term.name;
    case "Lam": {
      const idx = ctx.counter.n++;
      const newScope = new Map(ctx.scope);
      newScope.set(term.param, idx);
      const inner = printTerm(term.body, { scope: newScope, counter: ctx.counter });
      const paramName = varName(idx);
      const s = `λ${paramName}.${inner}`;
      return needsParens ? `(${s})` : s;
    }
    case "App": {
      // Collect arg list for multi-arg printing: f(a,b,c)
      const args: Term[] = [];
      let cur: Term = term;
      while (cur.tag === "App") {
        args.unshift(cur.arg);
        cur = cur.func;
      }
      const func = printTerm(cur, ctx, false);
      const argStrs = args.map(a => printTerm(a, ctx, false));
      const s = `${func}(${argStrs.join(",")})`;
      return s;
    }
  }
}

function printNormal(term: Term): string {
  const ctx: PrintCtx = {
    scope: new Map(),
    counter: { n: 0 },
  };
  return printTerm(term, ctx);
}

// ─── BINARY ENCODING (--to-bin) ──────────────────────────────────────────────
//
// Binary lambda calculus (BLC) encoding:
//   λx.M   →  00 enc(M)
//   M N    →  01 enc(M) enc(N)
//   i-th de Bruijn variable (0-indexed)  →  1^(i+1) 0
//
// We convert the term to de Bruijn indices first, then encode.

type DeBruijn =
  | { tag: "Idx"; index: number }
  | { tag: "DLam"; body: DeBruijn }
  | { tag: "DApp"; func: DeBruijn; arg: DeBruijn };

function toDeBruijn(term: Term, env: string[]): DeBruijn {
  switch (term.tag) {
    case "Var": {
      const idx = env.indexOf(term.name);
      if (idx === -1) throw new Error(`Unbound variable in binary encoding: ${term.name}`);
      return { tag: "Idx", index: idx };
    }
    case "Ref":
      throw new Error(`Ref @${term.name} must be inlined before binary encoding`);
    case "Lam":
      return { tag: "DLam", body: toDeBruijn(term.body, [term.param, ...env]) };
    case "App":
      return { tag: "DApp", func: toDeBruijn(term.func, env), arg: toDeBruijn(term.arg, env) };
  }
}

function encodeBLC(term: DeBruijn): string {
  switch (term.tag) {
    case "Idx":
      return "1".repeat(term.index + 1) + "0";
    case "DLam":
      return "00" + encodeBLC(term.body);
    case "DApp":
      return "01" + encodeBLC(term.func) + encodeBLC(term.arg);
  }
}

function toBinary(term: Term): string {
  const db = toDeBruijn(term, []);
  return encodeBLC(db);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function run() {
  const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const flags = process.argv.slice(2).filter(a => a.startsWith("--"));
  const toBin = flags.includes("--to-bin");

  if (args.length === 0) {
    process.stderr.write("usage: bun lamb.ts <file.lam> [--to-bin]\n");
    process.exit(1);
  }

  const src = readFileSync(args[0], "utf-8");
  const book = parse(src);

  // The entry point is @main (or @_ for normalization helper, or last definition)
  const entry = book.has("_") ? "_" : book.has("main") ? "main" : [...book.keys()].at(-1);
  if (!entry) throw new Error("No definitions found in file");

  const term: Term = { tag: "Ref", name: entry };
  const normal = normalize(term, book);

  if (toBin) {
    // For --to-bin we need the normalized closed term
    // Use de Bruijn encoding on the normalized form
    // First inline all remaining Refs
    const inlined = inlineRefs(normal, book, new Set());
    const bits = toBinary(inlined);
    process.stdout.write(bits + "\n");
  } else {
    process.stdout.write(printNormal(normal) + "\n");
  }
}

/** Inline all @refs in a term (for binary encoding). */
function inlineRefs(term: Term, book: Book, visited: Set<string>): Term {
  switch (term.tag) {
    case "Var": return term;
    case "Ref": {
      if (visited.has(term.name)) throw new Error(`Recursive ref @${term.name} cannot be binary-encoded`);
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined ref @${term.name}`);
      return inlineRefs(def, book, new Set([...visited, term.name]));
    }
    case "Lam": return { ...term, body: inlineRefs(term.body, book, visited) };
    case "App": return {
      ...term,
      func: inlineRefs(term.func, book, visited),
      arg: inlineRefs(term.arg, book, visited),
    };
  }
}

if (import.meta.main) {
  try {
    run();
  } catch (e: any) {
    process.stderr.write("error: " + (e?.message ?? String(e)) + "\n");
    process.exit(1);
  }
}

export { parse, normalize, printNormal, toBinary, inlineRefs };
export type { Term, Book };
