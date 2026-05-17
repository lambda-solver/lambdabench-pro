#!/usr/bin/env bun
// apps/server/src/daemon-cli.ts
//
// CLI entry point for daemon lifecycle management.
// Supports start, stop, restart, status, and logs commands.

import { spawn } from "node:child_process";
import { Effect } from "effect";
import { DaemonManager, DaemonManagerLayer } from "./daemon/manager";
import { ProcessError } from "./daemon/process";

const usage = `Usage: bun run apps/server/src/daemon-cli.ts <command>

Commands:
  start, bg   Start background dev servers
  stop        Stop background dev servers
  restart     Restart background dev servers
  status      Show daemon status
  logs        Tail combined logs`;

/**
 * Helper: run an Effect through the production DaemonManagerLayer and return a
 * Promise. Errors propagate as Promise rejections and are handled at the top
 * level.
 */
const run = <A, E>(effect: Effect.Effect<A, E, DaemonManager>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provide(DaemonManagerLayer)));

const printError = (error: unknown): never => {
  if (error instanceof ProcessError) {
    console.error(`Daemon error: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
  } else {
    console.error(`Unexpected error: ${String(error)}`);
  }
  return process.exit(1);
};

const main = async (): Promise<void> => {
  const command = process.argv[2];

  switch (command) {
    case "start":
    case "bg": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.start();
        }),
      );
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "stop": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.stop();
        }),
      );
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "restart": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.restart();
        }),
      );
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "status": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.status();
        }),
      );
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "logs": {
      spawn(
        "tail",
        [
          "-f",
          ".lambench-data/logs/server.log",
          ".lambench-data/logs/client.log",
        ],
        { stdio: "inherit" },
      );
      break;
    }
    default: {
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      console.log(usage);
      process.exit(1);
    }
  }
};

main().catch((error: unknown) => {
  printError(error);
});
