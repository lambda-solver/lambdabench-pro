import { beforeEach, describe, expect, test, vi } from "vitest";

describe("parsePositiveInt", () => {
  test("returns default when value is undefined", async () => {
    const { parsePositiveInt } = await import("./LamConfig");
    expect(parsePositiveInt(undefined, 42)).toBe(42);
  });

  test("returns default when value is empty", async () => {
    const { parsePositiveInt } = await import("./LamConfig");
    expect(parsePositiveInt("", 42)).toBe(42);
  });

  test("returns parsed positive integer", async () => {
    const { parsePositiveInt } = await import("./LamConfig");
    expect(parsePositiveInt("1", 42)).toBe(1);
    expect(parsePositiveInt("100", 42)).toBe(100);
    expect(parsePositiveInt("  50  ", 42)).toBe(50);
  });

  test("returns default for zero", async () => {
    const { parsePositiveInt } = await import("./LamConfig");
    expect(parsePositiveInt("0", 42)).toBe(42);
  });

  test("returns default for negative numbers", async () => {
    const { parsePositiveInt } = await import("./LamConfig");
    expect(parsePositiveInt("-1", 42)).toBe(42);
    expect(parsePositiveInt("-100", 42)).toBe(42);
  });

  test("returns default for NaN and non-numeric strings", async () => {
    const { parsePositiveInt } = await import("./LamConfig");
    expect(parsePositiveInt("abc", 42)).toBe(42);
    expect(parsePositiveInt("12abc", 42)).toBe(12); // parseInt parses prefix
    expect(parsePositiveInt("abc12", 42)).toBe(42);
    expect(parsePositiveInt("Infinity", 42)).toBe(42);
  });
});

describe("loadConfig", () => {
  beforeEach(() => {
    delete process.env["LAMBENCH_PORT"];
    delete process.env["LAMBENCH_DB_PATH"];
    delete process.env["OPENROUTER_API_KEY"];
    delete process.env["DEV_MODE"];
    delete process.env["TOP_MODELS"];
    delete process.env["LLM_MODEL"];
    delete process.env["RLM_MAX_DEPTH"];
    delete process.env["EVAL_CONCURRENCY"];
    delete process.env["BATCH_CONCURRENCY"];
    delete process.env["RETENTION_DAYS"];
    delete process.env["MAX_DB_SIZE_MB"];
    vi.resetModules();
  });

  test("returns all defaults when env is empty", async () => {
    vi.stubEnv("LAMBENCH_PORT", undefined);
    vi.stubEnv("LAMBENCH_DB_PATH", undefined);
    vi.stubEnv("OPENROUTER_API_KEY", undefined);
    vi.stubEnv("DEV_MODE", undefined);
    vi.stubEnv("TOP_MODELS", undefined);
    vi.stubEnv("LLM_MODEL", undefined);
    vi.stubEnv("RLM_MAX_DEPTH", undefined);
    vi.stubEnv("EVAL_CONCURRENCY", undefined);
    vi.stubEnv("BATCH_CONCURRENCY", undefined);
    vi.stubEnv("RETENTION_DAYS", undefined);
    vi.stubEnv("MAX_DB_SIZE_MB", undefined);

    const { loadConfig } = await import("./LamConfig");
    const cfg = loadConfig();

    expect(cfg.port).toBe(9000);
    expect(cfg.dbPath).toBe(".lambench-data/benchmark.sqlite");
    expect(cfg.openRouterApiKey).toBe("");
    expect(cfg.devMode).toBe(false);
    expect(cfg.topModels).toEqual([]);
    expect(cfg.llmModel).toBe("minimax/minimax-m2.5:free");
    expect(cfg.rlmMaxDepth).toBe(3);
    expect(cfg.evalConcurrency).toBe(4);
    expect(cfg.batchConcurrency).toBe(2);
    expect(cfg.retentionDays).toBe(90);
    expect(cfg.maxDbSizeMb).toBe(1024);
  });

  test("returns custom values when env vars are set", async () => {
    vi.stubEnv("LAMBENCH_PORT", "3000");
    vi.stubEnv("LAMBENCH_DB_PATH", "/tmp/test.db");
    vi.stubEnv("OPENROUTER_API_KEY", "sk-test");
    vi.stubEnv("DEV_MODE", "true");
    vi.stubEnv("TOP_MODELS", "model1,model2");
    vi.stubEnv("LLM_MODEL", "openai/gpt-4");
    vi.stubEnv("RLM_MAX_DEPTH", "5");
    vi.stubEnv("EVAL_CONCURRENCY", "8");
    vi.stubEnv("BATCH_CONCURRENCY", "4");
    vi.stubEnv("RETENTION_DAYS", "30");
    vi.stubEnv("MAX_DB_SIZE_MB", "512");

    const { loadConfig } = await import("./LamConfig");
    const cfg = loadConfig();

    expect(cfg.port).toBe(3000);
    expect(cfg.dbPath).toBe("/tmp/test.db");
    expect(cfg.openRouterApiKey).toBe("sk-test");
    expect(cfg.devMode).toBe(true);
    expect(cfg.topModels).toEqual(["model1", "model2"]);
    expect(cfg.llmModel).toBe("openai/gpt-4");
    expect(cfg.rlmMaxDepth).toBe(5);
    expect(cfg.evalConcurrency).toBe(8);
    expect(cfg.batchConcurrency).toBe(4);
    expect(cfg.retentionDays).toBe(30);
    expect(cfg.maxDbSizeMb).toBe(512);
  });

  test("TOP_MODELS splits on commas and trims whitespace", async () => {
    vi.stubEnv("TOP_MODELS", "  a  , b , c  ");

    const { loadConfig } = await import("./LamConfig");
    const cfg = loadConfig();

    expect(cfg.topModels).toEqual(["a", "b", "c"]);
  });

  test("TOP_MODELS filters empty entries", async () => {
    vi.stubEnv("TOP_MODELS", "a,,b, ,c");

    const { loadConfig } = await import("./LamConfig");
    const cfg = loadConfig();

    expect(cfg.topModels).toEqual(["a", "b", "c"]);
  });

  test("parseBoolean handles true-like strings for DEV_MODE", async () => {
    for (const val of ["1", "true", "yes", "on", "TRUE", "Yes", "ON"]) {
      delete process.env["LAMBENCH_PORT"];
      delete process.env["LAMBENCH_DB_PATH"];
      delete process.env["OPENROUTER_API_KEY"];
      delete process.env["DEV_MODE"];
      delete process.env["TOP_MODELS"];
      delete process.env["LLM_MODEL"];
      delete process.env["RLM_MAX_DEPTH"];
      delete process.env["EVAL_CONCURRENCY"];
      delete process.env["BATCH_CONCURRENCY"];
      delete process.env["RETENTION_DAYS"];
      delete process.env["MAX_DB_SIZE_MB"];
      vi.resetModules();
      vi.stubEnv("DEV_MODE", val);
      const { loadConfig } = await import("./LamConfig");
      expect(loadConfig().devMode).toBe(true);
    }
  });

  test("parseBoolean handles false-like strings for DEV_MODE", async () => {
    for (const val of ["0", "false", "no", "off", "FALSE", "No", "OFF"]) {
      delete process.env["LAMBENCH_PORT"];
      delete process.env["LAMBENCH_DB_PATH"];
      delete process.env["OPENROUTER_API_KEY"];
      delete process.env["DEV_MODE"];
      delete process.env["TOP_MODELS"];
      delete process.env["LLM_MODEL"];
      delete process.env["RLM_MAX_DEPTH"];
      delete process.env["EVAL_CONCURRENCY"];
      delete process.env["BATCH_CONCURRENCY"];
      delete process.env["RETENTION_DAYS"];
      delete process.env["MAX_DB_SIZE_MB"];
      vi.resetModules();
      vi.stubEnv("DEV_MODE", val);
      const { loadConfig } = await import("./LamConfig");
      expect(loadConfig().devMode).toBe(false);
    }
  });

  test("parseBoolean handles empty/undefined DEV_MODE with default", async () => {
    for (const val of [undefined, "", "   "]) {
      delete process.env["LAMBENCH_PORT"];
      delete process.env["LAMBENCH_DB_PATH"];
      delete process.env["OPENROUTER_API_KEY"];
      delete process.env["DEV_MODE"];
      delete process.env["TOP_MODELS"];
      delete process.env["LLM_MODEL"];
      delete process.env["RLM_MAX_DEPTH"];
      delete process.env["EVAL_CONCURRENCY"];
      delete process.env["BATCH_CONCURRENCY"];
      delete process.env["RETENTION_DAYS"];
      delete process.env["MAX_DB_SIZE_MB"];
      vi.resetModules();
      if (val !== undefined) vi.stubEnv("DEV_MODE", val);
      const { loadConfig } = await import("./LamConfig");
      expect(loadConfig().devMode).toBe(false);
    }
  });
});

