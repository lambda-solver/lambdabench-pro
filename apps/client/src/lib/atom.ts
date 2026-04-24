import { Layer } from "effect";
import { DevTools } from "effect/unstable/devtools";
import { Atom } from "effect/unstable/reactivity";
import { FetchHttpClient } from "effect/unstable/http";

const ENABLE_DEVTOOLS = import.meta.env.VITE_ENABLE_DEVTOOLS === "true";

export const runtime = Atom.runtime(
  FetchHttpClient.layer.pipe(
    Layer.provideMerge(ENABLE_DEVTOOLS ? DevTools.layer() : Layer.empty),
  ),
);
