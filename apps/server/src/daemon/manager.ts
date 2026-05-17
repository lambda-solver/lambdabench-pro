// apps/server/src/daemon/manager.ts
//
// DaemonManager — orchestrates background dev servers for client and server.
// Implements port conflict detection (FR-005) and warm start (FR-006).

import { Context, Effect, Layer, Ref } from "effect";
import { checkHealth } from "./health";
import {
  isProcessAlive,
  type ProcessConfig,
  ProcessError,
  type SpawnedProcess,
  spawnProcess,
  stopProcess,
  waitForPort,
} from "./process";
import {
  addProcess,
  getProcess,
  listProcesses,
  type ProcessEntry,
  type RegistryError,
  removeProcess,
} from "./registry";

// ─── Types ─────────────────────────────────────────────────────────────────

export type DaemonConfig = {
  readonly serverCommand: string[];
  readonly clientCommand: string[];
  readonly serverPort: number;
  readonly clientPort: number;
  readonly serverLogFile: string;
  readonly clientLogFile: string;
  readonly cwd: string;
};

export type DaemonStatus = {
  readonly running: boolean;
  readonly server: { pid: number | null; healthy: boolean; port: number };
  readonly client: { pid: number | null; healthy: boolean; port: number };
};

// ─── Default Config ────────────────────────────────────────────────────────

export const defaultConfig: DaemonConfig = {
  serverCommand: ["bun", "--watch", "run", "src/index.ts"],
  clientCommand: [
    "bun",
    "run",
    "vite",
    "--port",
    "3000",
    "--host",
    "--clearScreen",
    "false",
  ],
  serverPort: 9000,
  clientPort: 3000,
  serverLogFile: ".lambench-data/logs/server.log",
  clientLogFile: ".lambench-data/logs/client.log",
  cwd: process.cwd(),
};

// ─── Internal State ────────────────────────────────────────────────────────

type ManagerState = {
  readonly server: SpawnedProcess | null;
  readonly client: SpawnedProcess | null;
};

const initialState: ManagerState = { server: null, client: null };

// ─── ProcessManager Service ────────────────────────────────────────────────

export class ProcessManager extends Context.Service<
  ProcessManager,
  {
    readonly spawn: (
      config: ProcessConfig,
    ) => Effect.Effect<SpawnedProcess, ProcessError>;
    readonly stop: (
      spawned: SpawnedProcess,
    ) => Effect.Effect<void, ProcessError>;
    readonly isAlive: (pid: number) => Effect.Effect<boolean, never>;
    readonly waitForPort: (
      port: number,
      timeoutMs?: number,
    ) => Effect.Effect<void, ProcessError>;
    readonly checkHealth: (port: number) => Effect.Effect<boolean, never>;
    readonly tryConnect: (port: number) => Effect.Effect<boolean, never>;
  }
>()("daemon/ProcessManager") {
  static readonly live: Layer.Layer<ProcessManager> = Layer.succeed(
    ProcessManager,
    ProcessManager.of({
      spawn: (config) => spawnProcess(config),
      stop: (spawned) => stopProcess(spawned),
      isAlive: (pid) => isProcessAlive(pid),
      waitForPort: (port, timeoutMs) => waitForPort(port, timeoutMs),
      checkHealth: (port) => checkHealth(port),
      tryConnect: (port) =>
        Effect.tryPromise({
          try: () =>
            fetch(`http://127.0.0.1:${port}`, {
              signal: AbortSignal.timeout(500),
            })
              .then((r) => {
                r.text().catch(() => {});
                return true;
              })
              .catch(() => false),
          catch: () => false,
        }),
    }),
  );
}

// ─── RegistryService Service ───────────────────────────────────────────────
//
// Wraps registry operations so they can be mocked in tests.

export class RegistryService extends Context.Service<
  RegistryService,
  {
    readonly listProcesses: () => Effect.Effect<
      readonly ProcessEntry[],
      RegistryError
    >;
    readonly addProcess: (
      entry: ProcessEntry,
    ) => Effect.Effect<void, RegistryError>;
    readonly removeProcess: (pid: number) => Effect.Effect<void, RegistryError>;
    readonly getProcess: (
      pid: number,
    ) => Effect.Effect<ProcessEntry | null, RegistryError>;
  }
