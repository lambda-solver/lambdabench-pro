import { Effect } from "effect";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// ─── Constants ───────────────────────────────────────────────────────────────

export const REGISTRY_PATH = ".lambench-data/daemon-registry.json";
const TEMP_PATH = ".lambench-data/daemon-registry.json.tmp";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcessEntry {
  readonly pid: number;
  readonly command: string;
  readonly cwd: string;
  readonly port: number;
  readonly startTime: string;
  readonly lastHealthCheck: string | null;
  readonly healthy: boolean;
}

export interface RegistryData {
  readonly version: number;
  readonly processes: Array<ProcessEntry>;
  readonly updatedAt: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class RegistryError extends Error {
  readonly _tag = "RegistryError" as const;
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyRegistry = (): RegistryData => ({
  processes: [],
  updatedAt: new Date().toISOString(),
  version: 1,
});

const ensureDir = Effect.fnUntraced(function*() {
  const dir = dirname(REGISTRY_PATH);
  yield* Effect.tryPromise({
    catch: (e) =>
      new RegistryError(
        `Failed to create registry directory: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () => mkdir(dir, { recursive: true }),
  });
});

// ─── Public API ──────────────────────────────────────────────────────────────

export const readRegistry = Effect.fn("registry.readRegistry")(function*() {
  const content: string | null = yield* Effect.tryPromise({
    catch: (e) =>
      new RegistryError(
        `Failed to read registry: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: async () => {
      try {
        return await readFile(REGISTRY_PATH, "utf-8");
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === "ENOENT") return null;
        throw e;
      }
    },
  });

  if (content === null) {
    return emptyRegistry();
  }

  const data = yield* Effect.try({
    catch: (e) =>
      new RegistryError(
        `Corrupt registry file: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () => JSON.parse(content) as RegistryData,
  }).pipe(
    Effect.catchTag("RegistryError", (e) =>
      Effect.gen(function*() {
        yield* Effect.log(e.message);
        return emptyRegistry();
      })),
  );

  return data;
});

export const writeRegistry = Effect.fn("registry.writeRegistry")(function*(
  data: RegistryData,
) {
  yield* ensureDir();

  const json = `${JSON.stringify(data, null, 2)}\n`;
  yield* Effect.tryPromise({
    catch: (e) =>
      new RegistryError(
        `Failed to write registry temp file: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () => writeFile(TEMP_PATH, json, "utf-8"),
  });

  yield* Effect.tryPromise({
    catch: (e) =>
      new RegistryError(
        `Failed to rename registry file: ${e instanceof Error ? e.message : String(e)}`,
      ),
    try: () => rename(TEMP_PATH, REGISTRY_PATH),
  });
});

export const addProcess = Effect.fn("registry.addProcess")(function*(
  entry: ProcessEntry,
) {
  const data = yield* readRegistry();
  const updated: RegistryData = {
    ...data,
    processes: [...data.processes, entry],
    updatedAt: new Date().toISOString(),
  };
  yield* writeRegistry(updated);
});

export const removeProcess = Effect.fn("registry.removeProcess")(function*(
  pid: number,
) {
  const data = yield* readRegistry();
  const updated: RegistryData = {
    ...data,
    processes: data.processes.filter((p) => p.pid !== pid),
    updatedAt: new Date().toISOString(),
  };
  yield* writeRegistry(updated);
});

export const getProcess = Effect.fn("registry.getProcess")(function*(
  pid: number,
) {
  const data = yield* readRegistry();
  const entry = data.processes.find((p) => p.pid === pid);
  return entry ?? null;
});

export const listProcesses = Effect.fn("registry.listProcesses")(function*() {
  const data = yield* readRegistry();
  return data.processes;
});

export const updateHealth = Effect.fn("registry.updateHealth")(function*(
  pid: number,
  healthy: boolean,
) {
  const data = yield* readRegistry();
  const now = new Date().toISOString();
  const updated: RegistryData = {
    ...data,
    processes: data.processes.map((p) => p.pid === pid ? { ...p, healthy, lastHealthCheck: now } : p),
    updatedAt: now,
  };
  yield* writeRegistry(updated);
});
