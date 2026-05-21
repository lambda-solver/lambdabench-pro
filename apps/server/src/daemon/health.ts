// apps/server/src/daemon/health.ts
//
// Health checking service — polls background processes and auto-restarts failed ones.

import * as Registry from "./registry";

import { Context, Effect, Layer, Ref, Schedule } from "effect";

import type { ProcessEntry } from "./registry";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface HealthCheckConfig {
  readonly pid: number;
  readonly port: number;
  readonly intervalMs: number;
  readonly maxRestarts: number;
}

export interface HealthStatus {
  readonly pid: number;
  readonly healthy: boolean;
  readonly lastCheck: string | null;
  readonly consecutiveFailures: number;
  readonly restartCount: number;
}

// ─── Internal Error ────────────────────────────────────────────────────────────

class PollerStop {
  readonly _tag = "PollerStop" as const;
}

// ─── HealthChecker Service ─────────────────────────────────────────────────────
//
// Abstraction over health-checking and restarting so the poller can be tested
// without real HTTP calls or side-effects.

export class HealthChecker extends Context.Service<
  HealthChecker,
  {
    readonly check: (port: number) => Effect.Effect<boolean, never>;
    readonly restart: (pid: number) => Effect.Effect<void, never>;
  }
>()("daemon/health/HealthChecker") {
  static readonly live: Layer.Layer<HealthChecker> = Layer.succeed(
    HealthChecker,
    HealthChecker.of({
      check: (port) => checkHealthImpl(port),
      restart: (pid) => restartProcessImpl(pid),
    }),
  );
}

// ─── RegistryOps Service ──────────────────────────────────────────────────────
//
// Abstraction over registry read/write so the poller can be tested without
// touching the filesystem.

export class RegistryOps extends Context.Service<
  RegistryOps,
  {
    readonly updateHealth: (pid: number, healthy: boolean) => Effect.Effect<void>;
    readonly getProcess: (pid: number) => Effect.Effect<ProcessEntry | null>;
  }
>()("daemon/health/RegistryOps") {
  static readonly live: Layer.Layer<RegistryOps> = Layer.succeed(
    RegistryOps,
    RegistryOps.of({
      getProcess: (pid) =>
        Registry.getProcess(pid).pipe(
          Effect.catch((e) =>
            Effect.logWarning(`Registry getProcess failed for pid ${pid}: ${e.message}`).pipe(Effect.map(() => null)),
          ),
        ),
      updateHealth: (pid, healthy) =>
        Registry.updateHealth(pid, healthy).pipe(
          Effect.catch((e) =>
            Effect.logWarning(`Registry updateHealth failed for pid ${pid}: ${e.message}`).pipe(
              Effect.map(() => undefined),
            ),
          ),
        ),
    }),
  );
}

// ─── Internal Implementations ──────────────────────────────────────────────────

const checkHealthImpl = (port: number): Effect.Effect<boolean, never> =>
  Effect.tryPromise({
    catch: () => new Error("fetch failed"),
    try: () => fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(2000) }),
  }).pipe(
    Effect.timeout("2 seconds"),
    Effect.map(() => true as const),
    Effect.catch(() => Effect.succeed(false)),
  );

const restartProcessImpl = (pid: number): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    yield* Effect.logWarning(`restart not implemented for pid ${pid}`);
  });

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether a process is healthy by making an HTTP request to its port.
 * Returns `true` if the fetch succeeds (any status code), `false` on
 * connection error or 2-second timeout. Never fails.
 */
export const checkHealth = Effect.fn("health.checkHealth")(function* (port: number) {
  return yield* checkHealthImpl(port);
});

/**
 * Stub for restarting a process. Logs a warning — actual restart logic
 * will be implemented in the DaemonManager (task 6.4).
 */
export const restartProcess = Effect.fn("health.restartProcess")(function* (
  pid: number,
): Effect.fn.Return<void, never> {
  return yield* restartProcessImpl(pid);
});

/**
 * Create a health poller that periodically checks a process and
 * auto-restarts it after 3 consecutive failures.
 *
 * The poller runs indefinitely until:
 *   - the configured `maxRestarts` is exhausted (permanently failed), or
 *   - the fiber is externally interrupted.
 *
 * Requires `HealthChecker` and `RegistryOps` services.
 */
export const createHealthPoller = Effect.fn("health.createHealthPoller")(function* (config: HealthCheckConfig) {
  const checker = yield* HealthChecker;
  const registry = yield* RegistryOps;
  const state = yield* Ref.make({
    consecutiveFailures: 0,
    restartCount: 0,
  });

  const tick = Effect.fnUntraced(function* () {
    const healthy = yield* checker.check(config.port);
    yield* registry.updateHealth(config.pid, healthy);

    if (healthy) {
      yield* Ref.update(state, (s) => ({ ...s, consecutiveFailures: 0 }));
      return;
    }

    // ── Unhealthy ─────────────────────────────────────────────
    const { consecutiveFailures, restartCount } = yield* Ref.get(state);
    const newFailures = consecutiveFailures + 1;

    if (newFailures >= 3 && restartCount < config.maxRestarts) {
      yield* Effect.logWarning(`Restarting process ${config.pid} (attempt ${restartCount + 1}/${config.maxRestarts})`);
      yield* checker.restart(config.pid);
      yield* Ref.set(state, {
        consecutiveFailures: 0,
        restartCount: restartCount + 1,
      });
    } else if (newFailures >= 3 && restartCount >= config.maxRestarts) {
      yield* Effect.logError(`Process ${config.pid} permanently failed after ${restartCount} restarts`);
      return yield* Effect.fail(new PollerStop());
    } else {
      yield* Ref.update(state, (s) => ({
        ...s,
        consecutiveFailures: newFailures,
      }));
    }
  });

  return yield* tick().pipe(
    Effect.repeat(Schedule.spaced(config.intervalMs)),
    Effect.catchTag("PollerStop", () => Effect.void),
    Effect.interruptible,
  );
});
