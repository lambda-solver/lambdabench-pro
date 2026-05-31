# Behavior Specification

> **Version:** 0.7.1
> **Purpose:** Language-agnostic Given/When/Then conformance specs. The executable test
> contract and definition of done. Every [ESSENTIAL] invariant, workflow, and state
> transition from domain.md has a corresponding SPEC here.
> **Rule:** Each SPEC is testable without reading source code. NO language-specific material.

---

## Identity Rules

### SPEC-001 : PullRequest identity by (repository, number)

```
Tags: [ESSENTIAL]
Given two PullRequests with the same repository and number
  And different values for all other attributes
When  compared for identity
Then  they MUST be treated as the same entity
Maps-to: D-001
Source: src/domain.ts:135-160
```

### SPEC-002 : Issue identity by (repository, number)

```
Tags: [ESSENTIAL]
Given two Issues with the same repository and number
  And different values for all other attributes
When  compared for identity
Then  they MUST be treated as the same entity
Maps-to: D-001
Source: src/domain.ts:178-190
```

### SPEC-003 : Cache key format for items

```
Tags: [ESSENTIAL]
Given a PullRequest with repository "owner/name" and number 42
When  the item cache key is computed
Then  the result MUST be "owner/name#42"
Maps-to: D-010
Source: src/services/CacheService.ts:178
```

### SPEC-004 : Cache key format for views

```
Tags: [ESSENTIAL]
Given a QueueView with mode "authored" and no repository
When  the view cache key is computed
Then  the result MUST be "pullRequest:authored:_"
Maps-to: D-010
Source: src/pullRequestViews.ts:25, src/item.ts:104-107
```

### SPEC-005 : View cache key ignores text filter

```
Tags: [ESSENTIAL]
Given two queries that differ only in text filter
When  cache keys are computed for both
Then  they MUST produce the same cache key
Maps-to: D-010
Source: src/item.ts:104-107
```

---

## Detail Loaded Invariant

### SPEC-006 : detailLoaded reflects hydration state

```
Tags: [ESSENTIAL]
Given a PullRequest from a summary query
When  the item is inspected
Then  detailLoaded MUST be no
  And body, labels, checks, and line counts MUST be empty/default
Maps-to: D-002
Source: src/domain.ts:155
```

### SPEC-007 : detail query sets detailLoaded

```
Tags: [ESSENTIAL]
Given a PullRequest fetched via the detail query
When  the item is inspected
Then  detailLoaded MUST be yes
  And body, labels, checks, and line counts MUST be populated
Maps-to: D-002
Source: src/services/GitHubService.ts:231-254
```

---

## Comment Invariants

### SPEC-008 : General comment never carries file/line

```
Tags: [ESSENTIAL]
Given a Comment with tag "comment"
When  its attributes are inspected
Then  it MUST NOT have file, line, or side attributes
Maps-to: D-003
Source: src/domain.ts:121-129
```

### SPEC-009 : Review comment always carries file/line/side

```
Tags: [ESSENTIAL]
Given a Comment with tag "review-comment"
When  its attributes are inspected
Then  it MUST have file (text path), line (whole number), and side (LEFT or RIGHT)
Maps-to: D-003
Source: src/domain.ts:109-119
```

### SPEC-010 : Diff comment side values

```
Tags: [ESSENTIAL]
Given a review comment on a diff
When  the side is inspected
Then  it MUST be one of {LEFT, RIGHT}
  And LEFT corresponds to old/deleted content
  And RIGHT corresponds to new/added content
Maps-to: D-003
Source: src/domain.ts:49-50
```

---

## List Mode Invariants

### SPEC-011 : Review mode is PullRequest-only

```
Tags: [ESSENTIAL]
Given an ItemListInput with kind "issue"
When  mode is set to "review"
Then  the system MUST reject this as an illegal combination
Maps-to: D-006
Source: src/item.ts:23
```

### SPEC-012 : Mode "all" requires repository

```
Tags: [ESSENTIAL]
Given an ItemListInput with mode "all" and repository absent
When  the search qualifier is built
Then  the system MUST throw an IllegalInput error
  And the error MUST NOT reach the user
Maps-to: D-007
Source: src/item.ts:73-76
```

### SPEC-013 : Page size clamped to [1, 100]

