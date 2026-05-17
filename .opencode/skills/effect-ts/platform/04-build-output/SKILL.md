# Skill: Build Output & Deployment

## Overview

This skill documents build output directories and deployment patterns for the Effect-TS + Bun monorepo.

## Running Bun in the Background

### Method 1: Redirect to log file (Recommended)

```bash
bun src/index.ts server > logs/server.log 2>&1 &
echo "Server PID: $!"
```

- Output goes to `logs/server.log` (project root `logs/` directory)
- `>` redirects stdout to file
- `2>&1` redirects stderr to same file
- `&` runs in background
- `$!` captures the PID

### Method 2: Using nohup

```bash
nohup bun src/index.ts server &
```

- Creates `nohup.out` automatically
- Survives terminal disconnect

### Checking if running:

```bash
lsof -ti:9000          # Find process by port
ps aux | grep bun       # List bun processes
cat server.log | tail   # Check recent output
```

### Stopping:

```bash
lsof -ti:9000 | xargs kill -9
```

## Build Commands

### Server Build

```bash
bun run build --filter=server
```

- **Output**: `apps/server/dist/`
- **Entry**: `apps/server/dist/index.js`

### Client Build

```bash
bun run build --filter=client
```

- **Output**: `apps/client/dist/`
- **Static assets**: Copied from `apps/client/public/`

## Data Flow

1. **Evaluations** → `apps/server/res/*.txt`
2. **Build results** → `apps/client/public/data/results.json`
3. **Client build** → `apps/client/dist/` (includes data)
4. **Deployment** → GitHub Pages

## CI/CD Pattern

```yaml
# .github/workflows/benchmark.yml
- run: bun --filter=server run start run build
- run: bun run build --filter=client
- deploy: apps/client/dist/
```

## Environment Variables

- `VITE_BASE_URL`: Base path for GitHub Pages (`/${repo_name}/`)
- `LAMBENCH_DB_PATH`: SQLite database path
- `LAMBENCH_PORT`: Server port (default: 9000)
