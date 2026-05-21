import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";
import { LamBenchClient } from "./client/LamBenchClient.js";

const parseFlag = (args: ReadonlyArray<string>, prefix: string): string | undefined =>
  args.find((a) => a.startsWith(prefix))?.slice(prefix.length);

const stdout = (msg: string): Effect.Effect<void> =>
  Effect.sync(() => void process.stdout.write(`${msg}\n`));

const stderr = (msg: string): Effect.Effect<void> =>
  Effect.sync(() => void process.stderr.write(`${msg}\n`));

const printUsage = (): Effect.Effect<void> =>
  stderr(
    [
      "Usage: bun cli.ts <command> [options]",
      "",
      "Commands:",
      "  eval single <model> <task> [--variant=standard|rlm] [--provider=openrouter|opencode-go]",
      "  eval batch <models...> [--tasks=<task1,task2>] [--variant=both|standard|rlm]",
      "  status <jobId>",
      "  results [--model=<model>] [--task=<task>] [--limit=<n>]",
      "  tasks [--task=<taskId>]",
      "  models",
      "  server",
      "  gepa optimize <taskId>",
    ].join("\n"),
  );

export const runCli = Effect.fn("runCli")(function* (args: ReadonlyArray<string>) {
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
          yield* stderr("Error: model and task are required for 'eval single'");
          yield* printUsage();
          return;
        }

        const result = yield* client.evalSingle({
          maxTokens: 4096,
          mode: "direct",
          model,
          provider: provider as "openrouter" | "opencode-go",
          rlmMaxDepth: 3,
          task,
          variant: variant as "standard" | "rlm",
        });
        yield* stdout(JSON.stringify(result, null, 2));
        return;
      }

      if (subCommand === "batch") {
        const models: Array<string> = [];
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
          yield* stderr("Error: at least one model is required for 'eval batch'");
          yield* printUsage();
          return;
        }

        const result = yield* client.evalBatch({
          concurrency: 2,
          mode: "both",
          models,
          tasks,
          variant: variant as "standard" | "rlm" | "both",
        });
        yield* stdout(JSON.stringify(result, null, 2));
        return;
      }

      yield* stderr(`Error: unknown eval subcommand '${subCommand}'`);
      yield* printUsage();
      return;
    }

    case "status": {
      const jobId = args[1];
      if (!jobId) {
        yield* stderr("Error: jobId is required for 'status'");
        yield* printUsage();
        return;
      }
      const result = yield* client.evalStatus(jobId);
      yield* stdout(JSON.stringify(result, null, 2));
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

      yield* stdout(JSON.stringify(data, null, 2));
      return;
    }

    case "tasks": {
      const taskId = parseFlag(args, "--task=");
      if (taskId) {
        const result = yield* client.taskDetail(taskId);
        yield* stdout(JSON.stringify(result, null, 2));
        return;
      }
      const result = yield* client.tasks();
      yield* stdout(JSON.stringify(result, null, 2));
      return;
    }

    case "models": {
      const result = yield* client.models();
      yield* stdout(JSON.stringify(result, null, 2));
      return;
    }

    case "server": {
      yield* stdout("Start the server with: bun dev --filter=server");
      return;
    }

    case "gepa": {
      const gepaSub = args[1];
      if (gepaSub === "optimize") {
        yield* stdout("GEPA optimizer: not yet implemented");
        return;
      }
      yield* stderr(`Error: unknown gepa subcommand '${gepaSub}'`);
      yield* printUsage();
      return;
    }

    default: {
      yield* stderr(`Error: unknown command '${command}'`);
      yield* printUsage();
      return;
    }
  }
});

const baseUrl = process.env.LAMBENCH_API_URL ?? "http://127.0.0.1:9000";

if (import.meta.main) {
  BunRuntime.runMain(runCli(process.argv.slice(2)).pipe(Effect.provide(LamBenchClient.layer(baseUrl))));
}
