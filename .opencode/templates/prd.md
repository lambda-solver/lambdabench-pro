# PRD: {Feature Name}

**Date**: {YYYY-MM-DD}
**Author**: {name}
**Status**: Draft | Review | Approved
**Epoch**: {current epoch}

## Summary

{1-2 paragraph summary: what we're building and why it matters}

## Problem

### User Pain

{What problem are users facing? Why does this matter?}

### Current State

{How do users solve this today? What's broken?}

## Goals

| # | Goal | Metric |
|---|------|--------|
| 1 | {goal} | {how we measure} |

### Non-Goals

- {explicitly out of scope}

## Solution

### Overview

{High-level approach}

### User Stories

1. As a {user}, I want to {action} so that {benefit}
2. ...

### Requirements

#### Functional

- [ ] {requirement}
- [ ] {requirement}

#### Non-Functional

- [ ] Performance: {target}
- [ ] Security: {requirements}
- [ ] Scalability: {requirements}

### Architecture

{Key architectural decisions, diagrams, component boundaries}

### Schema Contracts

```ts
// Define interfaces first
interface FeatureInput { ... }
interface FeatureOutput { ... }
```

## Acceptance Criteria

- [ ] {criterion 1}
- [ ] {criterion 2}
- [ ] All tests pass
- [ ] Security audit passed
- [ ] Benchmark baseline established

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| {risk} | {high/med/low} | {approach} |

## Open Questions

- [ ] {question}

## Dependencies

- {external dependencies}
