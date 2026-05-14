const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return !["0", "false", "no", "off"].includes(normalized);
};

export const parsePositiveInt = (
  value: string | undefined,
  defaultValue: number,
) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

export interface LamConfig {
  readonly port: number;
  readonly dbPath: string;
  readonly openRouterApiKey: string;
  readonly devMode: boolean;
  readonly topModels: ReadonlyArray<string>;
  readonly llmModel: string;
  readonly rlmMaxDepth: number;
  readonly evalConcurrency: number;
  readonly batchConcurrency: number;
  readonly retentionDays: number;
  readonly maxDbSizeMb: number;
}

export const loadConfig = (): LamConfig => ({
  port: parsePositiveInt(process.env["LAMBENCH_PORT"], 9000),
  dbPath:
    process.env["LAMBENCH_DB_PATH"]?.trim() ||
    ".lambench-data/benchmark.sqlite",
  openRouterApiKey: process.env["OPENROUTER_API_KEY"]?.trim() || "",
  devMode: parseBoolean(process.env["DEV_MODE"], false),
  topModels:
    process.env["TOP_MODELS"]
      ?.trim()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [],
  llmModel: process.env["LLM_MODEL"]?.trim() || "minimax/minimax-m2.5:free",
  rlmMaxDepth: parsePositiveInt(process.env["RLM_MAX_DEPTH"], 3),
  evalConcurrency: parsePositiveInt(process.env["EVAL_CONCURRENCY"], 4),
  batchConcurrency: parsePositiveInt(process.env["BATCH_CONCURRENCY"], 2),
  retentionDays: parsePositiveInt(process.env["RETENTION_DAYS"], 90),
  maxDbSizeMb: parsePositiveInt(process.env["MAX_DB_SIZE_MB"], 1024),
});

let _cachedConfig: LamConfig | undefined;

export const config: LamConfig = new Proxy({} as LamConfig, {
  get(_target, prop) {
    if (_cachedConfig === undefined) {
      _cachedConfig = loadConfig();
    }
    return (_cachedConfig as unknown as Record<string | symbol, unknown>)[prop];
  },
});
