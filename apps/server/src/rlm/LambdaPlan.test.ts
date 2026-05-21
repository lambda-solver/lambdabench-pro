/**
 * LambdaPlan.test.ts — Pure unit tests for the λ-RLM planning algorithm.
 */

import { ComposeOp, TaskType, plan } from "./LambdaPlan";
import { describe, expect, it } from "vitest";

describe("plan — short input (lambda task, fits in window)", () => {
  it("depth=0 kStar=1 for n << K", () => {
    const result = plan(TaskType.GENERAL, 500, 100_000);
    expect(result.depth).toBe(0);
    expect(result.kStar).toBe(1);
    expect(result.tauStar).toBe(500);
  });

  it("n=K boundary still returns depth=0", () => {
    const result = plan(TaskType.GENERAL, 100_000, 100_000);
    expect(result.depth).toBe(0);
  });

  it("composeOp and pipeline come from tables", () => {
    const r = plan(TaskType.GENERAL, 500, 100_000);
    expect(r.composeOp).toBe(ComposeOp.MERGE_SUMMARIES);
    expect(r.pipeline.useFilter).toBe(false);

    const qa = plan(TaskType.QA, 500, 100_000);
    expect(qa.composeOp).toBe(ComposeOp.SELECT_RELEVANT);
    expect(qa.pipeline.useFilter).toBe(true);
  });

  it("cost estimate is positive", () => {
    const r = plan(TaskType.GENERAL, 500, 100_000);
    expect(r.costEstimate).toBeGreaterThan(0);
  });
});

describe("plan — large input (requires splitting)", () => {
  it("depth>=1 kStar>=2 for n > K", () => {
    const result = plan(TaskType.GENERAL, 200_000, 100_000);
    expect(result.depth).toBeGreaterThanOrEqual(1);
    expect(result.kStar).toBeGreaterThanOrEqual(2);
  });

  it("near-free composition (CONCATENATE) produces flat fan-out", () => {
    const concat = plan(TaskType.TRANSLATION, 400_000, 100_000);
    expect(concat.kStar).toBeGreaterThanOrEqual(2);
  });

  it("near-free composition produces smaller kStar than expensive ⊕", () => {
    const merge = plan(TaskType.SUMMARIZATION, 400, 100);
    const concat = plan(TaskType.TRANSLATION, 400, 100);
    expect(concat.kStar).toBeLessThan(merge.kStar);
  });

  it("accuracy constraint bumps kStar when aLeaf/aCompose are low", () => {
    const unconstrained = plan(TaskType.GENERAL, 500_000, 100_000, 0.8, 0.95, 0.9);
    const constrained = plan(TaskType.GENERAL, 500_000, 100_000, 0.8, 0.5, 0.5);
    expect(constrained.kStar).toBeGreaterThanOrEqual(unconstrained.kStar);
  });

  it("tauStar = min(K, floor(n/kStar))", () => {
    const r = plan(TaskType.GENERAL, 200_000, 100_000);
    const expected = Math.min(100_000, Math.floor(200_000 / r.kStar));
    expect(r.tauStar).toBe(expected);
  });

  it("n is stored on plan", () => {
    const r = plan(TaskType.GENERAL, 200_000, 100_000);
    expect(r.n).toBe(200_000);
  });
});