```
Tags: [ESSENTIAL]
Given a page size of 200
When  the list operation is invoked
Then  the effective page size MUST be 100
Maps-to: D-008
Source: src/services/GitHubService.ts:190
```

### SPEC-014 : Page size minimum clamped to 1

```
Tags: [ESSENTIAL]
Given a page size of 0
When  the list operation is invoked
Then  the effective page size MUST be 1
Maps-to: D-008
Source: src/services/GitHubService.ts:190
```

---

## Cache Merge Invariants

### SPEC-015 : Cache merge preserves detail on matching commit

```
Tags: [ESSENTIAL]
Given a cached PullRequest with detailLoaded=yes and headRefOid "abc123"
  And a fresh summary PullRequest with the same URL and headRefOid "abc123"
When  mergeCachedDetails is applied
Then  the result MUST have detailLoaded=yes
  And body, labels, checks, and line counts MUST come from the cached version
Maps-to: S-008
Source: src/pullRequestCache.ts:12-31
```

### SPEC-016 : Cache merge discards detail on different commit

```
Tags: [ESSENTIAL]
Given a cached PullRequest with detailLoaded=yes and headRefOid "abc123"
  And a fresh summary PullRequest with the same URL but headRefOid "def456"
When  mergeCachedDetails is applied
Then  the result MUST have detailLoaded=no
  And all attributes MUST come from the fresh version
Maps-to: S-008
Source: src/pullRequestCache.ts:17
```

### SPEC-017 : Cache merge skips non-detail-loaded cached items

```
Tags: [ESSENTIAL]
Given a cached PullRequest with detailLoaded=no
  And a fresh summary PullRequest with the same URL
When  mergeCachedDetails is applied
Then  the result MUST be the fresh item unchanged
Maps-to: S-008
Source: src/pullRequestCache.ts:17
```

### SPEC-018 : Append page deduplicates by URL

```
Tags: [ESSENTIAL]
Given an existing list with PullRequest at URL "https://example.com/pr/1"
  And an incoming page containing the same URL plus a new URL
When  appendPullRequestPage is applied
Then  the result MUST contain the existing items plus only the new URL
  And the duplicate MUST NOT appear twice
Maps-to: D-001
Source: src/pullRequestCache.ts:36-40
```

---

## Pagination Invariants

### SPEC-019 : Pagination survives duplicate-only page

```
Tags: [ESSENTIAL]
Given a current load with endCursor "cursor-A" and hasNextPage=yes
  And a new page where all items are duplicates of existing items
  And the new page has endCursor "cursor-B" (different from "cursor-A")
  And the new page has hasNextPage=yes
When  nextLoadAfterPage is applied
Then  hasNextPage MUST remain yes
  And endCursor MUST be updated to "cursor-B"
Maps-to: D-008, workflow 3.10
Source: src/pullRequestCache.ts:56-65
```

### SPEC-020 : Pagination stops at fetch limit

```
Tags: [ESSENTIAL]
Given a current load with 499 items
  And a fetch limit of 500
  And a new page with 10 items (all new)
When  nextLoadAfterPage is applied
Then  hasNextPage MUST be no (509 > 500)
Maps-to: D-008
Source: src/pullRequestCache.ts:64
```

### SPEC-021 : Pagination stops when server says no more pages

```
Tags: [ESSENTIAL]
Given a new page with hasNextPage=no
When  nextLoadAfterPage is applied
Then  the result MUST have hasNextPage=no regardless of item count
Maps-to: workflow 3.10
Source: src/pullRequestCache.ts:64
```

---

## Retry Invariants

### SPEC-022 : Transient errors trigger retry with backoff

```
Tags: [ESSENTIAL]
Given a network fetch that fails with a transient error
When  the retry policy is applied
Then  the system MUST retry up to 6 times
  And the backoff MUST start at 300ms with factor 2
  And the user MUST see "Retrying N/6" in the footer
Maps-to: workflow 3.11
Source: src/ui/pullRequests/atoms.ts:105
```

### SPEC-023 : Rate limit errors do not retry

```
Tags: [ESSENTIAL]
Given a network fetch that fails with a rate limit error
When  the retry policy is evaluated
Then  the system MUST NOT retry
  And the user MUST see "Rate limited" notice
Maps-to: workflow 3.11
Source: src/ui/pullRequests/atoms.ts:32
```

