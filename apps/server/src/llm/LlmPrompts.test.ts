/**
 * LlmPrompts.test.ts — Pure unit tests, no Effect runtime needed.
 */

import { describe, it } from "@effect/vitest"
import { assertInclude, strictEqual } from "@effect/vitest/utils"
import { Effect } from "effect"
import {
  buildRetryPrompt,
  buildSolvePrompt,
  buildTaskDetectionProbe,
} from "./LlmPrompts"
import type { Task } from "../check/Check"

// ─── Fixture ─────────────────────────────────────────────────────────────────

const task: Task = {
  id: "cnat_add",
  desc: "Add two Church nats. Return A + B.",
  tests: [
    { expr: "@main(λf.λx.x, λf.λx.x)", want: "λa.λb.b" },
    { expr: "@main(λf.λx.f(x), λf.λx.f(x))", want: "λa.λb.a(a(b))" },
  ],
}

// ─── buildSolvePrompt ─────────────────────────────────────────────────────────

describe("buildSolvePrompt", () => {
  it.effect("includes task description", () =>
    Effect.gen(function* () {
      assertInclude(buildSolvePrompt(task), "Add two Church nats")
    }),
  )

  it.effect("includes all test expr strings", () =>
    Effect.gen(function* () {
      const prompt = buildSolvePrompt(task)
      assertInclude(prompt, "@main(λf.λx.x, λf.λx.x)")
      assertInclude(prompt, "@main(λf.λx.f(x), λf.λx.f(x))")
    }),
  )

  it.effect("includes all test want strings", () =>
    Effect.gen(function* () {
      const prompt = buildSolvePrompt(task)
      assertInclude(prompt, "λa.λb.b")
      assertInclude(prompt, "λa.λb.a(a(b))")
    }),
  )

  it.effect("instructs reply with @main =", () =>
    Effect.gen(function* () {
      assertInclude(buildSolvePrompt(task), "@main = ")
    }),
  )
})

// ─── buildRetryPrompt ─────────────────────────────────────────────────────────

describe("buildRetryPrompt", () => {
  it.effect("contains prior attempt", () =>
    Effect.gen(function* () {
      const prompt = buildRetryPrompt(task, "@main = λa.λb.a", [
        "error: wrong result",
      ])
      assertInclude(prompt, "@main = λa.λb.a")
    }),
  )

  it.effect("contains all error strings", () =>
    Effect.gen(function* () {
      const errors = ["error: got λa.λb.a got λa.λb.b", "error: timeout"]
      const prompt = buildRetryPrompt(task, "@main = λa.λb.a", errors)
      assertInclude(prompt, errors[0]!)
      assertInclude(prompt, errors[1]!)
    }),
  )

  it.effect("still includes task description", () =>
    Effect.gen(function* () {
      assertInclude(
        buildRetryPrompt(task, "@main = λa.λb.a", []),
        "Add two Church nats",
      )
    }),
  )
})

// ─── buildTaskDetectionProbe ──────────────────────────────────────────────────

describe("buildTaskDetectionProbe", () => {
  it.effect("contains all 7 numbered menu options", () =>
    Effect.gen(function* () {
      const probe = buildTaskDetectionProbe("Add two church nats", 120)
      for (const n of [1, 2, 3, 4, 5, 6, 7]) {
        assertInclude(probe, `${n}.`)
      }
    }),
  )

  it.effect("includes length=n in metadata", () =>
    Effect.gen(function* () {
      const probe = buildTaskDetectionProbe("hello", 42)
      assertInclude(probe, "length=42")
    }),
  )

  it.effect("includes preview in metadata", () =>
    Effect.gen(function* () {
      const probe = buildTaskDetectionProbe("Add two church nats", 99)
      assertInclude(probe, "Add two church nats")
    }),
  )
})
