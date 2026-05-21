---
name: 04-anti-patterns
description: React anti-patterns to avoid — manual JSX repetition, useEffect misuse, reference instability, prop drilling, conditional hooks, and common performance traps
license: MIT
compatibility: opencode
---

# React Anti-Patterns

Common patterns that cause bugs, performance issues, or maintenance problems in React.

## Manual JSX Repetition

**NEVER repeat JSX elements manually.** Always render from data with `Array.map`.

```tsx
// ❌ MANUAL — violates DRY, unmaintainable, error-prone
<div>
  <TildeLine />
  <TildeLine />
  <TildeLine />
  <TildeLine />
  <TildeLine />
  <TildeLine />
  <TildeLine />
</div>

// ✅ DATA-DRIVEN — declarative, scalable, maintainable
<div>
  {Array.from({ length: 7 }, (_, i) => (
    <TildeLine key={i} />
  ))}
</div>

// ✅ with actual data
<div>
  {lines.map((line) => (
    <TildeLine key={line.id} variant={line.variant} />
  ))}
</div>
```

**Why this matters:**
- Manual repetition hides intent (why 7?)
- Changing count requires editing JSX, not data
- No way to add per-item props without more repetition
- Violates FP principle: derive UI from data, don't hardcode structure

## useEffect for Derived State

**Never use `useEffect` to synchronize state from props or other state.**

```tsx
// ❌ SYNC STATE — infinite loops, stale data, complexity
const [sortedItems, setSortedItems] = useState(items);
useEffect(() => {
  setSortedItems([...items].sort());
}, [items]);

// ✅ DERIVE — pure, synchronous, no extra renders
const sortedItems = useMemo(() => [...items].sort(), [items]);

// ✅ even simpler — inline if cheap
const sortedItems = [...items].sort();
```

```tsx
// ❌ SYNC PROPS TO STATE — anti-pattern
const [value, setValue] = useState(initialValue);
useEffect(() => {
  setValue(initialValue);
}, [initialValue]);

// ✅ CONTROLLED — parent owns state
function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />;
}

// ✅ UNCONTROLLED with key reset
<input key={resetKey} defaultValue={initialValue} />
```

## Reference Instability in JSX

**Never create objects, arrays, or functions inline in JSX props.**

```tsx
// ❌ NEW REFERENCE EVERY RENDER — child re-renders unnecessarily
<Component
  style={{ color: "red", fontSize: 14 }}
  config={{ enabled: true, mode: "auto" }}
  items={["a", "b", "c"]}
  onClick={() => handleClick(id)}
/>

// ✅ STABLE REFERENCES — memoize or lift out
const style = { color: "red", fontSize: 14 };
const config = { enabled: true, mode: "auto" };
const items = ["a", "b", "c"];

const handleItemClick = useCallback((id: string) => {
  handleClick(id);
}, [handleClick]);

<Component
  style={style}
  config={config}
  items={items}
  onClick={handleItemClick}
/>
```

```tsx
// ❌ inline arrow in JSX — new function every render
<button onClick={() => setCount((c) => c + 1)}>Increment</button>

// ✅ stable handler
const increment = () => setCount((c) => c + 1);
<button onClick={increment}>Increment</button>
```

## useCallback / useMemo Misuse

**Don't memoize everything. Don't forget dependencies.**

```tsx
// ❌ memoizing cheap operations — overhead > benefit
const count = useMemo(() => items.length, [items]);
const isEmpty = useMemo(() => items.length === 0, [items]);

// ✅ just compute inline
const count = items.length;
const isEmpty = items.length === 0;
```

```tsx
// ❌ missing dependencies — stale closures
const handleSubmit = useCallback(() => {
  submit(formData); // formData is stale!
}, []); // forgot formData

// ✅ correct dependencies
const handleSubmit = useCallback(() => {
  submit(formData);
}, [formData]);
```

```tsx
// ❌ useCallback without memoized child — no benefit
const handleClick = useCallback(() => {}, []);
<button onClick={handleClick}>Click</button>; // button is not memoized

// ✅ only when child is wrapped in React.memo
const MemoizedChild = React.memo(Child);
<MemoizedChild onClick={handleClick} />;
```

## Prop Drilling

**Don't thread props through multiple component layers.**

```tsx
// ❌ PROP DRILLING — App → Layout → Header → UserMenu → Avatar
function App() {
  const user = useUser();
  return <Layout user={user} />;
}
function Layout({ user }: { user: User }) {
  return <Header user={user} />;
}
function Header({ user }: { user: User }) {
  return <UserMenu user={user} />;
}

// ✅ CONTEXT — intermediate components don't know about user
const UserContext = createContext<User | null>(null);

function App() {
  const user = useUser();
  return (
    <UserContext.Provider value={user}>
      <Layout />
    </UserContext.Provider>
  );
}

function Avatar() {
  const user = useContext(UserContext); // only consumer knows
  return <img src={user?.avatar} />;
}

// ✅ COMPOSITION — pass children instead of props
<Layout header={<UserMenu />} />
```

## useEffect without Cleanup

**Always clean up side effects.**

