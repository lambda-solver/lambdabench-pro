/**
 * LamCodeExtractor.test.ts — Pure unit tests.
 */

import { describe, it } from "@effect/vitest"
import { assertInclude, strictEqual } from "@effect/vitest/utils"
import { Effect } from "effect"
import { extractLamCode } from "./LamCodeExtractor"

describe("extractLamCode", () => {
  it.effect("extracts content from ```lambda fence", () =>
    Effect.gen(function* () {
      const raw =
        "Here is your answer:\n```lambda\n@main = λf.λx.f(x)\n```\nDone."
      strictEqual(extractLamCode(raw), "@main = λf.λx.f(x)")
    }),
  )

  it.effect("extracts content from ```lam fence", () =>
    Effect.gen(function* () {
      const raw = "Solution:\n```lam\n@main = λa.λb.a(b)\n```"
      strictEqual(extractLamCode(raw), "@main = λa.λb.a(b)")
    }),
  )

  it.effect("fence extraction is case-insensitive", () =>
    Effect.gen(function* () {
      const raw = "```LAM\n@main = λf.x\n```"
      strictEqual(extractLamCode(raw), "@main = λf.x")
    }),
  )

  it.effect("extracts bare @main = line from prose", () =>
    Effect.gen(function* () {
      const raw = "The answer is:\n\n@main = λf.λx.f(f(x))\n\nThat's it."
      strictEqual(extractLamCode(raw), "@main = λf.λx.f(f(x))")
    }),
  )

  it.effect("includes helper @defs before @main", () =>
    Effect.gen(function* () {
      const raw =
        "Here:\n@add = λa.λb.λf.λx.a(f)(b(f)(x))\n@main = @add\nDone."
      const result = extractLamCode(raw)
      assertInclude(result, "@add")
      assertInclude(result, "@main")
    }),
  )

  it.effect("returns trimmed raw when no fence and no @main line", () =>
    Effect.gen(function* () {
      const raw = "  I don't know how to solve this.  "
      strictEqual(extractLamCode(raw), "I don't know how to solve this.")
    }),
  )

  it.effect("ignores ```python fences (not lambda/lam)", () =>
    Effect.gen(function* () {
      const raw = "```python\nprint('hello')\n```\n@main = λf.λx.x"
      assertInclude(extractLamCode(raw), "@main")
    }),
  )
})
