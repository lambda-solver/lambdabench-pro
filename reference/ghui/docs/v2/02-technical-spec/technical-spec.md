# Technical Specification

> **Version:** 0.7.1
> **Purpose:** Language-agnostic architecture — layers, dependency rules, contract shapes,
> algorithms, external API shapes, and composition. States WHAT each boundary guarantees,
> not which library provides it.

---

## 1. Design Principles

### P-001: Types are the specification

Every public operation crossing a module boundary must have its complete contract shape (inputs, outputs, error-kinds) defined before implementation. The contract tells the truth about what an operation needs, what it returns, and how it can fail.

### P-002: Knowledge flows down

UI → Reactive State → Services → External systems. Services never know about UI. Cache never knows about the remote platform CLI.

### P-003: Failures are data

Every error is a named family with semantics. Never throw raw/untyped errors. Never use plain text in the error channel.

### P-004: Cache is transparent

Cache failures are silent. The application never blocks on local storage. On failure, degrade to network-only behavior.

### P-005: Commands are values

A command is a pure description of an action gated by reactive state. It can be dispatched from keymap, palette, or tests without re-threading dependencies.

### P-006: All remote access goes through the official CLI

Every remote platform API call is mediated by the official CLI binary. No direct HTTP calls. This ensures consistent authentication and error handling.

---

## 2. Architecture Layers

```
Layer 0: External Systems
  - Remote Platform API (via official CLI)
  - Local Database (via storage library)
  - System clipboard
  - Default browser
  - Terminal (via renderer)

Layer 1: Infrastructure
  ProcessRunner          → spawns external processes
  BrowserOpener          → opens URLs in system browser
  Clipboard              → system clipboard access
  Config                 → environment variables, application settings
  Observability          → telemetry endpoints

Layer 2: Services
  RemoteSchemas          → pure data shape definitions (no dependencies)
  RemoteNormalizer       → transforms raw responses into domain entities
  RemoteService          → ProcessRunner + schemas + normalizer + domain
  CacheService           → storage client + domain
  MockRemoteService      → RemoteService contract, domain (for development)

Layer 3: Runtime Composition
  Runtime                → merges all service layers into a single runtime

Layer 4: Domain Logic (pure)
  domain                 → pure entity definitions
  item                   → shared list abstraction
  pullRequestViews       → view definitions + cache keys
  issueViews             → view definitions + cache keys
  pullRequestLoad        → load state types
  issueLoad              → load state types
  pullRequestCache       → cache merge logic (pure functions)
  workspacePreferences   → preference types
  workspaceSurfaces      → surface definitions
  errors                 → error classification
  themeConfig            → theme resolution (pure functions)

Layer 5: State / Reactive Cells
  ui/*/atoms             → Runtime + Domain + Services
  workspace/atoms        → Runtime + Domain

Layer 6: Commands
  commands/registry      → pure command definition shape
  commands/handoffs      → side-effect registry (bridge to imperative hooks)
  commands/derivations   → derived reactive state for command metadata
  commands/builtins      → all command definitions
  commands/dispatch      → command dispatch via registry
  commands/atoms         → command snapshot reactive cells

Layer 7: Input / Keymap
  keymap/contexts/*      → pure context shapes (no state/service dependencies)
  keymap/*               → keymap definitions per view/modal
  keymap/all             → full keymap composition

Layer 8: UI Components
  ui/primitives          → renderer primitives
  ui/modals/types        → domain (modal state shapes)
  ui/modals/*            → modal components
  ui/*                   → components
  surfaces/*             → workspace surface compositions
  App                    → composition root (everything)
  index                  → bootstrap (renderer, entry point)
```

---

## 3. Module Dependency Rules

### Rule MDG-001: No upward imports

A file may only import from the same layer or a lower layer (closer to Layer 0).

### Rule MDG-002: No cross-imports between sibling services

Services compose at the runtime layer, not by direct import.

### Rule MDG-003: Reactive cells import services; services never import reactive cells

### Rule MDG-004: Commands import reactive cells; reactive cells never import commands

### Rule MDG-005: Input contexts are pure shapes

Input context definitions must not import from reactive cells or services. Values are provided by the composition root.

### Forbidden Patterns

| ID | Pattern | Why Forbidden |
|----|---------|--------------|
| F-001 | Circular imports between services | Services compose at runtime layer. |
| F-002 | UI components importing services directly | Go through reactive cells. |
| F-003 | Domain types depending on infrastructure | Domain is pure. |
| F-004 | Commands importing UI components | Commands manipulate reactive cells; renderer reads them. |
| F-005 | Input layer importing renderer hooks | Input contexts receive imperative functions from composition root. |

---

## 4. Boundary Contracts

### 4.1 RemoteService

All operations in Contract Notation:

```
Operation: listPullRequestPage
  in  : ItemListInput<PullRequest>   # {mode, repository?, cursor?, pageSize∈[1,100]}
  out : Page<PullRequest>            # {items[], endCursor?, hasNextPage}
  err : RemoteError
  impl: reference/reference-impl.md#listPullRequestPage

Operation: listIssuePage
  in  : ItemListInput<Issue>
  out : Page<Issue>
  err : RemoteError
  impl: reference/reference-impl.md#listIssuePage

Operation: listAllPullRequests
  in  : {mode, repository?}          # cursor/pageSize managed internally
  out : list of PullRequest
  err : RemoteError

Operation: listAllIssues
  in  : {mode, repository?}
  out : list of Issue
  err : RemoteError

Operation: getPullRequestDetails
  in  : (repository: text, number: whole)
  out : PullRequest
  err : RemoteError

Operation: getRepositoryDetails
  in  : (repository: text)
  out : RepositoryDetails
  err : RemoteError

Operation: getAuthenticatedUser
  in  : ()
  out : text (username)
  err : RemoteError

Operation: getPullRequestDiff
  in  : (repository: text, number: whole)
  out : text (raw unified diff)
  err : RemoteError

Operation: listPullRequestReviewComments
  in  : (repository: text, number: whole)
  out : list of ReviewComment
  err : RemoteError

Operation: listPullRequestComments
  in  : (repository: text, number: whole)
  out : list of Comment (both general + review, sorted by time)
  err : RemoteError

Operation: listIssueComments
  in  : (repository: text, number: whole)
  out : list of GeneralComment
  err : RemoteError

Operation: getPullRequestMergeInfo
  in  : (repository: text, number: whole)
  out : MergeInfo
  err : RemoteError

Operation: getRepositoryMergeMethods
  in  : (repository: text)
  out : {squash: yes/no, merge-commit: yes/no, rebase: yes/no}
  err : RemoteError

Operation: mergePullRequest
  in  : (repository: text, number: whole, action: MergeAction)
  out : ()
  err : transport-failure

Operation: closePullRequest
  in  : (repository: text, number: whole)
  out : ()
  err : transport-failure

Operation: closeIssue
  in  : (repository: text, number: whole)
  out : ()
  err : transport-failure

Operation: createPullRequestComment
  in  : CreateCommentInput
  out : ReviewComment
  err : RemoteError

Operation: createPullRequestIssueComment
  in  : (repository, number, body)
  out : GeneralComment
  err : RemoteError

Operation: replyToReviewComment
  in  : (repository, number, inReplyTo, body)
  out : GeneralComment
  err : RemoteError

Operation: editPullRequestIssueComment
  in  : (repository, commentId, body)
  out : GeneralComment
  err : RemoteError

Operation: editReviewComment
  in  : (repository, commentId, body)
  out : GeneralComment
  err : RemoteError

Operation: deletePullRequestIssueComment
  in  : (repository, commentId)
  out : ()
  err : transport-failure

Operation: deleteReviewComment
  in  : (repository, commentId)
  out : ()
  err : transport-failure

Operation: submitPullRequestReview
  in  : SubmitReviewInput
  out : ()
  err : transport-failure

Operation: toggleDraftStatus
  in  : (repository, number, isDraft: yes/no)
  out : ()
  err : transport-failure

Operation: listRepoLabels
  in  : (repository)
  out : list of Label
  err : RemoteError

Operation: addPullRequestLabel / removePullRequestLabel
  in  : (repository, number, label)
  out : ()
  err : transport-failure

Operation: addIssueLabel / removeIssueLabel
  in  : (repository, number, label)
  out : ()
  err : transport-failure
```