>()("daemon/RegistryService") {
  static readonly live: Layer.Layer<RegistryService> = Layer.succeed(
    RegistryService,
    RegistryService.of({
      listProcesses: () => listProcesses(),
      addProcess: (entry) => addProcess(entry),
      removeProcess: (pid) => removeProcess(pid),
      getProcess: (pid) => getProcess(pid),
    }),
  );
}

// ─── DaemonManager Service ─────────────────────────────────────────────────

export class DaemonManager extends Context.Service<
  DaemonManager,
  {
    start(): Effect.Effect<DaemonStatus, ProcessError>;
    stop(): Effect.Effect<DaemonStatus, ProcessError>;
    restart(): Effect.Effect<DaemonStatus, ProcessError>;
    status(): Effect.Effect<DaemonStatus, never>;
  }
>()("app/DaemonManager") {}

// ─── Live Layer ────────────────────────────────────────────────────────────

/**
 * Helper: convert a `RegistryError` (from registry operations) into a
 * `ProcessError` so the public API keeps a single error type.
 */
const convertRegistryError = <A>(
  effect: Effect.Effect<A, RegistryError>,
): Effect.Effect<A, ProcessError> =>
  effect.pipe(
    Effect.catch((e) =>
      Effect.fail(new ProcessError(`Registry error: ${e.message}`)),
    ),
  );

const entryToSpawnedProcess = (entry: ProcessEntry): SpawnedProcess => ({
  pid: entry.pid,
  proc: {} as never,
  config: {
    command: entry.command.split(" "),
    cwd: entry.cwd,
    port: entry.port,
    logFile: "",
  },
  startTime: entry.startTime,
});

// ─── Layer Factory ─────────────────────────────────────────────────────────

/**
 * Raw `DaemonManager` layer requiring `ProcessManager` and `RegistryService`.
 *
 * Composing with real vs mock sub-services:
 *
 * **Production:**
 * ```ts
 * const layer = DaemonManagerLive.pipe(
 *   Layer.provide(ProcessManager.live),
 *   Layer.provide(RegistryService.live),
 * );
 * ```
 *
 * **Tests:**
 * ```ts
 * const layer = DaemonManagerLive.pipe(
 *   Layer.provide(mockProcessManager),
 *   Layer.provide(mockRegistry),
 * );
 * ```
 */
export const DaemonManagerLive: Layer.Layer<
  DaemonManager,
  ProcessError,
  ProcessManager | RegistryService