### SPEC-024 : Command timeouts do not retry

```
Tags: [ESSENTIAL]
Given a network fetch that fails with a command timeout
When  the retry policy is evaluated
Then  the system MUST NOT retry
Maps-to: workflow 3.11
Source: src/ui/pullRequests/atoms.ts:32
```

---

## Cache Failure Invariants

### SPEC-025 : Cache read failure treated as miss

```
Tags: [ESSENTIAL]
Given the local database returns an error on read
When  the cache service is queried
Then  the result MUST be absent (null)
  And no error MUST propagate to the caller
Maps-to: S-002
Source: src/services/CacheService.ts:550-591
```

### SPEC-026 : Cache write failure is silent

```
Tags: [ESSENTIAL]
Given the local database returns an error on write
When  the cache service writes data
Then  the error MUST be silently ignored
  And the write operation's error channel MUST be "never"
Maps-to: S-002
Source: src/services/CacheService.ts:593-628
```

---

## Merge Action Invariants

### SPEC-027 : Merge dialog only shows allowed methods

```
Tags: [ESSENTIAL]
Given a repository that allows squash and rebase but not merge-commit
When  the merge dialog is opened
Then  the available methods MUST include squash and rebase
  And MUST NOT include merge-commit
Maps-to: MergeAction rules
Source: src/mergeActions.ts:111-119
```

### SPEC-028 : Admin merge only when viewer has permission

```
Tags: [ESSENTIAL]
Given a PullRequest with viewerCanMergeAsAdmin=no
When  available merge kinds are computed
Then  AdminMerge MUST NOT be in the available list
Maps-to: MergeAction rules
Source: src/mergeActions.ts:100
```

### SPEC-029 : Auto-merge unavailable when already enabled

```
Tags: [ESSENTIAL]
Given a PullRequest with autoMergeEnabled=yes
When  available merge kinds are computed
Then  AutoMerge MUST NOT be in the available list
  And DisableAuto MUST be in the available list
Maps-to: MergeAction rules
Source: src/mergeActions.ts:81,90
```

### SPEC-030 : Cleanly mergeable conditions

```
Tags: [ESSENTIAL]
Given a PullRequest with state=open, isDraft=no, mergeable=mergeable,
  reviewStatus=approved, checkStatus=passing
When  MergeNow availability is checked
Then  MergeNow MUST be available
Maps-to: MergeInfo rules
Source: src/mergeActions.ts:24-31
```

### SPEC-031 : Not cleanly mergeable when checks failing

```
Tags: [ESSENTIAL]
Given a PullRequest with state=open, isDraft=no, mergeable=mergeable,
  reviewStatus=approved, checkStatus=failing
When  MergeNow availability is checked
Then  MergeNow MUST NOT be available
Maps-to: MergeInfo rules
Source: src/mergeActions.ts:31
```

---

## Diff Invariants

### SPEC-032 : Whitespace minimization collapses whitespace-only changes

```
Tags: [ESSENTIAL]
Given a diff hunk where a deletion and addition differ only in whitespace
When  minimizeWhitespacePatch is applied with mode "ignore"
Then  the matched lines MUST become context lines (space prefix)
  And the hunk MUST NOT contain the whitespace-only change
Maps-to: DiffView rules
Source: src/ui/diff.ts:229-246
```

### SPEC-033 : Whitespace minimization drops empty hunks

```
Tags: [ESSENTIAL]
Given a diff hunk where ALL changes are whitespace-only
When  minimizeWhitespacePatch is applied
Then  the hunk MUST be dropped entirely
Maps-to: DiffView rules
Source: src/ui/diff.ts:277
```

### SPEC-034 : Whitespace minimization drops files with no remaining hunks

```
Tags: [ESSENTIAL]
Given a file where all hunks become empty after whitespace minimization
When  minimizeWhitespaceDiffFiles is applied
Then  the file MUST be removed from the diff view
Maps-to: DiffView rules
Source: src/ui/diff.ts:301-306
```

### SPEC-035 : Hunk line counts recalculated after minimization

