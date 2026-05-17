import { Api } from "@repo/domain/Api";
import { Effect, Layer } from "effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { makeOpenRouterLayer } from "./llm/OpenRouterClient.js";
import { BatchService } from "./services/BatchService.js";
import { EvalService } from "./services/EvalService.js";
import { ResultStore } from "./services/ResultStore.js";
import { TaskService } from "./services/TaskService.js";

// ─── HealthGroup ─────────────────────────────────────────────────────────────

const HealthGroupLive = HttpApiBuilder.group(Api, "health", (handlers) =>
  handlers.handle("get", () =>
    Effect.succeed({
      db: "connected" as const,
      status: "ok" as const,
      uptimeSeconds: process.uptime(),
      version: "1.0.0",
    })));

// ─── EvalGroup ───────────────────────────────────────────────────────────────

const EvalGroupLive = HttpApiBuilder.group(Api, "eval", (handlers) =>
  handlers
    .handle("single", ({ payload }) =>
      Effect.gen(function*() {
        // Mode is accepted but only "direct" is fully implemented; "agent" mode is Phase 6
        const evalService = yield* EvalService;
        return yield* evalService
          .evaluateSingle(payload)
          .pipe(Effect.provide(makeOpenRouterLayer(payload.model)));
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      ))
    .handle("batch", ({ payload }) =>
      Effect.gen(function*() {
        // Mode is accepted but only "direct" is fully implemented; "agent" mode is Phase 6
        const batchService = yield* BatchService;
        const job = yield* batchService.createBatchJob(payload);
        yield* batchService.runBatchJob(job.id).pipe(Effect.forkChild);
        return job;
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      ))
    .handle("status", ({ params }) =>
      Effect.gen(function*() {
        const batchService = yield* BatchService;
        const job = yield* batchService.getBatchJob(params.jobId);
        if (job === undefined) {
          return HttpServerResponse.jsonUnsafe(
            { error: "Not found" },
            { status: 404 },
          );
        }
        return job;
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      )));

// ─── ResultsGroup ─────────────────────────────────────────────────────────────

const ResultsGroupLive = HttpApiBuilder.group(Api, "results", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function*() {
        const resultStore = yield* ResultStore;
        const dbResults = yield* resultStore.getLatestResults();

        const grouped: Record<string, Array<(typeof dbResults)[number]>> = {};
        for (const result of dbResults) {
          const list = grouped[result.model];
          if (list === undefined) {
            grouped[result.model] = [result];
          } else {
            list.push(result);
          }
        }

        const rankings = Object.entries(grouped).map(
          ([model, modelResults]) => {
            const passed = modelResults.filter((r) => r.pass).length;
            return {
              avgTime: 0,
              model,
              pct: modelResults.length > 0
                ? ((passed / modelResults.length) * 100).toFixed(1)
                : "0.0",
              pricePerMOutputTokens: 0,
              right: passed,
              taskBits: {},
              taskRefs: {},
              tasks: {},
              timestamp: new Date().toISOString(),
              total: modelResults.length,
            };
          },
        );

        return {
          categories: [],
          generatedAt: new Date().toISOString(),
          rankings,
          tasks: [],
        };
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      ))
    .handle("detail", ({ params }) =>
      Effect.gen(function*() {
        const resultStore = yield* ResultStore;
        const results = yield* resultStore.getResultsByRunId(params.runId);
        const first = results[0];
        if (first === undefined) {
          return HttpServerResponse.jsonUnsafe(
            { error: "Not found" },
            { status: 404 },
          );
        }
        return {
          bits: first.bits ?? 0,
          elapsedMs: first.elapsedMs,
          errors: first.errors ?? [],
          model: first.model,
          pass: first.pass,
          score: first.score ?? 0,
          submission: first.submission ?? "",
          taskId: first.taskId,
          timestamp: first.timestamp,
          variant: first.variant as "standard" | "rlm" | "both",
        };
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      )));

// ─── TasksGroup ──────────────────────────────────────────────────────────────

const TasksGroupLive = HttpApiBuilder.group(Api, "tasks", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function*() {
        const taskService = yield* TaskService;
        const dbTasks = yield* taskService.getAllTasks();
        return dbTasks.map((t) => ({
          category: t.category,
          categoryName: t.categoryName,
          description: t.description,
          id: t.id,
          testCount: t.testCount,
          tests: (
            t.tests as Array<{
              readonly input: string;
              readonly expected: string;
            }>
          )
            .slice(0, 3)
            .map((test) => ({
              expected: test.expected,
              input: test.input,
            })),
        }));
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      ))
    .handle("detail", ({ params }) =>
      Effect.gen(function*() {
        const taskService = yield* TaskService;
        const task = yield* taskService.getTask(params.taskId);
        if (task === undefined) {
          return HttpServerResponse.jsonUnsafe(
            { error: "Not found" },
            { status: 404 },
          );
        }
        return {
          category: task.category,
          categoryName: task.categoryName,
          description: task.description,
          id: task.id,
          testCount: task.testCount,
          tests: (
            task.tests as Array<{
              readonly input: string;
              readonly expected: string;
            }>
          )
            .slice(0, 3)
            .map((test) => ({
              expected: test.expected,
              input: test.input,
            })),
        };
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      )));

// ─── ModelsGroup ─────────────────────────────────────────────────────────────

const ModelsGroupLive = HttpApiBuilder.group(Api, "models", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function*() {
        const resultStore = yield* ResultStore;
        const configs = yield* resultStore.getActiveModelConfigs();
        return configs.map((c) => ({
          displayName: c.displayName ?? undefined,
          id: c.id,
          isActive: c.isActive,
          pricePerMOutput: c.pricePerMOutput ?? undefined,
          provider: c.provider as "openrouter" | "opencode-go",
        }));
      }).pipe(
        Effect.match({
          onFailure: (error) =>
            HttpServerResponse.jsonUnsafe(
              { error: String(error) },
              { status: 500 },
            ),
          onSuccess: (value) => value,
        }),
      ))
    .handle("test", ({ payload: _payload }) =>
      Effect.succeed({
        latencyMs: 0,
        ok: true,
      })));

// ─── API Layer ───────────────────────────────────────────────────────────────

export const ApiLayer = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(HealthGroupLive),
  Layer.provide(EvalGroupLive),
  Layer.provide(ResultsGroupLive),
  Layer.provide(TasksGroupLive),
  Layer.provide(ModelsGroupLive),
);
