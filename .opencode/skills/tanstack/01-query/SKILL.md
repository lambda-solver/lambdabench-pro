---
name: tanstack-query
description: TanStack Query (React Query) — server state management, caching, mutations, and Effect integration
license: MIT
compatibility: opencode
---

# TanStack Query

## Installation

```bash
bun add @tanstack/react-query
bun add -D @tanstack/react-query-devtools
```

## Setup

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (was cacheTime in v4)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
```

## Basic Query

```tsx
import { useQuery } from '@tanstack/react-query'

function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />
  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

## Query Keys

```tsx
// ✅ hierarchical, deterministic keys
['users']                           // all users
['users', { page: 1, limit: 10 }]  // paginated
['users', userId]                   // single user
['users', userId, 'posts']          // user's posts

// ❌ non-deterministic
['users', new Date()]               // never caches
[`users-${random()}`]               // never caches
```

## Mutations

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateUser() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      mutation.mutate({ name: 'Alice' })
    }}>
      <button disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

## Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previous = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], (old) =>
      old.map((t) => t.id === newTodo.id ? newTodo : t)
    )
    return { previous }
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

## Infinite Queries

```tsx
function PostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['posts'],
      queryFn: ({ pageParam = 1 }) => fetchPosts(pageParam),
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
      initialPageParam: 1,
    })

  return (
    <>
      {data?.pages.map((page, i) => (
        <Fragment key={i}>
          {page.posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </Fragment>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </>
  )
}
```

## Effect Integration

```tsx
// Wrap Effect in queryFn
import { Effect } from 'effect'

const queryFn = async () => {
  const program = Effect.gen(function* () {
    const api = yield* ApiClient
    return yield* api.getUsers()
  })
  return Effect.runPromise(program)
}

// Or with runtime
const runtime = Atom.runtime(ApiClient.layer)

function UserList() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => Effect.runPromise(
      Effect.gen(function* () {
        const api = yield* ApiClient
        return yield* api.getUsers()
      }).pipe(Effect.provide(runtime))
    ),
  })
}
```

## Best Practices

- **Keep query keys stable** — use objects, not arrays with random data
- **Colocate queries** — put `useQuery` in the component that needs the data
- **Use `isPending`** not `isLoading` (v5) for loading state
- **Use `gcTime`** not `cacheTime` (v5)
- **Invalidate on mutations** — always refetch after create/update/delete
- **Prefetch on hover** — `queryClient.prefetchQuery` for snappy navigation
