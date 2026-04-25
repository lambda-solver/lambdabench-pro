/**
 * Check.ts — Task parser, lam runner, scorer, and evaluator.
 *
 * Replaces reference/lambench/src/check.ts.
 * Uses Effect FileSystem for I/O; calls Lamb.ts exports directly in-process
 * (no subprocess, no tmp files for eval — fast and reliable).
 * The lam/ reference solutions live in apps/server/lam/.
 * The tsk/ task definitions live in apps/server/tsk/.
 */

import { Array as Arr, Effect, FileSystem, Path } from "effect";
import { extractLamCode } from "../rlm/LamCodeExtractor";
import { buildSolvePrompt } from "../llm/LlmPrompts";
import { guardedGenerate, ModelUnresponsiveError } from "../llm/ModelGuard";
import {
  inlineRefs,
  normalize,
  parse as parseLam,
  printNormal,
  toBinary,
} from "../lamb/Lamb";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Test = {
  readonly expr: string;
  readonly want: string;
};

export type Task = {
  readonly id: string;
  readonly desc: string;
  readonly tests: ReadonlyArray<Test>;
};

export type CheckResult = {
  readonly id: string;
  readonly pass: boolean;
  readonly bits: number;
  readonly score: number;
  readonly errors: ReadonlyArray<string>;
};

// ─── Paths ───────────────────────────────────────────────────────────────────

const SERVER_ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
export const LAM_DIR = `${SERVER_ROOT}/lam`;
export const TSK_DIR = `${SERVER_ROOT}/tsk`;

// ─── Errors ──────────────────────────────────────────────────────────────────

export class LamError {
  readonly _tag = "LamError";
  constructor(readonly message: string) {}
}

export class ParseError {
  readonly _tag = "ParseError";
  constructor(readonly message: string) {}
}

// ─── Task parsing ─────────────────────────────────────────────────────────────

export const parseTask = (
  id: string,
  text: string,
): Effect.Effect<Task, ParseError> =>
  Effect.try({
    try: () => {
      const secs = text.split(/\n---\n/);
      if (secs.length !== 2)
        throw new Error(`expected 2 sections, got ${secs.length}`);
      const desc = secs[0]!.trim();
      const lines = secs[1]!
        .trim()
        .split("\n")
        .filter((l) => l.trim() !== "");
      const tests: Test[] = [];
      for (let i = 0; i < lines.length; i += 2) {
        const expr = lines[i]!.trim();
        const wantLine = lines[i + 1];
        if (!wantLine?.startsWith("= ")) {
          throw new Error(`line ${i + 2}: expected "= ..." after expression`);
        }
        tests.push({ expr, want: wantLine.slice(2).trim() });
      }
      return { id, desc, tests } satisfies Task;
    },
    catch: (e) => new ParseError(`${id}: ${(e as Error).message}`),
  });

export const loadTask = Effect.fn("loadTask")(function* (taskId: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fs.readFileString(path.join(TSK_DIR, `${taskId}.tsk`));
  return yield* parseTask(taskId, text);
});

export const loadAllTasks = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fs.readDirectory(TSK_DIR);
  return yield* Effect.forEach(
    files.filter((f) => f.endsWith(".tsk")).sort(),
    (f) =>
      fs
        .readFileString(path.join(TSK_DIR, f))
        .pipe(
          Effect.flatMap((text) => parseTask(path.basename(f, ".tsk"), text)),
        ),
  );
});

// ─── Lam runner (in-process) ─────────────────────────────────────────────────

/**
 * Evaluate a lambda calculus source string in-process.
 * Evaluates the LAST defined entry in the book — when Check appends
 * `@_ = ${test.expr}` to a submission, `_` is always last and is the
 * expression under test. For standalone runs `@main` is the only entry.
 */
export const lamRun = Effect.fn("lamRun")(function* (src: string) {
  return yield* Effect.try({
    try: () => {
      const book = parseLam(src);
      if (book.size === 0) throw new LamError("empty program");
      // Last inserted key is always the entry point (Map preserves order).
      const last = [...book.keys()].at(-1)!;
      const term = book.get(last)!;
      const result = normalize(term, book);
      return printNormal(result);
    },
    catch: (e): LamError =>
      e instanceof LamError ? e : new LamError(String(e)),
  });
});

/**
 * Compute binary encoding length (BLC bits) of a submission in-process.
 * Always encodes @main — the submission's primary definition.
 */
export const binSize = Effect.fn("binSize")(function* (src: string) {
  return yield* Effect.try({
    try: () => {
      const book = parseLam(src);
      const main = book.get("main");
      if (!main) throw new LamError("no @main definition");
      const inlined = inlineRefs(main, book);
      return toBinary(inlined).length;
    },
    catch: (e): LamError =>
      e instanceof LamError ? e : new LamError(String(e)),
  });
});

// ─── Scoring ─────────────────────────────────────────────────────────────────

export const taskScore = (bits: number, refBits: number): number =>
  bits <= refBits ? 1 - bits / (2 * refBits) : refBits / (2 * bits);

/** Load reference solution bits for a task (undefined if no reference exists). */
export const referenceBits = Effect.fn("referenceBits")(function* (
  taskId: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const refPath = path.join(LAM_DIR, `${taskId}.lam`);
  const exists = yield* fs.exists(refPath);
  if (!exists) return undefined as number | undefined;
  const src = yield* fs.readFileString(refPath);
  const bits = yield* binSize(src.trim());
  return bits as number | undefined;
});

// ─── Task runner ─────────────────────────────────────────────────────────────

