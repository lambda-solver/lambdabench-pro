/**
 * LambdaPlan.test.ts — Pure unit tests for the λ-RLM planning algorithm.
 */

import { describe, it } from "@effect/vitest"
import { strictEqual, assertTrue } from "@effect/vitest/utils"
import { Effect } from "effect"
import { ComposeOp, TaskType, plan } from "./LambdaPlan"

describe("plan — short input (lambda task, fits in window)", () => {
  it.effect("depth=0 kStar=1 for n << K", () =>
    Effect.gen(function* () {
      const result = plan(TaskType.GENERAL, 500, 100_000)
      strictEqual(result.depth, 0)
      strictEqual(result.kStar, 1)
      strictEqual(result.tauStar, 500)
    }),
  )

  it.effect("n=K boundary still returns depth=0", () =>
    Effect.gen(function* () {
      const result = plan(TaskType.GENERAL, 100_000, 100_000)
      strictEqual(result.depth, 0)
    }),
  )

  it.effect("composeOp and pipeline come from tables", () =>
    Effect.gen(function* () {
      const r = plan(TaskType.GENERAL, 500, 100_000)
      strictEqual(r.composeOp, ComposeOp.MERGE_SUMMARIES)
      strictEqual(r.pipeline.useFilter, false)

      const qa = plan(TaskType.QA, 500, 100_000)
      strictEqual(qa.composeOp, ComposeOp.SELECT_RELEVANT)
      strictEqual(qa.pipeline.useFilter, true)
    }),
  )

  it.effect("cost estimate is positive", () =>
    Effect.gen(function* () {
      const r = plan(TaskType.GENERAL, 500, 100_000)
      assertTrue(r.costEstimate > 0)
    }),
  )
})

describe("plan — large input (requires splitting)", () => {
  it.effect("depth>=1 kStar>=2 for n > K", () =>
    Effect.gen(function* () {
      const result = plan(TaskType.GENERAL, 200_000, 100_000)
      assertTrue(result.depth >= 1)
      assertTrue(result.kStar >= 2)
    }),
  )

  it.effect("near-free composition (CONCATENATE) produces flat fan-out", () =>
    Effect.gen(function* () {
      const concat = plan(TaskType.TRANSLATION, 400_000, 100_000)
      assertTrue(concat.kStar >= 2)
    }),
  )

  it.effect(
    "near-free composition produces smaller kStar than expensive ⊕",
    () =>
      Effect.gen(function* () {
        const merge = plan(TaskType.SUMMARIZATION, 400, 100)
        const concat = plan(TaskType.TRANSLATION, 400, 100)
        assertTrue(concat.kStar < merge.kStar)
      }),
  )

  it.effect(
    "accuracy constraint bumps kStar when aLeaf/aCompose are low",
    () =>
      Effect.gen(function* () {
        const unconstrained = plan(
          TaskType.GENERAL,
          500_000,
          100_000,
          0.8,
          0.95,
          0.9,
        )
        const constrained = plan(
          TaskType.GENERAL,
          500_000,
          100_000,
          0.8,
          0.5,
          0.5,
        )
        assertTrue(constrained.kStar >= unconstrained.kStar)
      }),
  )

  it.effect("tauStar = min(K, floor(n/kStar))", () =>
    Effect.gen(function* () {
      const r = plan(TaskType.GENERAL, 200_000, 100_000)
      const expected = Math.min(100_000, Math.floor(200_000 / r.kStar))
      strictEqual(r.tauStar, expected)
    }),
  )

  it.effect("n is stored on plan", () =>
    Effect.gen(function* () {
      const r = plan(TaskType.GENERAL, 200_000, 100_000)
      strictEqual(r.n, 200_000)
    }),
  )
})
