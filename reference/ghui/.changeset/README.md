# Changesets

This folder stores pending release notes and semver bump metadata.

- Add a changeset for user-facing changes with `bun run changeset`.
- Apply pending changesets with `bun run changeset:version` before creating a release.
- Publishing still happens from the GitHub release workflow via npm trusted publishing.
