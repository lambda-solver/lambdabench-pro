/**
 * vitest-workspace-config.test.ts — Programmatic verification of vitest
 * workspace configuration. Ensures the two-config approach correctly
 * separates unit (no browser) and visual (browser mode) tests.
 */
import { describe, expect, test } from "bun:test";
import unitConfig from "../../vitest.config";
import visualConfig from "../../vitest.visual.config";

describe("vitest config separation", () => {
  describe("unit config (vitest.config.ts)", () => {
    test("is a single config object (not an array)", () => {
      expect(Array.isArray(unitConfig)).toBe(false);
      expect(typeof unitConfig).toBe("object");
    });

    test("has resolve alias for '@'", () => {
      const resolve = unitConfig.resolve as Record<string, unknown>;
      const alias = resolve.alias as Record<string, string>;
      expect(alias["@"]).toBeDefined();
      expect(typeof alias["@"]).toBe("string");
    });

    test("excludes visual test files", () => {
      const exclude = unitConfig.test?.exclude as string[];
      expect(exclude).toContain("**/*.visual.test.*");
    });

    test("has NO browser config (browser mode is disabled)", () => {
      const hasBrowser = "browser" in (unitConfig.test as Record<string, unknown>);
      expect(hasBrowser).toBe(false);
    });
  });

  describe("visual config (vitest.visual.config.ts)", () => {
    test("is a single config object (not an array)", () => {
      expect(Array.isArray(visualConfig)).toBe(false);
      expect(typeof visualConfig).toBe("object");
    });

    test("includes only visual test globs", () => {
      const include = visualConfig.test?.include as string[];
      expect(include).toContain("src/**/*.visual.test.{ts,tsx}");
      expect(include.length).toBe(1);
    });

    test("has resolve alias for '@'", () => {
      const resolve = visualConfig.resolve as Record<string, unknown>;
      const alias = resolve.alias as Record<string, string>;
      expect(alias["@"]).toBeDefined();
    });

    test("has browser mode ENABLED", () => {
      const browser = visualConfig.test?.browser as Record<string, unknown>;
      expect(browser).toBeDefined();
      expect(browser.enabled).toBe(true);
    });

    test("browser is configured headless", () => {
      const browser = visualConfig.test?.browser as Record<string, unknown>;
      expect(browser.headless).toBe(true);
    });

    test("has a Playwright provider", () => {
      const browser = visualConfig.test?.browser as Record<string, unknown>;
      expect(browser.provider).toBeDefined();
    });

    test("has chromium browser instance configured", () => {
      const browser = visualConfig.test?.browser as Record<string, unknown>;
      const instances = browser.instances as Array<Record<string, unknown>>;
      expect(instances).toBeDefined();
      expect(instances.length).toBeGreaterThanOrEqual(1);
      expect(instances[0]?.browser).toBe("chromium");
      expect(instances[0]?.name).toBe("chromium");
    });

    test("chromium viewport is set to 1280x720", () => {
      const browser = visualConfig.test?.browser as Record<string, unknown>;
      const instances = browser.instances as Array<Record<string, unknown>>;
      const viewport = instances[0]?.viewport as Record<string, number>;
      expect(viewport.width).toBe(1280);
      expect(viewport.height).toBe(720);
    });
  });

  describe("project separation", () => {
    test("unit config excludes visual tests", () => {
      const exclude = unitConfig.test?.exclude as string[];
      expect(exclude).toContain("**/*.visual.test.*");
    });

    test("visual config includes ONLY visual test globs", () => {
      const include = visualConfig.test?.include as string[];
      const hasRegularTestGlob = include.some(
        (g: string) => g.includes("*.test.") && !g.includes("visual")
      );
      expect(hasRegularTestGlob).toBe(false);
    });

    test("no overlap between configs", () => {
      const unitExcludes = unitConfig.test?.exclude as string[];
      const visualIncludes = visualConfig.test?.include as string[];
      // Visual test globs should be excluded by unit config
      const visualGlob = visualIncludes[0];
      expect(unitExcludes.some((e: string) => visualGlob.includes(e.replace("**/*.", "").replace(".*", ""))))
        .toBe(true);
    });
  });
});
