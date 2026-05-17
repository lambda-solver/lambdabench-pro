---
name: 03-state-management
description: React state management patterns — lifting state, colocation, URL state, server state with TanStack Query, local state with useState/useReducer
license: MIT
compatibility: opencode
---

# React State Management

## State Colocation

Keep state as close to where it's used as possible.

```tsx
// ❌ lifted too high
function App() {
  const [isOpen, setIsOpen] = useState(false); // only used in Modal
  return (
    <div>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

// ✅ colocated
function App() {
  return (
    <div>
      <ModalTrigger />
    </div>
  );
}

function ModalTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
```

## Server State vs Client State

| Type          | Tool                  | Examples                               |
| ------------- | --------------------- | -------------------------------------- |
| Server state  | TanStack Query        | API data, user profile, search results |
| URL state     | TanStack Router       | Filters, pagination, sort order        |
| Global client | Effect Atom / Zustand | Auth user, theme, sidebar state        |
| Local client  | useState / useReducer | Form inputs, modal open, toggle        |

## useState Patterns

```tsx
// ✅ boolean toggle
const [isOpen, setIsOpen] = useState(false)
<button onClick={() => setIsOpen((prev) => !prev)}>Toggle</button>

// ✅ derived from props — use initial value only
const [value, setValue] = useState(initialValue)

// ❌ sync state from props — use key prop instead
// If you need to reset when prop changes:
<Form key={userId} initialData={userData} />

// ✅ object state with single setter
const [form, setForm] = useState({ name: '', email: '' })
setForm((prev) => ({ ...prev, name: 'Alice' }))

// ✅ functional updates for counters
setCount((c) => c + 1)
```

## useReducer for Complex State

```tsx
type State = {
  status: "idle" | "loading" | "success" | "error";
  data: Data | null;
};
type Action =
  | { type: "fetch"; }
  | { type: "success"; payload: Data; }
  | { type: "error"; payload: Error; }
  | { type: "reset"; };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "fetch":
      return { ...state, status: "loading" };
    case "success":
      return { status: "success", data: action.payload };
    case "error":
      return { ...state, status: "error" };
    case "reset":
      return { status: "idle", data: null };
    default:
      return state;
  }
};

function DataFetcher() {
  const [state, dispatch] = useReducer(reducer, { status: "idle", data: null });
  // dispatch({ type: 'fetch' })
}
```

## URL as State (TanStack Router)

```tsx
// ✅ filter in URL — shareable, back-button works
const { filter } = route.useSearch();
const navigate = route.useNavigate();

// Update URL instead of local state
navigate({ search: (prev) => ({ ...prev, filter: "active" }) });

// ❌ local state for filters
const [filter, setFilter] = useState("all"); // lost on refresh
```

## Effect Atom for Global State

```tsx
// ✅ atom for shared server state
const usersAtom = runtime.atom(
  Effect.gen(function*() {
    const api = yield* ApiClient;
    return yield* api.getUsers();
  }),
);

// ✅ use in any component
function UserList() {
  const result = useAtomValue(usersAtom);
  return AsyncResult.match(result, {
    onInitial: () => <Loading />,
    onFailure: (e) => <Error error={e} />,
    onSuccess: ({ value }) => (
      <div>{value.map((u) => <UserCard key={u.id} user={u} />)}</div>
    ),
  });
}
```

## Form State

```tsx
// ✅ controlled with single state object
const [fields, setFields] = useState({ email: "", password: "" });
const [errors, setErrors] = useState<Record<string, string>>({});

// ✅ validation on submit
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  const validation = validate(fields);
  if (!validation.ok) {
    setErrors(validation.errors);
    return;
  }
  submit(fields);
};

// ✅ reset form
const reset = () => {
  setFields({ email: "", password: "" });
  setErrors({});
};
```
