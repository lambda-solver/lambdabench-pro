#!/usr/bin/env bun
// apps/server/src/daemon-cli.ts
//
// CLI entry point for daemon lifecycle management.
// Supports start, stop, restart, status, and logs commands.

import { DaemonManager, DaemonManagerLayer } from "./daemon/manager";

import { Effect } from "effect";

import { ProcessError } from "./daemon/process";
import { spawn } from "node:child_process";

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
    process.stderr.write(`Daemon error: ${error.message}\n`);
  } else if (error instanceof Error) {
    process.stderr.write(`Unexpected error: ${error.message}\n`);
  } else {
    process.stderr.write(`Unexpected error: ${String(error)}\n`);
  }
  return process.exit(1);
};

const out = (msg: string): void => void process.stdout.write(`${msg}\n`);
const err = (msg: string): void => void process.stderr.write(`${msg}\n`);

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
      out(JSON.stringify(status, null, 2));
      break;
    }
    case "stop": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.stop();
        }),
      );
      out(JSON.stringify(status, null, 2));
      break;
    }
    case "restart": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.restart();
        }),
      );
      out(JSON.stringify(status, null, 2));
      break;
    }
    case "status": {
      const status = await run(
        Effect.gen(function* () {
          const manager = yield* DaemonManager;
          return yield* manager.status();
        }),
      );
      out(JSON.stringify(status, null, 2));
      break;
    }
    case "logs": {
      spawn("tail", ["-f", ".lambench-data/logs/server.log", ".lambench-data/logs/client.log"], { stdio: "inherit" });
      break;
    }
    default: {
      if (command) {
        err(`Unknown command: ${command}`);
      }
      out(usage);
      process.exit(1);
    }
  }
};

main().catch((error: unknown) => {
  printError(error);
});
