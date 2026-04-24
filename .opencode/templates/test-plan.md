# Test Plan: {Feature Name}

**PRD**: {link}
**Date**: {YYYY-MM-DD}

## Scope

### In Scope
- {component/feature to test}

### Out of Scope
- {explicitly not testing}

## Test Strategy

### Unit Tests
- {what unit tests cover}

### Integration Tests
- {what integration tests cover}

### E2E Tests
- {what E2E tests cover}

## Test Cases

### TC-1: {Test Case Name}

**Given**: {precondition}
**When**: {action}
**Then**: {expected result}

**Priority**: High | Medium | Low
**Automated**: Yes | No

### TC-2: {Test Case Name}

...

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Empty input | {behavior} |
| Null/undefined | {behavior} |
| Max values | {behavior} |
| Concurrent access | {behavior} |

## Performance Criteria

- Response time: < {X}ms for {operation}
- Throughput: > {X} req/sec
- Memory: < {X}MB under load

## Security Test Cases

- [ ] Input validation
- [ ] Auth bypass attempts
- [ ] Injection attempts
- [ ] Rate limiting

## Exit Criteria

- [ ] All test cases executed
- [ ] No critical/high bugs open
- [ ] Performance criteria met
- [ ] Security test cases pass
