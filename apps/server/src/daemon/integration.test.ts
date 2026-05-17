// apps/server/src/daemon/integration.test.ts
//
// Integration test for DaemonManager — uses real RegistryService (filesystem)
// with a mock ProcessManager so no actual processes are spawned.

import { existsSync, unlinkSync } from "node:fs";
import { describe, it } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Layer } from "effect";
import { afterEach } from "vitest";

import {
  DaemonManager,
  DaemonManagerLive,
  ProcessManager,
  RegistryService,
} from "./manager";
import { ProcessError } from "./process";
import {
  addProcess,
  REGISTRY_PATH,
  readRegistry,
  removeProcess,
} from "./registry";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEMP_PATH = ".lambench-data/daemon-registry.json.tmp";

const cleanup = () => {
  for (const file of [REGISTRY_PATH, TEMP_PATH]) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
};

// ─── Mock ProcessManager ─────────────────────────────────────────────────────

/**
 * Mock ProcessManager that simulates process lifecycle and persists registry
 * entries to the real filesystem (matching what spawnProcess / stopProcess do
 * in production).
 */
const MockProcessManager = ProcessManager.of({
  spawn: (config) =>
    Effect.gen(function* () {
      const pid = config.port === 9000 ? 9001 : 3001;
      const entry = {
        pid,
        command: config.command.join(" "),
        cwd: config.cwd,
        port: config.port,
        startTime: new Date().toISOString(),
        lastHealthCheck: null,
        healthy: true,
      };
      yield* addProcess(entry).pipe(
        Effect.catch((e) =>
          Effect.fail(new ProcessError(`Registry error: ${e.message}`)),
        ),
      );
      return {
        pid,
        proc: {} as never,
        config,
        startTime: entry.startTime,
      };
    }),
  stop: (spawned) =>
    Effect.gen(function* () {
      yield* removeProcess(spawned.pid).pipe(
        Effect.catch((e) =>
          Effect.fail(new ProcessError(`Registry error: ${e.message}`)),
        ),
      );
    }),
  isAlive: (pid) => Effect.succeed(pid > 0),
  waitForPort: () => Effect.void,
  checkHealth: () => Effect.succeed(true),
  tryConnect: () => Effect.succeed(false),
});

// ─── Test Layer ──────────────────────────────────────────────────────────────

/**
 * Combined layer: mock ProcessManager + real RegistryService (filesystem).
 */
const TestLayer = DaemonManagerLive.pipe(
  Layer.provide(Layer.succeed(ProcessManager, MockProcessManager)),
  Layer.provide(RegistryService.live),
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("DaemonManager integration", () => {
  afterEach(() => {
    cleanup();
  });

  it.effect("full lifecycle: start → status → stop", () =>
    Effect.gen(function* () {
      const manager = yield* DaemonManager;

      // Start daemon
      const startStatus = yield* manager.start();
      assertTrue(startStatus.running, "expected running after start");
      strictEqual(startStatus.server.pid, 9001, "expected server pid 9001");
      strictEqual(startStatus.client.pid, 3001, "expected client pid 3001");
      assertTrue(startStatus.server.healthy, "expected server healthy");
      assertTrue(startStatus.client.healthy, "expected client healthy");

      // Verify registry has entries
      const registry = yield* readRegistry();
      strictEqual(registry.processes.length, 2, "expected 2 registry entries");
      strictEqual(registry.version, 1, "expected registry version 1");

      // Status reports running
      const currentStatus = yield* manager.status();
      assertTrue(currentStatus.running, "expected status running");

      // Stop daemon
      const stopStatus = yield* manager.stop();
      strictEqual(stopStatus.running, false, "expected not running after stop");
      strictEqual(stopStatus.server.pid, null, "expected null server pid");
      strictEqual(stopStatus.client.pid, null, "expected null client pid");

      // Verify registry is empty
      const emptyRegistry = yield* readRegistry();
      strictEqual(
        emptyRegistry.processes.length,
        0,
        "expected empty registry after stop",
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("restart replaces entries", () =>
    Effect.gen(function* () {
      const manager = yield* DaemonManager;

      // Start — creates 2 registry entries
      yield* manager.start();
      const afterStart = yield* readRegistry();
      strictEqual(afterStart.processes.length, 2);

      // Restart — removes old entries, creates new ones
      const restartStatus = yield* manager.restart();
      assertTrue(restartStatus.running, "expected running after restart");

      // Registry should still have exactly 2 entries (not 4)
      const afterRestart = yield* readRegistry();
      strictEqual(
        afterRestart.processes.length,
        2,
        "expected 2 entries after restart (no duplicates)",
      );
    }).pipe(Effect.provide(TestLayer)),
  );
});
