// apps/server/src/localServer.test.ts

import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform";
import { layer as nodeFileSystemLayer } from "@effect/platform-node-shared/NodeFileSystem";
import { layer as nodePathLayer } from "@effect/platform-node-shared/NodePath";
import { describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/unstable/http/HttpServer";
import { existsSync, unlinkSync } from "node:fs";
import type * as NodePath from "node:path";
import { afterEach, vi } from "vitest";

const testDbPath = "/tmp/lambench-localserver-test.sqlite";

vi.stubEnv("LAMBENCH_DB_PATH", testDbPath);
vi.stubEnv("LAMBENCH_PORT", "0");

vi.doMock("node:path", async (importOriginal) => {
  const original = await importOriginal<typeof NodePath>();
  return {
    ...original,
    default: {
      ...original,
      resolve: (...paths: Array<string | undefined>) => {
        const filtered = paths.filter((p): p is string => p !== undefined);
        return original.resolve(...filtered);
      },
    },
    resolve: (...paths: Array<string | undefined>) => {
      const filtered = paths.filter((p): p is string => p !== undefined);
      return original.resolve(...filtered);
    },
  };
});

vi.doMock("@effect/platform-bun", async () => ({
  BunServices: {
    layer: Layer.empty,
  },
}));

vi.doMock("@effect/platform-bun/BunHttpServer", async () => {
  const original = await import("@effect/platform-bun/BunHttpServer");
  return {
    ...original,
    layer: () =>
      Layer.succeed(HttpServer, {
        address: {
          _tag: "TcpAddress" as const,
          hostname: "127.0.0.1",
          port: 0,
        },
        serve: () => Effect.void,
      }),
  };
});

const cleanupDbFiles = () => {
  const paths = [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`];
  for (const p of paths) {
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
};

const { ServerLive } = await import("./localServer.js");

describe("localServer", () => {
  afterEach(() => {
    cleanupDbFiles();
  });

  it.effect("ServerLive is a valid Layer and can be built", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const layer = ServerLive.pipe(
          Layer.provide(nodeFileSystemLayer),
          Layer.provide(nodePathLayer),
          Layer.provideMerge(BunHttpPlatform.layer),
        );
        yield* Layer.build(layer);
      }),
    ));
});
