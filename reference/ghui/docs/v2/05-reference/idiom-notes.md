# Idiom Notes — How the Reference Solved Things

> **Purpose:** Exact bootstrap configuration and idiomatic patterns from the reference implementation.
> **Rule:** This file contains TypeScript/Effect-TS/OpenTUI/Bun-specific material quarantined from the blueprint.

---

## Exact Dependencies

```json
{
  "dependencies": {
    "@effect/atom-react": "4.0.0-beta.59",
    "@effect/sql-sqlite-bun": "4.0.0-beta.59",
    "@opentui/core": "0.2.1",
    "@opentui/react": "0.2.1",
    "effect": "4.0.0-beta.59",
    "react": "19.2.5",
    "scheduler": "0.27.0"
  },
  "devDependencies": {
    "@effect/language-service": "0.85.1",
    "@types/bun": "1.3.12",
    "@types/react": "19.2.14",
    "oxfmt": "0.47.0",
    "oxlint": "1.62.0",
    "typescript": "6.0.2"
  }
}
```

Workspace package: `packages/keymap/` — `@ghui/keymap` (keymap composition library).

---

## Exact Compiler Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleDetection": "force",
    "lib": ["ES2022"],
    "verbatimModuleSyntax": true,
    "rewriteRelativeImportExtensions": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["bun"],
    "plugins": [{ "name": "@effect/language-service" }]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "dev/**/*.ts", "dev/**/*.tsx"]
}
```

---

## Exact Linter Configuration

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "require-yield": "off",
    "no-underscore-dangle": "off"
  }
}
```

---

## Exact Formatter Configuration

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 180,
  "useTabs": true,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "objectWrap": "preserve",
  "sortImports": false,
  "sortPackageJson": false,
  "ignorePatterns": ["node_modules/**", "dist/**", "coverage/**"]
}
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.tsx",
    "test": "bun test test",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint --tsconfig tsconfig.json src/ test/",
    "format": "oxfmt src/ test/ dev/",
    "format:check": "oxfmt --check src/ test/ dev/"
  }
}
```

**Critical rules:**
- Never run `npx oxlint .` directly — always use `bun run lint`.
- Never run `npx tsc --noEmit` directly — always use `bun run typecheck`.
- Never run `npx oxfmt .` directly — always use `bun run format`.
- Import extensions must use `.js` even for `.ts` files (NodeNext resolution).
- `verbatimModuleSyntax: true` means `import type { X }` is required for type-only imports.

---

## How the Reference Solved Key Problems

### Service Boundary: `Context.Service` + `Layer.effect`

Every service is a class extending `Context.Service` with a static `layer` factory:

```typescript
export class MyService extends Context.Service<MyService, {
  readonly doThing: (input: Input) => Effect.Effect<Output, MyError>
}>()("ghui/MyService") {
  static readonly layer = Layer.effect(MyService, Effect.gen(function* () {
    const dep = yield* OtherService
    const doThing = Effect.fn("MyService.doThing")(function* (input) { /* ... */ })
    return MyService.of({ doThing })
  }))
}
```

Services compose at `runtime.ts` via `Layer.mergeAll` + `Layer.provide`.

### Error Model: `Schema.TaggedErrorClass`

```typescript
export class MyError extends Schema.TaggedErrorClass<MyError>()("MyError", {
  operation: Schema.String, cause: Schema.Defect,
}) {}
```

Every error has a `_tag` field for pattern matching. Never raw `Error` or `string` in error channel.

### Reactive State: `Atom` + `runtime.atom`

```typescript
// Static atom (global UI state)
export const activeViewAtom = Atom.make<PullRequestView>(initial).pipe(Atom.keepAlive)

// Async data atom (reactive to dependencies via `get` parameter)
export const pullRequestsAtom = githubRuntime
  .atom(Effect.fnUntraced(function* (get) {
    const view = get(activeViewAtom)  // registers reactive dependency
    const github = yield* GitHubService
    // ...
  }))
  .pipe(Atom.keepAlive)

// Function atom (one per argument, self-cleaning via WeakRef)
export const readCachedDetailsAtom = githubRuntime.fn<string>()(
  (repo) => CacheService.use((cache) => cache.readRepositoryDetails(repo))
)
// NEVER .pipe(Atom.keepAlive) on function atoms — prevents GC
```

**Critical:** `get(atom)` inside a `runtime.atom` body registers a reactive dependency. `Atom.get(atom)` is a non-tracking read — wrong for reactivity.

### Tagged Unions: `Data.TaggedEnum`

```typescript
export type Modal = Data.TaggedEnum<{
  None: {}; Merge: MergeModalState; Comment: CommentModalState; // ...
}>
export const Modal = Data.taggedEnum<Modal>()

// Construct: Modal.Merge({ ...initialMergeModalState, repository, number })
// Match: Modal.$is("Merge")(activeModal) — type guard
// Match: Modal.$match(activeModal, { Merge: (s) => ..., None: () => ... })
```

### Command System: Values, Not Closures

```typescript
// Commands are pure values dispatchable from keymap, palette, or tests
defineCommand({
  id: "view.authored",
  title: "Authored",
  scope: "View",
  subtitle: queueViewSubtitleAtom("authored"),  // atom for dynamic title
  disabledReason: queueViewAlreadyActiveReasonAtom("authored"),
  run: Effect.sync(() => invokeHandoff("viewAuthored")),
})

