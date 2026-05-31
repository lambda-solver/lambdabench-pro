---
"@kitlangton/ghui": patch
---

stop the "Loading more pull requests" loop that could fire repeatedly
when GitHub's cursor-based pagination drifted and returned items
already in the list; treat a page that adds no new pull requests as
terminal. also surface `updatedAt` on pull requests so the age column
and client-side ordering match GitHub's `sort:updated-desc`, fixing a
list that looked unordered because the age column was showing days
since creation while the server sorted by recent activity
