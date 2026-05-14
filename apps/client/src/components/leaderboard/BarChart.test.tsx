import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { BarChart } from "./BarChart";

/**
 * Finds the filled bar span (the one with a color class).
 * The BarChart renders two spans: filled (colored) + empty (base1).
 */
async function getFilledSpan(container: HTMLElement) {
  // The BarChart renders: <span class="color"> <span>filled</span> <span>empty</span> </span>
  // spans[0] = outer span with color class
  // spans[1] = inner filled span
  // spans[2] = inner empty span
  const spans = container.querySelectorAll("span");
  return spans[0] as HTMLElement | undefined;
}

async function getInnerSpans(container: HTMLElement) {
  const spans = container.querySelectorAll("span");
  return {
    filled: spans[1] as HTMLElement | undefined,
    empty: spans[2] as HTMLElement | undefined,
  };
}

describe("BarChart color thresholds", () => {
  test("pct >= 70 uses green class", async () => {
    const { container } = await render(<BarChart pct={70} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("text-[var(--sol-green)]");
  });

  test("pct >= 45 and < 70 uses blue class", async () => {
    const { container } = await render(<BarChart pct={45} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("text-[var(--sol-blue)]");
  });

  test("pct >= 20 and < 45 uses yellow class", async () => {
    const { container } = await render(<BarChart pct={20} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("text-[var(--sol-yellow)]");
  });

  test("pct < 20 uses red class", async () => {
    const { container } = await render(<BarChart pct={19} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("text-[var(--sol-red)]");
  });

  test("pct = 0 uses red class and all empty", async () => {
    const { container } = await render(<BarChart pct={0} width={10} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("text-[var(--sol-red)]");
    const { filled: innerFilled } = await getInnerSpans(container);
    expect(innerFilled?.textContent).toBe(""); // 0 filled blocks
  });

  test("pct = 100 fills entire bar", async () => {
    const { container } = await render(<BarChart pct={100} width={10} />);
    const filled = await getFilledSpan(container);
    expect(filled?.textContent).toBe("█".repeat(10));
  });

  test("respects custom width", async () => {
    const { container } = await render(<BarChart pct={50} width={20} />);
    const { filled, empty } = await getInnerSpans(container);
    const filledText = filled?.textContent ?? "";
    const emptyText = empty?.textContent ?? "";
    expect(filledText.length + emptyText.length).toBe(20);
  });
});
