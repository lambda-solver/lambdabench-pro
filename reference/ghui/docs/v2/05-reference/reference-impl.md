# Reference Implementation — Quarantined Source-Language Material

> **Purpose:** Exact TypeScript signatures, queries, SQL, CLI strings, and code snippets.
> Cross-linked from blueprint docs via `impl:` anchors.
> **Rule:** This file may contain TypeScript, Effect-TS, OpenTUI, and Bun-specific material.

---

## Domain Types

### `src/domain.ts`

```typescript
export type LoadStatus = "loading" | "ready" | "error"

export const pullRequestStates = ["open", "closed", "merged"] as const
export type PullRequestState = (typeof pullRequestStates)[number]

export const pullRequestQueueModes = ["authored", "review", "assigned", "mentioned"] as const
export type PullRequestUserQueueMode = (typeof pullRequestQueueModes)[number]
export type PullRequestQueueMode = "repository" | PullRequestUserQueueMode

export const checkConclusions = ["success", "failure", "neutral", "skipped", "cancelled", "timed_out"] as const
export type CheckConclusion = (typeof checkConclusions)[number]

export const checkRunStatuses = ["completed", "in_progress", "queued", "pending"] as const
export type CheckRunStatus = (typeof checkRunStatuses)[number]

export const checkRollupStatuses = ["passing", "pending", "failing", "none"] as const
export type CheckRollupStatus = (typeof checkRollupStatuses)[number]

export const reviewStatuses = ["draft", "approved", "changes", "review", "none"] as const
export type ReviewStatus = (typeof reviewStatuses)[number]

export type Mergeable = "mergeable" | "conflicting" | "unknown"

export const DiffCommentSide = Schema.Literals(["LEFT", "RIGHT"])
export type DiffCommentSide = Schema.Schema.Type<typeof DiffCommentSide>

export const pullRequestMergeMethods = ["squash", "merge", "rebase"] as const
export type PullRequestMergeMethod = (typeof pullRequestMergeMethods)[number]

export const pullRequestMergeKinds = ["now", "auto", "admin", "disable-auto"] as const
export type PullRequestMergeKind = (typeof pullRequestMergeKinds)[number]

export type PullRequestMergeAction =
  | { readonly kind: "now" | "auto" | "admin"; readonly method: PullRequestMergeMethod }
  | { readonly kind: "disable-auto" }

export interface RepositoryMergeMethods {
  readonly squash: boolean; readonly merge: boolean; readonly rebase: boolean
}

export const pullRequestReviewEvents = ["COMMENT", "APPROVE", "REQUEST_CHANGES"] as const
export type PullRequestReviewEvent = (typeof pullRequestReviewEvents)[number]

export interface CheckItem {
  readonly name: string; readonly status: CheckRunStatus; readonly conclusion: CheckConclusion | null
}

export interface PullRequestLabel { readonly name: string; readonly color: string | null }

export interface CreatePullRequestCommentInput {
  readonly repository: string; readonly number: number; readonly commitId: string
  readonly path: string; readonly line: number; readonly side: DiffCommentSide
  readonly startLine?: number; readonly startSide?: DiffCommentSide; readonly body: string
}

export interface SubmitPullRequestReviewInput {
  readonly repository: string; readonly number: number
  readonly event: PullRequestReviewEvent; readonly body: string
}

export interface PullRequestReviewComment {
  readonly id: string; readonly path: string; readonly line: number; readonly side: DiffCommentSide
  readonly author: string; readonly body: string; readonly createdAt: Date | null
  readonly url: string | null; readonly inReplyTo: string | null
}

export type PullRequestComment =
  | { readonly _tag: "comment"; readonly id: string; readonly author: string; readonly body: string; readonly createdAt: Date | null; readonly url: string | null }
  | ({ readonly _tag: "review-comment" } & PullRequestReviewComment)

export interface PullRequestItem {
  readonly repository: string; readonly author: string; readonly headRefOid: string
  readonly headRefName: string; readonly baseRefName: string; readonly defaultBranchName: string
  readonly number: number; readonly title: string; readonly body: string
  readonly labels: readonly PullRequestLabel[]; readonly additions: number; readonly deletions: number
  readonly changedFiles: number; readonly state: PullRequestState; readonly reviewStatus: ReviewStatus
  readonly checkStatus: CheckRollupStatus; readonly checkSummary: string | null
  readonly checks: readonly CheckItem[]; readonly autoMergeEnabled: boolean
  readonly detailLoaded: boolean; readonly createdAt: Date; readonly updatedAt: Date
  readonly closedAt: Date | null; readonly url: string
}

export interface RepositoryDetails {
  readonly repository: string; readonly description: string | null; readonly url: string
  readonly stargazerCount: number; readonly forkCount: number; readonly openIssueCount: number
  readonly openPullRequestCount: number; readonly defaultBranch: string | null
  readonly pushedAt: Date | null; readonly isArchived: boolean; readonly isPrivate: boolean
}

export type IssueState = "open" | "closed"

export interface IssueItem {
  readonly repository: string; readonly number: number; readonly state: IssueState
  readonly title: string; readonly body: string; readonly author: string
  readonly labels: readonly PullRequestLabel[]; readonly commentCount: number
  readonly createdAt: Date; readonly updatedAt: Date; readonly url: string
}

export interface PullRequestMergeInfo {
  readonly repository: string; readonly number: number; readonly title: string
  readonly state: PullRequestState; readonly isDraft: boolean; readonly mergeable: Mergeable
  readonly reviewStatus: ReviewStatus; readonly checkStatus: CheckRollupStatus
  readonly checkSummary: string | null; readonly autoMergeEnabled: boolean
  readonly viewerCanMergeAsAdmin: boolean
}
```

### `src/item.ts`

```typescript
export type ItemKind = "pullRequest" | "issue"
export const itemListModes = ["all", "authored", "assigned", "mentioned", "review"] as const
export type ItemListMode = (typeof itemListModes)[number]
export type IssueListMode = Exclude<ItemListMode, "review">

export interface ItemListInput<K extends ItemKind = ItemKind> {
  readonly kind: K; readonly mode: ListModeFor<K>
  readonly repository: string | null; readonly cursor: string | null; readonly pageSize: number
}

export interface ItemPage<T> {
  readonly items: readonly T[]; readonly endCursor: string | null; readonly hasNextPage: boolean
}

export class IllegalQueryError extends Error { readonly _tag = "IllegalQueryError" }

export const searchQualifier = (input: ItemListInput): string => {
  if (input.mode === "all" && input.repository === null) {
    throw new IllegalQueryError(`mode "all" requires a repository`)
  }
  const parts: string[] = [kindQualifier(input.kind)]
  const peopleQualifier = modeQualifier(input.mode)
  if (peopleQualifier !== null) parts.push(peopleQualifier)
  if (input.repository !== null) parts.push(`repo:${input.repository}`)
  parts.push("is:open", "archived:false", "sort:updated-desc")
  return parts.join(" ")
}

export const itemQueryCacheKey = (kind: ItemKind, query: ItemQuery): string => {
  const repo = query.repository ?? "_"
  return `${kind}:${query.mode}:${repo}`
}
```

### `src/pullRequestCache.ts`

```typescript
export const mergeCachedDetails = (
  fresh: readonly PullRequestItem[], cached: readonly PullRequestItem[] | undefined
): readonly PullRequestItem[] => {
  if (!cached) return fresh
  const cachedByUrl = new Map(cached.map(pr => [pr.url, pr]))
  return fresh.map(pr => {
    const cachedPr = cachedByUrl.get(pr.url)
    if (!cachedPr?.detailLoaded || cachedPr.headRefOid !== pr.headRefOid) return pr
    return {
      ...pr, body: cachedPr.body, labels: cachedPr.labels,
      additions: cachedPr.additions, deletions: cachedPr.deletions,
      changedFiles: cachedPr.changedFiles, checkStatus: cachedPr.checkStatus,
      checkSummary: cachedPr.checkSummary, checks: cachedPr.checks, detailLoaded: true,
    }
  })
}

export const appendPullRequestPage = (
  existing: readonly PullRequestItem[], incoming: readonly PullRequestItem[]
): readonly PullRequestItem[] => {
  const seen = new Set(existing.map(pr => pr.url))
  const mergedIncoming = mergeCachedDetails(incoming, existing)
  return [...existing, ...mergedIncoming.filter(pr => !seen.has(pr.url))]
}

export const nextLoadAfterPage = (
  current: PullRequestLoad, page: ItemPage<PullRequestItem>,
  prFetchLimit: number, fetchedAt: Date = new Date()
): PullRequestLoad => {
  const data = appendPullRequestPage(current.data, page.items)
  const cursorAdvanced = page.endCursor !== null && page.endCursor !== current.endCursor
  return {
    ...current, data, fetchedAt, endCursor: page.endCursor,
    hasNextPage: page.hasNextPage && cursorAdvanced && data.length < prFetchLimit,
  }
}
```

