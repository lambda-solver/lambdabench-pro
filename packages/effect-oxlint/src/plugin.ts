import {
  noAsyncAwaitInEffectGen,
  noCatchAll,
  noEffectIterate,
  noForLoopsInEffectGen,
  noLetInEffectGen,
  noLinterDisableComments,
  noPipeAfterEffectFn,
  noPlatformImportsInDomain,
  noServiceBind,
  noStringCatchTag,
  noTryCatchInEffectGen,
  noUnyieldedPromiseInEffectGen,
  noVitestExpectForEffect,
  preferContextService,
  preferEffectVitest,
} from "./rules/index.js";

import { Plugin } from "effect-oxlint";

export const repoEffectPlugin = Plugin.define({
  name: "@repo/effect-oxlint",
  rules: {
    "no-async-await-in-effect-gen": noAsyncAwaitInEffectGen,
    "no-catchall": noCatchAll,
    "no-effect-iterate": noEffectIterate,
    "no-for-loops-in-effect-gen": noForLoopsInEffectGen,
    "no-let-in-effect-gen": noLetInEffectGen,
    "no-linter-disable-comments": noLinterDisableComments,
    "no-pipe-after-effect-fn": noPipeAfterEffectFn,
    "no-platform-imports-in-domain": noPlatformImportsInDomain,
    "no-service-bind": noServiceBind,
    "no-string-catchtag": noStringCatchTag,
    "no-try-catch-in-effect-gen": noTryCatchInEffectGen,
    "no-unyielded-promise-in-effect-gen": noUnyieldedPromiseInEffectGen,
    "no-vitest-expect-for-effect": noVitestExpectForEffect,
    "prefer-context-service": preferContextService,
    "prefer-effect-vitest": preferEffectVitest,
  },
});

export default repoEffectPlugin;