**Observations from contracts alone:**
- Read operations return domain entities; writes return nothing.
- Read operations can fail with RemoteError; writes can fail with transport-failure only.
- All operations are repository-scoped.
- Pagination is explicit in the input shape.

### 4.2 CacheService

```
Operation: readQueue
  in  : (viewer: text, view: PullRequestView)
  out : PullRequestLoad | absent
  err : CacheError

Operation: writeQueue
  in  : (viewer: text, load: PullRequestLoad)
  out : ()
  err : never                        # writes never surface errors

Operation: readPullRequest
  in  : {repository, number}
  out : PullRequest | absent
  err : CacheError

Operation: upsertPullRequest
  in  : PullRequest
  out : ()
  err : never

Operation: readIssueQueue / writeIssueQueue
  in  : (viewer, view: IssueView)
  out : IssueLoad | absent / ()
  err : CacheError / never

Operation: readIssue / upsertIssue
  in  : {repository, number} / Issue
  out : Issue | absent / ()
  err : CacheError / never

Operation: readRepoRollup
  in  : (viewer)
  out : list of {repository, pullRequestCount, issueCount, lastActivityAt}
  err : CacheError

Operation: readRepositoryDetails / writeRepositoryDetails
  in  : repository / RepositoryDetails
  out : RepositoryDetails | absent / ()
  err : CacheError / never

Operation: readRepositoryDetailsFetchedAt
  in  : repository
  out : point-in-time | absent
  err : CacheError

Operation: readWorkspacePreferences / writeWorkspacePreferences
  in  : viewer / WorkspacePreferences
  out : WorkspacePreferences | absent / ()
  err : CacheError / never

Operation: prune
  in  : ()
  out : ()
  err : never
```

**Observations:**
- Writes never fail (error channel is "never").
- Reads return entity-or-absent — misses are normal.
- Queue operations are viewer-scoped (multi-tenant).
- `prune` has no arguments — uses internal clock.

### 4.3 ProcessRunner

```
Operation: run
  in  : (command: text, args: list of text, options?)
  out : {exitCode, stdout, stderr}
  err : transport-failure

Operation: runSchema
  in  : (shape, command, args)
  out : decoded value (shape-dependent)
  err : transport-failure | parse-failure | decode-failure
```

**Observations:**
- `runSchema` is polymorphic — output shape depends on the input shape.
- `runSchema` can fail three ways: process failure, output parse failure, shape decode failure.

### 4.4 Startup & Repository Detection

```
Operation: detectCurrentGitHubRepository
  in  : ()
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # detection failure is silent

Operation: parseGitRemoteUrl
  in  : text (remote URL)
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # parse failure is silent

Operation: detectSystemAppearance
  in  : ()
  out : ThemeTone                    # "dark" or "light"
  err : never                        # detection failure defaults to "dark"
```

**Observations:**
- Repository detection is best-effort — failure means user must open repository manually.
- Remote priority: "origin" > "upstream" > alphabetical.
- System appearance detection uses platform-specific commands (macOS: defaults, Linux: gsettings).

### 4.5 Theme & Preference Persistence

```
Operation: loadStoredThemeConfig
  in  : ()
  out : ThemeConfig
  err : never                        # file read failure returns default

Operation: saveStoredThemeConfig
  in  : ThemeConfig
  out : ()
  err : never                        # file write failure is silent

Operation: loadStoredDiffWhitespaceMode
  in  : ()
  out : DiffWhitespaceMode
  err : never                        # file read failure returns "ignore"

Operation: readWorkspacePreferencesFile
  in  : (path: text, viewer: text)
  out : WorkspacePreferences-or-absent
  err : never                        # file read failure or viewer mismatch returns absent

Operation: writeWorkspacePreferencesFile
  in  : (path: text, preferences: WorkspacePreferences)
  out : ()
  err : never                        # file write failure is silent
```

**Observations:**
- All persistence operations are infallible — failures are silent.
- Theme config stored in `~/.config/ghui/config.json` (or XDG_CONFIG_HOME).
- Workspace preferences stored in cache directory, viewer-scoped.

### 4.4 Startup & Repository Detection

```
Operation: detectCurrentGitHubRepository
  in  : ()
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # detection failure is silent

Operation: parseGitRemoteUrl
  in  : text (remote URL)
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # parse failure is silent

Operation: detectSystemAppearance
  in  : ()
  out : ThemeTone                    # "dark" or "light"
  err : never                        # detection failure defaults to "dark"
```

**Observations:**
- Repository detection is best-effort — failure means user must open repository manually.
- Remote priority: "origin" > "upstream" > alphabetical.
- System appearance detection uses platform-specific commands (macOS: defaults, Linux: gsettings).

### 4.5 Theme & Preference Persistence