### `src/pullRequestViews.ts`

```typescript
export type PullRequestView =
  | { readonly _tag: "Repository"; readonly repository: string }
  | { readonly _tag: "Queue"; readonly mode: PullRequestUserQueueMode; readonly repository: string | null }

export const viewCacheKey = (view: PullRequestView) =>
  itemQueryCacheKey("pullRequest", viewToPullRequestQuery(view))

export const parseRepositoryInput = (input: string) => {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i)
  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
  const match = urlMatch ?? shorthandMatch
  if (!match) return null
  const owner = match[1]!, repo = match[2]!.replace(/\.git$/i, "")
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null
  return `${owner}/${repo}`
}
```

---

## Check Rollup Logic

### `src/services/githubNormalize.ts`

```typescript
export const getCheckInfoFromContexts = (contexts: readonly RawCheckContext[]): Pick<PullRequestItem, "checkStatus" | "checkSummary" | "checks"> => {
  if (contexts.length === 0) {
    return { checkStatus: "none", checkSummary: null, checks: [] }
  }

  let completed = 0
  let successful = 0
  let pending = false
  let failing = false
  const checks: CheckItem[] = []

  for (const check of contexts) {
    const name = check.__typename === "CheckRun" ? (check.name ?? "check") : (check.context ?? "check")
    const status = getContextStatus(check)
    const conclusion = getContextConclusion(check)

    checks.push({ name, status, conclusion })

    if (status === "completed") {
      completed += 1
    } else {
      pending = true
    }

    if (conclusion === "success" || conclusion === "neutral" || conclusion === "skipped") {
      successful += 1
    } else if (conclusion) {
      failing = true
    }
  }

  if (pending) {
    return { checkStatus: "pending", checkSummary: `checks ${completed}/${contexts.length}`, checks }
  }

  if (failing) {
    return { checkStatus: "failing", checkSummary: `checks ${successful}/${contexts.length}`, checks }
  }

  return { checkStatus: "passing", checkSummary: `checks ${successful}/${contexts.length}`, checks }
}
```

**Priority order:** `pending` > `failing` > `passing` > `none`. A single in-progress check makes the whole rollup "pending" even if other checks have already failed.

---

## Service Contracts

### `src/services/GitHubService.ts`

```typescript
export type GitHubError = CommandError | JsonParseError | Schema.SchemaError

export class GitHubService extends Context.Service<GitHubService, {
  readonly listPullRequestPage: (input: ItemListInput<"pullRequest">) => Effect.Effect<ItemPage<PullRequestItem>, GitHubError>
  readonly listIssuePage: (input: ItemListInput<"issue">) => Effect.Effect<ItemPage<IssueItem>, GitHubError>
  readonly listAllPullRequests: (input: Omit<ItemListInput<"pullRequest">, "cursor" | "pageSize">) => Effect.Effect<readonly PullRequestItem[], GitHubError>
  readonly listAllIssues: (input: Omit<ItemListInput<"issue">, "cursor" | "pageSize">) => Effect.Effect<readonly IssueItem[], GitHubError>
  readonly getPullRequestDetails: (repository: string, number: number) => Effect.Effect<PullRequestItem, GitHubError>
  readonly getRepositoryDetails: (repository: string) => Effect.Effect<RepositoryDetails, GitHubError>
  readonly getAuthenticatedUser: () => Effect.Effect<string, GitHubError>
  readonly getPullRequestDiff: (repository: string, number: number) => Effect.Effect<string, GitHubError>
  readonly listPullRequestReviewComments: (repository: string, number: number) => Effect.Effect<readonly PullRequestReviewComment[], GitHubError>
  readonly listPullRequestComments: (repository: string, number: number) => Effect.Effect<readonly PullRequestComment[], GitHubError>
  readonly listIssueComments: (repository: string, number: number) => Effect.Effect<readonly PullRequestComment[], GitHubError>
  readonly getPullRequestMergeInfo: (repository: string, number: number) => Effect.Effect<PullRequestMergeInfo, GitHubError>
  readonly getRepositoryMergeMethods: (repository: string) => Effect.Effect<RepositoryMergeMethods, GitHubError>
  readonly mergePullRequest: (repository: string, number: number, action: PullRequestMergeAction) => Effect.Effect<void, CommandError>
  readonly closePullRequest: (repository: string, number: number) => Effect.Effect<void, CommandError>
  readonly closeIssue: (repository: string, number: number) => Effect.Effect<void, CommandError>
  readonly createPullRequestComment: (input: CreatePullRequestCommentInput) => Effect.Effect<PullRequestReviewComment, GitHubError>
  readonly createPullRequestIssueComment: (repository: string, number: number, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly replyToReviewComment: (repository: string, number: number, inReplyTo: string, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly editPullRequestIssueComment: (repository: string, commentId: string, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly editReviewComment: (repository: string, commentId: string, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly deletePullRequestIssueComment: (repository: string, commentId: string) => Effect.Effect<void, CommandError>
  readonly deleteReviewComment: (repository: string, commentId: string) => Effect.Effect<void, CommandError>
  readonly submitPullRequestReview: (input: SubmitPullRequestReviewInput) => Effect.Effect<void, CommandError>
  readonly toggleDraftStatus: (repository: string, number: number, isDraft: boolean) => Effect.Effect<void, CommandError>
  readonly listRepoLabels: (repository: string) => Effect.Effect<readonly { readonly name: string; readonly color: string | null }[], GitHubError>
  readonly addPullRequestLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
  readonly removePullRequestLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
  readonly addIssueLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
  readonly removeIssueLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
}>()("ghui/GitHubService") {
  static readonly layerNoDeps = Layer.effect(GitHubService, Effect.gen(function* () { /* ... */ }))
  static readonly layer = GitHubService.layerNoDeps.pipe(Layer.provide(CommandRunner.layer))
}
```

### `src/services/CommandRunner.ts`

```typescript
export class CommandError extends Schema.TaggedErrorClass<CommandError>()("CommandError", {
  command: Schema.String, args: Schema.Array(Schema.String),
  detail: Schema.String, cause: Schema.Defect,
}) {}

export class JsonParseError extends Schema.TaggedErrorClass<JsonParseError>()("JsonParseError", {
  command: Schema.String, args: Schema.Array(Schema.String),
  stdout: Schema.String, cause: Schema.Defect,
}) {}

export class CommandRunner extends Context.Service<CommandRunner, {
  readonly run: (command: string, args: readonly string[], options?: RunOptions) => Effect.Effect<CommandResult, CommandError>
  readonly runSchema: <S extends Schema.Top>(schema: S, command: string, args: readonly string[]) => Effect.Effect<S["Type"], CommandError | JsonParseError | Schema.SchemaError, S["DecodingServices"]>
}>()("ghui/CommandRunner") {
  static readonly layer = Layer.effect(CommandRunner, Effect.gen(function* () { /* Bun.spawn */ }))
}
```

### `src/services/CacheService.ts`

```typescript
export class CacheError extends Schema.TaggedErrorClass<CacheError>()("CacheError", {
  operation: Schema.String, cause: Schema.Defect,
}) {}

export const pullRequestCacheKey = ({ repository, number }: PullRequestCacheKey) => `${repository}#${number}`
export const issueCacheKey = ({ repository, number }: IssueCacheKey) => `${repository}#${number}`

