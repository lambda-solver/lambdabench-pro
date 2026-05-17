import { Context, Effect, Layer } from "effect";
import type { FileSystem, Path } from "effect";
import type * as PlatformError from "effect/PlatformError";
import type { LamError, ParseError } from "../check/Check.js";
import { loadAllTasks, referenceBits } from "../check/Check.js";
import type { DbTask, InsertTask, SqlError } from "./ResultStore.js";
import { ResultStore } from "./ResultStore.js";

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_NAMES: Record<string, string> = {
  algo: "Algorithms",
  cadt: "Church ADTs",
  cbin: "Church Binaries",
  clst: "Church Lists",
  cnat: "Church Naturals",
  ctre: "Church Trees",
  ntup: "N-Tuples",
  sadt: "Scott ADTs",
  sbin: "Scott Binaries",
  slst: "Scott Lists",
  snat: "Scott Naturals",
  stre: "Scott Trees",
};

// ─── Service Definition ───────────────────────────────────────────────────────

export class TaskService extends Context.Service<
  TaskService,
  {
    loadAndCacheTasks(): Effect.Effect<
      void,
      SqlError | ParseError | PlatformError.PlatformError,
      FileSystem.FileSystem | Path.Path
    >;
    getTask(taskId: string): Effect.Effect<DbTask | undefined, SqlError>;
    getAllTasks(): Effect.Effect<ReadonlyArray<DbTask>, SqlError>;
    getTasksByCategory(
      category: string,
    ): Effect.Effect<ReadonlyArray<DbTask>, SqlError>;
    computeRefBits(
      taskId: string,
    ): Effect.Effect<
      number | undefined,
      PlatformError.PlatformError | LamError,
      FileSystem.FileSystem | Path.Path
    >;
  }
>()("app/TaskService") {}

// ─── Layer Factory ────────────────────────────────────────────────────────────

export const TaskServiceLive = Layer.effect(
  TaskService,
  Effect.gen(function*() {
    const store = yield* ResultStore;

    const loadAndCacheTasks = Effect.fn("TaskService.loadAndCacheTasks")(
      function*() {
        const tasks = yield* loadAllTasks;

        yield* Effect.forEach(
          tasks,
          Effect.fnUntraced(function*(task) {
            const existing = yield* store.getTask(task.id);
            if (existing !== undefined) return;

            const refBits = yield* referenceBits(task.id).pipe(
              Effect.catchTag("LamError", () => Effect.succeed(undefined)),
            );

            const category = task.id.split("_")[0] ?? task.id;
            const categoryName = CATEGORY_NAMES[category] ?? category;

            const insertTask: InsertTask = {
              category,
              categoryName,
              description: task.desc,
              id: task.id,
              refBits,
              refSolution: undefined,
              testCount: task.tests.length,
              tests: task.tests.map((t) => ({
                expected: t.want,
                input: t.expr,
              })),
            };

            yield* store.insertTask(insertTask);
          }),
          { concurrency: 4 },
        );
      },
    );

    const getTask = Effect.fn("TaskService.getTask")(function*(
      taskId: string,
    ) {
      return yield* store.getTask(taskId);
    });

    const getAllTasks = Effect.fn("TaskService.getAllTasks")(function*() {
      return yield* store.getAllTasks();
    });

    const getTasksByCategory = Effect.fn("TaskService.getTasksByCategory")(
      function*(category: string) {
        return yield* store.getTasksByCategory(category);
      },
    );

    const computeRefBits = Effect.fn("TaskService.computeRefBits")(function*(
      taskId: string,
    ) {
      return yield* referenceBits(taskId);
    });

    return TaskService.of({
      computeRefBits,
      getAllTasks,
      getTask,
      getTasksByCategory,
      loadAndCacheTasks,
    });
  }),
);
