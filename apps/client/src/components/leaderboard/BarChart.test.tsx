import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { BarChart } from "./BarChart";

/**
 * Finds the filled bar span (the one with a color class).
 * The BarChart renders two spans: filled (colored) + empty (base1).
 */
async function getFilledSpan(container: HTMLElement) {
  const spans = container.querySelectorAll("span span");
  return spans[0] as HTMLElement | undefined;
}

describe("BarChart color thresholds", () => {
  test("pct >= 70 uses green class", async () => {
    const { container } = await render(<BarChart pct={70} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("sol-green");
  });

  test("pct >= 45 and < 70 uses blue class", async () => {
    const { container } = await render(<BarChart pct={45} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("sol-blue");
  });

  test("pct >= 20 and < 45 uses yellow class", async () => {
    const { container } = await render(<BarChart pct={20} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("sol-yellow");
  });

  test("pct < 20 uses red class", async () => {
    const { container } = await render(<BarChart pct={19} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("sol-red");
  });

  test("pct = 0 uses red class and all empty", async () => {
    const { container } = await render(<BarChart pct={0} width={10} />);
    const filled = await getFilledSpan(container);
    expect(filled?.className).toContain("sol-red");
    expect(filled?.textContent).toBe(""); // 0 filled blocks
  });

  test("pct = 100 fills entire bar", async () => {
    const { container } = await render(<BarChart pct={100} width={10} />);
    const filled = await getFilledSpan(container);
    expect(filled?.textContent).toBe("█".repeat(10));
  });

  test("respects custom width", async () => {
    const { container } = await render(<BarChart pct={50} width={20} />);
    const spans = container.querySelectorAll("span span");
    const filled = spans[0]?.textContent ?? "";
    const empty  = spans[1]?.textContent ?? "";
    expect(filled.length + empty.length).toBe(20);
  });
});
