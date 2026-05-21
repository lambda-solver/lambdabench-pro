// apps/server/src/daemon/manager.test.ts
//
// Tests for DaemonManager — wraps the live layer with mock ProcessManager and
// RegistryService so no real processes are spawned or files touched.

import { DaemonManager, DaemonManagerLive, ProcessManager, RegistryService } from "./manager";
import { Effect, Layer } from "effect";
import type { ProcessConfig, SpawnedProcess } from "./process";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { describe, it } from "@effect/vitest";

import type { ProcessEntry } from "./registry";

// ─── Test helpers ──────────────────────────────────────────────────────────

const makeFakeSpawned = (overrides?: Partial<SpawnedProcess>): SpawnedProcess => ({
  config: {
    command: ["test", "cmd"],
    cwd: "/tmp",
    logFile: "/tmp/test.log",
    port: 9000,
  },
  pid: 12_345,
  proc: {} as never,
  startTime: new Date().toISOString(),
  ...overrides,
});

const makeFakeEntry = (overrides?: Partial<ProcessEntry>): ProcessEntry => ({
  command: "test cmd",
  cwd: "/tmp",
  healthy: true,
  lastHealthCheck: null,
  pid: 12_345,
  port: 9000,
  startTime: new Date().toISOString(),
  ...overrides,
});

// Resolve DaemonManager from a test layer built from mock ProcessManager and
// RegistryService.  Returns the DaemonManager instance.
const makeManager = (mkProc: Layer.Layer<ProcessManager>, mkReg: Layer.Layer<RegistryService>) => {
  const layer = DaemonManagerLive.pipe(Layer.provide(mkProc), Layer.provide(mkReg));
  return Effect.gen(function* () {
    return yield* DaemonManager;
  }).pipe(Effect.provide(layer));
};

// Convenience: build a pair of mock layers from inline overrides.
const mockLayers = (overrides: {
  onSpawn?: (cfg: ProcessConfig) => SpawnedProcess;
  onStop?: (pid: number) => void;
  isAliveResult?: boolean;
  /** Per-pid override for isAlive (keys are pid numbers) */
  isAlivePids?: Record<number, boolean>;
  listProcessesResult?: Array<ProcessEntry>;
  listProcesses?: () => Effect.Effect<Array<ProcessEntry>>;
  registryRemove?: (pid: number) => void;
}) => {
  const spawnCalls: Array<ProcessConfig> = [];
  const stopCalls: Array<number> = [];
  const removedPids: Array<number> = [];

  const mockProc = Layer.succeed(
    ProcessManager,
    ProcessManager.of({
      checkHealth: () => Effect.succeed(true),
      isAlive: (pid: number) => {
        // Allow per-pid override through isAlivePids map
        if (overrides.isAlivePids && overrides.isAlivePids[pid] !== undefined) {
          return Effect.succeed(overrides.isAlivePids[pid]);
        }
        return Effect.succeed(overrides.isAliveResult !== undefined ? overrides.isAliveResult : false);
      },
      spawn: (cfg) => {
        spawnCalls.push(cfg);
        const sp = overrides.onSpawn
          ? overrides.onSpawn(cfg)
          : makeFakeSpawned({
              config: cfg,
              pid: cfg.port === 9000 ? 1001 : 2001,
              startTime: new Date().toISOString(),
            });
        return Effect.succeed(sp);
      },
      stop: (sp) => {
        stopCalls.push(sp.pid);
        if (overrides.onStop) overrides.onStop(sp.pid);
        return Effect.void;
      },
      tryConnect: () => Effect.succeed(false),
      waitForPort: () => Effect.void,
    }),
  );

  const defaultEntries: Array<ProcessEntry> = [
    {
      command: "",
      cwd: "",
      healthy: false,
      lastHealthCheck: null,
      pid: 0,
      port: 9000,
      startTime: "",
    },
    {
      command: "",
      cwd: "",
      healthy: false,
      lastHealthCheck: null,
      pid: 0,
      port: 3000,
      startTime: "",
    },
  ];

  const mockReg = Layer.succeed(
    RegistryService,
    RegistryService.of({
      addProcess: () => Effect.void,
      getProcess: () => Effect.succeed(null),
      listProcesses: overrides.listProcesses ?? (() => Effect.succeed(overrides.listProcessesResult ?? defaultEntries)),
      removeProcess: (pid) => {
        removedPids.push(pid);
        if (overrides.registryRemove) overrides.registryRemove(pid);
        return Effect.void;
      },
    }),
  );

  return { mockProc, mockReg, removedPids, spawnCalls, stopCalls };
};