export class CacheService extends Context.Service<CacheService, {
  readonly readQueue: (viewer: string, view: PullRequestView) => Effect.Effect<PullRequestLoad | null, CacheError>
  readonly writeQueue: (viewer: string, load: PullRequestLoad) => Effect.Effect<void, never>
  readonly readPullRequest: (key: PullRequestCacheKey) => Effect.Effect<PullRequestItem | null, CacheError>
  readonly upsertPullRequest: (pullRequest: PullRequestItem) => Effect.Effect<void, never>
  readonly readIssueQueue: (viewer: string, view: IssueView) => Effect.Effect<IssueLoad | null, CacheError>
  readonly writeIssueQueue: (viewer: string, load: IssueLoad) => Effect.Effect<void, never>
  readonly readIssue: (key: IssueCacheKey) => Effect.Effect<IssueItem | null, CacheError>
  readonly upsertIssue: (issue: IssueItem) => Effect.Effect<void, never>
  readonly readRepoRollup: (viewer: string) => Effect.Effect<readonly RepoRollupRow[], CacheError>
  readonly readRepositoryDetails: (repository: string) => Effect.Effect<RepositoryDetails | null, CacheError>
  readonly readRepositoryDetailsFetchedAt: (repository: string) => Effect.Effect<Date | null, CacheError>
  readonly writeRepositoryDetails: (details: RepositoryDetails) => Effect.Effect<void, never>
  readonly readWorkspacePreferences: (viewer: ViewerId) => Effect.Effect<WorkspacePreferences | null, CacheError>
  readonly writeWorkspacePreferences: (preferences: WorkspacePreferencesInput | WorkspacePreferences) => Effect.Effect<void, never>
  readonly prune: () => Effect.Effect<void, never>
}>()("ghui/CacheService") { /* ... */ }
```

---

## SQL Migrations

### `src/services/CacheService.ts` — `cacheMigrations`

```sql
-- 001_initial_cache_schema
CREATE TABLE IF NOT EXISTS pull_requests (
  pr_key TEXT PRIMARY KEY, repository TEXT NOT NULL, number INTEGER NOT NULL,
  url TEXT NOT NULL, head_ref_oid TEXT NOT NULL, state TEXT NOT NULL,
  detail_loaded INTEGER NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pull_requests_repository_number_idx ON pull_requests (repository, number);
CREATE TABLE IF NOT EXISTS queue_snapshots (
  viewer TEXT NOT NULL, view_key TEXT NOT NULL, view_json TEXT NOT NULL,
  pr_keys_json TEXT NOT NULL, fetched_at TEXT NOT NULL, end_cursor TEXT,
  has_next_page INTEGER NOT NULL, PRIMARY KEY (viewer, view_key)
);

-- 002_workspace_preferences
CREATE TABLE IF NOT EXISTS workspace_preferences (
  viewer TEXT PRIMARY KEY, preferences_json TEXT NOT NULL, updated_at TEXT NOT NULL
);

-- 003_unified_queue_view_key
DELETE FROM queue_snapshots WHERE view_key NOT LIKE 'pullRequest:%' AND view_key NOT LIKE 'issue:%';

-- 004_repository_details
CREATE TABLE IF NOT EXISTS repository_details (
  repository TEXT PRIMARY KEY, data_json TEXT NOT NULL, updated_at TEXT NOT NULL
);

-- 005_issues_table
CREATE TABLE IF NOT EXISTS issues (
  issue_key TEXT PRIMARY KEY, repository TEXT NOT NULL, number INTEGER NOT NULL,
  url TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS issues_repository_number_idx ON issues (repository, number);
```

### Pruning

```sql
-- 30-day cutoff
DELETE FROM queue_snapshots WHERE fetched_at < :cutoff;
DELETE FROM pull_requests WHERE updated_at < :cutoff
  AND pr_key NOT IN (
    SELECT value FROM queue_snapshots, json_each(queue_snapshots.pr_keys_json)
    WHERE view_key LIKE 'pullRequest:%'
  );
DELETE FROM issues WHERE updated_at < :cutoff
  AND issue_key NOT IN (
    SELECT value FROM queue_snapshots, json_each(queue_snapshots.pr_keys_json)
    WHERE view_key LIKE 'issue:%'
  );
```

### Pragmas

```sql
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA journal_size_limit = 16777216;
```

---

## GraphQL Queries

### `src/services/githubSchemas.ts`

```graphql
# pullRequestSummarySearchQuery
query PullRequests($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    nodes { ... on PullRequest {
      number title isDraft reviewDecision
      autoMergeRequest { enabledAt } state merged
      createdAt updatedAt closedAt url
      author { login } headRefOid headRefName baseRefName
      repository { nameWithOwner defaultBranchRef { name } }
    }}
    pageInfo { hasNextPage endCursor }
  }
}

# issueSearchQuery
query Issues($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    nodes { ... on Issue {
      number title body state createdAt updatedAt closedAt url
      author { login }
      repository { nameWithOwner defaultBranchRef { name } }
      labels(first: 20) { nodes { name color } }
      comments(first: 0) { totalCount }
    }}
    pageInfo { hasNextPage endCursor }
  }
}

# repositoryPullRequestsQuery
query RepositoryPullRequests($owner: String!, $name: String!, $first: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: $first, after: $after,
                 orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { ...SUMMARY_FIELDS }
      pageInfo { hasNextPage endCursor }
    }
  }
}

# pullRequestDetailQuery
query PullRequest($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      ...SUMMARY_FIELDS
      body additions deletions changedFiles
      labels(first: 20) { nodes { name color } }
      statusCheckRollup { contexts(first: 100) { nodes {
        __typename
        ... on CheckRun { name status conclusion }
        ... on StatusContext { context state }
      }}}
    }
  }
}

# repositoryDetailsQuery
query RepositoryDetails($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    description url stargazerCount forkCount isArchived isPrivate pushedAt
    defaultBranchRef { name }
    openIssues: issues(states: OPEN) { totalCount }
    openPRs: pullRequests(states: OPEN) { totalCount }
  }
}
```

---

## CLI Invocations

### `src/services/GitHubService.ts` — `ghJson` / `ghVoid` patterns

```typescript
// GraphQL search
["api", "graphql", "-f", `query=${graphqlQuery}`, "-F", `searchQuery=${searchQualifier(input)}`, "-F", `first=${input.pageSize}`, ...(cursor ? ["-F", `after=${cursor}`] : [])]

// REST diff (paginated, slurped)
["api", "--paginate", "--slurp", `repos/${repository}/pulls/${number}/files`]

// REST comments (paginated, slurped)
["api", "--paginate", "--slurp", `repos/${repository}/pulls/${number}/comments`]
["api", "--paginate", "--slurp", `repos/${repository}/issues/${number}/comments`]

// Create comment (POST)
["api", "--method", "POST", `repos/${repository}/issues/${number}/comments`, "-f", `body=${body}`]

// Create review comment (POST)
["api", "--method", "POST", `repos/${repository}/pulls/${number}/comments`,
 "-f", `body=${body}`, "-f", `commit_id=${commitId}`, "-f", `path=${path}`,
 "-F", `line=${line}`, "-f", `side=${side}`]

// Reply to review comment
["api", "--method", "POST", `repos/${repository}/pulls/${number}/comments/${inReplyTo}/replies`, "-f", `body=${body}`]

// Edit issue comment
["api", "--method", "PATCH", `repos/${repository}/issues/comments/${commentId}`, "-f", `body=${body}`]

// Edit review comment
["api", "--method", "PATCH", `repos/${repository}/pulls/comments/${commentId}`, "-f", `body=${body}`]

// Delete comments
["api", "--method", "DELETE", `repos/${repository}/issues/comments/${commentId}`]
["api", "--method", "DELETE", `repos/${repository}/pulls/comments/${commentId}`]

// Merge
["pr", "merge", String(number), "--repo", repository, ...mergeActionCliArgs(action)]
// mergeActionCliArgs: now → [methodFlag, "--delete-branch"]
//                     auto → [methodFlag, "--auto", "--delete-branch"]
//                     admin → [methodFlag, "--admin", "--delete-branch"]
//                     disable-auto → ["--disable-auto"]

// Close
["pr", "close", String(number), "--repo", repository]
["issue", "close", String(number), "--repo", repository]

// Review
["pr", "review", String(number), "--repo", repository, REVIEW_EVENT_CLI_FLAG[event], "--body", body]
// REVIEW_EVENT_CLI_FLAG: COMMENT→"--comment", APPROVE→"--approve", REQUEST_CHANGES→"--request-changes"

// Draft toggle
["pr", "ready", String(number), "--repo", repository, ...(isDraft ? [] : ["--undo"])]

// Labels
["label", "list", "--repo", repository, "--json", "name,color", "--limit", "100"]
["pr", "edit", String(number), "--repo", repository, "--add-label", label]
["pr", "edit", String(number), "--repo", repository, "--remove-label", label]
["issue", "edit", String(number), "--repo", repository, "--add-label", label]
["issue", "edit", String(number), "--repo", repository, "--remove-label", label]

// Merge info
["pr", "view", String(number), "--repo", repository, "--json", "number,title,state,isDraft,mergeable,reviewDecision,autoMergeRequest,statusCheckRollup"]

// Admin merge info (GraphQL inline)
["api", "graphql", "-F", `owner=${owner}`, "-F", `name=${name}`, "-F", `number=${number}`,
 "-f", "query=query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { viewerCanMergeAsAdmin } } }"]

// Repository merge methods
["repo", "view", repository, "--json", "squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed"]

