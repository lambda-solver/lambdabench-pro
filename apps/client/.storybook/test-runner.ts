import type { TestRunnerConfig } from "@storybook/test-runner";

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
};

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    // Test at all three viewports after the default render check
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(100);

      // Check for horizontal overflow (layout break)
      const hasOverflow = await page.evaluate(() => {
        const root = document.querySelector("#storybook-root");
        if (!root) return false;
        return root.scrollWidth > root.clientWidth + 5;
      });

      if (hasOverflow) {
        console.warn(`⚠️ [${name}] ${context.id}: horizontal overflow detected at ${vp.width}px`);
      }

      // Check story renders without error
      const errorElement = await page.$("#storybook-root > :has(> storybook-error)");
      if (errorElement) {
        throw new Error(`[${name}] ${context.id}: story error at ${vp.width}px`);
      }
    }
  },
};

export default config;