```
Operation: loadStoredThemeConfig
  in  : ()
  out : ThemeConfig
  err : never                        # file read failure returns default

Operation: saveStoredThemeConfig
  in  : ThemeConfig
  out : ()
  err : never                        # file write failure is silent

Operation: loadStoredDiffWhitespaceMode
  in  : ()
  out : DiffWhitespaceMode
  err : never                        # file read failure returns "ignore"

Operation: readWorkspacePreferencesFile
  in  : (path: text, viewer: text)
  out : WorkspacePreferences-or-absent
  err : never                        # file read failure or viewer mismatch returns absent

Operation: writeWorkspacePreferencesFile
  in  : (path: text, preferences: WorkspacePreferences)
  out : ()
  err : never                        # file write failure is silent
```

**Observations:**
- All persistence operations are infallible — failures are silent.
- Theme config stored in `~/.config/ghui/config.json` (or XDG_CONFIG_HOME).
- Workspace preferences stored in cache directory, viewer-scoped.

---

## 5. State & Reactivity

### 5.1 Reactive Cell Kinds

| Kind | Pattern | Example |
|------|---------|---------|
| Global UI cells | Static cell, kept alive | activeView, selectedIndex |
| Async data cells | Runtime-bound cell with reactive dependencies | pullRequests, username |
| Computed cells | Derived from other cells | displayedPullRequests |
| Override cells | Key-value map for optimistic updates | pullRequestOverrides |
| Function cells | Parameterized, one cell per argument | readCachedRepositoryDetails |
| Cache cells | Key-value map for in-memory caching | labelCache, repoMergeMethodsCache |

### 5.2 Reactive Dependencies

Inside a runtime-bound cell body, the `get` parameter registers a reactive dependency:

```
cell = runtime.cell(function* (get) {
  view = get(activeView)     # registers dependency on activeView
  github = require RemoteService
  # ...
})
```

**Rule:** A non-tracking read (reading a cell without registering dependency) must never be used inside a runtime cell body when reactivity is desired.

### 5.3 Async Results

UI components read async cells and handle three states:
- **waiting:** show loading indicator
- **failure:** show error (squashed from error cause)
- **value:** render data

### 5.4 Optimistic Updates

1. Write to override cell with optimistic state.
2. Fire remote service operation.
3. On success: override becomes redundant.
4. On failure: remove override, restoring server state.

### 5.5 Parameterized Cells and Garbage Collection

Function cells create one cell per argument value. These cells self-clean via weak references and finalization.

**Rule:** Never keep function cells alive artificially. It prevents garbage collection and accumulates one entry per argument value the user has ever viewed.

### 5.6 In-Memory Queue Load Cache

The queue load cache is a key-value map caching loaded pages in memory, keyed by view cache key. Repository-scoped entries are trimmed to a maximum of 8 entries to prevent unbounded growth.

---

## 6. Action / Command System

### 6.1 Command Definition Shape

```
Command:
  id: text (unique identifier)
  scope: text (category)
  shortcut: optional text (keybinding hint)
  keywords: optional list of text (search terms)
  title: text | reactive cell of text (dynamic title)
  subtitle: optional text | reactive cell of text
  when: optional reactive cell of yes/no (visibility gate)
  disabledReason: optional reactive cell of text-or-absent
  run: effect (the action to perform)
```

### 6.2 Principles

1. **Commands never close over component-local state.** Any value comes from a reactive cell.
2. **Dynamic titles/disabled reasons are reactive cells.** Palette evaluates them on every render.
3. **Hook-bound actions use handoffs.** Commands needing imperative renderer behavior invoke a named handoff slot, and the composition root registers a handler.

### 6.3 Three Command Shapes

1. **"Open this modal":** set the active modal cell to a new variant with initial state + seed data.
2. **"Toggle this cell":** update a cell's value via a transformation function.
3. **"Read selection, do thing with service":** read selection via cells, call a service operation.

### 6.4 Handoffs (the only escape hatch)

A handoff is a named slot that a renderer hook registers on mount, and commands invoke by name:

```
# In composition root:
onMount: registerHandoff("openDiffView", () => setDiffFullView(true))

# In command:
run: invokeHandoff("openDiffView")
```

Handoff identifiers: "quit", "openDiffView", "refreshPullRequests", "preserveDiffLocation", "viewAuthored", "viewReview", "viewAssigned", "viewMentioned".

### 6.5 Derivation Cells

Derivation cells compute dynamic command state (titles, subtitles, disabled reasons) from other cells. These are consumed by the command palette for live-updating command metadata.

---

## 7. Error Taxonomy

```
RemoteError = transport-failure | parse-failure | decode-failure

transport-failure:
  command: text
  args: list of text
  detail: text
  cause: opaque

parse-failure:
  command: text
  args: list of text
  stdout: text
  cause: opaque

decode-failure:
  shape: text
  cause: opaque

CacheError:
  operation: text
  cause: opaque
```

**Rule:** Every error must be a named family with a tag. Never use raw/untyped errors or plain text in the error channel.

### Recovery Strategies

| Error | Recovery | Evidence |
|-------|----------|----------|
| transport-failure (timeout) | Retry with backoff (6 retries, 300ms base, factor 2) | is-timeout predicate |
| transport-failure (rate limit) | Do not retry | is-rate-limit predicate |
| CacheError (read) | Treat as miss | catch → absent |
| CacheError (write) | Ignore silently | error channel is "never" |
| decode-failure | Treat as miss + log | map-error |

---

## 8. Extension Points

### Adding a Domain Entity

1. Add literal value-domains with const arrays in the domain module.
2. Add entity definition with all attributes immutable.
3. Add pure helper functions.
4. If cached: add cached shape, encoder, decoder in CacheService.

### Adding a Data Source

1. Add operation to RemoteService contract.
2. Implement via the json/void helper pattern.
3. Add response shape in schemas module.
4. Add parser in normalizer module.
5. Create parameterized runtime cell in the UI atoms module.
6. Wire into composition root or surface component.

### Adding a Workspace Surface

1. Add surface name to the surface definition.
2. Add labels and tab ordering.
3. Create surface component.
4. Add surface-specific reactive cells.
5. Add commands.
6. Add input context.
7. Register context in the full keymap composition.

### Adding a Modal

1. Add variant to the modal tagged enumeration with state shape.
2. Add initial state constant.
3. Add to initial states record.
4. Create modal component.
5. Add reactive cells if needed.
6. Add keymap and register in full keymap.
7. Add command.
8. Add active flag to the input context and scope predicate in keymap composition.

### Adding a Command

