---
"@kitlangton/ghui": patch
---

Internal refactor: drain App.tsx by ~330 lines and reorganize state, hooks,
and view components into per-feature modules. No user-facing change. Atoms
move into `src/ui/<feature>/atoms.ts` files (theme, diff, comments, filter,
detail, workspace, listSelection, notice, modals, pullRequests). Effects
extract into custom hooks (`useFlashNotice`, `useSystemAppearancePolling`,
`useSpinnerFrame`, `useClampedIndex`, `useTerminalFocus`,
`useScrollFollowSelected`, `usePasteHandler`, `useIdleRefresh`,
`useDiffPrefetch`, `useWorkspacePreferencesPersistence`). The keymap
context object splits into 17 per-domain builders under
`src/keymap/contexts/`, composed by `buildAppCtx()`. The 1,379-line
`src/ui/modals.tsx` carves into per-modal files under `src/ui/modals/`
with the original path preserved as a barrel re-export. New
`src/surfaces/` directory holds `RepoWorkspace`, `IssuesWorkspace`, and
`WorkspaceModals`.
