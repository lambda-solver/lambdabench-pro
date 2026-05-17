// apps/server/src/daemon/process.ts
// ─── ProcessHandle — Bun.spawn lifecycle management ──────────────────────────

import { Effect } from "effect";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import { addProcess, removeProcess } from "./registry";
import type { ProcessEntry } from "./registry";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcessConfig {
  readonly command: Array<string>;
  readonly cwd: string;
  readonly env?: Record<string, string>;
  readonly port: number;
  readonly logFile: string;
}

export interface SpawnedProcess {
  readonly pid: number;
  readonly proc: Subprocess;
  readonly config: ProcessConfig;
  readonly startTime: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class ProcessError extends Error {
  readonly _tag = "ProcessError" as const;
  constructor(message: string) {
    super(message);
    this.name = "ProcessError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ensureLogDir = Effect.fnUntraced(function*(logFile: string) {
  yield* Effect.sync(() => {
    mkdirSync(dirname(logFile), { recursive: true });
  });
});

const toProcessEntry = (spawned: SpawnedProcess): ProcessEntry => ({
  command: spawned.config.command.join(" "),
  cwd: spawned.config.cwd,
  healthy: true,
  lastHealthCheck: null,
  pid: spawned.pid,
  port: spawned.config.port,
  startTime: spawned.startTime,
});

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Spawn a background process with detached mode.
 * - Opens the log file and passes the fd to the child process.
 * - Calls `proc.unref()` so the parent does not wait for the child.
 * - Registers the process in the daemon registry.
 */
export const spawnProcess = Effect.fn("process.spawnProcess")(function*(
  config: ProcessConfig,
) {
  yield* ensureLogDir(config.logFile);

  const logFd = yield* Effect.try({
    catch: (e) =>
      new ProcessError(
        `Failed to open log file: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () => openSync(config.logFile, "a"),
  });

  const proc = yield* Effect.try({
    catch: (e) =>
      new ProcessError(
        `Failed to spawn process: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () =>
      Bun.spawn({
        cmd: config.command,
        cwd: config.cwd,
        detached: true,
        env: { ...process.env, ...config.env } as Record<string, string>,
        stdio: ["ignore", logFd, logFd],
      }),
  });

  // Close our copy of the fd — Bun.spawn keeps its own copy for the child
  yield* Effect.sync(() => closeSync(logFd));

  proc.unref();

  const spawned: SpawnedProcess = {
    config,
    pid: proc.pid,
    proc,
    startTime: new Date().toISOString(),
  };

  // Register in the daemon registry
  yield* addProcess(toProcessEntry(spawned));

  return spawned;
});

/**
 * Stop a spawned process.
 * - Sends SIGTERM and polls every 500ms for up to 10 seconds.
 * - Escalates to SIGKILL if the process is still alive after the deadline.
 * - Removes the process from the daemon registry.
 */
export const stopProcess = Effect.fn("process.stopProcess")(function*(
  spawned: SpawnedProcess,
) {
  // Send SIGTERM
  yield* Effect.try({
    catch: (e) =>
      new ProcessError(
        `Failed to send SIGTERM to pid ${spawned.pid}: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () => {
      try {
        process.kill(spawned.pid, "SIGTERM");
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === "ESRCH") return; // already dead — success
        throw e;
      }
    },
  });

  const deadline = Date.now() + 10_000;

  const poll = (): Effect.Effect<void, ProcessError> =>
    Effect.suspend(() =>
      Effect.gen(function*() {
        const alive = yield* isProcessAlive(spawned.pid);
        if (!alive) return;

        if (Date.now() >= deadline) {
          // Timeout — escalate to SIGKILL
          yield* Effect.try({
            catch: (e) =>
              new ProcessError(
                `Failed to send SIGKILL to pid ${spawned.pid}: ${e instanceof Error ? e.message : String(e)}`,
              ),
            try: () => process.kill(spawned.pid, "SIGKILL"),
          });
          return;
        }

        yield* Effect.sleep("500 millis");
        return yield* poll();
      })
    );

  yield* poll();

  // Remove from registry
  yield* removeProcess(spawned.pid);
});

/**
 * Check if a process is alive by sending signal 0.
 * Never fails — always returns a boolean.
 */
export const isProcessAlive = Effect.fn("process.isProcessAlive")(function*(
  pid: number,
) {
  return yield* Effect.sync(() => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      // ESRCH = no such process
      if (err.code === "ESRCH") return false;
      // EPERM = process exists but we lack permission to signal it
      if (err.code === "EPERM") return true;
      return false;
    }
  });
});

/**
 * Wait for a TCP port to start responding to HTTP requests.
 * Polls every 250ms until the port responds or the timeout elapses.
 */
export const waitForPort = Effect.fn("process.waitForPort")(function*(
  port: number,
  timeoutMs: number = 30_000,
) {
  const deadline = Date.now() + timeoutMs;

  const poll = (): Effect.Effect<void, ProcessError> =>
    Effect.suspend(() =>
      Effect.gen(function*() {
        const response = yield* Effect.tryPromise({
          catch: () => undefined as Response | undefined,
          try: async () => {
            const res = await fetch(`http://127.0.0.1:${port}`);
            await res.text(); // consume body to release connection
            return res;
          },
        });

        if (response !== undefined) return;

        if (Date.now() >= deadline) {
          return yield* Effect.fail(
            new ProcessError(
              `Timed out waiting for port ${port} after ${timeoutMs}ms`,
            ),
          );
        }

        yield* Effect.sleep("250 millis");
        return yield* poll();
      })
    );

  yield* poll();
});