1. Define using the command definition helper.
2. Export from the commands barrel.
3. If handoff needed: register handoff slot, handle in composition root.
4. Add derivation cells for dynamic state.

### Adding Cache Persistence

1. Add table in new migration.
2. Add read/write to CacheService contract.
3. Implement storage operations.
4. Wire read into data-loading cell (stale-while-revalidate).
5. Wire write into success path of mutation/fetch.
6. Add to pruning if entity grows unbounded.

---

## 9. Design Decisions

### D-001: Plain domain entities over validated shapes

**Decision:** Domain entities are plain immutable records, not runtime-validated shapes.

**Rationale:** Runtime validation is for serialization boundaries (cache, API responses). Internal domain entities change frequently; adding validation overhead slows iteration.

**Trade-off:** Less runtime validation of internal data. Mitigated by compile-time types and test coverage.

### D-002: Storage library over direct database access

**Decision:** Cache uses a typed storage library, never direct database calls.

**Rationale:** The storage library provides typed queries, migrations, transactions, and error handling. Direct access bypasses all of these.

**Trade-off:** Slightly more boilerplate for simple queries. Mitigated by helper functions.

### D-003: Commands as values, not closures

**Decision:** Commands are pure definition values, not functions closing over renderer state.

**Rationale:** Makes commands dispatchable from keymap, palette, and tests without re-threading props. Dynamic state goes through reactive cells.

**Trade-off:** Commands needing imperative renderer behavior require the handoff pattern.

### D-004: One active modal cell

**Decision:** All modal state lives in a single tagged enumeration cell.

**Rationale:** Prevents modal state from leaking into global cells. Makes modal transitions atomic and exhaustive.

**Trade-off:** Modal-specific state is nested inside the enumeration, requiring pattern matching on the tag.

### D-005: Selection persistence per view key

**Decision:** Selection indices are cached per view cache key.

**Rationale:** Returning to a previously visited view restores the last selection index.

**Trade-off:** Selection map grows unbounded. Mitigated by capping to recent views.

### D-006: detailLoaded as boolean, not separate entity

**Decision:** PullRequest.detailLoaded is a boolean, not a separate summary-vs-detail type split.

**Rationale:** Prevents type explosion. Summary and detail are the same entity with different hydration levels. Cache merge logic uses the flag to preserve detail fields.

**Trade-off:** Consumers must check detailLoaded before accessing detail fields.

### D-007: Official CLI as sole remote API client

**Decision:** All remote platform API calls go through the official CLI binary, never direct HTTP.

**Rationale:** The CLI handles authentication, rate limiting, and API versioning. Avoids reimplementing the authentication flow.

**Trade-off:** Requires the CLI to be installed and authenticated. Cannot work in environments without it.

### D-008: Single composition root

**Decision:** The composition root is a single large component (~2800 lines) rather than decomposed into smaller context-providing components.

**Rationale:** All state lives in reactive cells, so there is no prop drilling. Decomposition would add indirection without reducing coupling.

**Trade-off:** Large file. Mitigated by clear internal sectioning and handoff registration.

---

## 10. External API Architecture

### 10.1 Two Query Patterns

The service uses two distinct remote API patterns:

**Search API** — for user-scoped queues (authored, review, assigned, mentioned):
- Sends a search query string with qualifiers (kind, author, repository, sort)
- Returns paginated results with cursor-based pagination

**Repository Connection** — for repo-scoped items (faster, authoritative ordering):
- Queries the repository's connection directly
- Used when mode is "all" with a non-null repository

**Routing logic:** mode "all" with a repository uses the repository connection. Everything else uses search.

### 10.2 Query Catalog

| Query | Purpose |
|-------|---------|
| pullRequestSummarySearch | Search for PR summaries via search API |
| issueSearch | Search for issues via search API |
| repositoryPullRequests | Repo-scoped PRs via repository connection |
| pullRequestDetail | Full PR detail via repository.pullRequest |
| repositoryDetails | Repository metadata |

### 10.3 Direct API Endpoints

| Endpoint | Purpose |
|---------|---------|
| repos/{repo}/pulls/{number}/files | Diff patch (paginated, slurped) |
| repos/{repo}/pulls/{number}/comments | Review comments (paginated, slurped) |
| repos/{repo}/issues/{number}/comments | Issue comments (paginated, slurped) |
| repos/{repo}/issues/comments/{id} | Edit/delete issue comment |
| repos/{repo}/pulls/comments/{id} | Edit/delete review comment |
| repos/{repo}/pulls/{number}/comments/{id}/replies | Reply to review comment |

### 10.4 CLI Subcommands

| Command | Purpose |
|---------|---------|
| pr merge | Merge a PR |
| pr close | Close a PR |
| pr review | Submit review |
| pr ready | Toggle draft status |
| pr view | Merge info |
| repo view | Repository merge methods |
| issue close | Close an issue |
| issue edit | Issue label management |
| pr edit | PR label management |
| label list | List available labels |
| api user | Authenticated user |
| git remote | List git remotes (for repository detection) |
| git remote get-url | Get URL for a specific remote (for repository detection) |

### 10.5 Helper Pattern

Two convenience wrappers around the process runner:
- **json helper:** runs a CLI command, decodes output against a shape, wraps in a span for observability.
- **void helper:** runs a CLI command, discards output, wraps in a span.

### 10.6 Generic Search Page Fetcher

A single generic function parameterized by the response shape and parser. Accepts a query string, a shape, and a parser. Returns a page fetcher that assembles CLI arguments and decodes the response.

### 10.7 Pagination via Streaming

Auto-pagination uses a streaming paginator that fetches pages lazily. Interrupting the surrounding fiber stops mid-flight. The fetch limit config caps total items.

