---
"@kitlangton/ghui": patch
---

Cache: persist the issue queue, derive a repo rollup from cached PRs +
issues, and prewarm `repository_details` in the background so the Issues
and Repos tabs paint instantly on launch and repo detail panes feel warm
on first selection. Adds an `issues` table mirroring `pull_requests`
(reusing `queue_snapshots` with `view_key LIKE 'issue:%'`), a viewer-
scoped `readRepoRollup` aggregation, and an opportunistic prewarm with
TTL-skip and concurrency 4 for favorites + recents + the detected repo.
