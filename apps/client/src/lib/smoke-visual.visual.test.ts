/**
 * Minimal smoke test to verify vitest browser mode is functional.
 */
import { describe, it, expect } from "vitest";

describe("vitest browser mode smoke", () => {
  it("1 + 1 = 2", () => {
    expect(1 + 1).toBe(2);
  });

  it("document is available", () => {
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();
  });
});