```
Tags: [ESSENTIAL]
Given a patch that has been whitespace-minimized
When  the result is inspected
Then  all @@ hunk headers MUST have line counts matching actual content
Maps-to: DiffView rules
Source: src/ui/diff.ts:298
```

### SPEC-036 : LCS fallback for large hunks

```
Tags: [ESSENTIAL]
Given a hunk with 300 deletions and 200 additions
  And (300+1) × (200+1) = 60,501 > 40,000
When  whitespaceEquivalentMatches is computed
Then  the linear greedy fallback MUST be used instead of LCS
Maps-to: DiffView rules
Source: src/ui/diff.ts:196-198
```

### SPEC-037 : Split view aligns deletion and addition rows

```
Tags: [ESSENTIAL]
Given a diff with 2 deletions and 3 additions at the same position
  And render mode is "split"
When  getDiffCommentAnchors is computed
Then  rows 0 and 1 MUST have both a LEFT and RIGHT anchor
  And row 2 MUST have only a RIGHT anchor
  And the shorter side MUST be padded for visual alignment
Maps-to: DiffView rules
Source: src/ui/diff.ts:466-487
```

### SPEC-038 : Patch splitting by diff markers

```
Tags: [ESSENTIAL]
Given a multi-file patch with 3 "diff --git" markers
When  splitPatchFiles is applied
Then  the result MUST contain exactly 3 DiffFilePatch entries
  And each entry's name MUST be extracted from the diff header
Maps-to: DiffView rules
Source: src/ui/diff.ts:308-324
```

### SPEC-039 : Empty patch produces empty list

```
Tags: [ESSENTIAL]
Given an empty string as input
When  splitPatchFiles is applied
Then  the result MUST be an empty list
Maps-to: DiffView rules
Source: src/ui/diff.ts:310
```

---

## Filter Invariants

### SPEC-040 : Filter is client-side only

```
Tags: [ESSENTIAL]
Given a user typing in the filter input
When  the filter query changes
Then  NO network request MUST be triggered
  And results MUST be computed from the currently loaded items
Maps-to: U-004
Source: src/ui/filter/scoring.ts
```

### SPEC-041 : Filter scoring prioritizes title over body

```
Tags: [ESSENTIAL]
Given two issues: one with query matching the title, one with query matching the body
When  filterByScore is applied
Then  the title-matching issue MUST rank before the body-matching issue
Maps-to: workflow 3.5
Source: src/ui/filter/scoring.ts:26-45
```

### SPEC-042 : Filter returns all items for empty query

```
Tags: [ESSENTIAL]
Given an empty filter query
When  filterByScore is applied
Then  all items MUST be returned in their original order
Maps-to: workflow 3.5
Source: src/ui/filter/scoring.ts:47-62
```

---

## State Machine Invariants

### SPEC-043 : Only one modal active at a time

```
Tags: [ESSENTIAL]
Given the Merge modal is currently active
When  the Comment modal is opened
Then  the active modal MUST be Comment
  And the Merge modal state MUST be gone
Maps-to: State Machine 4.2
Source: src/ui/modals/types.ts:221-239
```

### SPEC-044 : Modal close returns to None

```
Tags: [ESSENTIAL]
Given any modal is currently active
When  the close action is invoked
Then  the active modal MUST be None
Maps-to: State Machine 4.2
Source: src/ui/modals/types.ts:239
```

### SPEC-045 : Surface switch resets transient state

```
Tags: [ESSENTIAL]
Given the user is on the pullRequests surface with diffFullView=yes
When  the user switches to the issues surface
Then  diffFullView MUST be no
  And detailFullView MUST be no
  And commentsViewActive MUST be no
Maps-to: workflow 3.4
Source: src/commands/builtins.ts:108-120
```

---

## Theme Invariants

### SPEC-046 : Fixed theme mode returns configured theme

```
Tags: [ESSENTIAL]
Given a ThemeConfig with mode "fixed" and theme "tokyo-night"
When  resolveThemeId is called with any appearance
Then  the result MUST be "tokyo-night"
Maps-to: Theme rules
Source: src/themeConfig.ts:46-47
```

### SPEC-047 : System theme mode follows appearance

