import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";
import { LamBenchClient } from "./client/LamBenchClient.js";

const parseFlag = (
  args: readonly string[],
  prefix: string,
): string | undefined =>
  args.find((a) => a.startsWith(prefix))?.slice(prefix.length);

const printUsage = (): Effect.Effect<void> =>
  Effect.sync(() => {
    console.error("Usage: bun cli.ts <command> [options]");
    console.error("");
    console.error("Commands:");
    console.error(
      "  eval single <model> <task> [--variant=standard|rlm] [--provider=openrouter|opencode-go]",
    );
    console.error(
      "  eval batch <models...> [--tasks=<task1,task2>] [--variant=both|standard|rlm]",
    );
    console.error("  status <jobId>");
    console.error("  results [--model=<model>] [--task=<task>] [--limit=<n>]");
    console.error("  tasks [--task=<taskId>]");
    console.error("  models");
    console.error("  server");
    console.error("  gepa optimize <taskId>");
  });

export const runCli = Effect.fn("runCli")(function* (args: readonly string[]) {
  const client = yield* LamBenchClient;

  if (args.length === 0) {
    yield* printUsage();
    return;
  }

  const command = args[0];

  switch (command) {
    case "eval": {
      const subCommand = args[1];

      if (subCommand === "single") {
        const model = args[2];
        const task = args[3];
        const variant = parseFlag(args, "--variant=") ?? "standard";
        const provider = parseFlag(args, "--provider=") ?? "openrouter";

        if (!model || !task) {
          console.error("Error: model and task are required for 'eval single'");
          yield* printUsage();
          return;
        }

        const result = yield* client.evalSingle({
          model,
          task,
          variant: variant as "standard" | "rlm",
          provider: provider as "openrouter" | "opencode-go",
          maxTokens: 4096,
          rlmMaxDepth: 3,
          mode: "direct",
        });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (subCommand === "batch") {
        const models: string[] = [];
        let idx = 2;
        while (idx < args.length) {
          const arg = args[idx];
          if (arg === undefined || arg.startsWith("--")) break;
          models.push(arg);
          idx++;
        }

        const tasksFlag = parseFlag(args, "--tasks=");
        const tasks = tasksFlag ? tasksFlag.split(",") : [];
        const variant = parseFlag(args, "--variant=") ?? "both";

        if (models.length === 0) {
          console.error(
            "Error: at least one model is required for 'eval batch'",
          );
          yield* printUsage();
          return;
        }

        const result = yield* client.evalBatch({
          models,
          tasks,
          variant: variant as "standard" | "rlm" | "both",
          concurrency: 2,
          mode: "both",
        });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.error(`Error: unknown eval subcommand '${subCommand}'`);
      yield* printUsage();
      return;
    }

    case "status": {
      const jobId = args[1];
      if (!jobId) {
        console.error("Error: jobId is required for 'status'");
        yield* printUsage();
        return;
      }
      const result = yield* client.evalStatus(jobId);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    case "results": {
      const modelFilter = parseFlag(args, "--model=");
      const taskFilter = parseFlag(args, "--task=");
      const limitFilter = parseFlag(args, "--limit=");
      const limit = limitFilter ? parseInt(limitFilter, 10) : undefined;

      const result = yield* client.results();
      let data = result;

      if (modelFilter || taskFilter || limit !== undefined) {
        let filtered = result.rankings;
        if (modelFilter) {
          filtered = filtered.filter((r) => r.model === modelFilter);
        }
        if (taskFilter) {
          filtered = filtered.filter((r) => taskFilter in r.tasks);
        }
        if (limit !== undefined && limit > 0) {
          filtered = filtered.slice(0, limit);
        }
        data = { ...result, rankings: filtered };
      }

      console.log(JSON.stringify(data, null, 2));
      return;
    }

    case "tasks": {
      const taskId = parseFlag(args, "--task=");
      if (taskId) {
        const result = yield* client.taskDetail(taskId);
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      const result = yield* client.tasks();
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    case "models": {
      const result = yield* client.models();
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    case "server": {
      console.log("Start the server with: bun dev --filter=server");
      return;
    }

    case "gepa": {
      const gepaSub = args[1];
      if (gepaSub === "optimize") {
        console.log("GEPA optimizer: not yet implemented");
        return;
      }
      console.error(`Error: unknown gepa subcommand '${gepaSub}'`);
      yield* printUsage();
      return;
    }

    default: {
      console.error(`Error: unknown command '${command}'`);
      yield* printUsage();
      return;
    }
  }
});

const baseUrl = process.env["LAMBENCH_API_URL"] ?? "http://127.0.0.1:9000";

if (import.meta.main) {
  BunRuntime.runMain(
    runCli(process.argv.slice(2)).pipe(
      Effect.provide(LamBenchClient.layer(baseUrl)),
    ),
  );
}
