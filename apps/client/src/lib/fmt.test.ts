/**
 * fmt.test.ts — Unit tests for fmtModel display utility.
 */

import { describe, expect, test } from "vitest";
import { fmtModel } from "./fmt";

describe("fmtModel", () => {
  test("strips openrouter/ prefix", () => {
    expect(fmtModel("openrouter/google/gemini-2.5-pro")).toBe(
      "google/gemini-2.5-pro",
    );
  });

  test("appends [rlm] when id ends with /rlm", () => {
    expect(fmtModel("minimax/minimax-m2.5:free/rlm")).toBe(
      "minimax/minimax-m2.5:free [rlm]",
    );
  });

  test("strips openrouter/ prefix AND appends [rlm]", () => {
    expect(
      fmtModel("openrouter/minimax/minimax-m2.5:free/rlm"),
    ).toBe("minimax/minimax-m2.5:free [rlm]");
  });

  test("no openrouter/ prefix — returned as-is", () => {
    expect(fmtModel("google/gemini-2.5-pro")).toBe("google/gemini-2.5-pro");
  });

  test("no /rlm suffix — no [rlm] appended", () => {
    expect(fmtModel("openrouter/google/gemini-2.5-pro")).not.toContain(
      "[rlm]",
    );
  });

  test("openrouter/minimax/minimax-m2.5:free stays without [rlm]", () => {
    expect(fmtModel("openrouter/minimax/minimax-m2.5:free")).toBe(
      "minimax/minimax-m2.5:free",
    );
  });
});
