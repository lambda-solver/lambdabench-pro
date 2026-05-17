// apps/server/src/daemon/process.test.ts

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { describe, it } from "@effect/vitest";
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Either } from "effect";
import { afterEach } from "vitest";

import {
  isProcessAlive,
  type ProcessConfig,
  ProcessError,
  type SpawnedProcess,
  spawnProcess,
  stopProcess,
  waitForPort,
} from "./process";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_DIR = "/tmp/lambench-test-process";

const testConfig = (overrides?: Partial<ProcessConfig>): ProcessConfig => ({
  command: ["sleep", "30"],
  cwd: TEST_DIR,
  port: 0,
  logFile: `${TEST_DIR}/test.log`,
  ...overrides,
});

const ensureTestDir = () => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
};

const cleanupDir = () => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe.skipIf(typeof Bun === "undefined")("ProcessHandle", () => {
  const spawned: SpawnedProcess[] = [];

  afterEach(() => {
    // Kill any spawned processes that are still running
    for (const s of spawned) {
      try {
        process.kill(s.pid, "SIGKILL");
      } catch {
        // already dead
      }
    }
    spawned.length = 0;
    cleanupDir();
  });

  it.effect("spawnProcess creates a real background process", () =>
    Effect.gen(function* () {
      ensureTestDir();

      const proc = yield* spawnProcess(
        testConfig({ command: ["sleep", "10"] }),
      );
      spawned.push(proc);

      assertTrue(proc.pid > 0, "expected a valid pid");
      strictEqual(typeof proc.startTime, "string");
      assertTrue(proc.startTime.length > 0, "expected non-empty startTime");

      // The process should be alive shortly after spawn
      const alive = yield* isProcessAlive(proc.pid);
      assertTrue(alive, "expected process to be alive after spawn");
    }),
  );

  it.effect("stopProcess terminates the process", () =>
    Effect.gen(function* () {
      ensureTestDir();

      const proc = yield* spawnProcess(
        testConfig({ command: ["sleep", "30"] }),
      );
      spawned.push(proc);

      // Confirm it's alive
      const aliveBefore = yield* isProcessAlive(proc.pid);
      assertTrue(aliveBefore, "expected process to be alive before stop");

      // Stop the process
      yield* stopProcess(proc);

      // Confirm it's dead
      const aliveAfter = yield* isProcessAlive(proc.pid);
      assertFalse(aliveAfter, "expected process to be dead after stop");
    }),
  );

  it.effect("isProcessAlive returns true for running process", () =>
    Effect.gen(function* () {
      ensureTestDir();

      const proc = yield* spawnProcess(testConfig({ command: ["sleep", "5"] }));
      spawned.push(proc);

      const alive = yield* isProcessAlive(proc.pid);
      assertTrue(alive, "expected running process to report alive");
    }),
  );

  it.effect("isProcessAlive returns false for non-existent pid", () =>
    Effect.gen(function* () {
      // Use a pid that is extremely unlikely to exist
      const alive = yield* isProcessAlive(999_999_999);
      assertFalse(alive, "expected non-existent pid to report dead");
    }),
  );

  it.effect("isProcessAlive never fails for non-existent pid", () =>
    Effect.gen(function* () {
      // pid 0 checks the current process group — it may succeed, so only
      // test with a very large pid that is extremely unlikely to exist.
      const alive = yield* isProcessAlive(999_999_999);
      assertFalse(alive);
    }),
  );

  it.effect("waitForPort succeeds when port is available", () =>
    Effect.gen(function* () {
      // Start a minimal Bun HTTP server on a random port
      const server = Bun.serve({
        port: 0,
        fetch() {
          return new Response("ok");
        },
      });

      const port = server.port;

      try {
        yield* waitForPort(port, 5_000);
      } finally {
        server.stop();
      }
    }),
  );

  it.effect("waitForPort times out when port is not available", () =>
    Effect.gen(function* () {
      // Use a port that should not be listening (high random port)
      const effect = waitForPort(58_999, 1_000);
      const result = yield* Effect.either(effect);
      Either.match(result, {
        onLeft: (error) => {
          assertTrue(
            error instanceof ProcessError,
            "expected ProcessError instance",
          );
          assertTrue(
            error.message.includes("Timed out"),
            `expected timeout message, got: ${error.message}`,
          );
        },
        onRight: () => {
          assertTrue(
            false,
            "expected waitForPort to fail with a timeout error",
          );
        },
      });
    }),
  );
}); // closes ProcessHandle describe

describe("ProcessError", () => {
  it.effect("has correct _tag", () =>
    Effect.sync(() => {
      const err = new ProcessError("test error");
      strictEqual(err._tag, "ProcessError");
      strictEqual(err.name, "ProcessError");
      strictEqual(err.message, "test error");
    }),
  );
});
