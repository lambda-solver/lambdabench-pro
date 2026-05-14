#!/usr/bin/env bun
import { BunRuntime, BunStdio } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/unstable/ai";
import { LamBenchClient } from "./client/LamBenchClient.js";

const EvalSingleTool = Tool.make("lambench_eval_single", {
  description: "Run a single benchmark evaluation for a model and task",
  parameters: Schema.Struct({
    model: Schema.String.annotate({ description: "Model ID to evaluate" }),
    task: Schema.String.annotate({ description: "Task ID to evaluate" }),
    variant: Schema.Literals(["standard", "rlm"]).annotate({
      description: "Evaluation variant: standard or rlm",
    }),
    provider: Schema.Literals(["openrouter", "opencode-go"]).annotate({
      description: "Provider to use",
    }),
    mode: Schema.Literals(["direct", "agent"])
      .pipe(Schema.withDecodingDefaultKey(Effect.succeed("direct" as const)))
      .annotate({ description: "Evaluation mode: direct or agent" }),
  }),
  success: Schema.Unknown,
});

const ListTasksTool = Tool.make("lambench_list_tasks", {
  description: "List all available benchmark tasks with summaries",
  parameters: Tool.EmptyParams,
  success: Schema.Unknown,
}).annotate(Tool.Readonly, true);

const ListResultsTool = Tool.make("lambench_list_results", {
  description:
    "List recent benchmark results with optional filtering by model, task, or limit",
  parameters: Schema.Struct({
    model: Schema.optional(
      Schema.String.annotate({ description: "Filter by model ID" }),
    ),
    task: Schema.optional(
      Schema.String.annotate({ description: "Filter by task ID" }),
    ),
    limit: Schema.optional(
      Schema.Number.annotate({
        description: "Maximum number of results to return",
      }),
    ),
  }),
  success: Schema.Unknown,
}).annotate(Tool.Readonly, true);

const GetTaskTool = Tool.make("lambench_get_task", {
  description: "Get full details for a specific benchmark task",
  parameters: Schema.Struct({
    taskId: Schema.String.annotate({ description: "The task ID to look up" }),
  }),
  success: Schema.Unknown,
}).annotate(Tool.Readonly, true);

const ListPromptVersionsTool = Tool.make("lambench_list_prompt_versions", {
  description: "List all prompt versions for a task (GEPA)",
  parameters: Schema.Struct({
    taskId: Schema.String.annotate({
      description: "Task ID to look up prompt versions for",
    }),
  }),
  success: Schema.Unknown,
}).annotate(Tool.Readonly, true);

const TriggerGepaTool = Tool.make("lambench_trigger_gepa", {
  description: "Trigger GEPA prompt optimization for a task",
  parameters: Schema.Struct({
    taskId: Schema.String.annotate({
      description: "Task ID to optimize prompts for",
    }),
  }),
  success: Schema.Unknown,
});

export const LambenchToolkit = Toolkit.make(
  EvalSingleTool,
  ListTasksTool,
  ListResultsTool,
  GetTaskTool,
  ListPromptVersionsTool,
  TriggerGepaTool,
);

const errorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "cause" in err) {
    return errorMessage((err as { cause: unknown }).cause);
  }
  return String(err);
};

const ToolHandlers = LambenchToolkit.toLayer(
  Effect.gen(function* () {
    const client = yield* LamBenchClient;

    return {
      lambench_eval_single: (input) =>
        Effect.match(
          client.evalSingle({
            model: input.model,
            task: input.task,
            variant: input.variant,
            provider: input.provider,
            maxTokens: 4096,
            rlmMaxDepth: 3,
            mode: input.mode,
          }),
          {
            onFailure: (err) => ({ error: errorMessage(err) }),
            onSuccess: (result) => result,
          },
        ),

      lambench_list_tasks: () =>
        Effect.match(client.tasks(), {
          onFailure: (err) => ({ error: errorMessage(err) }),
          onSuccess: (tasks) => tasks,
        }),

      lambench_list_results: (input) =>
        Effect.match(
          Effect.gen(function* () {
            const data = yield* client.results();
            const filteredByModel = input.model
              ? data.rankings.filter((r) => r.model === input.model)
              : data.rankings;
            const taskFilter = input.task;
            const filteredByTask = taskFilter
              ? filteredByModel.filter((r) => taskFilter in r.tasks)
              : filteredByModel;
            const limitFilter = input.limit;
            const limited =
              typeof limitFilter === "number" && limitFilter > 0
                ? filteredByTask.slice(0, limitFilter)
                : filteredByTask;
            return limited;
          }),
          {
            onFailure: (err) => ({ error: errorMessage(err) }),
            onSuccess: (results) => results,
          },
        ),

      lambench_get_task: (input) =>
        Effect.match(client.taskDetail(input.taskId), {
          onFailure: (err) => ({ error: errorMessage(err) }),
          onSuccess: (task) => task,
        }),

      lambench_list_prompt_versions: () =>
        Effect.succeed({
          message: "Prompt version management: not yet implemented",
        }),

      lambench_trigger_gepa: () =>
        Effect.succeed({ message: "GEPA optimizer: not yet implemented" }),
    };
  }),
);

export const ServerLayer = McpServer.toolkit(LambenchToolkit).pipe(
  Layer.provideMerge(ToolHandlers),
  Layer.provide(LamBenchClient.layer("http://127.0.0.1:9000")),
  Layer.provide(
    McpServer.layerStdio({
      name: "lambench",
      version: "1.0.0",
    }),
  ),
  Layer.provide(BunStdio.layer),
);

if (import.meta.main) {
  Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
}