// Handoff bridge: Effect commands → imperative React hooks
// In App.tsx: useEffect(() => registerHandoff("viewAuthored", () => { ... }), [])
// In command: invokeHandoff("viewAuthored")
```

### Cache Merge: `mergeCachedDetails`

Summary queries omit detail fields. When a fresh summary page arrives, `mergeCachedDetails` preserves detail fields from cached items at the same URL + same commit SHA:

```typescript
if (!cachedPr?.detailLoaded || cachedPr.headRefOid !== pr.headRefOid) return pr
return { ...pr, body: cachedPr.body, labels: cachedPr.labels, /* ... */ detailLoaded: true }
```

### Atomic Read-Merge-Write

```typescript
const load = yield* Atom.modify(queueLoadCacheAtom, (cache) => {
  const existing = cache[cacheKey]
  const data = mergeCachedDetails(page.items, existing?.data)
  const next = { view, data, fetchedAt: new Date(), endCursor: page.endCursor, hasNextPage: ... }
  return [next, { ...cache, [cacheKey]: next }]  // [returnValue, newAtomValue]
})
```

### Generation-Based Staleness

```typescript
const refreshGenerationRef = useRef(0)
const refresh = () => {
  const generation = ++refreshGenerationRef.current
  Effect.runPromise(fetchData()).then(data => {
    if (generation !== refreshGenerationRef.current) return  // stale
    applyData(data)
  })
}
```

### Retry with Exponential Backoff

```typescript
yield* github.listPullRequestPage(input).pipe(
  Effect.retry({
    times: 6,
    schedule: Schedule.exponential("300 millis", 2),
    while: shouldRetryPullRequestFetch,  // excludes rate limits + timeouts
  }),
)
```

### Pagination: Cursor Advances = Keep Going

```typescript
const cursorAdvanced = page.endCursor !== null && page.endCursor !== current.endCursor
hasNextPage: page.hasNextPage && cursorAdvanced && data.length < prFetchLimit
// Duplicate-only pages do NOT kill pagination — cursor still advances
```

### OpenTUI Rendering

Elements are terminal primitives, not HTML:
- `<box>` — container with flexbox-like layout (`flexDirection`, `paddingLeft`, `gap`, `width`, `height`)
- `<scrollbox>` — scrollable container with `scrollTop`
- `<text>` — text with inline segments

`ModalFrame` requires `junctionRows` for dividers to connect to side borders with `├`/`┤`.

### Keymap: `@ghui/keymap` Package

```typescript
import { context } from "@ghui/keymap"

const Diff = context<DiffViewCtx>()
export const diffViewKeymap = Diff(
  { id: "diff.up", keys: ["up", "k"], run: (s) => s.moveAnchor(-1) },
  { id: "diff.down", keys: ["down", "j"], run: (s) => s.moveAnchor(1) },
  // ...
)

// In all.ts:
diffViewKeymap.scope((a) => a.diffFullView && !modalActive(a) && a.diff)
```

Context types are pure TypeScript interfaces — no atom/service imports. Values provided by `App.tsx`.

### Test Framework: `bun:test`

```typescript
import { describe, expect, test } from "bun:test"

// Pure domain tests — no Effect runtime needed
describe("viewCacheKey", () => {
  test("repository view key", () => {
    expect(viewCacheKey({ _tag: "Repository", repository: "owner/name" })).toBe("pullRequest:all:owner/name")
  })
})

// Service tests — real SQLite with temp files
const tempDbPath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "test-"))
  return join(dir, "test.sqlite")
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GHUI_PR_FETCH_LIMIT` | 500 | Max total items to fetch across all pages |
| `GHUI_PR_PAGE_SIZE` | 50 | Items per page (clamped to [1, 100]) |
| `GHUI_COMMAND_TIMEOUT_MS` | 15000 | Timeout for `gh` CLI commands |
| `GHUI_CACHE_PATH` | `~/.cache/ghui/cache.sqlite` | SQLite cache path; "off" to disable |
| `GHUI_MOCK_PR_COUNT` | (none) | Enable mock mode with N fake PRs |
| `GHUI_MOCK_REPOSITORY` | (none) | Mock repository name |
| `GHUI_MOCK_USERNAME` | (none) | Mock authenticated user |
| `XDG_CACHE_HOME` | `~/.cache` | XDG cache directory |

---

## Idiom Translation Table

This table maps [ESSENTIAL] concepts to [INCIDENTAL] reference idioms.
Stage 2 fills the target language column.

| Concept [ESSENTIAL] | Reference Idiom [INCIDENTAL] | Target Idiom |
|---------------------|------------------------------|--------------|
| Service boundary | `Context.Service` + `Layer.effect` | ? |
| Typed error family | `Schema.TaggedErrorClass` | ? |
| Reactive cell | `Atom.make` + `Atom.keepAlive` | ? |
| Async data cell | `runtime.atom(Effect.fnUntraced)` | ? |
| Tagged union | `Data.TaggedEnum` | ? |
| Effect composition | `Effect.gen(function* () { ... })` | ? |
| Dependency injection | `Layer.provide` | ? |
| Persistence | `@effect/sql-sqlite-bun` | ? |
| Terminal rendering | `@opentui/react` + JSX | ? |
| Keymap composition | `@ghui/keymap` package | ? |

**Rule**: Every row MUST be filled before coding begins.
**Rule**: Target idiom MUST be idiomatic, not transliterated.