```
Tags: [ESSENTIAL]
Given a ThemeConfig with mode "system", darkTheme "ghui", lightTheme "catppuccin-latte"
When  resolveThemeId is called with appearance "dark"
Then  the result MUST be "ghui"
When  resolveThemeId is called with appearance "light"
Then  the result MUST be "catppuccin-latte"
Maps-to: Theme rules
Source: src/themeConfig.ts:46-47
```

---

## Repository Input Invariants

### SPEC-048 : Accepts shorthand owner/name format

```
Tags: [ESSENTIAL]
Given user input "kitlangton/ghui"
When  parseRepositoryInput is applied
Then  the result MUST be "kitlangton/ghui"
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:44-53
```

### SPEC-049 : Accepts full GitHub URL

```
Tags: [ESSENTIAL]
Given user input "https://github.com/kitlangton/ghui"
When  parseRepositoryInput is applied
Then  the result MUST be "kitlangton/ghui"
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:46
```

### SPEC-050 : Rejects invalid input

```
Tags: [ESSENTIAL]
Given user input "not a repository"
When  parseRepositoryInput is applied
Then  the result MUST be absent (null)
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:49
```

### SPEC-051 : Strips .git suffix

```
Tags: [ESSENTIAL]
Given user input "kitlangton/ghui.git"
When  parseRepositoryInput is applied
Then  the result MUST be "kitlangton/ghui"
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:51
```

---

## Search Qualifier Invariants

### SPEC-052 : Search qualifier includes kind

```
Tags: [ESSENTIAL]
Given an ItemListInput with kind "pullRequest"
When  searchQualifier is built
Then  the result MUST contain "is:pr"
Maps-to: D-006
Source: src/item.ts:50,77
```

### SPEC-053 : Search qualifier includes sort order

```
Tags: [ESSENTIAL]
Given any valid ItemListInput
When  searchQualifier is built
Then  the result MUST contain "sort:updated-desc"
  And MUST contain "is:open"
  And MUST contain "archived:false"
Maps-to: workflow 3.1
Source: src/item.ts:81
```

### SPEC-054 : Authored mode qualifier

```
Tags: [ESSENTIAL]
Given an ItemListInput with mode "authored"
When  searchQualifier is built
Then  the result MUST contain "author:@me"
Maps-to: workflow 3.1
Source: src/item.ts:57
```

---

## Check Rollup Invariants

### SPEC-055 : Any failure produces failing rollup

```
Tags: [ESSENTIAL]
Given a list of checks where all have status "completed"
  And one has conclusion "failure"
  And all others have conclusion "success"
When  the rollup status is computed
Then  the result MUST be "failing"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:105-145
```

### SPEC-056 : All success produces passing rollup

```
Tags: [ESSENTIAL]
Given a list of checks where all have status "completed"
  And all have conclusion "success"
When  the rollup status is computed
Then  the result MUST be "passing"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:105-145
```

### SPEC-057 : In-progress produces pending rollup

```
Tags: [ESSENTIAL]
Given a list of checks where one has status "in_progress"
  And all completed checks have conclusion "success"
When  the rollup status is computed
Then  the result MUST be "pending"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:105-145
```

### SPEC-058 : No checks produces none rollup

```
Tags: [ESSENTIAL]
Given an empty list of checks
When  the rollup status is computed
Then  the result MUST be "none"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:106-108
```

### SPEC-058a : Pending beats failing (priority order)

```
Tags: [ESSENTIAL]
Given a list of checks where one has status "in_progress"
  And another has status "completed" with conclusion "failure"
When  the rollup status is computed
Then  the result MUST be "pending" (not "failing")
  And pending takes priority over failing in the evaluation order
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:136-144
```

---

## Pruning Invariants

### SPEC-059 : Pruning retains items referenced by queue snapshots

```
Tags: [ESSENTIAL]
Given a PullRequest older than 30 days
  And a queue snapshot that references it
When  prune is executed
Then  the PullRequest MUST NOT be deleted
Maps-to: S-001
Source: src/services/CacheService.ts:509-526
```

### SPEC-060 : Pruning removes unreferenced old items

```
Tags: [ESSENTIAL]
Given a PullRequest older than 30 days
  And no queue snapshot references it
When  prune is executed
Then  the PullRequest MUST be deleted
Maps-to: S-001
Source: src/services/CacheService.ts:513-518
```

---

## Git Remote Detection Invariants

### SPEC-061 : Git remote URL parsing accepts HTTPS format