```tsx
// ❌ NO CLEANUP — memory leaks, stale subscriptions
useEffect(() => {
  const subscription = source.subscribe(setData);
}, [source]);

// ✅ CLEANUP
useEffect(() => {
  const subscription = source.subscribe(setData);
  return () => subscription.unsubscribe();
}, [source]);

// ❌ NO CLEANUP — event listener leaks
useEffect(() => {
  window.addEventListener("resize", handleResize);
}, []);

// ✅ CLEANUP
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

## Conditional Hooks

**Never call hooks conditionally or in loops.**

```tsx
// ❌ CONDITIONAL HOOK — breaks Rules of Hooks
if (isLoggedIn) {
  const user = useUser(); // crash or undefined behavior
}

// ✅ CONDITIONAL RENDER — hooks always run
const user = useUser();
if (!isLoggedIn) return <Login />;
return <Dashboard user={user} />;
```

```tsx
// ❌ HOOK IN LOOP — breaks Rules of Hooks
{items.map((item) => {
  const ref = useRef(null); // crash!
  return <div ref={ref}>{item.name}</div>;
})}

// ✅ SINGLE HOOK WITH ARRAY
const refs = useRef<(HTMLDivElement | null)[]>([]);
{items.map((item, i) => (
  <div ref={(el) => { refs.current[i] = el; }}>{item.name}</div>
))}
```

## Large Components

**Split components that exceed ~100 lines or mix concerns.**

```tsx
// ❌ GOD COMPONENT — 300+ lines, mixed data, UI, logic
function Dashboard() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... 200 more lines of handlers, effects, JSX
}

// ✅ SEPARATED BY CONCERN
function Dashboard() {
  return (
    <PageLayout>
      <UserSection />
      <PostSection />
    </PageLayout>
  );
}

function UserSection() {
  const { users, isLoading } = useUsers();
  if (isLoading) return <Loading />;
  return <UserList users={users} />;
}

function PostSection() {
  const { posts, isLoading } = usePosts();
  if (isLoading) return <Loading />;
  return <PostList posts={posts} />;
}
```

## Direct State Mutation

**Never mutate state directly — React won't detect changes.**

```tsx
// ❌ MUTATION — React can't detect, won't re-render
const handleAdd = () => {
  items.push(newItem);
  setItems(items);
};

// ✅ NEW ARRAY
const handleAdd = () => {
  setItems([...items, newItem]);
};

// ❌ MUTATION — nested object
const handleUpdate = () => {
  user.name = "Alice";
  setUser(user);
};

// ✅ NEW OBJECT
const handleUpdate = () => {
  setUser({ ...user, name: "Alice" });
};

// ❌ MUTATION — array element
items[0].completed = true;
setItems(items);

// ✅ MAP
setItems(items.map((item, i) =>
  i === 0 ? { ...item, completed: true } : item
));
```

## Inline Function Definitions

**Avoid creating functions inside JSX render body.**

```tsx
// ❌ INLINE IN JSX — new function every render, reference instability
<div>
  {items.map((item) => (
    <button onClick={() => handleItemClick(item.id)}>
      {item.name}
    </button>
  ))}
</div>

// ✅ STABLE HANDLER FACTORY
const makeHandleClick = (id: string) => () => handleItemClick(id);

<div>
  {items.map((item) => (
    <button key={item.id} onClick={makeHandleClick(item.id)}>
      {item.name}
    </button>
  ))}
</div>

// ✅ OR CURRIED HANDLER
const handleItemClick = (id: string) => () => {
  // handle click
};

<div>
  {items.map((item) => (
    <button key={item.id} onClick={handleItemClick(item.id)}>
      {item.name}
    </button>
  ))}
</div>
```

## Default Values in Destructuring

**Don't use destructuring defaults for optional props — hides missing prop bugs.**

```tsx
// ❌ HIDDEN DEFAULT — caller might not know prop exists
function Button({ variant = "primary" }: { variant?: string }) {
  return <button className={variant}>Click</button>;
}

// ✅ EXPLICIT DEFAULT — visible in component body
function Button({ variant }: { variant?: string }) {
  const resolvedVariant = variant ?? "primary";
  return <button className={resolvedVariant}>Click</button>;
}

// ✅ REQUIRED PROP — fail fast
function Button({ variant }: { variant: string }) {
  return <button className={variant}>Click</button>;
}
```

## Summary

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Manual JSX repetition | DRY violation, unmaintainable | `Array.map` over data |
| useEffect for derived state | Extra renders, complexity | `useMemo` or inline derivation |
| Inline objects/arrays in JSX | Reference instability, re-renders | Lift out, memoize, or use constants |
| useCallback/useMemo misuse | Unnecessary overhead, stale closures | Only for expensive ops / memoized children |
| Prop drilling | Tight coupling, refactoring pain | Context API or composition |
| useEffect without cleanup | Memory leaks, stale subscriptions | Always return cleanup function |
| Conditional hooks | Undefined behavior, crashes | Conditional render, not conditional hooks |
| Large components | Mixed concerns, hard to test | Split by data boundary or concern |
| Direct state mutation | Missed re-renders, bugs | Spread, map, filter for immutability |
| Inline functions in JSX | Reference instability | Factory functions or curried handlers |
| Destructuring defaults | Hidden bugs, unclear API | Explicit defaults or required props |