(impl: reference/reference-impl.md#query-catalog, reference/reference-impl.md#CLI-Invocations)

---

## 11. Cache / Data Merge Strategy

### 11.1 The Core Problem

Summary queries (list pages) omit detail fields: body, labels, additions, deletions, changedFiles, checks, checkStatus, checkSummary. When a fresh summary page arrives, it would overwrite cached detail data, causing check indicators to revert to blank on every page fetch.

### 11.2 Merge Rule

```
For each fresh item:
  1. Look up cached item by URL
  2. If cached item has detailLoaded=yes AND commit identifier matches:
     → preserve body, labels, additions, deletions, changedFiles,
       checkStatus, checkSummary, checks, detailLoaded from cache
  3. Otherwise: use fresh item as-is
```

**Key rules:**
- Only merge if the cached item has detailLoaded=yes
- Only merge if the commit identifier matches — stale details for old commits are discarded
- Merge preserves all detail-only fields

### 11.3 Queue Snapshot Model

The cache stores queue ordering as snapshots:

```
queue_snapshots:
  viewer        — username or "anonymous"
  view_key      — e.g., "pullRequest:authored:_", "issue:assigned:owner/name"
  view_json     — serialized view definition
  pr_keys_json  — ordered list of item keys ["owner/name#1", "owner/name#2", ...]
  fetched_at    — point in time
  end_cursor    — pagination cursor for load-more
  has_next_page — whether more pages exist
```

The view_key prefix ("pullRequest:" vs "issue:") discriminates between PR and issue queues.

### 11.4 Atomic Read-Merge-Write

When writing a queue, the service performs an atomic transaction:
1. Read existing items for each key in the new queue
2. Apply the merge rule to preserve detail fields
3. Upsert all items
4. Write the queue snapshot

### 11.5 Disabled Layer Pattern

For mock/development mode, a disabled implementation provides no-op operations where all reads return absent and all writes are no-ops.

### 11.6 Pruning

Pruning deletes rows older than 30 days, but preserves items still referenced by any queue snapshot. This prevents orphaned items from accumulating while keeping referenced data intact.

(impl: reference/reference-impl.md#SQL-Migrations, reference/reference-impl.md#Pruning)

---

## 12. Input / Keymap System

### 12.1 Keymap Library

The keymap system is a workspace package providing:
- `context<Ctx>()` — creates a keymap definition bound to a context shape
- `.scope(predicate)` — conditionally activates a keymap layer
- Binding objects: `{id, title, keys, run, when?}`

### 12.2 Application Context Shape

The full context is the union of all active flags and narrow contexts:

```
AppContext:
  # 16+ active flags
  closeModalActive, mergeModalActive, commentModalActive, ...
  diffFullView, detailFullView, filterMode, textInputActive, ...

  # 16+ narrow contexts (one per keymap layer)
  closeModal: CloseModalCtx
  mergeModal: MergeModalCtx
  diff: DiffViewCtx
  listNav: ListNavCtx
  ...

  # Always-on actions
  openCommandPalette: () → ()
  handleQuitOrClose: () → ()
```

### 12.3 Layer Composition

The full keymap composes 21 layers in priority order:

1. **Always-on** (2 bindings): command palette opener, quit/close
2. **Modal layers** (13 layers, first matching wins)
3. **Filter mode**
4. **Full-view layers** (3, gated: no modal active)
5. **List nav** (lowest priority, gated: in list mode)

### 12.4 Scoping Predicates

```
modalActive(context) = OR of all 13 modal flags
inListMode(context) = NOT modalActive AND NOT filterMode AND NOT diffFullView AND NOT detailFullView AND NOT commentsViewActive
```

### 12.5 Diff View Keymap (vim-style)

| Binding | Action |
|---------|--------|
| j/k | Single-step anchor movement |
| ctrl+u/ctrl+d | Half-page movement (preserves viewport row) |
| shift+j/shift+k | Jump 8 lines |
| g g / shift+g | First/last comment anchor |
| z z/z t/z b | Align center/top/bottom |
| h/l | Select LEFT/RIGHT side |
| v | Toggle comment range |
| shift+v | Toggle unified/split view |
| w | Toggle word wrap |
| n/p | Next/previous thread |
| [/] | Previous/next file |
| f | Open changed files list |
| shift+r | Open submit review |
| Count prefixes (15j) | Vim count prefix support (1-99 × {j,k,up,down}) |

### 12.6 Keymap Helper Generators

```
Operation: countedVerticalBindings
  in  : moveBy function (ctx, delta) → ()
  out : list of binding configs
  approach: generate 99 × {k, up, j, down} bindings
            key format: "1 5 j" for count=15, key=j
            each binding calls moveBy(ctx, ±count)

Operation: defaultVerticalKeys
  out : { up: ["k", "up", "ctrl+p", "ctrl+k"],
          down: ["j", "down", "ctrl+n", "ctrl+j"] }
  purpose: standard vertical navigation chords (vim + arrows + emacs + readline)

Operation: confirmModalBindings
  in  : { id, close, confirm: { title, run, enabled? }, cancelTitle?, cancelKeys? }
  out : list of binding configs
  approach: escape closes, return confirms (with optional enabled gate)

Operation: selectionModalBindings
  in  : confirmModalBindings options + { move, verticalKeys? }
  out : list of binding configs
  approach: confirm bindings + up/down navigation with customizable keys
```

### 12.7 Context Purity

Keymap context shapes are pure — they must not import from reactive cells or services. The imperative functions they declare are provided by the composition root via mount effects and callbacks.

(impl: reference/reference-impl.md#Keymap-Composition)

---

## 13. Non-Trivial Algorithms

### 13.1 Patch Splitting

```
Operation: splitPatchFiles
  in  : text (raw multi-file unified diff)
  out : list of DiffFilePatch
  approach: match "diff --git" markers, split at boundaries
  edge: empty patch → empty list; no markers → single file named "diff"
  
  PROPERTY: For all patches P, length(splitPatchFiles(P)) equals the count of
            "diff --git" markers in P (or 0 if empty, 1 if no markers).
```

### 13.2 Hunk Normalization

```
Operation: normalizeHunkLineCounts
  in  : text (patch with potentially incorrect hunk headers)
  out : text (patch with corrected hunk headers)
  approach: walk each hunk body, count context/deletion/addition lines,
            rewrite @@ headers with actual counts
  why: the remote platform sometimes returns incorrect line counts
  
  PROPERTY: For all patches P, every hunk in normalizeHunkLineCounts(P) has
            header counts that match the actual line counts in the hunk body.
```

### 13.3 Whitespace Minimization

```
Operation: minimizeWhitespacePatch
  in  : text (patch)
  out : text (patch with whitespace-only changes collapsed to context)

  approach:
    For each hunk:
      1. Collect contiguous blocks of deletions and additions
      2. Compare by stripping all whitespace
      3. Find longest common subsequence of whitespace-equivalent lines
      4. Matched pairs become context lines; unmatched remain changes
      5. If hunk becomes empty, drop it
    If file has no remaining hunks, drop the file

  complexity: O(D × A) where D = deletions, A = additions per block
  fallback: [DERIVED:domain] when (D+1)×(A+1) > 40,000 cells,
            fall back to linear greedy matching
  correctness: always re-normalize hunk line counts after minimization
  
  PROPERTY: For all patches P, lineCounts(normalize(minimizeWhitespace(P)))
            equals the actual body counts in the minimized patch.
  PROPERTY: For all patches P where all changes are whitespace-only,
            minimizeWhitespace(P) produces an empty patch or drops the file.
```
(impl: reference/reference-impl.md#Diff-Algorithm)

### 13.4 Stacked Diff Files

```
Operation: buildStackedDiffFiles
  in  : list of DiffFilePatch, renderMode, wrapMode, width
  out : list of StackedDiffFilePatch (with computed vertical offsets)

  approach: sequential offset accumulation
    file[0]: headerLine=0, diffStartLine=2
    separator (1 line)
    file[1]: headerLine=N+3, diffStartLine=N+5
    ...
  each file carries headerLine, diffStartLine, diffHeight for scroll calculation
  
  PROPERTY: For all file lists F, the headerLine of file[i+1] equals
            headerLine(file[i]) + 2 + diffHeight(file[i]) + separator.
```

### 13.5 Comment Anchoring

```
Operation: getDiffCommentAnchors
  in  : DiffFilePatch, renderMode, wrapMode, width
  out : list of DiffCommentAnchor

  unified mode: deletions above additions, sequential renderLine
  split mode: alignSplitSides() pads shorter side to keep visual alignment;
              deletions and additions at same position share renderLine

  word wrap: estimatedWrappedLineCount(text, width, wrapMode)
    = max(1, ceil(charWidth(text) / max(1, width)))  when wrapMode=word
    = 1                                                when wrapMode=none
  
  PROPERTY: For all diffs D in split mode, if deletions and additions share
            a position, they MUST have the same renderLine value.
  PROPERTY: For all diffs D, renderLine values are monotonically increasing.
```

### 13.6 Filter Scoring

```
Operation: filterScore
  in  : item, query text
  out : number | absent (null = no match, filtered out)

  approach:
    fields = [title, repository, number, author, labels, body]  (priority order)
    For each field: find indexOf(query) in lowercased field
    score = fieldIndex × 1000 + matchOffset
    Return minimum score across all matching fields

  sorting: ascending by score, then descending by time for ties
  
  PROPERTY: For all items I and queries Q, if Q matches I.title at position P1
            and I.body at position P2, then filterScore(I, Q) uses P1 (title wins).
  PROPERTY: For all items I and empty query "", filterScore(I, "") = 0 (no filtering).
```
(impl: reference/reference-impl.md#Filter-Algorithm)

---

## 14. Rendering / Framework Model

### 14.1 Primitive Model

The terminal renderer provides three core elements:

| Element | Purpose |
|---------|---------|
| Container | Layout container with flexbox-like properties (direction, padding, gap, width, height) |
| Scrollable | Scrollable container with scroll position and scroll events |
| Text | Text rendering with inline styled segments |

These are terminal elements, not HTML. They render to terminal cells.

### 14.2 Layout Model

Layout uses a subset of flexbox concepts:
- `flexDirection`: "row" | "column"
- `width`, `height`: fixed or percentage
- `flexGrow`: proportional growth
- `paddingLeft`, `gap`: spacing
- `backgroundColor`: per-element background

### 14.3 Split Pane

A two-pane layout computed in the composition root:
- Left pane: fixed width (list)
- Right pane: remaining width (detail)
- Layout math (pane widths, heights) is computed once and passed as props

### 14.4 Modal Frame

Modals render inside a bordered frame. **Critical convention:** when a modal contains a horizontal divider, the divider's row index must be threaded through the frame's junction-rows property so the side borders render junction characters at that row instead of plain vertical bars.

### 14.5 Syntax Highlighting

A syntax style maps token categories (keyword, string, comment, number, function, etc.) to foreground colors and text styles (bold, italic). Used for diff code highlighting.

### 14.6 Inline Segments

Inline markdown rendering (bold, italic, code spans, links) within text elements. Segments are arrays of {text, style} objects.

---

## 15. Composition Root Patterns

### 15.1 Single Composition Root

The composition root (~2800 lines) reads reactive cells, registers handoffs, and renders the full component tree. It is the single point where all layers converge.

### 15.2 Modal Setter Factory

A generic factory creates type-safe modal state setters:

```
setMergeModal = makeModalSetter("Merge", initialMergeModalState)
# Usage:
setMergeModal({repository, number, info, allowedMethods})
# Produces: set active modal to Merge with initial state merged with overrides
```

This ensures every modal open includes all required initial state fields.

### 15.3 Generation-Based Staleness Detection

Async operations use a generation counter to detect if a refresh happened while the operation was in flight:

```
generationRef = ref(0)

refresh = () => {
  generation = ++generationRef.current
  runAsync(fetchData()).then(data => {
    if generation ≠ generationRef.current: return  # stale, discard
    applyData(data)
  })
}
```

Used for: comment loading, diff loading, detail hydration.

### 15.4 Comment Mutations Hook

Encapsulates all comment CRUD operations in a single hook. Each mutation:
1. Applies optimistic update to the relevant cell
2. Calls the remote service
3. On success: replaces optimistic data with server response
4. On failure: reverts optimistic update, shows error notice

### 15.5 Auto-Load-More

Pagination triggers automatically based on two thresholds:

| Constant | Value | Meaning |
|----------|-------|---------|
| Selection threshold | [DERIVED:domain] 8 | Items from end of list |
| Scroll threshold | [DERIVED:domain] 3 | Rows from bottom of viewport |

When the selection index is within the selection threshold of the list end, or the scroll position is within the scroll threshold of the bottom, the next page is fetched.

### 15.6 Handoff Registration

The composition root registers imperative handlers for commands that need hook-local state:

```
onMount:
  registerHandoff("quit", () => destroy renderer)
  registerHandoff("openDiffView", () => setDiffFullView(true))
  registerHandoff("refreshPullRequests", () => refreshPullRequests())
  registerHandoff("preserveDiffLocation", () => preserveDiffLocation())
```

### 15.7 Keymap Context Provision

The composition root provides all keymap context values by reading reactive cells and creating callbacks:

```
keymapContext = {
  closeModalActive: isCloseModal(activeModal),
  mergeModalActive: isMergeModal(activeModal),
  diffFullView: diffFullViewValue,
  textInputActive: isTextInputActive(activeModal),
  closeModal: { handleConfirm: () => closePullRequest(), ... },
  diff: { moveAnchor: (delta) => moveDiffAnchor(delta), ... },
  listNav: { moveUp: () => moveSelection(-1), ... },
}
```

---

## 16. Architectural Fitness Function

> **Purpose:** A machine-checkable specification of the architecture's invariants.
> This is NOT a description — it is a set of rules that MUST be implemented as an
> automated check in the target repo and run on every commit. When a rule fails,
> the build fails. This is the wall that stops features from eroding the design.

### How to read this

Each rule has: an ID, a STATEMENT (language-neutral), a DETECTION recipe (how a
check proves it), and a SEVERITY. Stage 2 binds each rule to a concrete tool in
the target language (e.g. dependency-cruiser / go-arch-lint / cargo-deny /
import-linter / a custom test). Every rule must end up GREEN in CI.

### 16.1 Dependency-Direction Rules (the spine)

#### Layer → Path Mapping

Derived from §2. Stage 2 binds these to concrete module paths in the target language.

| Layer | Name | Path pattern (reference) |
|-------|------|-------------------------|
| 0 | External Systems | (external — not in repo) |
| 1 | Infrastructure | `services/CommandRunner`, `services/BrowserOpener`, `services/Clipboard`, `config`, `observability` |
| 2 | Services | `services/githubSchemas`, `services/githubNormalize`, `services/GitHubService`, `services/CacheService`, `services/MockGitHubService` |
| 3 | Runtime Composition | `services/runtime` |
| 4 | Domain Logic (pure) | `domain`, `item`, `pullRequestViews`, `issueViews`, `pullRequestLoad`, `issueLoad`, `pullRequestCache`, `workspacePreferences`, `workspaceSurfaces`, `errors`, `themeConfig`, `mergeActions` |
| 5 | State / Reactive Cells | `ui/*/atoms`, `workspace/atoms` |
| 6 | Commands | `commands/*` |
| 7 | Input / Keymap | `keymap/*`, `packages/keymap/*` |
| 8 | UI Components | `ui/*`, `surfaces/*`, `App`, `index` |

#### Rules

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-DEP-001 | A module in layer N may import only from layers ≤ N. | Build the import graph; assert no edge points to a higher layer. | BLOCK |
| FIT-DEP-002 | No import cycles between modules. | Tarjan SCC on import graph; assert all SCCs size 1. | BLOCK |
| FIT-DEP-003 | Domain layer (Layer 4) imports nothing outside the domain layer. | Assert domain modules' out-edges ⊆ domain. | BLOCK |
| FIT-DEP-004 | The state/reactive layer (Layer 5) is the ONLY layer holding mutable state. | Grep/AST: mutable-state primitives appear only under the state layer path. | BLOCK |
| FIT-DEP-005 | UI/presentation (Layer 8) never imports the I/O/external-client layer (Layer 1) directly; it goes through the state layer. | Assert no edge from UI modules to infrastructure modules. | BLOCK |
| FIT-DEP-006 | Sibling services (Layer 2) do not import each other; they compose only at the composition root (Layer 3). | Assert no edge between two service modules; only runtime may import both. | BLOCK |
| FIT-DEP-007 | Commands (Layer 6) never import UI components (Layer 8). | Assert no edge from commands/* to ui/*.tsx or surfaces/*. | BLOCK |
| FIT-DEP-008 | Keymap contexts (Layer 7) are pure — no imports from state (Layer 5) or services (Layer 2). | Assert keymap/contexts/* imports only from keymap library and domain. | BLOCK |

### 16.2 Boundary & Error Rules

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-ERR-001 | Every error crossing a module boundary is a typed error-family member, never a raw/string/untyped error. | AST check on public fn return/error types at boundaries. | BLOCK |
| FIT-ERR-002 | Write operations to the local store never surface errors to callers (their error-kind is `never`/infallible). | Assert store-write signatures carry no error in their public type. | BLOCK |
| FIT-BND-001 | Every public boundary operation has a complete, explicit type/contract (no inferred-any at boundaries). | Type/compile in max-strict mode; assert zero implicit-any/unknown leaks at boundaries. | BLOCK |
| FIT-BND-002 | Remote service read operations return domain entities; write operations return nothing (void/unit). | AST: read fns return domain types; write fns return void/unit. | WARN |
| FIT-BND-003 | All remote service operations are repository-scoped (first parameter is repository identifier). | AST: every RemoteService operation takes repository as first arg. | WARN |

### 16.3 State & Purity Rules

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-STATE-001 | No global mutable state exists outside the designated state system (Layer 5). | Grep for module-level mutable globals outside state layer. | BLOCK |
| FIT-STATE-002 | Domain & pure modules (Layer 4) perform no I/O (no network/disk/process/clock). | Assert pure modules don't import I/O capabilities. | BLOCK |
| FIT-STATE-003 | Per-argument/family caches are garbage-collectable (no permanent pinning). | Assert "keep-alive/leak" markers are absent on family caches. | WARN |
| FIT-STATE-004 | Reactive cell bodies use dependency-tracking reads, not non-tracking reads. | AST: inside runtime-bound cell bodies, only tracking reads are used. | BLOCK |
| FIT-STATE-005 | Commands never close over component-local state; all values come from reactive cells or handoffs. | AST: command run functions reference only cells, services, and handoff invocations. | WARN |

### 16.4 Taste / Complexity Budgets

Derived from the reference implementation's observed sizes. Stage 2 re-tunes
these for the target language's idioms.

| ID | Statement | Detection | Severity | Reference value |
|----|-----------|-----------|----------|-----------------|
| FIT-SIZE-001 | A module's public surface ≤ MAX_EXPORTS exports (except the composition root). | Count public exports per module. | WARN | 30 |
| FIT-SIZE-002 | A function ≤ MAX_FN_LINES lines (except generated/composition code). | Line count per function. | WARN | 100 |
| FIT-SIZE-003 | Cyclomatic complexity ≤ MAX_CC per function. | Complexity linter. | WARN | 20 |
| FIT-SIZE-004 | The composition root is the ONLY module allowed to exceed MAX_COMPOSITION_LINES. | Line count; whitelist only the composition root. | WARN | 3000 |
| FIT-IMM-001 | Data structures crossing boundaries are immutable/readonly by default. | AST: boundary types declared immutable. | WARN | — |
| FIT-IMM-002 | Domain entity attributes are all immutable. | AST: domain entity fields are readonly/const. | BLOCK | — |

> WARN rules are budgets, not blockers — but the Drift Audit (§17) tracks
> their trend. A rising WARN count is an early drift signal.

### 16.5 Conformance Linkage Rules (ties code to the spec)

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-SPEC-001 | Every [ESSENTIAL] SPEC in behavior-spec.md has ≥1 passing test whose name encodes the SPEC/invariant ID. | Parse SPEC IDs; assert a matching test exists and passes. | BLOCK |
| FIT-SPEC-002 | Every domain invariant ID (D/S/U-###) maps to ≥1 SPEC. | Cross-reference domain.md ↔ behavior-spec.md. | BLOCK |
| FIT-SPEC-003 | No test references a retired SPEC; no SPEC is silently weakened. | Diff SPEC set vs test set across commits. | BLOCK |
| FIT-SPEC-004 | Every impl: pointer in technical-spec.md resolves to an existing anchor in reference/reference-impl.md. | Parse impl: pointers; assert anchor exists. | BLOCK |
| FIT-SPEC-005 | Every Source: citation in behavior-spec.md points to an existing file:line in the reference. | Parse Source: citations; assert file exists and line is in range. | WARN |

### 16.6 Output the check as code

Stage 2 MUST produce an executable `fitness` check (a test target or script) that
evaluates rules 16.1–16.5 and exits non-zero on any BLOCK failure. It runs in CI BEFORE
the feature test suite.

#### Binding Table (filled by Stage 2)

| Rule family | Target language mechanism |
|-------------|--------------------------|
| FIT-DEP-* | e.g. dependency-cruiser config / go-arch-lint yaml / cargo-deny / import-linter / archtest |
| FIT-ERR-* | e.g. compiler strict flags + a boundary-types test |
| FIT-STATE-* | e.g. AST linter + grep patterns + custom test |
| FIT-SIZE-* | e.g. complexity linter + line-count script |
| FIT-IMM-* | e.g. compiler readonly enforcement + AST check |
| FIT-SPEC-* | a generated test that scans behavior-spec.md and the test registry |

#### CI Integration

```
fitness check  →  format-check  →  typecheck/compile  →  lint  →  test suite
     ↑                                                        ↑
  runs FIRST                                          runs AFTER fitness
  BLOCK failure = build fails                         SPEC regressions = build fails
```

---

## 17. Cross-Cutting Invariants

These invariants appear across multiple layers. Each states an [ESSENTIAL] requirement
neutrally, then tags the reference implementation's mechanism as [INCIDENTAL:<paradigm>].

### 17.1 Staleness Guard

**[ESSENTIAL] Invariant**: Stale async results MUST NOT overwrite fresher state.

When an async operation completes, the system MUST verify the result is still current
before applying it. If a newer operation has started, the stale result is discarded.

**[INCIDENTAL:reactive-runtime] Reference mechanism**: Generation counter
```
generationRef = ref(0)

refresh = () => {
  generation = ++generationRef.current
  runAsync(fetchData()).then(data => {
    if generation ≠ generationRef.current: discard  # stale
    applyData(data)
  })
}
```

**Used in reference**: 
- `useDetailHydration` (PR detail fetches)
- `useLoadMore` (pagination)
- `useMergeFlow` (merge operations)
- `useRepositoryDetails` (repo metadata)

### 17.2 Optimistic Rollback

**[ESSENTIAL] Invariant**: UI responds immediately to user actions; if the server rejects
the action, the UI reverts to the pre-action state and shows an error.

Optimistic updates MUST be distinguishable from server-confirmed state so they can be
selectively reverted on failure.

**[INCIDENTAL] Reference mechanism**: Local ID prefix
```
1. Generate optimistic ID ("local:{timestamp}")
2. Insert optimistic entity into state
3. Fire server request
4. On success: swap optimistic ID → server ID
5. On failure: remove optimistic entity, show error
```

**Used in reference**:
- `useCommentMutations` (all comment CRUD)
- `useMergeFlow` (merge state updates)

### 17.3 Cache-Then-Network

**[ESSENTIAL] Invariant**: Provide instant response from cache, then update with fresh
data from network. Cache writes MUST happen only after successful network fetch.

This ensures users see immediate content while still getting fresh data, and prevents
cache corruption from failed network requests.

**[INCIDENTAL] Reference mechanism**: Double-write pattern
```
1. Read from cache (SQLite)
2. If cache hit + valid: apply immediately
3. Fetch from network
4. On success: apply network data, write to cache
5. On failure: keep cache data, show error
```

**Used in reference**:
- `useDetailHydration` (PR details)
- `useRepositoryDetails` (repo metadata)
- Queue load cache (PR/issue lists)

---

## 18. Layer Effect Requirements

Each layer declares the effects it REQUIRES and the effects it PROVIDES.

| Layer | Requires | Provides |
|-------|----------|----------|
| 0 (External) | — | Process, Network, Storage, Terminal |
| 1 (Infrastructure) | Process, Storage | CommandRunner, CacheClient |
| 2 (Services) | CommandRunner, CacheClient | GitHubService, CacheService |
| 3 (Runtime) | GitHubService, CacheService | Runtime (merged services) |
| 4 (Domain) | — | Pure functions (no effects) |
| 5 (State) | Runtime | Reactive cells, async data |
| 6 (Commands) | Reactive cells | Command dispatch |
| 7 (Keymap) | — | Pure context shapes |
| 8 (UI) | Command dispatch, Reactive cells | Rendered interface |

**Rule MDG-009**: A layer may only use effects from layers below it.
**Rule MDG-010**: Layer 4 (Domain) MUST be effect-free (pure).

---

## Changelog

### 2026-05-30 (v0.7.1-r5)
- Moved §19 Idiom Translation Table to reference/idiom-notes.md (violated Quarantine Rule by naming specific libraries).
- Added PROPERTY invariants to §13 algorithms.
- Retagged §17 as Cross-Cutting Invariants with [ESSENTIAL] requirements and [INCIDENTAL] mechanisms.

### 2024-05-30 (v0.7.1-r4)
- Added section 17: Cross-Cutting Patterns (generation guard, optimistic-rollback, cache-then-network).
- Added section 18: Layer Effect Requirements (MDG-009, MDG-010).
- Added section 19: Idiom Translation Table (10 concept→idiom mappings).

### 2024-05-30 (v0.7.1-r3)
- Rewritten in Contract Notation per Quarantine Rule.
- Zero library/framework proper nouns in normative text.
- All 15 sections preserved: layers, dependency rules, boundary contracts, state/reactivity, command system, error taxonomy, extension points, design decisions, external API architecture, cache merge strategy, keymap system, algorithms, rendering model, composition root patterns.
- Added portability tags ([DERIVED:domain], [DERIVED:platform]) to constants.
- Added impl: pointers to reference/reference-impl.md.
- Added section 16: Architectural Fitness Function (24 rules across 5 categories).

### 2024-05-29 (v0.7.1-r2)
- Added sections 10-15.

### 2024-05-27 (v0.7.1)
- Initial version.
