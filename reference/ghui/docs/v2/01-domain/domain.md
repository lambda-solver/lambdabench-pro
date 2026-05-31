# Domain Specification

> **Version:** 0.7.1
> **Purpose:** What the system IS — the problem domain, entities, workflows, and invariants.
> Written as a domain expert who has never seen code. ZERO framework/library/language nouns.

---

## 1. System Overview

### Value Proposition

A local-first terminal application for browsing, reviewing, and managing code review items and issue trackers from a remote code hosting platform. It runs entirely in the terminal, fetches data from the platform's API via its official command-line tool, caches data locally for instant startup, and provides a keyboard-driven interface.

### Target User

A developer who reviews code changes, manages issues, prefers terminal workflows, and wants to operate without switching to a browser.

### The ONE System Invariant

**Network is authoritative; local cache accelerates.** The application always presents the freshest network data available, but renders cached data immediately rather than showing blank screens during network fetches.

### External Dependencies (as Roles)

| Role | Responsibility |
|------|---------------|
| **Remote Platform CLI** | Sole gateway to the code hosting platform's API. Handles authentication, rate limiting, and API versioning. Must be installed and authenticated. |
| **Local Database** | Persistent key-value and relational storage for cached items, queue ordering, user preferences. |
| **Terminal Renderer** | Renders the user interface in the terminal. Handles keyboard input, screen layout, and text rendering. |
| **System Clipboard** | Copy/paste operations for URLs and text. |
| **System Browser** | Opening URLs in the user's default browser. |

---

## 2. Domain Model

### Entity: PullRequest