// Authenticated user
["api", "user"]  // → { login: string }
```

---

## Diff Algorithm

### `src/ui/diff.ts`

```typescript
export const DiffView = Schema.Literals(["unified", "split"])
export const DiffWrapMode = Schema.Literals(["none", "word"])
export const DiffWhitespaceMode = Schema.Literals(["ignore", "show"])
export const DiffCommentKind = Schema.Literals(["addition", "deletion", "context"])

const MAX_WHITESPACE_LCS_CELLS = 40_000

export const splitPatchFiles = (patch: string): readonly DiffFilePatch[] => {
  const trimmed = patch.trimEnd()
  if (trimmed.length === 0) return []
  const matches = [...trimmed.matchAll(/^diff --git .+$/gm)]
  if (matches.length === 0) return [{ name: "diff", filetype: undefined, patch: trimmed }]
  return matches.map((match, index) => {
    const start = match.index ?? 0
    const end = index + 1 < matches.length ? matches[index + 1]!.index ?? trimmed.length : trimmed.length
    const filePatch = normalizeHunkLineCounts(trimmed.slice(start, end).trimEnd())
    const name = patchFileName(filePatch)
    return { name, filetype: pathToFiletype(name), patch: filePatch }
  })
}

export const minimizeWhitespacePatch = (patch: string) => {
  // Per hunk: collect deletion/addition blocks, LCS on whitespace-stripped text
  // If (deletions+1)*(additions+1) > 40000 → linear fallback
  // Matched pairs become context lines; unmatched remain changes
  // Empty hunks dropped; files with no remaining hunks removed
  // Final: normalizeHunkLineCounts on result
}

export const buildStackedDiffFiles = (files, view, wrapMode, width): readonly StackedDiffFilePatch[] => {
  let offset = 0
  return files.map((file, index) => {
    const diffHeight = patchRenderableLineCount(file.patch, view, wrapMode, width)
    const separatorBefore = index === 0 ? 0 : 1
    const headerLine = offset + separatorBefore
    const stackedFile = { file, index, headerLine, diffStartLine: headerLine + 2, diffHeight }
    offset += separatorBefore + 2 + diffHeight
    return stackedFile
  })
}

export const getDiffCommentAnchors = (file, view, wrapMode, width): readonly DiffCommentAnchor[] => {
  // Walks hunk lines, tracking oldLine/newLine/renderLine/colorLine
  // Unified: deletions above additions, sequential renderLine
  // Split: alignSplitSides() pads shorter side, deletions+additions share renderLine
  // estimatedWrappedLineCount for word wrap
}

const estimatedWrappedLineCount = (text: string, width: number, wrapMode: DiffWrapMode) => {
  if (wrapMode === "none") return 1
  return Math.max(1, Math.ceil(Bun.stringWidth(text) / Math.max(1, width)))
}
```

---

## Filter Algorithm

### `src/ui/filter/scoring.ts`

```typescript
// Score = fieldIndex * 1000 + matchOffset. Lower ranks earlier.
// null = no match (filtered out).
export const issueFilterScore = (issue: IssueItem, query: string): number | null => {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) return 0
  const fields = [
    issue.title.toLowerCase(), issue.repository.toLowerCase(),
    String(issue.number), issue.author.toLowerCase(),
    issue.labels.map(l => l.name).join(" ").toLowerCase(),
    issue.body.toLowerCase(),
  ]
  const scores = fields.flatMap((field, index) => {
    const matchIndex = field.indexOf(normalized)
    return matchIndex >= 0 ? [index * 1000 + matchIndex] : []
  })
  return scores.length > 0 ? Math.min(...scores) : null
}

export const filterByScore = <Item>(items, query, scoreItem, getTime) => {
  // Sort by score ascending, then by time descending for ties
}
```

---

## Modal State Shapes

### `src/ui/modals/types.ts`

```typescript
export type Modal = Data.TaggedEnum<{
  None: {}
  Label: LabelModalState                    // { repository, query, selectedIndex, availableLabels, loading }
  Close: CloseModalState                    // { kind, repository, number, title, url, running, error }
  PullRequestState: PullRequestStateModalState  // { repository, number, title, url, isDraft, selectedIsDraft, running, error }
  Merge: MergeModalState                    // { repository, number, selectedIndex, loading, running, info, error, selectedMethod, allowedMethods, pendingConfirm }
  Comment: CommentModalState                // { body, cursor, error, target: CommentModalTarget }
  DeleteComment: DeleteCommentModalState    // { commentId, commentTag, author, preview, running, error }
  CommentThread: CommentThreadModalState    // { scrollOffset }
  ChangedFiles: ChangedFilesModalState      // { query, selectedIndex }
  Filter: FilterModalState                  // { surface, selectedIndex }
  SubmitReview: SubmitReviewModalState      // { repository, number, focus, selectedIndex, body, cursor, running, error }
  Theme: ThemeModalState                    // { query, filterMode, mode, tone, fixedTheme, darkTheme, lightTheme, initialThemeConfig }
  CommandPalette: CommandPaletteState       // { query, selectedIndex }
  OpenRepository: OpenRepositoryModalState  // { query, error }
}>
export const Modal = Data.taggedEnum<Modal>()
```

---

## Theme System

### `src/themeConfig.ts`

```typescript
export type ThemeMode = "fixed" | "system"
export type ThemeConfig =
  | { readonly mode: "fixed"; readonly theme: ThemeId }
  | { readonly mode: "system"; readonly darkTheme: ThemeId; readonly lightTheme: ThemeId }

export const defaultThemeConfig: ThemeConfig = { mode: "fixed", theme: "ghui" }

export const resolveThemeId = (config: ThemeConfig, appearance: ThemeTone): ThemeId =>
  config.mode === "fixed" ? config.theme : appearance === "dark" ? config.darkTheme : config.lightTheme
```

### `src/ui/colors.ts` — ThemeId (28 themes)

```typescript
export type ThemeId =
  | "system" | "ghui" | "tokyo-night" | "catppuccin" | "catppuccin-latte"
  | "rose-pine" | "rose-pine-dawn" | "gruvbox" | "gruvbox-light" | "nord"
  | "dracula" | "kanagawa" | "one-dark" | "one-light" | "monokai"
  | "solarized-dark" | "solarized-light" | "everforest" | "vesper" | "vague"
  | "ayu" | "ayu-mirage" | "ayu-light" | "github-dark-dimmed" | "palenight"
  | "opencode" | "cursor"

export type ThemeTone = "dark" | "light"
```

---

## Keymap Composition

### `src/keymap/all.ts`

```typescript
export interface AppCtx {
  readonly closeModalActive: boolean; readonly pullRequestStateModalActive: boolean
  readonly mergeModalActive: boolean; readonly commentThreadModalActive: boolean
  readonly changedFilesModalActive: boolean; readonly filterModalActive: boolean
  readonly submitReviewModalActive: boolean; readonly labelModalActive: boolean
  readonly themeModalActive: boolean; readonly openRepositoryModalActive: boolean
  readonly commentModalActive: boolean; readonly deleteCommentModalActive: boolean
  readonly commandPaletteActive: boolean; readonly filterMode: boolean
  readonly diffFullView: boolean; readonly detailFullView: boolean
  readonly commentsViewActive: boolean; readonly textInputActive: boolean
  // 16 narrow contexts + 2 always-on actions
  readonly openCommandPalette: () => void; readonly handleQuitOrClose: () => void
}

const modalActive = (a: AppCtx): boolean => /* OR of all 13 modal flags */
const inListMode = (a: AppCtx): boolean =>
  !modalActive(a) && !a.filterMode && !a.diffFullView && !a.detailFullView && !a.commentsViewActive

export const appKeymap = App(
  // Always-on (2)
  { id: "command.open", keys: ["ctrl+p", "meta+k"], run: (s) => s.openCommandPalette() },
  { id: "app.quit-or-close", keys: ["ctrl+c"], run: (s) => s.handleQuitOrClose() },
  // Modal layers (13)
  closeModalKeymap.scope((a) => a.closeModalActive && a.closeModal),
  // ... 12 more modal layers
  filterModeKeymap.scope((a) => a.filterMode && a.filterModeCtx),
  // Full-view layers (3, gated by !modalActive)
  diffViewKeymap.scope((a) => a.diffFullView && !modalActive(a) && a.diff),
  detailViewKeymap.scope((a) => a.detailFullView && !modalActive(a) && a.detail),
  commentsViewKeymap.scope((a) => a.commentsViewActive && !modalActive(a) && a.commentsView),
  // List nav (1, lowest priority)
  listNavKeymap.scope((a) => inListMode(a) && a.listNav),
)
```

---

## Runtime Composition

### `src/services/runtime.ts`

```typescript
export const mockPrCount = parseOptionalPositiveInt(process.env.GHUI_MOCK_PR_COUNT, null)
export const pullRequestPageSize = Math.min(100, parseOptionalPositiveInt(process.env.GHUI_PR_PAGE_SIZE, config.prPageSize) ?? config.prPageSize)

