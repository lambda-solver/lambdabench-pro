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

## Summary

| Rule | Enforce |
|------|---------|
| `const` everywhere | No `let`/`var` in component files |
| No in-place mutation | Spread, `map`, `filter`, `structuredClone` |
| Derive over store | `useMemo` / inline expression |
| Pure render | No side effects in render body |
| Declarative atom reads | `useAtomValue` + `AsyncResult.match` |