describe("config proxy", () => {
  beforeEach(() => {
    delete process.env["LAMBENCH_PORT"];
    delete process.env["LAMBENCH_DB_PATH"];
    delete process.env["OPENROUTER_API_KEY"];
    delete process.env["DEV_MODE"];
    delete process.env["TOP_MODELS"];
    delete process.env["LLM_MODEL"];
    delete process.env["RLM_MAX_DEPTH"];
    delete process.env["EVAL_CONCURRENCY"];
    delete process.env["BATCH_CONCURRENCY"];
    delete process.env["RETENTION_DAYS"];
    delete process.env["MAX_DB_SIZE_MB"];
    vi.resetModules();
  });

  test("lazy loads on first property access", async () => {
    vi.stubEnv("LAMBENCH_PORT", "7777");

    const mod = await import("./LamConfig");
    // Accessing a property should trigger loadConfig
    expect(mod.config.port).toBe(7777);
  });

  test("returns same values as loadConfig", async () => {
    vi.stubEnv("LAMBENCH_PORT", "8888");
    vi.stubEnv("DEV_MODE", "true");
    vi.stubEnv("TOP_MODELS", "x,y");

    const mod = await import("./LamConfig");
    const loaded = mod.loadConfig();

    expect(mod.config.port).toBe(loaded.port);
    expect(mod.config.devMode).toBe(loaded.devMode);
    expect(mod.config.topModels).toEqual(loaded.topModels);
    expect(mod.config.llmModel).toBe(loaded.llmModel);
    expect(mod.config.dbPath).toBe(loaded.dbPath);
    expect(mod.config.openRouterApiKey).toBe(loaded.openRouterApiKey);
    expect(mod.config.rlmMaxDepth).toBe(loaded.rlmMaxDepth);
    expect(mod.config.evalConcurrency).toBe(loaded.evalConcurrency);
    expect(mod.config.batchConcurrency).toBe(loaded.batchConcurrency);
    expect(mod.config.retentionDays).toBe(loaded.retentionDays);
    expect(mod.config.maxDbSizeMb).toBe(loaded.maxDbSizeMb);
  });
});