const githubServiceLayer = mockPrCount !== null
  ? MockGitHubService.layer({ prCount: mockPrCount, /* ... */ })
  : GitHubService.layerNoDeps

const cacheServiceLayer = mockPrCount !== null
  ? CacheService.disabledLayer
  : CacheService.layerFromPath(config.cachePath)

export const githubRuntime = Atom.runtime(
  Layer.mergeAll(githubServiceLayer, cacheServiceLayer, Clipboard.layerNoDeps, BrowserOpener.layerNoDeps)
    .pipe(Layer.provide(CommandRunner.layer), Layer.provideMerge(Observability.layer))
)
```

---

## Config Constants

### `src/config.ts`

```typescript
export const config = {
  prFetchLimit: 500,        // env: GHUI_PR_FETCH_LIMIT
  prPageSize: 50,           // env: GHUI_PR_PAGE_SIZE, clamped to [1, 100]
  commandTimeoutMs: 15_000, // env: GHUI_COMMAND_TIMEOUT_MS
  cachePath: "~/.cache/ghui/cache.sqlite" | null,  // env: GHUI_CACHE_PATH, "off" to disable
}
```

### Other constants from source

| Constant | Value | Source |
|----------|-------|--------|
| `PR_FETCH_RETRIES` | 6 | `src/ui/pullRequests/atoms.ts:29` |
| `MAX_REPOSITORY_CACHE_ENTRIES` | 8 | `src/ui/pullRequests/atoms.ts:30` |
| `MAX_WHITESPACE_LCS_CELLS` | 40,000 | `src/ui/diff.ts:163` |
| `LOAD_MORE_SELECTION_THRESHOLD` | 8 | `src/App.tsx:238` |
| `LOAD_MORE_SCROLL_THRESHOLD` | 3 | `src/App.tsx:238` |
| Retry backoff base | 300ms, factor 2 | `src/ui/pullRequests/atoms.ts:105` |
| Prune retention | 30 days | `src/services/CacheService.ts:510` |
| SQLite busy_timeout | 5000ms | `src/services/CacheService.ts:365` |
| SQLite journal_size_limit | 16MB | `src/services/CacheService.ts:368` |
| `DETAIL_PREFETCH_BEHIND` | 1 | `src/ui/pullRequests/useDetailHydration.ts:10` |
| `DETAIL_PREFETCH_AHEAD` | 3 | `src/ui/pullRequests/useDetailHydration.ts:11` |
| `DETAIL_PREFETCH_CONCURRENCY` | 3 | `src/ui/pullRequests/useDetailHydration.ts:12` |
| `DETAIL_PREFETCH_DELAY_MS` | 120ms | `src/ui/pullRequests/useDetailHydration.ts:13` |
| `MAX_COUNT_PREFIX` | 99 | `src/keymap/helpers.ts:3` |
| Flash notice duration | 2500ms | `src/ui/notice/useFlashNotice.ts:5` |

---

## Startup & Repository Detection

### `src/gitRemotes.ts`

```typescript
const GITHUB_REMOTE_PATTERN = /^(?:https?:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/

export const parseGitRemoteUrl = (url: string): string | null => {
  const match = url.trim().match(GITHUB_REMOTE_PATTERN)
  if (!match) return null
  const owner = match[1]!, repo = match[2]!
  if (!owner || !repo) return null
  return `${owner}/${repo}`
}

export const detectCurrentGitHubRepository = (): string | null => {
  const remotes = Bun.spawnSync({ cmd: ["git", "remote"], stdout: "pipe", stderr: "pipe" })
  if (remotes.exitCode !== 0) return null
  const names = remotes.stdout.toString().split("\n").map(n => n.trim()).filter(Boolean)
  // Priority: origin first, then upstream, then alphabetical
  const orderedNames = [...names].sort((a, b) =>
    a === "origin" ? -1 : b === "origin" ? 1 : a === "upstream" ? -1 : b === "upstream" ? 1 : 0
  )
  for (const name of orderedNames) {
    const url = Bun.spawnSync({ cmd: ["git", "remote", "get-url", name], stdout: "pipe", stderr: "pipe" })
    if (url.exitCode !== 0) continue
    const repository = parseGitRemoteUrl(url.stdout.toString())
    if (repository) return repository
  }
  return null
}
```

**Remote URL patterns accepted:**
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

### `src/standalone.ts`

```typescript
// CLI entry point for standalone binary
// Parses: --help/-h, --version/-v, upgrade (rejected), unknown (edit-distance suggestion)
// Falls through to import("./index.js") for TUI launch

const editDistance = (a: string, b: string) => {
  const distances = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) distances[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1, distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return distances[a.length]![b.length]!
}

// Known commands: ["help", "version"]
// Unknown command: suggests closest match if editDistance <= 2
// "upgrade" command: prints "Use your package manager to upgrade ghui"
```

---

## Theme Persistence

### `src/themeStore.ts`

```typescript
// Config file path resolution:
//   GHUI_CONFIG_DIR > XDG_CONFIG_HOME/ghui > ~/.config/ghui (Windows: APPDATA/ghui)
// File: config.json

export const configPath = () => join(configDirectory(), "config.json")

// Stored config JSON shape:
interface StoredConfig {
  readonly theme?: unknown           // ThemeId string
  readonly themeMode?: unknown       // "fixed" | "system"
  readonly darkTheme?: unknown       // ThemeId string
  readonly lightTheme?: unknown      // ThemeId string
  readonly diffWhitespaceMode?: unknown  // "ignore" | "show"
  readonly systemThemeAutoReload?: unknown  // boolean
}

// Load operations catch all errors and return defaults:
export const loadStoredThemeId: Effect.Effect<ThemeId>        // default: "ghui"
export const loadStoredThemeConfig: Effect.Effect<ThemeConfig> // default: normalizeThemeConfig({})
export const loadStoredDiffWhitespaceMode: Effect.Effect<DiffWhitespaceMode> // default: "ignore"
export const loadStoredSystemThemeAutoReload: Effect.Effect<boolean>        // default: false

// Save operations skip write if value unchanged:
export const saveStoredThemeId = (theme: ThemeId): Effect.Effect<void>
export const saveStoredThemeConfig = (themeConfig: ThemeConfig): Effect.Effect<void>
export const saveStoredDiffWhitespaceMode = (mode: DiffWhitespaceMode): Effect.Effect<void>
```

---

## Workspace Preference File

### `src/workspacePreferenceFile.ts`

```typescript
// JSON file for workspace-level preferences (favorites, recent repos)
// Viewer-scoped: read returns null if stored viewer ≠ current viewer

export const readWorkspacePreferencesFile = (path: string, viewer: ViewerId):
  Effect.Effect<WorkspacePreferences | null> =>
  // Reads JSON, decodes via Schema, returns null on any error or viewer mismatch

export const writeWorkspacePreferencesFile = (path: string, input: WorkspacePreferencesInput | WorkspacePreferences):
  Effect.Effect<void> =>
  // mkdir -p dirname, writes JSON with tab indentation, catches all errors silently
```

---

## System Appearance Detection

### `src/systemAppearance.ts`

```typescript
export type SystemAppearance = "dark" | "light"

// macOS: defaults read -g AppleInterfaceStyle → "Dark" = dark, else light
// Linux: gsettings get org.gnome.desktop.interface color-scheme
//        gsettings get org.gnome.desktop.interface gtk-theme
//        → parse output for "dark"/"light"/"default" keywords
// Fallback: "dark" on error or unknown platform

export const appearanceFromLinuxSetting = (value: string): SystemAppearance | null => {
  const normalized = value.trim().replaceAll("'", "").replaceAll('"', "").toLowerCase()
  if (normalized.includes("dark")) return "dark"
  if (normalized.includes("light") || normalized === "default") return "light"
  return null
}

export const detectSystemAppearance = async (): Promise<SystemAppearance> => {
  if (process.platform === "darwin") return await detectMacAppearance()
  if (process.platform === "linux") return await detectLinuxAppearance()
  return "dark"
}
```

---

## Command Palette Scoring

### `src/commands.ts`

```typescript
export type CommandScope = "Global" | "View" | "Pull request" | "Issue" | "Diff" | "Comments" | "Labels" | "Navigation" | "System"

// Scope ordering for sort:
const SCOPE_ORDER: readonly CommandScope[] = [
  "Global", "View", "Pull request", "Issue", "Diff", "Comments", "Labels", "Navigation", "System"
]

export interface AppCommand {
  readonly id: string; readonly title: string; readonly scope: CommandScope
  readonly run: () => void; readonly subtitle?: string; readonly shortcut?: string
  readonly keywords?: readonly string[]; readonly disabledReason?: string | null
}

// 6-tier scoring algorithm. Lower score = better match. null = filtered out.
const commandScore = (command: AppCommand, query: string): number | null => {
  // 0: title starts with query
  // 1: searchText (title+subtitle+scope+shortcut+keywords) starts with query
  // 2: title includes query
  // 3: searchText includes query
  // 4: title acronym starts with query (e.g. "op" matches "Open Repository")
  // 5: fuzzy character match on searchText (no spaces)
  // null: no match
}

// Sorting: enabled commands first, then by score, then by original index
export const filterCommands = (commands: readonly AppCommand[], query: string) =>
  commands.flatMap((cmd, i) => {
    const score = commandScore(cmd, query)
    return score === null ? [] : [{ command: cmd, index: i, score }]
  }).sort((a, b) => {
    const enabled = Number(commandEnabled(b.command)) - Number(commandEnabled(a.command))
    return enabled || a.score - b.score || a.index - b.index
  }).map(({ command }) => command)

// Active-scope sorting: commands matching the current screen's scope rank first
export const sortCommandsByActiveScope = (commands, activeScope: CommandScope | null) =>
  // activeScope match → 0, others → 1, then SCOPE_ORDER
```

---

## View Synchronization

### `src/viewSync.ts`

```typescript
// Projects a PullRequestView onto the matching IssueView.
// Total function — every PR view has a defined issue counterpart.
export const issueViewForPullRequestView = (view: PullRequestView): IssueView => {
  if (view._tag === "Repository") return { _tag: "Repository", repository: view.repository }
  if (view.repository === null) return { _tag: "Queue", mode: "authored", repository: null }
  return { _tag: "Repository", repository: view.repository }
}
```

**Projection rules:**

| PullRequestView | IssueView |
|-----------------|-----------|
| Repository(repo) | Repository(repo) |
| Queue(mode, null) | Queue("authored", null) |
| Queue(mode, repo) | Repository(repo) |

---

## Rate Limit Classification

### `src/services/githubRateLimit.ts`

```typescript
export type GitHubRateLimitKind = "graphql" | "rest" | "secondary"

export const classifyGitHubRateLimit = (detail: string): GitHubRateLimitKind | null => {
  const text = detail.toLowerCase()
  if (text.includes("secondary rate limit") || text.includes("abuse detection")) return "secondary"
  if (text.includes("graphql_rate_limit") || text.includes("graphql rate limit")) return "graphql"
  if (text.includes("api rate limit already exceeded")) return text.includes("graphql") ? "graphql" : "rest"
  if (text.includes("rate limit exceeded")) return text.includes("graphql") ? "graphql" : "rest"
  return null
}

export const isGitHubRateLimitError = (error: unknown): boolean =>
  classifyGitHubRateLimit(errorMessage(error)) !== null
```

---

## System Atoms

### `src/services/systemAtoms.ts`

```typescript
// Parameterized runtime atoms bridging command system to services
export const submitPullRequestReviewAtom = githubRuntime.fn<SubmitPullRequestReviewInput>()(
  (input) => GitHubService.use((github) => github.submitPullRequestReview(input))
)
export const copyToClipboardAtom = githubRuntime.fn<string>()(
  (text) => Clipboard.use((clipboard) => clipboard.copy(text))
)
export const openInBrowserAtom = githubRuntime.fn<PullRequestItem>()(
  (pr) => BrowserOpener.use((browser) => browser.openPullRequest(pr))
)
export const openUrlAtom = githubRuntime.fn<string>()(
  (url) => BrowserOpener.use((browser) => browser.openUrl(url))
)
```

---

## Keyboard Adapter

### `src/keyboard/opentuiAdapter.ts`

```typescript
// Maps opentui KeyEvent → @ghui/keymap ParsedStroke
// Key normalization: "enter" → "return", lowercase
// Modifier fold: option (alt on Linux/Windows) → meta
export const normalizeOpenTuiKey = (event: KeyEvent): ParsedStroke => ({
  key: normalizeKeyName(event.name),  // "enter" → "return"
  ctrl: event.ctrl, shift: event.shift,
  meta: event.meta || event.option,   // cross-platform alt fold
})

// Fan-out hook: single useKeyboard listener dispatches to multiple handlers
// Handlers return true to mark event as handled (prevents default)
export const useOpenTuiSubscribe = (): KeySubscribe => {
  const handlersRef = useRef<Set<(stroke: ParsedStroke) => boolean | void>>(new Set())
  useKeyboard((event) => {
    if (event.defaultPrevented) return
    const stroke = normalizeOpenTuiKey(event)
    let handled = false
    for (const handler of handlersRef.current) {
      if (handler(stroke)) handled = true
    }
    if (handled) event.preventDefault()
  })
  return (handler) => { handlersRef.current.add(handler); return () => handlersRef.current.delete(handler) }
}
```

---

## Keymap Helpers

### `src/keymap/helpers.ts`

```typescript
const MAX_COUNT_PREFIX = 99

// Generates 99 × {k, up, j, down} bindings for vim count prefix
// e.g. "1 5 j" moves down by 15
export const countedVerticalBindings = <C>(moveBy: (ctx: C, delta: number) => void):
  readonly CommandConfig<C>[] => {
  const out: CommandConfig<C>[] = []
  for (let count = 1; count <= MAX_COUNT_PREFIX; count++) {
    out.push({ keys: [countSequence(count, "k"), countSequence(count, "up")], run: (s) => moveBy(s, -count) })
    out.push({ keys: [countSequence(count, "j"), countSequence(count, "down")], run: (s) => moveBy(s, count) })
  }
  return out
}

// Default vertical navigation: vim (j/k) + arrows + emacs (ctrl+p/n) + readline (ctrl+k/j)
export const defaultVerticalKeys = {
  up: ["k", "up", "ctrl+p", "ctrl+k"] as const,
  down: ["j", "down", "ctrl+n", "ctrl+j"] as const,
}

// Two-button confirm modal: escape closes, return confirms
export const confirmModalBindings = <C>(options: ConfirmModalOptions<C>): readonly CommandConfig<C>[]

// List-picker modal: confirm + up/down navigation
export const selectionModalBindings = <C>(options: SelectionModalOptions<C>): readonly CommandConfig<C>[]
```

---

## Command Runtime Atom

### `src/commands/runtimeAtom.ts`

```typescript
// Bridge atom: App.tsx mirrors hook-local computed values into this atom
// on every render via useEffect. Command derivation atoms read from here.
export interface CommandRuntimeSnapshot {
  readonly readyDiffFileCount: number
  readonly diffFileIndex: number
  readonly selectedDiffCommentAnchorLabel: string | null
  readonly selectedDiffCommentThreadCount: number
  readonly hasDiffCommentThreads: boolean
  readonly diffRangeActive: boolean
  readonly hasSelectedComment: boolean
  readonly canEditSelectedComment: boolean
}

const initialSnapshot: CommandRuntimeSnapshot = {
  readyDiffFileCount: 0, diffFileIndex: 0,
  selectedDiffCommentAnchorLabel: null, selectedDiffCommentThreadCount: 0,
  hasDiffCommentThreads: false, diffRangeActive: false,
  hasSelectedComment: false, canEditSelectedComment: false,
}

export const commandRuntimeAtom = Atom.make<CommandRuntimeSnapshot>(initialSnapshot).pipe(Atom.keepAlive)
```

---

## Theme Palette Structure

### `src/ui/colors.ts`

```typescript
export interface ColorPalette {
  readonly background: string
  readonly modalBackground: string
  readonly text: string
  readonly muted: string
  readonly separator: string
  readonly accent: string
  readonly link: string
  readonly inlineCode: string
  readonly error: string
  readonly selectedBg: string
  readonly selectedText: string
  readonly count: string
  readonly status: {
    readonly draft: string; readonly approved: string; readonly changes: string
    readonly review: string; readonly none: string
    readonly passing: string; readonly pending: string; readonly failing: string
  }
  readonly repos: {
    readonly opencode: string; readonly "effect-smol": string
    readonly "opencode-console": string; readonly opencontrol: string; readonly default: string
  }
  readonly diff: {
    readonly addedBg: string; readonly removedBg: string; readonly contextBg: string
    readonly lineNumberBg: string; readonly addedLineNumberBg: string; readonly removedLineNumberBg: string
  }
}

// "ghui" theme (default) exact values:
const ghuiColors: ColorPalette = {
  background: "#111018", modalBackground: "#1a1a2e",
  text: "#ede7da", muted: "#9f9788", separator: "#6f685d",
  accent: "#f4a51c", link: "#7fb4ca", inlineCode: "#d7c5a1", error: "#f97316",
  selectedBg: "#1d2430", selectedText: "#f8fafc", count: "#d7c5a1",
  status: {
    draft: "#f59e0b", approved: "#7dd3a3", changes: "#f87171", review: "#93c5fd",
    none: "#9f9788", passing: "#7dd3a3", pending: "#f4a51c", failing: "#f87171",
  },
  repos: {
    opencode: "#60a5fa", "effect-smol": "#34d399", "opencode-console": "#f472b6",
    opencontrol: "#f59e0b", default: "#93c5fd",
  },
  diff: {
    addedBg: "#17351f", removedBg: "#3a1e22", contextBg: "transparent",
    lineNumberBg: "#151515", addedLineNumberBg: "#12301a", removedLineNumberBg: "#35171b",
  },
}

// "system" theme: derived from terminal ANSI palette via makeSystemColors()
// Uses grayscale ramp from terminal background, maps palette slots to status colors
// diffAlpha: 0.22 for dark backgrounds, 0.14 for light

// Color utilities:
export const mixHex = (base: string, overlay: string, amount: number) => /* RGB interpolation */
export const rowHoverBackground = () => mixHex(colors.modalBackground, colors.selectedBg, 0.38)
export const lineNumberTextColor = (bg: string, fg: string) => /* contrast-based mix */
```

---

## Essential Hook Contracts

### `src/ui/pullRequests/useDetailHydration.ts`

**Contract:** Background detail hydration pipeline for PR list.

```typescript
// Constants:
const DETAIL_PREFETCH_BEHIND = 1      // neighbours behind selection
const DETAIL_PREFETCH_AHEAD = 3       // neighbours ahead of selection
const DETAIL_PREFETCH_CONCURRENCY = 3 // max simultaneous prefetches
const DETAIL_PREFETCH_DELAY_MS = 120  // debounce before prefetch starts

// Protocol:
// 1. Selected PR: hydrate with notifyError=true (shows loading state + flash on error)
// 2. Neighbours: hydrate with notifyError=false (silent prefetch after debounce)
// 3. Cache-then-network: read SQLite first, apply if detailLoaded + matching SHA,
//    then fetch from network, apply server response, write back to SQLite
// 4. Generation guard: if refreshGenerationRef changes mid-flight, discard response
// 5. Force-refresh: when queueFetchedAt advances (list refreshed), re-fetch even if
//    detailLoaded is still true (checks may have changed without SHA change)
// 6. Concurrency cap: prefetch skipped if DETAIL_PREFETCH_CONCURRENCY already in flight
```

### `src/ui/pullRequests/useLoadMore.ts`

**Contract:** Pagination "load more" state machine.

```typescript
// Gating conditions (all must pass):
// 1. pullRequestLoad is non-null
// 2. hasMorePullRequests is true
// 3. Not already loading (isLoadingMorePullRequests is false)
// 4. pullRequestLoad.endCursor is non-null
// 5. config.prFetchLimit - data.length > 0

// Protocol:
// 1. Set loading flag keyed to current cache key
// 2. Fetch next page via listOpenPullRequestPageAtom
// 3. Generation guard: if refreshGenerationRef changed, discard
// 4. Apply nextLoadAfterPage (merge + dedup + cursor advance)
// 5. Update in-memory queue cache
// 6. Persist to SQLite via writeQueueCacheAtom
// 7. Clear loading flag only if key still matches (stale guard)
```

### `src/ui/comments/useCommentMutations.ts`

**Contract:** Comment CRUD lifecycle with optimistic-rollback.

```typescript
// Core protocol: submitOptimisticComment
// 1. Insert optimistic comment with local id ("local:{timestamp}")
// 2. Fire onOptimistic callback (update thread maps, issue commentCount)
// 3. Close modal, show "Posting..." notice
// 4. Fire server request
// 5. On success: swap optimistic id → server id, show success notice
// 6. On failure: remove optimistic comment, fire onRevert, show error notice

// canEditComment: comment must belong to viewer AND have server id (not "local:" prefix)

// findReviewThreadRootId: walk inReplyTo chain to find thread root
// (GitHub /replies endpoint rejects non-root ids with "parent comment not found")

// Mutation types: submitDiffComment, submitIssueComment, submitReplyComment,
//   submitEditComment, confirmDeleteComment
```

### `src/ui/merge/useMergeFlow.ts`

**Contract:** Merge workflow state machine.

```typescript
// Flow: open → load info+methods async → cycle method → choose kind → confirm → execute

// Two-stage confirm invariant:
// If PR is draft AND kind is not method-agnostic (e.g. MergeNow):
//   First Enter → enter pendingConfirm mode (shows "Mark as ready and merge?")
//   Second Enter → execute with markReady=true (toggles draft, then merges)
//   Escape → exit pendingConfirm (back to kind selection, NOT close modal)
// If PR is not draft OR kind is method-agnostic:
//   Enter → execute immediately

// Optimistic updates:
// - markReady: set reviewStatus from "draft" to "none"
// - autoMerge: set autoMergeEnabled to optimistic value
// - merge now: mark PR as "merged" (removes from open list)

// Rollback on failure:
// - If markReady was applied: full refresh (can't undo draft toggle safely)
// - Otherwise: restore previous PR state from snapshot
```

### `src/ui/useTextInputDispatcher.ts`

**Contract:** Text input routing with strict precedence.

```typescript
// Precedence order (first match wins):
// 1. commandPaletteActive → singleLineInput editing
// 2. openRepositoryModalActive → singleLineInput editing
// 3. (no modal, no full-view) → numeric tabs (1/2/3 switch surface)
// 4. themeModalActive + filterMode → singleLineInput editing
// 5. commentModalActive → (handled by comment editor, passthrough)
// 6. submitReviewModalActive + focus="body" → insertText
// 7. changedFilesModalActive → singleLineInput editing
// 8. labelModalActive → singleLineInput editing
// 9. filterMode → singleLineInput editing
```

---

## UI Display Logic

### `src/ui/pullRequests.ts`

```typescript
// Row display computation:
export const pullRequestRowDisplay = (pr: PullRequestItem, selected: boolean): PullRequestRowDisplay => {
  // indicatorFg: merged→passing, closed→muted, autoMerge→accent, else reviewStatus color
  // rowFg: selected→selectedText, final→muted, else text
  // numberFg: selected→accent, final→muted, else count
  // checkFg: merged→passing, closed→muted, unhydrated→muted, else checkStatus color
  // checkText: unhydrated→"·" (dot), else CHECK_ICON[checkStatus]
  //   CHECK_ICON: passing→"✓", failing→"×", pending→"◐", none→"−"
  //   REVIEW_ICON: draft→"◌", approved→"✓", changes→"!", review→"◐", none→"⌥"
}

// Review icons: merged→"✓", closed→"×", autoMerge→"↻", else REVIEW_ICON[status]

// Label color: use label.color if valid hex, else hash-based HSL fallback
export const labelColor = (label: PullRequestLabel): string
export const labelTextColor = (color: string): string  // luminance > 0.6 → dark text

// groupBy: group items by key, sort by orderedKeys then alphabetical
export const groupBy = <T>(items: readonly T[], getKey: (item: T) => string, orderedKeys?: readonly string[])
```

### `src/ui/inlineSegments.ts`

```typescript
// Single-pass tokenizer for rich inline text in comments
// Regex alternation order (first match wins):
// 1. `code spans` → inlineCode color
// 2. [label](url) → link color + underline
// 3. **bold** → recursive tokenize with bold=true
// 4. https://bare-urls → link color + underline (strips trailing punctuation)
// 5. #NNN → count color (+ underline if issueReferenceRepository provided)

const INLINE_TOKEN = /(`(?:\\.|[^`])+`)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*|(https?:\/\/[^\s<>()[\]"'`]+)|(#\d+)/g

// URL position tracking for click handling:
export const collectUrlPositions = (lines): readonly UrlPosition[]
export const findUrlAt = (positions, lineIndex, col): string | null

// Issue reference URLs use internal scheme: ghui://issue-ref/{repository}/{number}
```

### `src/ui/singleLineInput.ts`

```typescript
export interface SingleLineInputKey {
  readonly name: string; readonly sequence: string; readonly ctrl?: boolean; readonly meta?: boolean
}

// Editing operations:
// ctrl+u → clear all
// ctrl+w → delete last word (regex: /\s*\S+\s*$/)
// backspace → remove last character
// printable char → append
// ctrl/meta/empty sequence → null (not a text input key)

export const editSingleLineInput = (value: string, key: SingleLineInputKey): string | null
export const isSingleLineInputKey = (key: SingleLineInputKey): boolean
```

### `src/ui/diff/comments.ts`

```typescript
// Thread grouping: comments grouped by diffKey + path + side + line
export const diffCommentThreadMapKey = (diffKey: string, location: Pick<PullRequestReviewComment, "path" | "side" | "line">): string
  // Format: "{diffKey}:{path}:{side}:{line}"

export const groupDiffCommentThreads = (pr: PullRequestItem, comments: readonly PullRequestReviewComment[]):
  Record<string, PullRequestReviewComment[]>

// Range selection: two anchors on same path+side form a range
export const diffCommentRangeSelection = (start, end): DiffCommentRangeSelection | null
  // Returns null if different path or side; normalizes so start.line <= end.line

export const diffCommentRangeContains = (range, anchor): boolean
  // Same target + line within [start.line, end.line]

export const isLocalDiffComment = (comment) => comment.id.startsWith("local:")
```

---

## UI Primitives

### `src/ui/primitives.tsx`

```typescript
// Text fitting:
export const fitCell = (text: string, width: number, align?: "left" | "right"): string
  // Truncates with "…" if too long, pads with spaces
export const trimCell = (text: string, width: number): string
export const centerCell = (text: string, width: number): string

// Core components:
export const PlainLine = ({ text, fg?, bold? })  // Single-line text
export const TextLine = ({ children, fg?, bg?, width?, onMouse*? })  // Styled text line
export const MatchedCell = ({ text, width, query, align?, matchIndexes? })  // Search highlight
export const Divider = ({ width, junctionAt?, junctionChar?, junctions? })  // Horizontal rule
  // Supports junction characters at specific positions for modal borders
export const SeparatorColumn = ({ height, junctionRows?, junctions? })  // Vertical border
  // Renders "│" by default, "├" at junction rows

// Modal layout:
export const standardModalDims = (modalWidth, modalHeight, hasMiddleRow?): StandardModalDims
  // innerWidth = max(16, width - 2)
  // contentWidth = max(14, innerWidth - 2)
  // bodyHeight = max(1, height - fixedRows) where fixedRows = 7 or 9
```

### `src/ui/paneLayout.tsx`

```typescript
// Two-pane layout: fixed-width left + separator + remaining-width right
export const SplitPane = ({ height, leftWidth, rightWidth, left, right, junctionRows?, junctions? }) =>
  // <box flexDirection="row">
  //   <box width={leftWidth} height={height}>{left}</box>
  //   <SeparatorColumn height={height} junctionRows={...} />
  //   <box width={rightWidth} height={height}>{right}</box>
  // </box>

export const paneContentWidth = (width: number, inset?: number): number
  // max(1, width - inset * 2)

export const PaneInsetLine = ({ width, inset?, children })  // Inset text line
export const PaneDivider = ({ width })  // Full-width divider
```

### `src/ui/listSelection/SelectableRow.tsx`

```typescript
// Row background: selected → selectedBg, hovered → mix(modalBg, selectedBg, 0.38), else none
export const SelectableRow = ({ width, height?, selected, hovered, onSelect, onHoverChange, children }) =>
  // children is a function receiving rowBg: (rowBg: string | undefined) => ReactNode

// Hover state hook: keyed by string | number
export const useHoverState = <K extends string | number>() => {
  // Returns { isHovered: (key) => boolean, onHoverChange: (key) => (next: boolean) => void }
}
```

---

## Hook Composition and Lifecycle

### Hook Dependency Graph

```
App.tsx (composition root)
├── useDetailHydration
│   ├── reads: pullRequestsAtom, selectedIndex
│   ├── writes: queueLoadCacheAtom
│   └── calls: readCachedPullRequestAtom, writeCachedPullRequestAtom
├── useLoadMore
│   ├── reads: pullRequestLoadAtom, hasMorePullRequestsAtom
│   ├── writes: queueLoadCacheAtom
│   └── calls: listOpenPullRequestPageAtom, writeQueueCacheAtom
├── useCommentMutations
│   ├── reads: selectedPullRequest, selectedDiffCommentAnchor
│   ├── writes: pullRequestCommentsAtom, diffCommentThreadsAtom
│   └── calls: createPullRequestCommentAtom, replyToReviewCommentAtom, ...
├── useMergeFlow
│   ├── reads: selectedPullRequest, mergeModalAtom
│   ├── writes: mergeModalAtom, pullRequestsAtom (optimistic)
│   └── calls: getPullRequestMergeInfoAtom, mergePullRequestAtom, ...
└── useTextInputDispatcher
    ├── reads: all modal active flags
    └── writes: modal query/body atoms
```

### Lifecycle Order

1. **Mount**: All hooks initialize state
2. **Render**: Hooks read atoms, compute derived state
3. **Effect**: Hooks fire async operations (detail hydration, prefetch)
4. **User Input**: Keymap dispatches to commands, which update atoms
5. **Re-render**: Atoms notify subscribers, hooks re-read
6. **Unmount**: Hooks clean up (clear timeouts, cancel fetches)

### Hook Interaction Rules

**Rule HOOK-001**: Hooks MUST NOT call each other directly. Communicate via atoms.
**Rule HOOK-002**: Hooks MUST clean up async operations on unmount.
**Rule HOOK-003**: Hooks MUST use generation guard for async operations.

### Hook Implementation Signatures

```typescript
// useDetailHydration
export const useDetailHydration = (input: {
  selectedPullRequest: PullRequestItem | null
  pullRequests: readonly PullRequestItem[]
  refreshGenerationRef: MutableRefObject<number>
}): {
  detailHydrationState: Record<string, DetailHydrationState>
  resetHydration: () => void
}

// useLoadMore
export const useLoadMore = (input: {
  activeView: PullRequestView
  currentQueueCacheKey: string
  refreshGenerationRef: MutableRefObject<number>
}): {
  loadMorePullRequests: () => void
  isLoadingMorePullRequests: boolean
  resetLoadingMore: () => void
}

// useCommentMutations
export const useCommentMutations = (input: {
  selectedPullRequest: PullRequestItem | null
  selectedDiffCommentAnchor: DiffCommentAnchor | null
  commentModal: CommentModalState
  setCommentModal: (next: CommentModalState) => void
}): {
  submitComment: () => void
  deleteComment: (id: string) => void
}

// useMergeFlow
export const useMergeFlow = (input: {
  selectedPullRequest: PullRequestItem | null
  mergeModal: MergeModalState
  setMergeModal: (next: MergeModalState) => void
}): {
  openMergeModal: () => void
  confirmMerge: () => void
  cancelMerge: () => void
}

// useTextInputDispatcher
export const useTextInputDispatcher = (input: {
  commandPaletteActive: boolean
  openRepositoryModalActive: boolean
  // ... all modal flags
}): void
```

### `src/gitRemotes.ts`

```typescript
const GITHUB_REMOTE_PATTERN = /^(?:https?:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/

export const parseGitRemoteUrl = (url: string): string | null => {
  const match = url.trim().match(GITHUB_REMOTE_PATTERN)
  if (!match) return null
  const owner = match[1]!, repo = match[2]!
  if (!owner || !repo) return null
  return `${owner}/${repo}`
}

export const detectCurrentGitHubRepository = (): string | null => {
  const remotes = Bun.spawnSync({ cmd: ["git", "remote"], stdout: "pipe", stderr: "pipe" })
  if (remotes.exitCode !== 0) return null
  const names = remotes.stdout.toString().split("\n").map(n => n.trim()).filter(Boolean)
  // Priority: origin first, then upstream, then alphabetical
  const orderedNames = [...names].sort((a, b) =>
    a === "origin" ? -1 : b === "origin" ? 1 : a === "upstream" ? -1 : b === "upstream" ? 1 : 0
  )
  for (const name of orderedNames) {
    const url = Bun.spawnSync({ cmd: ["git", "remote", "get-url", name], stdout: "pipe", stderr: "pipe" })
    if (url.exitCode !== 0) continue
    const repository = parseGitRemoteUrl(url.stdout.toString())
    if (repository) return repository
  }
  return null
}
```

**Remote URL patterns accepted:**
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

### `src/standalone.ts`

```typescript
// CLI entry point for standalone binary
// Parses: --help/-h, --version/-v, upgrade (rejected), unknown (edit-distance suggestion)
// Falls through to import("./index.js") for TUI launch

const editDistance = (a: string, b: string) => {
  const distances = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) distances[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1, distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return distances[a.length]![b.length]!
}

// Known commands: ["help", "version"]
// Unknown command: suggests closest match if editDistance <= 2
// "upgrade" command: prints "Use your package manager to upgrade ghui"
```

