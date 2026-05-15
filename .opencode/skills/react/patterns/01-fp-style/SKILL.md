---
name: 01-fp-style
description: React functional programming style — pure components, hooks conventions, Effect Atom integration, and Tailwind patterns
license: MIT
compatibility: opencode
---

# React FP Style

Functional programming conventions for React components. These rules apply to
all React code regardless of whether Effect-TS is used.

## Core Rules

- **Always `const`** — components, handlers, derived values; never `let` or `var`
- **No mutation** — never mutate arrays or objects in place; always produce new values
- **Pure components** — same props → same output; side effects only in `useEffect` or custom hooks
- **Derive, don't store** — don't put derivable values in `useState`; compute them inline or with `useMemo`
- **Immutable handlers** — declare event handlers as `const` at component scope

## Never Mutate

```typescript
// ❌ mutation
const handleAdd = () => {
  items.push(newItem)
  setItems(items)
}

// ✅ new array
const handleAdd = () => {
  setItems([...items, newItem])
}

// ❌ object mutation
state.count = state.count + 1

// ✅ new object
const next = { ...state, count: state.count + 1 }
```

## Always const

```typescript
// ❌ let / var
let MyComponent = () => <div />
var count = items.length

// ✅ const
const MyComponent = () => <div />
const count = items.length
```

## Derive, Don't Store

```typescript
// ❌ redundant state
const [sortedItems, setSortedItems] = useState(items)
useEffect(() => setSortedItems([...items].sort()), [items])

// ✅ derived value
const sortedItems = useMemo(() => [...items].sort(), [items])
```

## Immutable Handlers

```typescript
// ❌ inline mutation in JSX
<button onClick={() => { arr.push(x); setState(arr) }}>Add</button>

// ✅ pure handler declared with const
const handleClick = () => setState(prev => [...prev, x])
<button onClick={handleClick}>Add</button>
```

## Props and State Updates

```typescript
// ❌ mutate props or state directly
props.user.name = "Alice"
state.items[0] = updated

// ✅ spread for objects, map/filter for arrays
const updatedUser = { ...props.user, name: "Alice" }
const updatedItems = state.items.map((item, i) => i === 0 ? updated : item)
```

## Effect Atom Boundary (Effect-TS projects)

```typescript
// ❌ imperative runtime call inside JSX
const value = runtime.runSync(someEffect)

// ✅ read atom declaratively; AsyncResult.match handles all states
const result = useAtomValue(benchmarkAtom)
return AsyncResult.match(result, {
  onInitial: () => <Loading />,
  onFailure: (e) => <Error error={e} />,
  onSuccess: ({ value }) => <View data={value} />,
})
```

## List Rendering with map

**Always render lists dynamically with `Array.map`. Never hardcode list items.**

```tsx
// ❌ STATIC — violates DRY, hard to maintain
<div>
  <UserItem name="Alice" />
  <UserItem name="Bob" />
  <UserItem name="Carol" />
</div>

// ✅ DYNAMIC — data-driven, composable, scalable
<div>
  {users.map((user) => (
    <UserItem key={user.id} name={user.name} />
  ))}
</div>
```

### Key Rules

```tsx
// ❌ index as key — causes reordering bugs, broken state
{items.map((item, i) => <Item key={i} {...item} />)}

// ✅ stable unique id
{items.map((item) => <Item key={item.id} {...item} />)}

// ✅ fragment with key for multiple elements
{items.map((item) => (
  <React.Fragment key={item.id}>
    <dt>{item.name}</dt>
    <dd>{item.value}</dd>
  </React.Fragment>
))}
```

## Custom Hooks for Logic Reuse

```tsx
// ❌ logic in component
function UserList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    fetchUsers().then(setUsers).finally(() => setLoading(false))
  }, [])
  // ... 50 more lines
}

// ✅ custom hook
function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  useEffect(() => {
    setIsLoading(true)
    fetchUsers().then(setUsers).finally(() => setIsLoading(false))
  }, [])
  return { users, isLoading }
}

// ✅ clean component
function UserList() {
  const { users, isLoading } = useUsers()
  if (isLoading) return <Loading />
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}
```

## useMemo and useCallback

```tsx
// ✅ memoize expensive computation
const sortedUsers = useMemo(
  () => users.sort((a, b) => a.name.localeCompare(b.name)),
  [users]
)

// ✅ memoize callback to prevent child re-renders
const handleSelect = useCallback((id: string) => {
  setSelectedId(id)
}, [])

// ❌ don't memoize everything — only when:
// 1. Expensive computation
// 2. Passed to memoized child component
// 3. Used in dependency array of useEffect

// ❌ unnecessary memoization
const count = useMemo(() => items.length, [items]) // cheap, skip it
```

## Component Composition

```tsx
// ✅ composition over configuration
<Card>
  <Card.Header title="Users" />
  <Card.Body>
    <UserList />
  </Card.Body>
  <Card.Footer>
    <Button>Create</Button>
  </Card.Footer>
</Card>

// ❌ prop drilling configuration
<Card
  title="Users"
  body={<UserList />}
  footer={<Button>Create</Button>}
/>
```

## Error Boundaries

```tsx
// ✅ functional error boundary (react-error-boundary)
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div>
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )}
>
  <RiskyComponent />
</ErrorBoundary>
```

## Summary

| Rule | Enforce |
|------|---------|
| `const` everywhere | No `let`/`var` in component files |
| No in-place mutation | Spread, `map`, `filter`, `structuredClone` |
| Derive over store | `useMemo` / inline expression |
| Pure render | No side effects in render body |
| Declarative atom reads | `useAtomValue` + `AsyncResult.match` |
| Dynamic lists | Always `Array.map`, never static |
| Stable keys | Use `id`, never array index |
| Custom hooks | Extract logic, keep components thin |
| Composition | `children` props over configuration props |
| Memoization | Only for expensive ops or memoized children |