/** Run a single test case — returns error string or null on pass. */
const runTestCase = Effect.fn("runTestCase")(function* (
  submission: string,
  test: Test,
) {
  return yield* Effect.catchTag(
    Effect.gen(function* () {
      const got = yield* lamRun(`${submission}\n@_ = ${test.expr}`);
      const want = yield* lamRun(`@main = ${test.want}`);
      return got !== want
        ? (`${test.expr}\nwant: ${want}\n got: ${got}` as string | null)
        : (null as string | null);
    }),
    "LamError",
    (e) => Effect.succeed(`error: ${e.message}` as string | null),
  );
});

/** Run all tests for a task against a submission. Returns a CheckResult. */
export const runTask = Effect.fn("runTask")(function* (
  task: Task,
  submission: string,
  refBits?: number,
) {
  const maybeErrors = yield* Effect.forEach(
    task.tests,
    (test) => runTestCase(submission, test),
    { concurrency: 1 },
  );

  const errors = maybeErrors.filter((e): e is string => e !== null);

  if (errors.length > 0) {
    return {
      id: task.id,
      pass: false,
      bits: 0,
      score: 0,
      errors,
    } satisfies CheckResult;
  }

  return yield* Effect.catchTag(
    binSize(submission).pipe(
      Effect.map(
        (bits) =>
          ({
            id: task.id,
            pass: true,
            bits,
            score: taskScore(bits, refBits ?? bits),
            errors: [],
          }) satisfies CheckResult,
      ),
    ),
    "LamError",
    (e) =>
      Effect.succeed({
        id: task.id,
        pass: false,
        bits: 0,
        score: 0,
        errors: [e.message],
      } satisfies CheckResult),
  );
});

/** Run a task against its bundled lam/ reference solution. */
export const runTaskFromFile = Effect.fn("runTaskFromFile")(function* (
  taskId: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const task = yield* loadTask(taskId);
  const sub = yield* fs.readFileString(path.join(LAM_DIR, `${taskId}.lam`));
  const ref = yield* referenceBits(taskId);
  return yield* runTask(task, sub.trim(), ref);
});

/** Run all reference lam/ solutions against their tasks. Used in CI. */
export const runAllReferenceTasks = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const lamFiles = (yield* fs.readDirectory(LAM_DIR))
    .filter((f) => f.endsWith(".lam"))
    .sort();

  return yield* Effect.forEach(
    lamFiles,
    (f) => {
      const taskId = path.basename(f, ".lam");
      return Effect.catchTags(runTaskFromFile(taskId), {
        LamError: (e) =>
          Effect.succeed({
            id: taskId,
            pass: false,
            bits: 0,
            score: 0,
            errors: [e.message],
          } satisfies CheckResult),
        ParseError: (e) =>
          Effect.succeed({
            id: taskId,
            pass: false,
            bits: 0,
            score: 0,
            errors: [e.message],
          } satisfies CheckResult),
      });
    },
    { concurrency: 8 },
  );
});

// ─── LLM-based task runner ────────────────────────────────────────────────────

export type TimedCheckResult = CheckResult & {
  readonly elapsedMs: number;
};

/** Run a single task via a single LLM call (standard, non-RLM eval). */
export const runTaskWithLlm = Effect.fn("runTaskWithLlm")(function* (
  task: Task,
  refBits?: number,
) {
  const start = Date.now();

  const prompt = buildSolvePrompt(task);
  yield* Effect.log(
    `[standard] ${task.id} → prompt (${prompt.length} chars): ${prompt.slice(0, 80).replace(/\n/g, " ")}…`,
  );

  const rawResponse = yield* guardedGenerate(prompt, "standard").pipe(
    Effect.catchTag("ModelUnresponsiveError", (e) =>
      Effect.fail(new ModelUnresponsiveError(e.model, e.attempts)),
    ),
  );

  const submission = extractLamCode(rawResponse);
  yield* Effect.log(
    `[standard] ${task.id} ← ${rawResponse.slice(0, 200).replace(/\n/g, " ")}`,
  );

  const checkResult = yield* runTask(task, submission, refBits);
  const elapsedMs = Date.now() - start;

  yield* Effect.log(
    `[standard] ${task.id} check: ${checkResult.pass ? "PASS" : "FAIL"} bits=${checkResult.bits} score=${checkResult.score.toFixed(3)} time=${(elapsedMs / 1000).toFixed(1)}s`,
  );

  return { ...checkResult, elapsedMs } satisfies TimedCheckResult;
});

/** Run all tasks using standard single-shot LLM eval (model provided by Layer). */
export const runAllTasksForModel = Effect.fn("runAllTasksForModel")(
  function* (
    tasks: ReadonlyArray<Task>,
    refBitsMap: ReadonlyMap<string, number>,
    concurrency = 4,
  ) {
    return yield* Effect.forEach(
      tasks,
      (task) => runTaskWithLlm(task, refBitsMap.get(task.id)),
      { concurrency },
    );
  },
);

export const showResult = (r: CheckResult): string => {
  const status = r.pass ? "✓" : "✗";
  const detail = r.pass
    ? `${r.bits} bits, score: ${r.score.toFixed(3)}`
    : "FAIL";
  const lines = [
    `${status} ${r.id}: ${detail}`,
    ...r.errors.map((e) => "  " + e.split("\n").join("\n  ")),
  ];
  return lines.join("\n");
};

export const summarize = (results: ReadonlyArray<CheckResult>): string => {
  const passed = results.filter((r) => r.pass).length;
  const avg =
    Arr.reduce(results, 0, (s, r) => s + r.score) / Math.max(results.length, 1);
  return `${passed}/${results.length} passed  score: ${(avg * 100).toFixed(1)}`;
};
