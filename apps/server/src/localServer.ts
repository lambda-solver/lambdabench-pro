import { BunServices } from "@effect/platform-bun";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { Layer } from "effect";
import * as HttpMiddleware from "effect/unstable/http/HttpMiddleware";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpStaticServer from "effect/unstable/http/HttpStaticServer";
import path from "node:path";
import { ApiLayer } from "./httpApi.js";
import { makeServicesLayer } from "./runtime.js";
import { config } from "./services/LamConfig.js";

// ---------------------------------------------------------------------------
// Static SPA layer
// ---------------------------------------------------------------------------

const CLIENT_DIST_DIR = path.resolve(import.meta.dir, "../../client/dist");

const StaticLayer = HttpStaticServer.layer({
  root: CLIENT_DIST_DIR,
  spa: true,
});

// ---------------------------------------------------------------------------
// Services layer
// ---------------------------------------------------------------------------

const ServicesLive = makeServicesLayer(config.dbPath);

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

export const ServerLive = HttpRouter.serve(
  Layer.mergeAll(ApiLayer, StaticLayer),
  { middleware: HttpMiddleware.tracer },
).pipe(
  Layer.provide(ServicesLive),
  Layer.provide(BunServices.layer),
  Layer.provide(
    BunHttpServer.layer({
      hostname: "127.0.0.1",
      port: config.port,
    }),
  ),
);
