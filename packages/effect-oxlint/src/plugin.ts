import { Plugin } from "effect-oxlint";
import {
  noAsyncAwaitInEffectGen,
  noCatchAll,
  noEffectIterate,
  noForLoopsInEffectGen,
  noLetInEffectGen,
  noPipeAfterEffectFn,
  noPlatformImportsInDomain,
  noTryCatchInEffectGen,
  noVitestExpectForEffect,
  preferContextService,
  preferEffectFn,
  preferEffectVitest,
  preferTaggedErrorClass,
} from "./rules/index.js";

export const repoEffectPlugin = Plugin.define({
  name: "@repo/effect-oxlint",
  rules: {
    "prefer-effect-fn": preferEffectFn,
    "no-let-in-effect-gen": noLetInEffectGen,
    "no-try-catch-in-effect-gen": noTryCatchInEffectGen,
    "no-async-await-in-effect-gen": noAsyncAwaitInEffectGen,
    "no-pipe-after-effect-fn": noPipeAfterEffectFn,
    "no-catchall": noCatchAll,
    "no-effect-iterate": noEffectIterate,
    "prefer-context-service": preferContextService,
    "no-for-loops-in-effect-gen": noForLoopsInEffectGen,
    "prefer-tagged-error-class": preferTaggedErrorClass,
    "no-platform-imports-in-domain": noPlatformImportsInDomain,
    "prefer-effect-vitest": preferEffectVitest,
    "no-vitest-expect-for-effect": noVitestExpectForEffect,
  },
});

export default repoEffectPlugin;
