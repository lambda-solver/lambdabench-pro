import { Layer } from "effect";
import { DevTools } from "effect/unstable/devtools";
import { FetchHttpClient } from "effect/unstable/http";
import { Atom } from "effect/unstable/reactivity";

const ENABLE_DEVTOOLS = import.meta.env.VITE_ENABLE_DEVTOOLS === "true";

export const runtime = Atom.runtime(
  FetchHttpClient.layer.pipe(
    Layer.provideMerge(ENABLE_DEVTOOLS ? DevTools.layer() : Layer.empty),
  ),
);
