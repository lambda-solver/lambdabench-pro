import { Layer, ManagedRuntime } from "effect";
import { BatchServiceLive } from "./services/BatchService.js";
import { EvalServiceLive } from "./services/EvalService.js";
import { config } from "./services/LamConfig.js";
import { ResultStoreLive } from "./services/ResultStore.js";
import { TaskServiceLive } from "./services/TaskService.js";

const validateDbPath = (dbPath: string) => {
  if (dbPath.trim().length === 0) {
    throw new Error(`dbPath must be a non-empty string, got: '${dbPath}'`);
  }
};

export const ServicesLive = BatchServiceLive.pipe(
  Layer.provideMerge(EvalServiceLive),
  Layer.provideMerge(TaskServiceLive),
  Layer.provideMerge(ResultStoreLive(config.dbPath)),
);

export const serverRuntime = ManagedRuntime.make(ServicesLive);

export const makeServicesLayer = (dbPath: string) => {
  validateDbPath(dbPath);
  return BatchServiceLive.pipe(
    Layer.provideMerge(EvalServiceLive),
    Layer.provideMerge(TaskServiceLive),
    Layer.provideMerge(ResultStoreLive(dbPath)),
  );
};

export const makeRuntime = (dbPath: string) => {
  validateDbPath(dbPath);
  return ManagedRuntime.make(makeServicesLayer(dbPath));
};