```
Tags: [ESSENTIAL]
Given a git remote URL "https://github.com/owner/repo"
When  parseGitRemoteUrl is applied
Then  the result MUST be "owner/repo"
Maps-to: StartupRepositoryDetection rules
Source: src/gitRemotes.ts:3-9
```

### SPEC-062 : Git remote URL parsing accepts SSH format

```
Tags: [ESSENTIAL]
Given a git remote URL "git@github.com:owner/repo.git"
When  parseGitRemoteUrl is applied
Then  the result MUST be "owner/repo"
Maps-to: StartupRepositoryDetection rules
Source: src/gitRemotes.ts:3-9
```

### SPEC-063 : Git remote URL parsing strips .git suffix

```
Tags: [ESSENTIAL]
Given a git remote URL "https://github.com/owner/repo.git"
When  parseGitRemoteUrl is applied
Then  the result MUST be "owner/repo" (without .git suffix)
Maps-to: StartupRepositoryDetection rules
Source: src/gitRemotes.ts:3-9
```

### SPEC-064 : Git remote detection prefers origin over upstream

```
Tags: [ESSENTIAL]
Given a git repository with remotes "upstream" pointing to "other/repo"
  And "origin" pointing to "owner/repo"
When  detectCurrentGitHubRepository is applied
Then  the result MUST be "owner/repo" (from origin, not upstream)
Maps-to: StartupRepositoryDetection rules
Source: src/gitRemotes.ts:11-28
```

---

## Command Palette Invariants

### SPEC-065 : Command palette scoring prioritizes title prefix

```
Tags: [ESSENTIAL]
Given two commands: "Open Repository" and "View Repository"
  And a query "open"
When  commandScore is applied
Then  "Open Repository" MUST score higher (lower number) than "View Repository"
  And title-prefix match MUST score 0
Maps-to: U-002
Source: src/commands.ts:54-72
```

### SPEC-066 : Command palette fuzzy matching accepts substring matches

```
Tags: [ESSENTIAL]
Given a command "Open Repository" and query "repo"
When  commandScore is applied
Then  the result MUST NOT be null (match found)
  And substring match MUST score 2
Maps-to: U-002
Source: src/commands.ts:54-72
```

---

## View Synchronization Invariants

### SPEC-067 : View sync projects Repository view to Repository view

```
Tags: [ESSENTIAL]
Given a PullRequestView with tag "Repository" and repository "owner/repo"
When  issueViewForPullRequestView is applied
Then  the result MUST be an IssueView with tag "Repository" and repository "owner/repo"
Maps-to: ViewSynchronization rules
Source: src/viewSync.ts:21-26
```

### SPEC-068 : View sync projects Queue view to Queue view with authored mode

```
Tags: [ESSENTIAL]
Given a PullRequestView with tag "Queue", mode "assigned", and repository null
When  issueViewForPullRequestView is applied
Then  the result MUST be an IssueView with tag "Queue", mode "authored", and repository null
Maps-to: ViewSynchronization rules
Source: src/viewSync.ts:21-26
```

---

## Algorithm Property Invariants

These property-based SPECs verify algorithm correctness across all valid inputs. They are mandatory for every non-trivial algorithm and serve as the primary fidelity check during Stage 2 implementation.

### SPEC-069-P : Patch splitting preserves diff marker count

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P
Invariant length(splitPatchFiles(P)) equals the count of "diff --git" markers in P
          (or 0 if P is empty, 1 if P contains no markers)
Maps-to: §13.1 Patch Splitting
Source: src/ui/diff.ts:splitPatchFiles
```

### SPEC-070-P : Hunk normalization produces accurate line counts

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P
Invariant every hunk in normalizeHunkLineCounts(P) has header counts that match
          the actual line counts in the hunk body
Maps-to: §13.2 Hunk Normalization
Source: src/ui/diff.ts:normalizeHunkLineCounts
```

### SPEC-071-P : Whitespace minimization preserves line count integrity

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P
Invariant lineCounts(normalize(minimizeWhitespace(P))) equals the actual body counts
          in the minimized patch
