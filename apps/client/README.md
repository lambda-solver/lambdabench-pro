# Client App

Demo UI for the edu_effect-rag-builder experiment. Built with Vite + React and
designed to showcase RAG and chat/agent flows.

## Stack

- **React 19** - UI framework
- **Vite 8** - Build tool and dev server
- **TypeScript** - Type safety
- **Effect 4-beta** - Functional programming utilities
- **@repo/domain** - Shared types and schemas

## Getting Started

From the monorepo root:

```bash
# Start development server
bun dev --filter=client

# Build for production
bun run build --filter=client
```

The app runs on `http://localhost:3000` in development.

## Architecture

The client is a standard React application with:

- **Shared Types**: Import from `@repo/domain` for type-safe API communication
- **Effect Integration**: Use Effect for functional programming patterns
- **Experiment-first UI**: Components are optimized for fast iteration on RAG UX
- **Environment Variables**: Configure server URL via `VITE_SERVER_URL`

## Example Usage

```typescript
import { ApiResponse } from "@repo/domain";

// Type-safe API calls
const response = await fetch("/api/hello");
// Decode the response using Effect Schema
const res = Schema.decodeUnknownSync(ApiResponse)(await req.json());
```

## Testing

The client uses **bun:test** (Bun's built-in test runner) for logic tests and
**Storybook** for visual component inspection.

```bash
# Run client tests
bun run test --filter=client

# Start Storybook for visual component inspection
bun run storybook --filter=client
```

**Test Setup:**

- **bun:test**: Zero-config test runner for pure logic and utility tests
- **Storybook**: Manual visual inspection of components with fixtures
- **No DOM tests**: Component behavior is verified via Storybook fixtures, not automated DOM assertions

**Test File Structure:**

```typescript
import { expect, test } from "bun:test";
import { fmtModel } from "./fmt";

test("strips openrouter/ prefix", () => {
  expect(fmtModel("openrouter/google/gemini-2.5-pro")).toBe("google/gemini-2.5-pro");
});
```

Tests are colocated with source files using the `*.test.ts` pattern.
For component visual testing, use Storybook stories with fixtures.

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Project Overview](../../README.md)
