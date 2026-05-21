// apps/server/src/daemon/registry.test.ts

import type { ProcessEntry, RegistryData } from "./registry";
import {
  addProcess,
  getProcess,
  listProcesses,
  readRegistry,
  REGISTRY_PATH,
  removeProcess,
  updateHealth,
  writeRegistry,
} from "./registry";
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { describe, it } from "@effect/vitest";
import { existsSync, unlinkSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

import { Effect } from "effect";

import { afterEach } from "vitest";
import { dirname } from "node:path";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEMP_PATH = ".lambench-data/daemon-registry.json.tmp";

const cleanup = () => {
  for (const p of [REGISTRY_PATH, TEMP_PATH]) {
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
};

const sampleEntry = (overrides?: Partial<ProcessEntry>): ProcessEntry => ({
  command: "bun dev",
  cwd: "/test",
  healthy: true,
  lastHealthCheck: null,
  pid: 1234,
  port: 9000,
  startTime: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProcessRegistry", () => {
  afterEach(() => {
    cleanup();
  });

  it.effect("readRegistry returns empty registry when file does not exist", () =>
    Effect.gen(function* () {
      const data = yield* readRegistry();

      strictEqual(data.version, 1);
      deepStrictEqual(data.processes, []);
      assertTrue(typeof data.updatedAt === "string");
    }),
  );

  it.effect("writeRegistry then readRegistry roundtrip", () =>
    Effect.gen(function* () {
      const testData: RegistryData = {
        processes: [sampleEntry()],
        updatedAt: "2025-01-01T00:00:00.000Z",
        version: 1,
      };

      yield* writeRegistry(testData);

      const read = yield* readRegistry();
      deepStrictEqual(read, testData);
    }),
  );

  it.effect("addProcess adds entry to registry", () =>
    Effect.gen(function* () {
      const entry = sampleEntry({ pid: 42, port: 8080 });

      yield* addProcess(entry);

      const processes = yield* listProcesses();
      strictEqual(processes.length, 1);
      strictEqual(processes[0]?.pid, 42);
      strictEqual(processes[0]?.port, 8080);
    }),
  );

  it.effect("removeProcess removes entry by pid", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ pid: 1 }));
      yield* addProcess(sampleEntry({ pid: 2 }));

      yield* removeProcess(1);

      const processes = yield* listProcesses();
      strictEqual(processes.length, 1);
      strictEqual(processes[0]?.pid, 2);
    }),
  );

  it.effect("removeProcess is a no-op for non-existent pid", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ pid: 1 }));

      yield* removeProcess(999);

      const processes = yield* listProcesses();
      strictEqual(processes.length, 1);
    }),
  );

  it.effect("getProcess returns null for missing pid", () =>
    Effect.gen(function* () {
      const entry = yield* getProcess(999);
      strictEqual(entry, null);
    }),
  );

  it.effect("getProcess returns entry for existing pid", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ pid: 42, port: 8080 }));

      const entry = yield* getProcess(42);
      if (entry === null) throw new Error("Expected process to exist");
      strictEqual(entry.pid, 42);
      strictEqual(entry.port, 8080);
    }),
  );

  it.effect("listProcesses returns all entries", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ pid: 1 }));
      yield* addProcess(sampleEntry({ pid: 2 }));
      yield* addProcess(sampleEntry({ pid: 3 }));

      const all = yield* listProcesses();
      strictEqual(all.length, 3);
    }),
  );

  it.effect("listProcesses returns empty array for empty registry", () =>
    Effect.gen(function* () {
      const all = yield* listProcesses();
      deepStrictEqual(all, []);
    }),
  );

  it.effect("updateHealth updates healthy flag and records lastHealthCheck timestamp", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ healthy: true, lastHealthCheck: null, pid: 1 }));

      yield* updateHealth(1, false);

      const entry = yield* getProcess(1);
      if (entry === null) throw new Error("Expected process to exist");
      strictEqual(entry.healthy, false);
      assertTrue(entry.lastHealthCheck !== null);
    }),
  );

  it.effect("updateHealth is a no-op for non-existent pid", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ pid: 1 }));

      yield* updateHealth(999, false);

      const processes = yield* listProcesses();
      strictEqual(processes.length, 1);
      strictEqual(processes[0]?.healthy, true);
    }),
  );

  it.effect("corrupted JSON file returns empty registry with warning", () =>
    Effect.gen(function* () {
      yield* Effect.tryPromise({
        catch: (e) => new Error(String(e)),
        try: () =>
          mkdir(dirname(REGISTRY_PATH), { recursive: true }).then(() =>
            writeFile(REGISTRY_PATH, "not valid json content", "utf-8"),
          ),
      });

      const data = yield* readRegistry();
      strictEqual(data.version, 1);
      deepStrictEqual(data.processes, []);
    }),
  );

  it.effect("multiple addProcess calls persist all entries", () =>
    Effect.gen(function* () {
      yield* addProcess(sampleEntry({ command: "cmd1", pid: 1 }));
      yield* addProcess(sampleEntry({ command: "cmd2", pid: 2 }));

      const processes = yield* listProcesses();
      strictEqual(processes.length, 2);
      strictEqual(processes[0]?.pid, 1);
      strictEqual(processes[1]?.pid, 2);
    }),
  );
});
