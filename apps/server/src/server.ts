import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { ServerLive } from "./localServer.js";

ServerLive.pipe(Layer.launch, BunRuntime.runMain);
