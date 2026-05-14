import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Effect, Layer, ServiceMap } from "effect";

// ─── Error ───────────────────────────────────────────────────────────────────

export class SqlError {
  readonly _tag = "SqlError" as const;
  constructor(readonly message: string) {}
}

// ─── Insert Types ────────────────────────────────────────────────────────────

export interface InsertResult {
  readonly runId: string;
  readonly jobId?: string | undefined;
  readonly taskId: string;
  readonly model: string;
  readonly variant: string;
  readonly provider: string;
  readonly pass: boolean;
  readonly bits?: number | undefined;
  readonly score?: number | undefined;
  readonly errors?: ReadonlyArray<string> | undefined;
  readonly submission?: string | undefined;
  readonly elapsedMs: number;
  readonly timestamp: string;
}

export interface InsertJob {
  readonly id: string;
  readonly status: string;
  readonly config: unknown;
  readonly totalTasks: number;
  readonly completedTasks?: number;
}

export interface InsertTask {
  readonly id: string;
  readonly category: string;
  readonly categoryName: string;
  readonly description: string;
  readonly testCount: number;
  readonly tests: ReadonlyArray<unknown>;
  readonly refBits?: number | undefined;
  readonly refSolution?: string | undefined;
}

export interface InsertModelConfig {
  readonly id: string;
  readonly provider: string;
  readonly displayName?: string | undefined;
  readonly pricePerMOutput?: number | undefined;
  readonly isActive?: boolean;
}

// ─── Db Types ────────────────────────────────────────────────────────────────

export interface DbResult {
  readonly id: number;
  readonly runId: string;
  readonly jobId: string | null;
  readonly taskId: string;
  readonly model: string;
  readonly variant: string;
  readonly provider: string;
  readonly pass: boolean;
  readonly bits: number | null;
  readonly score: number | null;
  readonly errors: ReadonlyArray<string> | null;
  readonly submission: string | null;
  readonly elapsedMs: number;
  readonly timestamp: string;
  readonly createdAt: string | null;
}

export interface DbJob {
  readonly id: string;
  readonly status: string;
  readonly config: unknown;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly createdAt: string | null;
  readonly completedAt: string | null;
}

export interface DbTask {
  readonly id: string;
  readonly category: string;
  readonly categoryName: string;
  readonly description: string;
  readonly testCount: number;
  readonly tests: ReadonlyArray<unknown>;
  readonly refBits: number | null;
  readonly refSolution: string | null;
}