> = Layer.effect(
  DaemonManager,
  Effect.gen(function* () {
    const config = defaultConfig;
    const stateRef = yield* Ref.make<ManagerState>(initialState);
    const pm = yield* ProcessManager;
    const rs = yield* RegistryService;

    // ── helpers (use service instances so they are mockable) ────────────

    const buildStatus = Effect.fnUntraced(function* (
      state: ManagerState,
      cfg: DaemonConfig,
    ): Effect.Effect<DaemonStatus, never> {
      const serverAlive =
        state.server !== null ? yield* pm.isAlive(state.server.pid) : false;
      const clientAlive =
        state.client !== null ? yield* pm.isAlive(state.client.pid) : false;

      const [serverHealthy, clientHealthy] = yield* Effect.all(
        [
          serverAlive && state.server !== null
            ? pm.checkHealth(state.server.config.port)
            : Effect.succeed(false),
          clientAlive && state.client !== null
            ? pm.checkHealth(state.client.config.port)
            : Effect.succeed(false),
        ],
        { concurrency: 2 },
      );

      return {
        running: serverAlive || clientAlive,
        server: {
          pid: state.server?.pid ?? null,
          healthy: serverAlive && serverHealthy,
          port: state.server?.config.port ?? cfg.serverPort,
        },
        client: {
          pid: state.client?.pid ?? null,
          healthy: clientAlive && clientHealthy,
          port: state.client?.config.port ?? cfg.clientPort,
        },
      };
    });

    const resolvePort = Effect.fn("DaemonManager.resolvePort")(function* (
      port: number,
    ): Effect.Effect<SpawnedProcess | null, ProcessError> {
      const processes = yield* convertRegistryError(rs.listProcesses());
      const entry = [...processes].find((p) => p.port === port);

      // ── Case 1 & 3: known entry ──────────────────────────────────────
      if (entry !== undefined) {
        const alive = yield* pm.isAlive(entry.pid);
        if (alive) {
          yield* Effect.log(
            `Warm start — reusing process on port ${port} (pid ${entry.pid})`,
          );
          return entryToSpawnedProcess(entry);
        }

        // Process died — clean up registry entry, skip conflict check
        yield* convertRegistryError(rs.removeProcess(entry.pid));
        yield* Effect.log(
          `Removed dead registry entry for port ${port} (pid ${entry.pid})`,
        );
        return null;
      }

      // ── Case 4: unknown entry — check for port conflict ──────────────
      const occupied = yield* pm.tryConnect(port);
      if (occupied) {
        return yield* Effect.fail(
          new ProcessError(
            `Port ${port} is in use by a different process — not in daemon registry`,
          ),
        );
      }

      // ── Case 5: port is free, caller should spawn ────────────────────
      return null;
    });

    // ── start ──────────────────────────────────────────────────────────

    const start = Effect.fn("DaemonManager.start")(function* () {
      // 1. Check in-memory state for already-running processes
      let state = yield* Ref.get(stateRef);

      if (state.server !== null && state.client !== null) {
        const serverAlive = yield* pm.isAlive(state.server.pid);
        const clientAlive = yield* pm.isAlive(state.client.pid);

        if (serverAlive && clientAlive) {
          yield* Effect.log(
            "DaemonManager: warm start — both processes already running",
          );
          return yield* buildStatus(state, config);
        }

        // Clean up stale in-memory references
        if (!serverAlive) {
          yield* convertRegistryError(rs.removeProcess(state.server.pid));
        }
        if (!clientAlive) {
          yield* convertRegistryError(rs.removeProcess(state.client.pid));
        }
        state = { server: null, client: null };
        yield* Ref.set(stateRef, state);
      }

      // 2. Resolve each port (warm start + conflict detection)
      const serverResolved = yield* resolvePort(config.serverPort);
      const clientResolved = yield* resolvePort(config.clientPort);

      // 3. Spawn processes that aren't running yet
      const serverFinal: SpawnedProcess =
        serverResolved ??
        (yield* pm.spawn({
          command: config.serverCommand,
          cwd: config.cwd,
          port: config.serverPort,
          logFile: config.serverLogFile,
        }));

      const clientFinal: SpawnedProcess =
        clientResolved ??
        (yield* pm.spawn({
          command: config.clientCommand,
          cwd: config.cwd,
          port: config.clientPort,
          logFile: config.clientLogFile,
        }));

      // 4. Wait for both to be ready
      yield* pm.waitForPort(config.serverPort);
      yield* pm.waitForPort(config.clientPort);

      // 5. Persist new state
      const newState: ManagerState = {
        server: serverFinal,
        client: clientFinal,
      };
      yield* Ref.set(stateRef, newState);

      return yield* buildStatus(newState, config);
    });

    // ── stop ───────────────────────────────────────────────────────────

    const stop = Effect.fn("DaemonManager.stop")(function* () {
      const state = yield* Ref.get(stateRef);

      if (state.client !== null) {
        yield* pm.stop(state.client);
      }
      if (state.server !== null) {
        yield* pm.stop(state.server);
      }

      yield* Ref.set(stateRef, { server: null, client: null });

      return yield* buildStatus({ server: null, client: null }, config);
    });

    // ── restart ────────────────────────────────────────────────────────

    const restart = Effect.fn("DaemonManager.restart")(function* () {
      yield* stop();
      return yield* start();
    });

    // ── status ─────────────────────────────────────────────────────────

    const status = Effect.fn("DaemonManager.status")(function* () {
      const state = yield* Ref.get(stateRef);
      return yield* buildStatus(state, config);
    });

    return DaemonManager.of({ start, stop, restart, status });
  }),
);

/**
 * Pre-composed production layer that wires `DaemonManager` with the real
 * `ProcessManager` and `RegistryService` implementations.
 */
export const DaemonManagerLayer: Layer.Layer<DaemonManager, ProcessError> =
  DaemonManagerLive.pipe(
    Layer.provide(ProcessManager.live),
    Layer.provide(RegistryService.live),
  );