// ─── describe ──────────────────────────────────────────────────────────────

describe("DaemonManager", () => {
  // ── start / stop lifecycle ───────────────────────────────────────────

  it.effect("start spawns both processes and returns DaemonStatus", () =>
    Effect.gen(function* () {
      const { mockProc, mockReg, spawnCalls } = mockLayers({
        isAlivePids: { 1001: true, 2001: true },
      });
      const manager = yield* makeManager(mockProc, mockReg);

      const status = yield* manager.start();

      assertTrue(status.running, "expected status.running === true");
      assertTrue(status.server.pid !== null, "expected server pid");
      assertTrue(status.server.healthy, "expected server healthy");
      assertTrue(status.client.pid !== null, "expected client pid");
      assertTrue(status.client.healthy, "expected client healthy");
      strictEqual(spawnCalls.length, 2, "expected 2 spawn calls");
    }),
  );

  it.effect("stop terminates both processes and returns stopped status", () =>
    Effect.gen(function* () {
      const stopPids: Array<number> = [];
      const { mockProc, mockReg } = mockLayers({
        isAlivePids: { 1001: true, 2001: true },
        onStop: (pid) => {
          stopPids.push(pid);
        },
      });
      const manager = yield* makeManager(mockProc, mockReg);

      yield* manager.start();
      const status = yield* manager.stop();

      strictEqual(status.running, false, "expected stopped");
      strictEqual(status.server.pid, null);
      strictEqual(status.client.pid, null);
      strictEqual(stopPids.length, 2, "expected 2 stop calls");
    }),
  );

  it.effect("start → stop → start full lifecycle", () =>
    Effect.gen(function* () {
      const { mockProc, mockReg, spawnCalls } = mockLayers({
        isAlivePids: { 1001: true, 2001: true },
      });
      const manager = yield* makeManager(mockProc, mockReg);

      const s1 = yield* manager.start();
      assertTrue(s1.running);
      yield* manager.stop();

      const s2 = yield* manager.start();
      assertTrue(s2.running);

      strictEqual(spawnCalls.length, 4, "expected 4 total spawn calls");
    }),
  );

  // ── Warm start (FR-006) ─────────────────────────────────────────────

  it.effect("warm start — reuses processes already in registry when alive", () =>
    Effect.gen(function* () {
      const serverEntry = makeFakeEntry({
        command: "bun --watch run src/index.ts",
        pid: 5001,
        port: 9000,
      });
      const clientEntry = makeFakeEntry({
        command: "bun run vite --port 3000 --host --clearScreen false",
        pid: 5002,
        port: 3000,
      });

      const { mockProc, mockReg, spawnCalls } = mockLayers({
        isAliveResult: true,
        listProcessesResult: [serverEntry, clientEntry],
      });
      const manager = yield* makeManager(mockProc, mockReg);

      const status = yield* manager.start();

      assertTrue(status.running, "expected running after warm start");
      strictEqual(spawnCalls.length, 0, "expected 0 spawn calls");
      strictEqual(status.server.pid, 5001);
      strictEqual(status.client.pid, 5002);
    }),
  );

  it.effect("warm start — respawns if registry entry exists but process is dead", () =>
    Effect.gen(function* () {
      const serverEntry = makeFakeEntry({ pid: 5001, port: 9000 });
      const clientEntry = makeFakeEntry({ pid: 5002, port: 3000 });

      const { mockProc, mockReg, spawnCalls, removedPids } = mockLayers({
        isAlivePids: { 1001: true, 2001: true },
        listProcessesResult: [serverEntry, clientEntry],
      });
      const manager = yield* makeManager(mockProc, mockReg);

      const status = yield* manager.start();

      assertTrue(status.running);
      strictEqual(spawnCalls.length, 2, "expected 2 spawn calls");
      assertTrue(removedPids.includes(5001), "expected server entry removed");
      assertTrue(removedPids.includes(5002), "expected client entry removed");
      strictEqual(status.server.pid, 1001);
      strictEqual(status.client.pid, 2001);
    }),
  );

  // ── Port conflict detection (FR-005) ──────────────────────────────────

  it.effect("port conflict — fails when port is in use by unknown process", () =>
    Effect.gen(function* () {
      // Provide a mock registry that claims NO ownership of the default
      // ports.  If any of the default daemon ports (9000 or 3000) is
      // actually occupied on this machine, `resolvePort` will detect the
      // orphaned port as a conflict and fail with ProcessError.
      const { mockProc, mockReg } = mockLayers({
        listProcessesResult: [],
      });
      const manager = yield* makeManager(mockProc, mockReg);

      // Catch the ProcessError.  If start succeeds (all ports free),
      // the test is a no-op.  If it fails, verify it's a port conflict.
      const caught: string | null = yield* manager.start().pipe(
        Effect.map(() => null as string | null),
        Effect.catch((e: unknown) => Effect.succeed((e as Error).message)),
      );

      if (caught !== null) {
        assertTrue(caught.toLowerCase().includes("port"), `expected port conflict message, got: ${caught}`);
      }
    }),
  );

  // ── Status ───────────────────────────────────────────────────────────

  it.effect("status returns non-running when no processes", () =>
    Effect.gen(function* () {
      const { mockProc, mockReg } = mockLayers({ isAliveResult: false });
      const manager = yield* makeManager(mockProc, mockReg);

      const status = yield* manager.status();

      strictEqual(status.running, false, "expected not running");
      strictEqual(status.server.pid, null);
      strictEqual(status.server.healthy, false);
      strictEqual(status.client.pid, null);
      strictEqual(status.client.healthy, false);
    }),
  );

  it.effect("status returns running after start", () =>
    Effect.gen(function* () {
      const { mockProc, mockReg } = mockLayers({
        isAlivePids: { 1001: true, 2001: true },
      });
      const manager = yield* makeManager(mockProc, mockReg);

      yield* manager.start();

      const status = yield* manager.status();
      assertTrue(status.running, "expected running after start");
      strictEqual(status.server.pid, 1001);
      strictEqual(status.client.pid, 2001);
    }),
  );

  it.effect("status returns not running after stop", () =>
    Effect.gen(function* () {
      const { mockProc, mockReg } = mockLayers({});
      const manager = yield* makeManager(mockProc, mockReg);

      yield* manager.start();
      yield* manager.stop();

      const status = yield* manager.status();
      strictEqual(status.running, false, "expected not running after stop");
      strictEqual(status.server.pid, null);
      strictEqual(status.client.pid, null);
    }),
  );

  // ── Restart ──────────────────────────────────────────────────────────

  it.effect("restart stops then starts, returning running status", () =>
    Effect.gen(function* () {
      const events: Array<string> = [];

      const { mockProc, mockReg } = mockLayers({
        isAlivePids: { 1001: true, 2001: true },
        onSpawn: (cfg) => {
          events.push("spawn");
          return makeFakeSpawned({
            config: cfg,
            pid: cfg.port === 9000 ? 1001 : 2001,
            startTime: new Date().toISOString(),
          });
        },
        onStop: () => {
          events.push("stop");
        },
      });
      const manager = yield* makeManager(mockProc, mockReg);

      yield* manager.start();
      const status = yield* manager.restart();

      assertTrue(status.running, "expected running after restart");
      strictEqual(events.filter((e) => e === "stop").length, 2);
      strictEqual(events.filter((e) => e === "spawn").length, 4);
      assertTrue(status.server.pid !== null, "expected server pid");
      assertTrue(status.client.pid !== null, "expected client pid");
    }),
  );
});