export interface DbModelConfig {
  readonly id: string;
  readonly provider: string;
  readonly displayName: string | null;
  readonly pricePerMOutput: number | null;
  readonly isActive: boolean;
  readonly createdAt: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ResultStore extends ServiceMap.Service<
  ResultStore,
  {
    // Results
    insertResult(result: InsertResult): Effect.Effect<void, SqlError>;
    getResultsByRunId(
      runId: string,
    ): Effect.Effect<ReadonlyArray<DbResult>, SqlError>;
    getResultsByJobId(
      jobId: string,
    ): Effect.Effect<ReadonlyArray<DbResult>, SqlError>;
    getLatestResults(): Effect.Effect<ReadonlyArray<DbResult>, SqlError>;

    // Batch jobs
    insertJob(job: InsertJob): Effect.Effect<void, SqlError>;
    updateJobStatus(
      jobId: string,
      status: string,
      completedTasks?: number,
    ): Effect.Effect<void, SqlError>;
    getJob(jobId: string): Effect.Effect<DbJob | undefined, SqlError>;
    getJobsByStatus(
      status: string,
    ): Effect.Effect<ReadonlyArray<DbJob>, SqlError>;

    // Tasks
    insertTask(task: InsertTask): Effect.Effect<void, SqlError>;
    getTask(taskId: string): Effect.Effect<DbTask | undefined, SqlError>;
    getTasksByCategory(
      category: string,
    ): Effect.Effect<ReadonlyArray<DbTask>, SqlError>;
    getAllTasks(): Effect.Effect<ReadonlyArray<DbTask>, SqlError>;

    // Model configs
    insertModelConfig(config: InsertModelConfig): Effect.Effect<void, SqlError>;
    getActiveModelConfigs(): Effect.Effect<
      ReadonlyArray<DbModelConfig>,
      SqlError
    >;

    // Retention
    cleanupExpired(
      retentionDays: number,
      maxDbSizeMb: number,
    ): Effect.Effect<{ deletedResults: number; deletedJobs: number }, SqlError>;
  }
>()("app/ResultStore") {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toBoolean = (n: number): boolean => n === 1;

const fromBoolean = (b: boolean): number => (b ? 1 : 0);

// Returns null on parse failure — caller must handle null (motel pattern)
const safeJsonParse = (text: string | null): unknown => {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// ─── SQL ─────────────────────────────────────────────────────────────────────

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS benchmark_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  job_id TEXT,
  task_id TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  provider TEXT NOT NULL,
  pass INTEGER NOT NULL,
  bits INTEGER,
  score REAL,
  errors TEXT,
  submission TEXT,
  elapsed_ms INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  config TEXT NOT NULL,
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  test_count INTEGER NOT NULL,
  tests TEXT NOT NULL,
  ref_bits INTEGER,
  ref_solution TEXT
);

CREATE TABLE IF NOT EXISTS model_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  display_name TEXT,
  price_per_m_output REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_results_run ON benchmark_results(run_id);
CREATE INDEX IF NOT EXISTS idx_results_job ON benchmark_results(job_id);
CREATE INDEX IF NOT EXISTS idx_results_task ON benchmark_results(task_id);
CREATE INDEX IF NOT EXISTS idx_results_model ON benchmark_results(model);
CREATE INDEX IF NOT EXISTS idx_results_timestamp ON benchmark_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON benchmark_results(created_at);
CREATE INDEX IF NOT EXISTS idx_results_pass_created_at ON benchmark_results(pass, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON batch_jobs(status);
`;

// ─── Row mappers ─────────────────────────────────────────────────────────────

const mapDbResult = (row: Record<string, unknown>): DbResult => ({
  id: row["id"] as number,
  runId: row["run_id"] as string,
  jobId: (row["job_id"] as string | null) ?? null,
  taskId: row["task_id"] as string,
  model: row["model"] as string,
  variant: row["variant"] as string,
  provider: row["provider"] as string,
  pass: toBoolean(row["pass"] as number),
  bits: (row["bits"] as number | null) ?? null,
  score: (row["score"] as number | null) ?? null,
  errors: safeJsonParse(
    row["errors"] as string | null,
  ) as ReadonlyArray<string> | null,
  submission: (row["submission"] as string | null) ?? null,
  elapsedMs: row["elapsed_ms"] as number,
  timestamp: row["timestamp"] as string,
  createdAt: (row["created_at"] as string | null) ?? null,
});

const mapDbJob = (row: Record<string, unknown>): DbJob => ({
  id: row["id"] as string,
  status: row["status"] as string,
  config: safeJsonParse(row["config"] as string | null),
  totalTasks: row["total_tasks"] as number,
  completedTasks: row["completed_tasks"] as number,
  createdAt: (row["created_at"] as string | null) ?? null,
  completedAt: (row["completed_at"] as string | null) ?? null,
});

const mapDbTask = (row: Record<string, unknown>): DbTask => ({
  id: row["id"] as string,
  category: row["category"] as string,
  categoryName: row["category_name"] as string,
  description: row["description"] as string,
  testCount: row["test_count"] as number,
  tests:
    (safeJsonParse(
      row["tests"] as string | null,
    ) as ReadonlyArray<unknown> | null) ?? [],
  refBits: (row["ref_bits"] as number | null) ?? null,
  refSolution: (row["ref_solution"] as string | null) ?? null,
});

const mapDbModelConfig = (row: Record<string, unknown>): DbModelConfig => ({
  id: row["id"] as string,
  provider: row["provider"] as string,
  displayName: (row["display_name"] as string | null) ?? null,
  pricePerMOutput: (row["price_per_m_output"] as number | null) ?? null,
  isActive: toBoolean(row["is_active"] as number),
  createdAt: (row["created_at"] as string | null) ?? null,
});

// ─── Layer Factory ───────────────────────────────────────────────────────────

export const ResultStoreLive = (dbPath: string): Layer.Layer<ResultStore> =>
  Layer.effect(
    ResultStore,
    Effect.gen(function* () {
      mkdirSync(dirname(dbPath), { recursive: true });
      const db = new Database(dbPath, { create: true });
      db.exec("PRAGMA journal_mode = WAL");
      db.exec("PRAGMA foreign_keys = ON");
      db.exec(CREATE_TABLES_SQL);

      const runSql = <A>(fn: () => A): Effect.Effect<A, SqlError> =>
        Effect.try({
          try: fn,
          catch: (e) =>
            new SqlError(e instanceof Error ? e.message : String(e)),
        });

      const insertResult = Effect.fnUntraced(function* (result: InsertResult) {
        const stmt = db.query(`
          INSERT INTO benchmark_results (
            run_id, job_id, task_id, model, variant, provider, pass, bits, score, errors, submission, elapsed_ms, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        yield* runSql(() =>
          stmt.run(
            result.runId,
            result.jobId ?? null,
            result.taskId,
            result.model,
            result.variant,
            result.provider,
            fromBoolean(result.pass),
            result.bits ?? null,
            result.score ?? null,
            result.errors ? JSON.stringify(result.errors) : null,
            result.submission ?? null,
            result.elapsedMs,
            result.timestamp,
          ),
        );
      });

      const getResultsByRunId = Effect.fnUntraced(function* (runId: string) {
        const stmt = db.query(
          "SELECT * FROM benchmark_results WHERE run_id = ? ORDER BY timestamp DESC",
        );
        const rows = yield* runSql(
          () => stmt.all(runId) as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbResult);
      });

      const getResultsByJobId = Effect.fnUntraced(function* (jobId: string) {
        const stmt = db.query(
          "SELECT * FROM benchmark_results WHERE job_id = ? ORDER BY timestamp DESC",
        );
        const rows = yield* runSql(
          () => stmt.all(jobId) as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbResult);
      });

      const getLatestResults = Effect.fnUntraced(function* () {
        const stmt = db.query(
          "SELECT * FROM benchmark_results ORDER BY timestamp DESC LIMIT 100",
        );
        const rows = yield* runSql(
          () => stmt.all() as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbResult);
      });

      const insertJob = Effect.fnUntraced(function* (job: InsertJob) {
        const stmt = db.query(`
          INSERT INTO batch_jobs (id, status, config, total_tasks, completed_tasks)
          VALUES (?, ?, ?, ?, ?)
        `);
        yield* runSql(() =>
          stmt.run(
            job.id,
            job.status,
            JSON.stringify(job.config),
            job.totalTasks,
            job.completedTasks ?? 0,
          ),
        );
      });

      const updateJobStatus = Effect.fnUntraced(function* (
        jobId: string,
        status: string,
        completedTasks?: number,
      ) {
        if (completedTasks !== undefined) {
          const completedAt =
            status === "completed" ? new Date().toISOString() : null;
          const stmt = db.query(`
            UPDATE batch_jobs SET status = ?, completed_tasks = ?, completed_at = ? WHERE id = ?
          `);
          yield* runSql(() =>
            stmt.run(status, completedTasks, completedAt, jobId),
          );
        } else if (status === "completed") {
          const completedAt = new Date().toISOString();
          const stmt = db.query(`
            UPDATE batch_jobs SET status = ?, completed_at = ? WHERE id = ?
          `);
          yield* runSql(() => stmt.run(status, completedAt, jobId));
        } else {
          const stmt = db.query(
            "UPDATE batch_jobs SET status = ? WHERE id = ?",
          );
          yield* runSql(() => stmt.run(status, jobId));
        }
      });

      const getJob = Effect.fnUntraced(function* (jobId: string) {
        const stmt = db.query("SELECT * FROM batch_jobs WHERE id = ?");
        const row = yield* runSql(
          () => stmt.get(jobId) as Record<string, unknown> | null,
        );
        return row ? mapDbJob(row) : undefined;
      });

      const getJobsByStatus = Effect.fnUntraced(function* (status: string) {
        const stmt = db.query(
          "SELECT * FROM batch_jobs WHERE status = ? ORDER BY created_at DESC",
        );
        const rows = yield* runSql(
          () => stmt.all(status) as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbJob);
      });

      const insertTask = Effect.fnUntraced(function* (task: InsertTask) {
        const stmt = db.query(`
          INSERT INTO tasks (id, category, category_name, description, test_count, tests, ref_bits, ref_solution)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        yield* runSql(() =>
          stmt.run(
            task.id,
            task.category,
            task.categoryName,
            task.description,
            task.testCount,
            JSON.stringify(task.tests),
            task.refBits ?? null,
            task.refSolution ?? null,
          ),
        );
      });

      const getTask = Effect.fnUntraced(function* (taskId: string) {
        const stmt = db.query("SELECT * FROM tasks WHERE id = ?");
        const row = yield* runSql(
          () => stmt.get(taskId) as Record<string, unknown> | null,
        );
        return row ? mapDbTask(row) : undefined;
      });

      const getTasksByCategory = Effect.fnUntraced(function* (
        category: string,
      ) {
        const stmt = db.query(
          "SELECT * FROM tasks WHERE category = ? ORDER BY id",
        );
        const rows = yield* runSql(
          () => stmt.all(category) as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbTask);
      });

      const getAllTasks = Effect.fnUntraced(function* () {
        const stmt = db.query("SELECT * FROM tasks ORDER BY id");
        const rows = yield* runSql(
          () => stmt.all() as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbTask);
      });

      const insertModelConfig = Effect.fnUntraced(function* (
        config: InsertModelConfig,
      ) {
        const stmt = db.query(`
          INSERT INTO model_configs (id, provider, display_name, price_per_m_output, is_active)
          VALUES (?, ?, ?, ?, ?)
        `);
        yield* runSql(() =>
          stmt.run(
            config.id,
            config.provider,
            config.displayName ?? null,
            config.pricePerMOutput ?? null,
            fromBoolean(config.isActive ?? true),
          ),
        );
      });

      const getActiveModelConfigs = Effect.fnUntraced(function* () {
        const stmt = db.query(
          "SELECT * FROM model_configs WHERE is_active = 1 ORDER BY id",
        );
        const rows = yield* runSql(
          () => stmt.all() as Array<Record<string, unknown>>,
        );
        return rows.map(mapDbModelConfig);
      });

      const cleanupExpired = Effect.fnUntraced(function* (
        retentionDays: number,
        maxDbSizeMb: number,
      ) {
        let deletedResults = 0;

        // Delete old benchmark_results
        const deleteResultsStmt = db.query(
          "DELETE FROM benchmark_results WHERE created_at < datetime('now', '-' || ? || ' days')",
        );
        yield* runSql(() => deleteResultsStmt.run(retentionDays));
        deletedResults = (
          db.query("SELECT changes() as c").get() as { c: number }
        ).c;

        // Delete old completed batch_jobs
        const deleteJobsStmt = db.query(
          "DELETE FROM batch_jobs WHERE status = 'completed' AND created_at < datetime('now', '-' || ? || ' days')",
        );
        yield* runSql(() => deleteJobsStmt.run(retentionDays));
        const deletedJobs = (
          db.query("SELECT changes() as c").get() as { c: number }
        ).c;

        // Check DB size and delete oldest 20% of completed results if needed
        const mainSize = Bun.file(dbPath).size;
        const walSize = Bun.file(`${dbPath}-wal`).size;
        const fileSize = mainSize + walSize;
        const maxBytes = maxDbSizeMb * 1024 * 1024;

        if (fileSize > maxBytes) {
          const countStmt = db.query(
            "SELECT COUNT(*) as count FROM benchmark_results WHERE pass = 1",
          );
          const countRow = yield* runSql(
            () => countStmt.get() as { count: number } | null,
          );
          const completedCount = countRow?.count ?? 0;
          const limit = Math.floor(completedCount * 0.2);

          if (limit > 0) {
            const pruneStmt = db.query(
              "DELETE FROM benchmark_results WHERE id IN (SELECT id FROM benchmark_results WHERE pass = 1 ORDER BY created_at ASC LIMIT ?)",
            );
            yield* runSql(() => pruneStmt.run(limit));
            deletedResults += (
              db.query("SELECT changes() as c").get() as { c: number }
            ).c;
          }
        }

        // WAL checkpoint
        yield* runSql(() => db.exec("PRAGMA wal_checkpoint(TRUNCATE)"));

        return { deletedResults, deletedJobs };
      });

      return ResultStore.of({
        insertResult,
        getResultsByRunId,
        getResultsByJobId,
        getLatestResults,
        insertJob,
        updateJobStatus,
        getJob,
        getJobsByStatus,
        insertTask,
        getTask,
        getTasksByCategory,
        getAllTasks,
        insertModelConfig,
        getActiveModelConfigs,
        cleanupExpired,
      });
    }),
  );
