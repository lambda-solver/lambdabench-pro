---
name: tanstack-router
description: TanStack Router — type-safe routing, nested layouts, search params, and data loading
license: MIT
compatibility: opencode
---

# TanStack Router

## Installation

```bash
bun add @tanstack/react-router
bun add -D @tanstack/router-devtools @tanstack/router-vite-plugin
```

## Setup

```tsx
// main.tsx
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen"; // generated

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

render(<RouterProvider router={router} />, document.getElementById("root"));
```

## File-Based Routes

```tsx
// src/routes/__root.tsx — root layout
export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Navigation />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}

// src/routes/index.tsx — home page
export const Route = createFileRoute("/")({
  component: HomePage,
});

// src/routes/users.$userId.tsx — dynamic segment
export const Route = createFileRoute("/users/$userId")({
  component: UserPage,
  loader: ({ params }) => fetchUser(params.userId),
});

// src/routes/users.index.tsx — users list (when no $userId)
export const Route = createFileRoute("/users/")({
  component: UsersListPage,
});
```

## Type-Safe Links

```tsx
// ✅ type-safe — params and search are validated
<Link to="/users/$userId" params={{ userId: '123' }}>
  View User
</Link>

// ✅ with search params
<Link
  to="/users"
  search={{ page: 1, filter: 'active' }}
>
  Page 1
</Link>

// ❌ no type safety with string href
<a href="/users/123">View User</a>
```

## Search Params (URL State)

```tsx
// Define search schema
import { z } from "zod";

const usersSearchSchema = z.object({
  page: z.number().default(1),
  filter: z.enum(["all", "active", "inactive"]).default("all"),
  q: z.string().optional(),
});

export const Route = createFileRoute("/users/")({
  validateSearch: usersSearchSchema,
  component: UsersPage,
});

// Use in component
function UsersPage() {
  const { page, filter, q } = Route.useSearch();
  const navigate = Route.useNavigate();

  const setFilter = (filter: string) => {
    navigate({ search: (prev) => ({ ...prev, filter, page: 1 }) });
  };

  return (
    <div>
      <FilterSelect value={filter} onChange={setFilter} />
      <UserList page={page} filter={filter} query={q} />
    </div>
  );
}
```

## Data Loading

```tsx
export const Route = createFileRoute("/users/$userId")({
  loader: async ({ params }) => {
    const user = await fetchUser(params.userId);
    return { user };
  },
  component: UserPage,
});

function UserPage() {
  const { user } = Route.useLoaderData();
  return <UserProfile user={user} />;
}

// With TanStack Query integration
export const Route = createFileRoute("/users/$userId")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["users", params.userId],
      queryFn: () => fetchUser(params.userId),
    });
  },
  component: UserPage,
});
```

## Nested Layouts

```tsx
// src/routes/dashboard.tsx — layout
export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// src/routes/dashboard.index.tsx — /dashboard
// src/routes/dashboard.settings.tsx — /dashboard/settings
// src/routes/dashboard.profile.tsx — /dashboard/profile
```

## Navigation

```tsx
// Programmatic navigation
const navigate = useNavigate()
navigate({ to: '/users', search: { page: 2 } })

// Back navigation
const router = useRouter()
router.history.back()

// Active link styling
<Link
  to="/users"
  activeProps={{ className: 'font-bold' }}
  activeOptions={{ exact: true }}
>
  Users
</Link>
```

## Best Practices

- **Use file-based routing** — type-safe, no manual route config
- **Put filters in URL** — shareable, bookmarkable, back-button works
- **Use `validateSearch`** — validates and types URL search params
- **Load data in route loader** — parallel fetching, less waterfall
- **Use `<Outlet />`** for nested layouts — composition over configuration
