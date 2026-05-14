/**
 * Compatibility shim for bun:sqlite when running under Vitest (Node).
 * Wraps Node 22+ built-in node:sqlite to expose a bun:sqlite-like API.
 */

import { statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

class StatementWrapper {
  private stmt: ReturnType<DatabaseSync["prepare"]>;

  constructor(stmt: ReturnType<DatabaseSync["prepare"]>) {
    this.stmt = stmt;
  }

  run(...params: Array<unknown>) {
    this.stmt.run(...params);
  }

  all(...params: Array<unknown>): Array<Record<string, unknown>> {
    return this.stmt.all(...params) as Array<Record<string, unknown>>;
  }

  get(...params: Array<unknown>): Record<string, unknown> | null {
    const result = this.stmt.get(...params);
    return result === undefined ? null : (result as Record<string, unknown>);
  }
}

export class Database {
  private db: DatabaseSync;

  constructor(path: string, _opts?: { create?: boolean }) {
    this.db = new DatabaseSync(path);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  query(sql: string): StatementWrapper {
    return new StatementWrapper(this.db.prepare(sql));
  }

  get changes(): number {
    const stmt = this.db.prepare("SELECT changes() as changes");
    const row = stmt.get() as { changes: number } | undefined;
    return row?.changes ?? 0;
  }
}

// Also stub Bun.file globally since ResultStore.ts uses it for DB size checks
if (typeof globalThis.Bun === "undefined") {
  (globalThis as unknown as Record<string, unknown>).Bun = {
    file: (path: string) => ({
      get size() {
        try {
          return statSync(path).size;
        } catch {
          return 0;
        }
      },
    }),
  };
}