```
Identity: (repository, number)
  — same repository + number ⇒ same pull request, regardless of other attributes.

Attributes:
  - repository: text ("owner/name" format)
  - number: whole number
  - title: text
  - body: text (long-form description, may be empty)
  - author: text (username)
  - state: one of {open, closed, merged}
  - reviewStatus: one of {draft, approved, changes, review, none}
  - checkStatus: one of {passing, pending, failing, none}
  - checkSummary: optional text (human-readable check summary)
  - checks: list of CheckItem
  - headRefOid: text (current commit identifier)
  - headRefName: text (source branch name)
  - baseRefName: text (target branch name)
  - defaultBranchName: text
  - labels: list of Label
  - additions: whole number (lines added)
  - deletions: whole number (lines removed)
  - changedFiles: whole number
  - autoMergeEnabled: yes/no
  - detailLoaded: yes/no
  - createdAt, updatedAt: points in time
  - closedAt: optional point in time
  - url: text (canonical link)

Rules:
  - [ESSENTIAL] detailLoaded is yes IFF body, labels, checks, and line counts are populated.
  - [ESSENTIAL] All attributes are immutable — updates produce new values, never mutate.
  - [ESSENTIAL] Dates are always points in time, never text representations.
```
(impl: reference/reference-impl.md#PullRequestItem)

### Entity: Issue

```
Identity: (repository, number)

Attributes:
  - repository, number, title, body, author: as PullRequest
  - state: one of {open, closed}
  - labels: list of Label
  - commentCount: whole number
  - createdAt, updatedAt: points in time
  - url: text

Rules:
  - [ESSENTIAL] Issues share identity shape with PullRequests but have a different lifecycle.
  - [ESSENTIAL] Issues cannot be "review-requested" — that concept is PullRequest-only.
```
(impl: reference/reference-impl.md#IssueItem)

### Concept: Label

```
Attributes:
  - name: text
  - color: optional text (hex color code)
```

### Concept: CheckItem

```
Attributes:
  - name: text
  - status: one of {completed, in-progress, queued, pending}
  - conclusion: one of {success, failure, neutral, skipped, cancelled, timed-out} or absent

Rules:
  - [ESSENTIAL] conclusion is only present when status is "completed".
```

### Concept: CheckRollup

```
How individual checks produce the aggregate checkStatus:

  Condition                                          → Rollup
  ─────────────────────────────────────────────────────────────
  No checks exist                                    → none
  Any check status is not "completed"                → pending
  Any check concluded failure/cancelled/timed-out    → failing
  All checks concluded success/neutral/skipped       → passing

Rules:
  - [ESSENTIAL] Evaluation order matters: pending beats failing beats passing beats none.
    A single in-progress check makes the whole rollup "pending" even if other
    checks have already failed.
```
(impl: reference/reference-impl.md#getCheckInfoFromContexts)

### Concept: Comment — one of:

```
- GeneralComment:
    Attributes: id, author, body, when (optional point in time), link (optional text)
    Rule: [ESSENTIAL] Never carries file/line/side information.

- ReviewComment:
    Attributes: id, author, body, when (optional), link (optional),
                file (text path), line (whole number),
                side: one of {LEFT, RIGHT},
                replyTo (optional comment id)
    Rule: [ESSENTIAL] Always carries file, line, and side.
    Rule: [ESSENTIAL] side LEFT = old/deleted content; RIGHT = new/added content.
```
(impl: reference/reference-impl.md#PullRequestComment)

### Concept: MergeAction — one of:

```
- MergeNow:      { method: one of {squash, merge, rebase} }
- AutoMerge:     { method: one of {squash, merge, rebase} }
- AdminMerge:    { method: one of {squash, merge, rebase} }
- DisableAuto:   { }   (no method needed)

Rules:
  - [ESSENTIAL] The merge dialog only shows methods the repository allows.
  - [ESSENTIAL] AdminMerge is only available when the viewer has admin merge permission.
  - [ESSENTIAL] AutoMerge is only available when the item is open, not already auto-merge-enabled, and not conflicting.
  - [ESSENTIAL] DisableAuto is only available when auto-merge is currently enabled.
```
(impl: reference/reference-impl.md#PullRequestMergeAction)

### Concept: MergeInfo

```
Attributes:
  - repository, number, title: as PullRequest
  - state: one of {open, closed, merged}
  - isDraft: yes/no
  - mergeable: one of {mergeable, conflicting, unknown}
  - reviewStatus, checkStatus, checkSummary: as PullRequest
  - autoMergeEnabled: yes/no
  - viewerCanMergeAsAdmin: yes/no

Rules:
  - [ESSENTIAL] "Cleanly mergeable" requires: state=open, not draft, mergeable=mergeable,
    reviewStatus not in {changes, review}, checkStatus not in {pending, failing}.
```
(impl: reference/reference-impl.md#PullRequestMergeInfo)

### Concept: RepositoryDetails

```
Attributes:
  - repository: text
  - description: optional text
  - url: text
  - stargazerCount, forkCount, openIssueCount, openPullRequestCount: whole numbers
  - defaultBranch: optional text
  - pushedAt: optional point in time
  - isArchived, isPrivate: yes/no
```
(impl: reference/reference-impl.md#RepositoryDetails)

### Sub-Domain: DiffView

```
Concept: DiffRenderMode — one of {unified, split}
  - unified: deletions above additions in a single column
  - split: deletions (left) and additions (right) aligned on the same row

Concept: DiffWrapMode — one of {none, word}
  - none: lines do not wrap
  - word: lines wrap at terminal width

Concept: DiffWhitespaceMode — one of {ignore, show}
  - ignore: whitespace-only changes are minimized (collapsed to context)
  - show: all changes displayed

Concept: DiffCommentAnchor
  Attributes:
    - file: text (file path)
    - line: whole number (original line number)
    - side: one of {LEFT, RIGHT}
    - kind: one of {addition, deletion, context}
    - renderLine: whole number (visual row in rendered output)
    - colorLine: whole number (row for syntax highlighting)
    - text: text (line content without diff prefix)

Concept: DiffFilePatch
  Attributes:
    - name: text (file path)
    - filetype: optional text (for syntax highlighting)
    - patch: text (raw unified diff)

Concept: DiffState — one of:
  - Loading
  - Ready: { patch: text, files: list of DiffFilePatch }
  - Error: { message: text }

Rules:
  - [ESSENTIAL] Scroll position is preserved when toggling render mode, wrap mode, or whitespace mode.
  - [ESSENTIAL] Whitespace minimization must not remove all hunks from a file silently —
    if all hunks become empty, the entire file is dropped from the diff view.
  - [ESSENTIAL] In split view, deletion and addition lines at the same position are visually aligned.
```
(impl: reference/reference-impl.md#DiffView)

### Sub-Domain: CommentTarget

```
Concept: CommentTarget — one of:
  - DiffComment:    (comment on a diff line)
  - IssueComment:   (comment on an issue)
  - Reply:          { inReplyTo: comment id, anchorLabel: text }
  - Edit:           { commentId: text, commentTag: one of {comment, review-comment}, anchorLabel: text }

Rules:
  - [ESSENTIAL] Reply must reference an existing comment identifier.
  - [ESSENTIAL] Edit must match the author's comment and carry the correct tag.
  - [ESSENTIAL] Diff comments are anchored to a specific file, line, and side.
```
(impl: reference/reference-impl.md#CommentModalTarget)

### Sub-Domain: Theme

```
Concept: ThemeMode — one of {fixed, system}
  - fixed: always use the specified theme
  - system: follow terminal appearance (dark/light)

Concept: ThemeTone — one of {dark, light}

Concept: ThemeConfig — one of:
  - FixedTheme:    { theme: theme identifier }
  - SystemTheme:   { darkTheme: theme identifier, lightTheme: theme identifier }

The system supports 27 named themes (e.g., "ghui", "tokyo-night", "catppuccin",
"gruvbox", "nord", "dracula", "solarized-dark", "solarized-light", etc.).

Each theme defines a ColorPalette with named color slots:
  - background, modalBackground, text, muted, separator, accent, link, inlineCode, error
  - selectedBg, selectedText, count
  - status colors: draft, approved, changes, review, none, passing, pending, failing
  - diff colors: addedBg, removedBg, contextBg, lineNumberBg, addedLineNumberBg, removedLineNumberBg

Rules:
  - [ESSENTIAL] In system mode, the active theme follows the terminal's appearance.
  - [ESSENTIAL] Theme changes apply immediately without restart.
  - [ESSENTIAL] Theme choice is persisted across sessions.
```
(impl: reference/reference-impl.md#ThemeConfig)

### Sub-Domain: ItemList

```
Concept: ItemKind — one of {pullRequest, issue}

Concept: ListMode — one of {all, authored, assigned, mentioned, review}
  - "review" is PullRequest-only; issues cannot be review-requested.
  - [ESSENTIAL] "all" requires a non-null repository scope.
    Without it, the query means "every item on the platform" — never intentional.

Concept: ListInput
  Attributes:
    - kind: ItemKind
    - mode: ListMode (restricted by kind)
    - repository: optional text
    - cursor: optional text (pagination token)
    - pageSize: whole number in [1, 100]

Concept: Page<T>
  Attributes:
    - items: list of T
    - endCursor: optional text
    - hasNextPage: yes/no

Concept: CacheKey
  Format: "{kind}:{mode}:{repository-or-underscore}"
  Example: "pullRequest:authored:_", "issue:assigned:owner/name"
  Rule: [ESSENTIAL] Two queries differing only in text filter share a cache key.
    Typing in the filter must not evict loaded pages.
```
(impl: reference/reference-impl.md#ItemListInput)

### Sub-Domain: WorkspaceSurface

```
Concept: WorkspaceSurface — one of {repos, pullRequests, issues}
  - repos: browse tracked repositories with item counts
  - pullRequests: browse and review pull requests
  - issues: browse and manage issues

Rules:
  - [ESSENTIAL] Only one surface is active at a time.
  - [ESSENTIAL] Switching surfaces resets transient state (detail view, diff view, selections).
  - [ESSENTIAL] The issue view's repository scope is synchronized to the pull request view's scope.
```

### Sub-Domain: PullRequestView

```
Concept: PullRequestView — one of:
  - RepositoryView: { repository: text }
  - QueueView:      { mode: one of {authored, review, assigned, mentioned}, repository: optional text }

Rules:
  - [ESSENTIAL] RepositoryView requires a non-null repository.
  - [ESSENTIAL] QueueView can be global (repository absent) or scoped to a repository.
```
(impl: reference/reference-impl.md#PullRequestView)

### Sub-Domain: StartupRepositoryDetection

```
Concept: GitRemoteUrl — text matching GitHub remote patterns
  Patterns accepted:
    - https://github.com/owner/repo
    - https://github.com/owner/repo.git
    - git@github.com:owner/repo.git

Concept: RemotePriority — ordering for repository detection
  Order: "origin" > "upstream" > alphabetical

Rules:
  - [ESSENTIAL] Remote URL parsing accepts both HTTPS and SSH formats.
  - [ESSENTIAL] .git suffix is stripped from repository names.
  - [ESSENTIAL] Detection prefers "origin" remote, then "upstream", then alphabetical.
  - [ESSENTIAL] Detection failure is silent — user must open repository manually.
```
(impl: reference/reference-impl.md#Startup-Repository-Detection)

### Sub-Domain: ViewSynchronization

```
Concept: ViewProjection — mapping PullRequestView to IssueView
  Rules:
    - [ESSENTIAL] RepositoryView(repo) projects to RepositoryView(repo).
    - [ESSENTIAL] QueueView(mode, null) projects to QueueView("authored", null).
    - [ESSENTIAL] QueueView(mode, repo) projects to RepositoryView(repo).
    - [ESSENTIAL] Projection is total — every PR view has a defined issue counterpart.
```
(impl: reference/reference-impl.md#View-Synchronization)

---

## 3. User Workflows

### 3.1 Browse Items

```
1. User launches the application.
2. Cached item list renders immediately (if available).
3. Background fetch refreshes from the remote platform.
4. User navigates with keyboard (up/down or j/k).
5. User opens an item with enter to see details.

Invariant: [ESSENTIAL] The list must never be empty due to a network error if cached data exists.
Invariant: [ESSENTIAL] Cache failures are silent — the user never sees a cache error.
```

### 3.2 Review a Pull Request

```
1. User selects a pull request from the list.
2. User opens diff view.
3. User navigates diff lines and adds review comments.
4. User submits review (choosing comment, approve, or request-changes).

Invariant: [ESSENTIAL] Diff comments must be anchored to a specific line and side.
Invariant: [ESSENTIAL] A review submission sends all pending review comments atomically.
```

### 3.3 Merge a Pull Request

```
1. User selects an open pull request.
2. User opens merge dialog.
3. Dialog shows allowed merge methods for the repository.
4. User selects method and confirms.
5. UI shows optimistic merge state; network confirms.

Invariant: [ESSENTIAL] The merge action validates the item is open and mergeable before sending.
Invariant: [ESSENTIAL] On merge failure, optimistic state is reverted.
```

### 3.4 Switch Workspace Surface

```
1. User presses 1, 2, or 3 to switch surface.
2. Current selection and scroll position persist per view.
3. Transient state (detail view, diff view) resets.

Invariant: [ESSENTIAL] Switching surfaces must not lose cached data.
```

### 3.5 Filter Items

```
1. User opens filter mode.
2. User types query; results filter in real-time.
3. User clears filter to return to full list.

Invariant: [ESSENTIAL] Filter is client-side only — never triggers network requests.
Invariant: [ESSENTIAL] Filter scoring ranks earlier matches in higher-priority fields first.
```

### 3.6 Submit a Review

```
1. User opens diff and navigates to a commentable line.
2. User opens comment editor, writes body.
3. User opens submit review dialog.
4. User selects review event: comment, approve, or request-changes.
5. User optionally writes a review summary body.
6. User confirms submission.

Invariant: [ESSENTIAL] Partial submission is not supported — all pending comments go atomically.
```

### 3.7 Manage Labels

```
1. User selects an item.
2. User opens label modal.
3. Modal fetches available labels for the repository.
4. User searches and toggles labels.
5. Each toggle immediately sends an add/remove request.

Invariant: [ESSENTIAL] Label operations are independent — toggling one does not affect others.
```

### 3.8 Change Theme

```
1. User opens theme modal.
2. User browses available themes with live preview.
3. User selects a theme or switches between fixed/system mode.
4. Theme applies immediately without restart.

Invariant: [ESSENTIAL] Theme changes must not affect cached data or network state.
```

### 3.9 Open Repository

```
1. User opens repository modal.
2. User types "owner/name" format (or pastes a URL).
3. System validates the repository exists.
4. On success, switches to the new repository's item list.

Invariant: [ESSENTIAL] Invalid repository names show an error, not a crash.
Invariant: [ESSENTIAL] Both URL format and shorthand "owner/name" are accepted.
```

### 3.10 Pagination (Load More)

```
1. User scrolls near the end of the list.
2. System automatically fetches the next page.
3. New items are appended, deduplicating by URL.
4. Cached detail fields are preserved across the merge.

Invariant: [ESSENTIAL] Pagination continues as long as the cursor advances and the server
  reports more pages. A page of all-duplicate items must NOT kill pagination.
Invariant: [ESSENTIAL] Total items are capped at the fetch limit (default 500).
```

### 3.11 Retry on Failure

```
1. Network fetch fails (transient error).
2. System retries with exponential backoff (base 300ms, factor 2, max 6 retries).
3. User sees "Retrying N/M" in the footer.
4. Rate limit errors and command timeouts do NOT trigger retries.

Invariant: [ESSENTIAL] Rate-limited requests show "Rate limited" and stop retrying.
Invariant: [ESSENTIAL] Command timeouts do not retry — they indicate a systemic issue.
```

### 3.12 Auto-Detect Repository on Launch

```
1. Application starts.
2. System checks if current directory is inside a git repository.
3. If yes, system reads git remotes and parses GitHub URLs.
4. Remotes are checked in priority order: "origin", "upstream", then alphabetical.
5. First valid GitHub remote sets the initial repository scope.
6. If detection fails or no git repo found, user must open repository manually.

Invariant: [ESSENTIAL] Detection failure is silent — no error shown to user.
Invariant: [ESSENTIAL] Both HTTPS and SSH remote formats are accepted.
```

---

## 4. State Machines

### 4.1 Load Status

```
States: {loading, ready, error}

Transitions:
  loading → ready     (on success)
  loading → error     (on failure)
  error   → loading   (on retry)

Invalid:
  loading + ready simultaneously
```

### 4.2 Modal System

```
States: one of 14 variants (including None)

  None
  CommandPalette     { query, selectedIndex }
  Comment            { body, cursor, error, target }
  Merge              { repository, number, selectedIndex, loading, running, info, error,
                       selectedMethod, allowedMethods, pendingConfirm }
  Close              { kind, repository, number, title, url, running, error }
  Label              { repository, query, selectedIndex, availableLabels, loading }
  PullRequestState   { repository, number, title, url, isDraft, selectedIsDraft, running, error }
  DeleteComment      { commentId, commentTag, author, preview, running, error }
  CommentThread      { scrollOffset }
  ChangedFiles       { query, selectedIndex }
  Filter             { surface, selectedIndex }
  SubmitReview       { repository, number, focus, selectedIndex, body, cursor, running, error }
  Theme              { query, filterMode, mode, tone, fixedTheme, darkTheme, lightTheme,
                       initialThemeConfig }
  OpenRepository     { query, error }

Transitions:
  None → any variant    (on open)
  any variant → None    (on close)
  any variant → any variant  (on replace — atomic)

Invalid:
  Two modals active simultaneously.
```
(impl: reference/reference-impl.md#Modal)

### 4.3 Comment Editor

```
States: {idle, editing, submitting}

Transitions:
  idle      → editing     (on start)
  editing   → submitting  (on submit)
  submitting → idle       (on success)
  editing   → idle        (on cancel)

Invalid:
  submitting → editing (must complete or fail first)
```

### 4.4 Diff View

```
States: {list, loading, ready, error, comment-editor}

Transitions:
  list    → loading          (on open-diff)
  loading → ready            (on success)
  loading → error            (on failure)
  ready   → list             (on close)
  ready   → ready            (on toggle-view: unified ↔ split)
  ready   → ready            (on toggle-wrap: none ↔ word)
  ready   → ready            (on toggle-whitespace: ignore ↔ show)
  ready   → comment-editor   (on open-comment)
  comment-editor → ready     (on submit or cancel)

Invalid:
  ready → loading (must close and reopen)
```

### 4.5 Pagination

```
States: {initial, loaded, loading-more, complete}

Transitions:
  initial      → loaded         (on first page)
  loaded       → loading-more   (on load-more trigger)
  loading-more → loaded         (on success, with more items)
  loading-more → loaded         (on failure — retry on next trigger)
  loaded       → complete       (when hasNextPage = no)

Invalid:
  complete → loading-more (no more pages)
```

### 4.6 Retry Progress

```
States: {idle, retrying}

Transitions:
  idle    → retrying   (on fetch error, attempt 1)
  retrying → retrying  (on backoff, attempt N+1; exponential: 300ms base, factor 2)
  retrying → idle      (on success)
  retrying → idle      (on max retries reached: 6)

Rules:
  - [ESSENTIAL] Rate limit errors do NOT enter retrying.
  - [ESSENTIAL] Command timeouts do NOT enter retrying.
  - [ESSENTIAL] Maximum 6 retries with exponential backoff from 300ms, factor 2.
```

---

## 5. Invariants & Laws

### Domain Invariants

| ID | Invariant | Consequence if Violated |
|----|-----------|------------------------|
| D-001 | Two items with the same (repository, number) are the same entity. | Duplicate entries, incorrect cache keys. |
| D-002 | detailLoaded is yes IFF body, labels, checks, and line counts are populated. | UI shows incomplete data or unnecessary fetches. |
| D-003 | A review comment always carries file, line, and side. A general comment never does. | Invalid API requests, broken diff anchors. |
| D-004 | Dates are always points in time, never text representations. | Sorting errors, display inconsistencies. |
| D-005 | All entity attributes are immutable. | Accidental mutation, stale UI. |
| D-006 | "review" list mode is PullRequest-only; issues cannot be review-requested. | Invalid search queries. |
| D-007 | "all" list mode requires a non-null repository. | Unbounded global search. |
| D-008 | Page size is clamped to [1, 100]. | Remote API rejection. |
| D-009 | Diff comment anchors must map to valid render lines within the diff. | Comments attached to wrong lines. |
| D-010 | Cache key format: "{kind}:{mode}:{repository-or-underscore}". | Cache collisions, stale reads. |

### System Invariants

| ID | Invariant | Consequence if Violated |
|----|-----------|------------------------|
| S-001 | Network is authoritative; cache accelerates. | Stale data presented as fresh, data loss. |
| S-002 | Cache failures are silent. | Application crashes on storage errors. |
| S-003 | The remote platform service never knows about local storage. | Service layer entanglement, testability loss. |
| S-004 | Local storage never knows about the user interface. | Persistence layer entanglement. |
| S-005 | The UI never invokes external processes directly. | Untracked side effects, security issues. |
| S-006 | All remote platform access goes through the official CLI tool. | Bypassing authentication, inconsistent error handling. |
| S-007 | Summary queries omit detail fields; detail queries hydrate. | Unnecessary bandwidth, slow list rendering. |
| S-008 | Cache merge preserves detail fields when summary refresh overwrites, only if the commit identifier matches. | Check icons revert to blank on every page fetch. |

### UI Invariants

| ID | Invariant | Consequence if Violated |
|----|-----------|------------------------|
| U-001 | Every mutable UI state is a reactive cell. | State inconsistency, re-rendering bugs. |
| U-002 | Commands never close over component-local state. | Commands fail when dispatched from palette or keymap. |
| U-003 | Selection is scoped per view. | Wrong item selected after view switch. |
| U-004 | Filter is client-side only. | Unnecessary network requests, poor UX. |
| U-005 | Layout math happens in the composition root, passed as props. | Inconsistent layouts, magic constants. |
| U-006 | Modal dividers connect to side borders via junction characters. | Detached visual appearance. |
| U-007 | Input layer contexts are pure — no state or service dependencies. | Input layer coupling, test difficulty. |
| U-008 | Parameterized reactive cells must not be kept alive artificially. | Memory leaks via prevented garbage collection. |

---

## 6. Error Model

### Error Families

```
RemoteError = transport-failure | parse-failure | decode-failure
  - transport-failure: the CLI process failed or timed out
  - parse-failure: the CLI output was not valid structured data
  - decode-failure: the structured data did not match the expected shape

CacheError = read-failure | write-failure
  - read-failure: treated as cache miss (transparent)
  - write-failure: ignored silently (writes never surface errors)

IllegalInput = programmer error that must never reach a user
  - e.g., list mode "all" with no repository
```

### Recovery Strategies

| Error | Recovery | Parameters |
|-------|----------|------------|
| Transport failure (transient) | Retry with exponential backoff | 6 retries, 300ms base, factor 2 |
| Transport failure (rate limit) | Do not retry; show "Rate limited" | — |
| Transport failure (timeout) | Do not retry | — |
| Parse failure | Treat as cache miss | — |
| Decode failure | Treat as cache miss | — |
| Cache read failure | Treat as miss; fetch from network | — |
| Cache write failure | Ignore silently | — |
| Illegal input | Internal error; must never reach user | — |
| Command failure (merge/close) | Revert optimistic update; show error notice | User can retry |

### Display Rules

1. **Network errors during list fetch:** show cached data with stale indicator; show error as secondary notice.
2. **Network errors during mutation:** revert optimistic update; show error notice.
3. **Cache errors:** never show to user. Log silently.
4. **Retry in progress:** show "Retrying N/M" in footer.
5. **Rate limited:** show "Rate limited" notice; stop retrying.

---

## 7. Constants with Justifications

| Constant | Value | Tag | Justification |
|----------|-------|-----|---------------|
| PR fetch limit | 500 | [DERIVED:domain] | Empirical: users rarely scroll past 500 PRs. Higher = slow pagination. |
| Page size | 50 | [DERIVED:platform] | GitHub API allows [1, 100]. 50 balances latency vs. pagination frequency. |
| Retry count | 6 | [DERIVED:domain] | 6 retries × 300ms × 2^n = max 19.2s wait. Long enough for transient errors. |
| Retry base | 300ms | [DERIVED:domain] | Fast enough for user patience, slow enough to not hammer API. |
| LCS cell limit | 40,000 | [DERIVED:domain] | O(n²) algorithm. 40k cells = ~200×200 matrix. Fits in L2 cache. |
| Load-more threshold | 8 | [DERIVED:domain] | Prefetch when 8 items from end. Balances prefetch cost vs. user wait. |
| Prune retention | 30 days | [DERIVED:domain] | Monthly cleanup cycle. Old PRs rarely accessed. |
| SQLite busy_timeout | 5000ms | [DERIVED:platform] | SQLite default. Long enough for concurrent access. |
| Detail prefetch ahead | 3 | [DERIVED:domain] | Prefetch 3 PRs ahead of selection. Matches typical scroll speed. |
| Detail prefetch behind | 1 | [DERIVED:domain] | Prefetch 1 PR behind. User rarely scrolls back immediately. |
| Detail prefetch concurrency | 3 | [DERIVED:domain] | Max 3 concurrent fetches. Avoids rate limiting. |
| Detail prefetch delay | 120ms | [DERIVED:domain] | Debounce before prefetch. Avoids fetching on fast scroll. |
| Max count prefix | 99 | [DERIVED:domain] | Vim convention. 99j moves 99 lines. Higher = unusable. |
| Flash notice duration | 2500ms | [DERIVED:domain] | Long enough to read, short enough to not clutter. |

---

## Changelog

### 2026-05-30 (v0.7.1-r5)
- Removed §7 (Coalgebraic View) — category theory framing was decorative, not operational.
- Renumbered §8 Constants to §7.
- Fixed theme count: 27 themes (was incorrectly stated as 28).
- Removed duplicate §3.12 workflow.

### 2024-05-30 (v0.7.1-r4)
- Added section 7: Constants with Justifications (14 constants with rationale).

### 2024-05-29 (v0.7.1-r3)
- Rewritten in Domain Notation per Quarantine Rule.
- Zero source-language proper nouns in normative text.
- All entities, sub-domains, workflows, state machines, invariants, and error families preserved from prior version.
- Added portability tags ([ESSENTIAL]) to all rules.
- Added impl: pointers to reference/reference-impl.md.

### 2024-05-29 (v0.7.1-r2)
- Added Diff View, Comment Target, Theme, Check System, Repository Details, Merge Info, Item List sub-domains.
- Expanded workflows, state machines, invariants.

### 2024-05-27 (v0.7.1)
- Initial version.
