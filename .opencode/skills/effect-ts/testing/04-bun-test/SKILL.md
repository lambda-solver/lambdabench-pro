---
name: 04-bun-test
description: Bun built-in test runner — zero-config testing for Effect, React, and TypeScript projects
license: MIT
compatibility: opencode
---

# Bun Test

**Package**: Built into Bun (no installation needed)
**Command**: `bun test`

Bun's built-in test runner replaces Vitest/Jest with zero configuration. Same API, faster execution, no extra dependencies.

## Why bun:test over Vitest

| Feature | bun:test | Vitest |
|---------|----------|--------|
| Installation | Built-in | `npm i -D vitest` |
| Config file | None needed | `vitest.config.ts` |
| Startup | Instant | ~1-2s |
| Effect support | Native | Via plugin |
| DOM testing | Requires happy-dom | Built-in via browser mode |

**Rule of thumb**: Use `bun:test` for all logic/server tests. Use Storybook for visual component inspection. Skip DOM-heavy component tests.

## Basic Test

```typescript
import { describe, expect, test } from "bun:test";

describe("fmtModel", () => {
  test("strips openrouter/ prefix", () => {
    expect(fmtModel("openrouter/google/gemini-2.5-pro")).toBe(
      "google/gemini-2.5-pro",
    );
  });
});
```

## Effect Tests

```typescript
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

describe("TaskService", () => {
  test("getTask returns cached task", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* TaskService;
      return yield* svc.getTask("bool_not");
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TaskServiceLive)),
    );

    expect(result.id).toBe("bool_not");
  });
});
```

## Async Tests

```typescript
test("async operation", async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

## Snapshots

```typescript
test("snapshot comparison", () => {
  expect(data).toMatchSnapshot();
});
```

Update snapshots: `bun test -u`

## Skipping and TODO

```typescript
test.skip("not ready yet", () => { ... });
test.todo("implement this later");
test.only("run only this", () => { ... });
```

## Test Files

Bun automatically discovers:
- `*.test.ts`
- `*.test.tsx`
- `*.spec.ts`
- `*.spec.tsx`

## React Component Testing

**Philosophy**: Test logic, not DOM. Use Storybook for visual inspection.

```typescript
// ❌ Don't test DOM rendering
import { render } from "@testing-library/react";
const { container } = render(<BarChart pct={50} />);
expect(container.querySelector("span")).toBeDefined();

// ✅ Test pure logic
function getBarColor(pct: number): string {
  if (pct >= 70) return "green";
  if (pct >= 45) return "blue";
  if (pct >= 20) return "yellow";
  return "red";
}

describe("getBarColor", () => {
  test("green at 70+", () => {
    expect(getBarColor(70)).toBe("green");
    expect(getBarColor(100)).toBe("green");
  });

  test("blue at 45-69", () => {
    expect(getBarColor(45)).toBe("blue");
    expect(getBarColor(69)).toBe("blue");
  });

  test("yellow at 20-44", () => {
    expect(getBarColor(20)).toBe("yellow");
    expect(getBarColor(44)).toBe("yellow");
  });

  test("red below 20", () => {
    expect(getBarColor(0)).toBe("red");
    expect(getBarColor(19)).toBe("red");
  });
});
```

## Mocking

```typescript
import { mock, spyOn } from "bun:test";

// Mock a function
const mockFn = mock((x: number) => x * 2);
expect(mockFn(5)).toBe(10);
expect(mockFn).toHaveBeenCalledTimes(1);

// Spy on module
import * as fs from "node:fs";
const readSpy = spyOn(fs, "readFileSync").mockReturnValue("test");

// Restore
readSpy.mockRestore();
```

## Running Tests

```bash
# All tests
bun test

# Specific file
bun test src/lib/fmt.test.ts

# Watch mode
bun test --watch

# Update snapshots
bun test -u

# Coverage
bun test --coverage

# Bail on first failure
bun test --bail
```

## Package.json Scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

## CI Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: bun test
```

No config file needed. No setup files. Just `bun test`.

## Comparison: When to Use What

| Test Type | Tool | Example |
|-----------|------|---------|
| Pure functions | `bun:test` | `fmtModel()`, `getBarColor()` |
| Effect services | `bun:test` | `TaskService.getTask()` |
| React logic | `bun:test` | Hook utilities, helpers |
| Visual appearance | Storybook | Component fixtures |
| Browser behavior | Manual QA | Click flows, responsive |
| E2E API | `bun:test` + `fetch` | HTTP endpoint tests |

## Migrating from Vitest

1. Replace `import { ... } from "vitest"` with `import { ... } from "bun:test"`
2. Replace `vi.fn()` with `mock()`
3. Replace `vi.spyOn()` with `spyOn()`
4. Remove `vitest.config.ts`
5. Remove `@vitest/*` dependencies
6. Convert DOM tests to logic tests or Storybook fixtures
7. Update package.json scripts

## Anti-Patterns

```typescript
// ❌ Testing implementation details
test("sets internal state", () => { ... });

// ❌ Testing React DOM structure
test("has 3 divs", () => { ... });

// ❌ Heavy mocking
mock("./module", () => ({ ... }));

// ✅ Test behavior
// ✅ Test pure logic
// ✅ Test public API
// ✅ Visual inspection in Storybook
```
