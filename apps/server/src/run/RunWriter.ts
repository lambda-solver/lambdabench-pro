/**
 * RunWriter.ts — Write eval results to res/{timestamp}_{safeModelId}.txt
 *
 * File format is compatible with BuildResults.ts parseResultFile pattern,
 * with new optional variant / rlm_depth / rlm_attempts header lines.
 */

import { Effect, FileSystem, Path } from "effect";
import type { TimedCheckResult } from "../check/Check";

// ─── Paths ───────────────────────────────────────────────────────────────────

const SERVER_ROOT = new URL("../..", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
export const RES_DIR = `${SERVER_ROOT}/res`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type RlmMeta = {
  readonly depth: number;
  readonly attempts: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a Date as the existing timestamp convention: 2026y04m25d.10h00m00s */
const formatTimestamp = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}y${pad(d.getMonth() + 1)}m${pad(d.getDate())}d` +
    `.${pad(d.getHours())}h${pad(d.getMinutes())}m${pad(d.getSeconds())}s`
  );
};

/** Make the model ID safe for use in a filename. */
const safeModelId = (modelId: string): string =>
  modelId.replace(/[/: ]/g, "_");

// ─── writeResultFile ──────────────────────────────────────────────────────────

/**
 * Write results for one model to res/{timestamp}_{safeModelId}.txt
 * Returns the path of the written file.
 */
export const writeResultFile = Effect.fn("writeResultFile")(function* (
  modelId: string,
  results: ReadonlyArray<TimedCheckResult>,
  variant: "standard" | "rlm",
  rlmMeta?: RlmMeta,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.makeDirectory(RES_DIR, { recursive: true }).pipe(
    Effect.catch((_) => Effect.void),
  );

  const timestamp = formatTimestamp(new Date());
  const filename = `${timestamp}_${safeModelId(modelId)}.txt`;
  const filePath = path.join(RES_DIR, filename);

  const right = results.filter((r) => r.pass).length;
  const total = results.length;

  const rlmLines =
    rlmMeta !== undefined
      ? [`rlm_depth: ${rlmMeta.depth}`, `rlm_attempts: ${rlmMeta.attempts}`]
      : [];

  const headerLines = [
    `model: ${modelId}`,
    `right: ${right}/${total}`,
    `variant: ${variant}`,
    ...rlmLines,
  ];

  const taskLines = results.map((r) => {
    const status = r.pass ? "pass" : "fail";
    const score = r.score.toFixed(3);
    const time = (r.elapsedMs / 1000).toFixed(3);
    const bits = r.pass && r.bits > 0 ? ` bits=${r.bits}` : "";
    return `- ${r.id}: ${score} ${status} time=${time}s${bits}`;
  });

  const content = [...headerLines, ...taskLines].join("\n") + "\n";

  yield* fs.writeFileString(filePath, content);
  yield* Effect.log(`[RunWriter] Written ${right}/${total} → ${filePath}`);

  return filePath;
});
