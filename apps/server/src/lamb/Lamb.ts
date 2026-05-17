/**
 * Lamb.ts — Minimal lambda-calculus interpreter.
 * Pure logic only — no I/O, no process calls.
 * CLI entry is in src/index.ts.
 */

// ─── AST ─────────────────────────────────────────────────────────────────────

export type Term =
  | { tag: "Var"; name: string; }
  | { tag: "Ref"; name: string; }
  | { tag: "Lam"; param: string; body: Term; }
  | { tag: "App"; func: Term; arg: Term; };

export type Book = Map<string, Term>;

// ─── LEXER ───────────────────────────────────────────────────────────────────

type Token =
  | { type: "Lambda"; }
  | { type: "Dot"; }
  | { type: "LParen"; }
  | { type: "RParen"; }
  | { type: "Comma"; }
  | { type: "Equals"; }
  | { type: "At"; }
  | { type: "Name"; value: string; };

const tokenize = (src: string): Array<Token> => {
  const tokens: Array<Token> = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i] ?? "";
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
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j] ?? "")) j++;
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
  constructor(private readonly tokens: Array<Token>) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private consume(): Token {
    const t = this.tokens[this.pos++];
    if (!t) throw new Error("Unexpected end of input");
    return t;
  }
  private expect(type: Token["type"]): Token {
    const t = this.consume();
    if (t.type !== type) {
      throw new Error(`Expected ${type}, got ${t.type} at pos ${this.pos}`);
    }
    return t;
  }

  parseBook(): Book {
    const book: Book = new Map();
    while (this.pos < this.tokens.length) {
      this.expect("At");
      const name = (this.consume() as { type: "Name"; value: string; }).value;
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
      const param = (this.consume() as { type: "Name"; value: string; }).value;
      this.expect("Dot");
      const body = this.parseTerm();
      return { body, param, tag: "Lam" };
    }
    return this.parseApp();
  }

  parseApp(): Term {
    let func = this.parseAtom();
    // Accept both explicit-paren style  f(x, y)  and juxtaposition  f x y
    while (true) {
      const t = this.peek();
      if (t?.type === "LParen") {
        // Could be either f(arg, arg2) or f (arg) — peek one further
        // If what's inside resolves to a single arg with no comma it's juxtaposition-style grouping;
        // either way: consume the group as a single argument.
        this.consume();
        const arg = this.parseTerm();
        if (this.peek()?.type === "Comma") {
          // Explicit multi-arg: f(a, b) → App(App(f,a),b)
          func = { arg, func, tag: "App" };
          while (this.peek()?.type === "Comma") {
            this.consume();
            const next = this.parseTerm();
            func = { arg: next, func, tag: "App" };
          }
        } else {
          func = { arg, func, tag: "App" };
        }
        this.expect("RParen");
      } else if (t?.type === "Name") {
        // Juxtaposition: f x  (only bare variable names — @refs are book-level defs)
        const arg = this.parseAtom();
        func = { arg, func, tag: "App" };
      } else {
        break;
      }
    }
    return func;
  }

  parseAtom(): Term {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of input");
    if (t.type === "At") {
      this.consume();
      const name = (this.consume() as { type: "Name"; value: string; }).value;
      return { name, tag: "Ref" };
    }
    if (t.type === "Name") {
      this.consume();
      return { name: (t as { type: "Name"; value: string; }).value, tag: "Var" };
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

export const parse = (src: string): Book => new Parser(tokenize(src)).parseBook();

// ─── EVALUATOR ───────────────────────────────────────────────────────────────

const freeVars = (term: Term): Set<string> => {
  switch (term.tag) {
    case "Var": {
      return new Set([term.name]);
    }
    case "Ref": {
      return new Set();
    }
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

const ALPHA = [..."abcdefghijklmnopqrstuvwxyz"];

const freshen = (base: string, used: Set<string>): string => {
  for (const s of ALPHA) {
    if (!used.has(base + s)) return base + s;
  }
  let i = 0;
  while (used.has(base + i)) i++;
  return base + String(i);
};

const subst = (term: Term, name: string, value: Term): Term => {
  switch (term.tag) {
    case "Var": {
      return term.name === name ? value : term;
    }
    case "Ref": {
      return term;
    }
    case "Lam": {
      if (term.param === name) return term;
      if (freeVars(value).has(term.param)) {
        const fresh = freshen(term.param, freeVars(value));
        const renamed = subst(term.body, term.param, {
          name: fresh,
          tag: "Var",
        });
        return { body: subst(renamed, name, value), param: fresh, tag: "Lam" };
      }
      return {
        body: subst(term.body, name, value),
        param: term.param,
        tag: "Lam",
      };
    }
    case "App": {
      return {
        arg: subst(term.arg, name, value),
        func: subst(term.func, name, value),
        tag: "App",
      };
    }
  }
};

const MAX_STEPS = 10_000_000;

const normalizeWHNF = (term: Term, book: Book, steps: { n: number; }): Term => {
  if (steps.n++ > MAX_STEPS) throw new Error("Reduction limit exceeded");
  switch (term.tag) {
    case "Var":
    case "Lam": {
      return term;
    }
    case "Ref": {
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined reference: @${term.name}`);
      return normalizeWHNF(def, book, steps);
    }
    case "App": {
      const func = normalizeWHNF(term.func, book, steps);
      if (func.tag === "Lam") {
        return normalizeWHNF(
          subst(func.body, func.param, term.arg),
          book,
          steps,
        );
      }
      return { arg: term.arg, func, tag: "App" };
    }
  }
};

export const normalize = (term: Term, book: Book, steps = { n: 0 }): Term => {
  if (steps.n++ > MAX_STEPS) {
    throw new Error("Reduction limit exceeded (possible infinite loop)");
  }
  switch (term.tag) {
    case "Var": {
      return term;
    }
    case "Ref": {
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined reference: @${term.name}`);
      return normalize(def, book, steps);
    }
    case "Lam": {
      return {
        body: normalize(term.body, book, steps),
        param: term.param,
        tag: "Lam",
      };
    }
    case "App": {
      const func = normalizeWHNF(term.func, book, steps);
      if (func.tag === "Lam") {
        return normalize(subst(func.body, func.param, term.arg), book, steps);
      }
      return {
        arg: normalize(term.arg, book, steps),
        func: normalize(func, book, steps),
        tag: "App",
      };
    }
  }
};

// ─── PRINTER ─────────────────────────────────────────────────────────────────

const varName = (idx: number): string => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  if (idx < 26) return letters[idx] ?? "a";
  return (
    (letters[Math.floor(idx / 26) - 1] ?? "a") + (letters[idx % 26] ?? "a")
  );
};

const printTerm = (
  term: Term,
  scope: Map<string, number>,
  counter: { n: number; },
): string => {
  switch (term.tag) {
    case "Var": {
      const idx = scope.get(term.name);
      return idx === undefined ? term.name : varName(idx);
    }
    case "Ref": {
      return `@${term.name}`;
    }
    case "Lam": {
      const idx = counter.n++;
      const newScope = new Map(scope);
      newScope.set(term.param, idx);
      return `λ${varName(idx)}.${printTerm(term.body, newScope, counter)}`;
    }
    case "App": {
      const args: Array<Term> = [];
      let cur: Term = term;
      while (cur.tag === "App") {
        args.unshift(cur.arg);
        cur = cur.func;
      }
      const func = printTerm(cur, scope, counter);
      const argStrs = args.map((a) => printTerm(a, scope, counter));
      return `${func}(${argStrs.join(",")})`;
    }
  }
};

export const printNormal = (term: Term): string => printTerm(term, new Map(), { n: 0 });

// ─── BINARY ENCODING ─────────────────────────────────────────────────────────

type DeBruijn =
  | { tag: "Idx"; index: number; }
  | { tag: "DLam"; body: DeBruijn; }
  | { tag: "DApp"; func: DeBruijn; arg: DeBruijn; };

const toDeBruijn = (term: Term, env: Array<string>): DeBruijn => {
  switch (term.tag) {
    case "Var": {
      const idx = env.indexOf(term.name);
      if (idx === -1) throw new Error(`Unbound variable: ${term.name}`);
      return { index: idx, tag: "Idx" };
    }
    case "Ref": {
      throw new Error(
        `Ref @${term.name} must be inlined before binary encoding`,
      );
    }
    case "Lam": {
      return { body: toDeBruijn(term.body, [term.param, ...env]), tag: "DLam" };
    }
    case "App": {
      return {
        arg: toDeBruijn(term.arg, env),
        func: toDeBruijn(term.func, env),
        tag: "DApp",
      };
    }
  }
};

const encodeBLC = (term: DeBruijn): string => {
  switch (term.tag) {
    case "Idx": {
      return `${"1".repeat(term.index + 1)}0`;
    }
    case "DLam": {
      return `00${encodeBLC(term.body)}`;
    }
    case "DApp": {
      return `01${encodeBLC(term.func)}${encodeBLC(term.arg)}`;
    }
  }
};

export const inlineRefs = (
  term: Term,
  book: Book,
  visited = new Set<string>(),
): Term => {
  switch (term.tag) {
    case "Var": {
      return term;
    }
    case "Ref": {
      if (visited.has(term.name)) {
        throw new Error(`Recursive ref @${term.name} cannot be binary-encoded`);
      }
      const def = book.get(term.name);
      if (!def) throw new Error(`Undefined ref @${term.name}`);
      return inlineRefs(def, book, new Set([...visited, term.name]));
    }
    case "Lam": {
      return { ...term, body: inlineRefs(term.body, book, visited) };
    }
    case "App": {
      return {
        ...term,
        arg: inlineRefs(term.arg, book, visited),
        func: inlineRefs(term.func, book, visited),
      };
    }
  }
};

export const toBinary = (term: Term): string => encodeBLC(toDeBruijn(term, []));