Maps-to: §13.3 Whitespace Minimization
Source: src/ui/diff.ts:minimizeWhitespacePatch
```

### SPEC-072-P : Whitespace minimization eliminates whitespace-only changes

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P where all changes are whitespace-only
Invariant minimizeWhitespace(P) produces an empty patch or drops the file
Maps-to: §13.3 Whitespace Minimization
Source: src/ui/diff.ts:minimizeWhitespacePatch
```

### SPEC-073-P : Stacked diff files maintain vertical offset consistency

```
Tags: [ESSENTIAL] [PROPERTY]
For-all file lists F
Invariant the headerLine of file[i+1] equals headerLine(file[i]) + 2 + diffHeight(file[i]) + separator
Maps-to: §13.4 Stacked Diff Files
Source: src/ui/diff.ts:buildStackedDiffFiles
```

### SPEC-074-P : Comment anchoring preserves render line monotonicity

```
Tags: [ESSENTIAL] [PROPERTY]
For-all diffs D
Invariant renderLine values in getDiffCommentAnchors(D) are monotonically increasing
Maps-to: §13.5 Comment Anchoring
Source: src/ui/diff.ts:getDiffCommentAnchors
```

### SPEC-075-P : Split mode comment anchoring aligns shared positions

```
Tags: [ESSENTIAL] [PROPERTY]
For-all diffs D in split mode
Invariant if deletions and additions share a position, they MUST have the same renderLine value
Maps-to: §13.5 Comment Anchoring
Source: src/ui/diff.ts:getDiffCommentAnchors
```

### SPEC-076-P : Filter scoring prioritizes higher-priority fields

```
Tags: [ESSENTIAL] [PROPERTY]
For-all items I and queries Q
Invariant if Q matches I.title at position P1 and I.body at position P2,
          then filterScore(I, Q) uses P1 (title wins)
Maps-to: §13.6 Filter Scoring
Source: src/ui/filter/scoring.ts:filterScore
```

### SPEC-077-P : Filter scoring handles empty queries

```
Tags: [ESSENTIAL] [PROPERTY]
For-all items I and empty query ""
Invariant filterScore(I, "") = 0 (no filtering)
Maps-to: §13.6 Filter Scoring
Source: src/ui/filter/scoring.ts:filterScore
```

---

## SPEC Dependency Notes

This section documents which SPECs logically imply others. This information is useful for understanding relationships, but **never drop a SPEC for being derivable**. Redundant SPECs are cheap; missing SPECs are catastrophic. Anything not covered by a SPEC will be silently dropped during Stage 2 implementation.

**Coverage bias**: Prefer MORE SPECs. The goal is maximal behavioral coverage, not minimal specification.

**Documented dependencies**:
- SPEC-014 (page size min) can be derived from SPEC-013 (page size max) + clamping logic
- SPEC-051 (strip .git) can be derived from SPEC-048 (shorthand) + regex

**Why keep derivable SPECs?**
1. They serve as explicit test cases during implementation
2. They catch edge cases that might be missed in the derivation
3. They provide regression protection if the base SPEC changes
4. They make the specification self-documenting

---

## Changelog

### 2026-05-30 (v0.7.1-r6)
- Added 9 property SPECs (SPEC-069-P through SPEC-077-P) for algorithm correctness verification
- Renamed "Minimization Analysis" to "SPEC Dependency Notes" with emphasis on coverage over minimality
- Total: 77 SPEC entries (68 Given/When/Then + 9 Property)

### 2024-05-30 (v0.7.1-r5)
- Added Minimization Analysis section identifying independent vs. derivable SPECs.

### 2024-05-30 (v0.7.1-r4)
- Added 8 SPEC entries: git remote detection (SPEC-061 to SPEC-064), command palette scoring (SPEC-065 to SPEC-066), view synchronization (SPEC-067 to SPEC-068).
- Total: 68 SPEC entries.

### 2024-05-29 (v0.7.1-r3)
- Initial version: 60 SPEC entries covering identity rules, detail-loaded invariant, comment invariants, list mode invariants, cache merge invariants, pagination invariants, retry invariants, cache failure invariants, merge action invariants, diff invariants, filter invariants, state machine invariants, theme invariants, repository input invariants, search qualifier invariants, check rollup invariants, pruning invariants.
- All SPECs are language-agnostic Given/When/Then format.
- All SPECs cite source file:line and map to domain.md invariant IDs.
