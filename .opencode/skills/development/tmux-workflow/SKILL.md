---
name: tmux-workflow
description: Development workflow with tmux — run dev servers, Storybook, and background processes in persistent sessions with live logs, while keeping OpenCode free for chat
license: MIT
compatibility: opencode
---

# tmux Development Workflow

Run dev servers and long-lived processes in **tmux sessions** so they survive
agent session boundaries, keep scrollable logs, and leave the main terminal
free for OpenCode chat.

## Why tmux Instead of `&` Background

| Approach     | Survives agent restart? | Scrollable logs? | Easy to kill? | View logs live? |
| ------------ | ----------------------- | ----------------- | ------------- | --------------- |
| `command &`  | ❌ dies with session    | ❌ lost on close  | ⚠️  by PID    | ❌              |
| `nohup`      | ✅ survives             | ❌ file only      | ⚠️  by PID    | ❌ `tail -f`    |
| **tmux**     | ✅ survives             | ✅ built-in       | ✅ `tmux kill`| ✅ live pane    |

## Quick Start

```bash
# Start an app in a named tmux session
tmux new-session -d -s client 'bun dev --filter=client'

# Attach to see logs
tmux attach -t client

# Detach: Ctrl-b d

# Kill when done
tmux kill-session -t client
```

## One-Line Session Starters

```bash
# Storybook (port 6006)
tmux new-session -d -s storybook 'bun run storybook'

# Client Vite dev server (port 3000)
tmux new-session -d -s client 'bun dev --filter=client'

# Backend server (port 9000)
tmux new-session -d -s server 'bun dev --filter=server'

# Tests in watch mode
tmux new-session -d -s test 'bun test --watch'
```

## Session Management

```bash
# List all tmux sessions
tmux ls
# → client: 1 windows (created ...)
# → storybook: 1 windows (created ...)

# Attach to see live logs
tmux attach -t client

# Detach from a session
# Press: Ctrl-b  then  d

# Scroll back in history
# Press: Ctrl-b  then  [  (use PgUp/PgDown, then q to quit)

# Kill a session
tmux kill-session -t client

# Kill all dev sessions
tmux kill-session -t client 2>/dev/null; \
tmux kill-session -t storybook 2>/dev/null; \
tmux kill-session -t server 2>/dev/null

# Send a command to a running session (e.g., restart)
tmux send-keys -t client -R "" Enter
```

## Recommended Layout: Split Window

For seeing multiple servers at once, create a split-pane session:

```bash
# Create a session with two panes: client + server logs
tmux new-session -d -s dev -n logs
tmux send-keys -t dev 'bun dev --filter=client' Enter
tmux split-window -h -t dev
tmux send-keys -t dev 'bun dev --filter=server' Enter
tmux attach -t dev
```

## Workflow: OpenCode + tmux

```
┌─────────────────────────────────────────────┐
│  Terminal 1 (tmux)                          │
│  ┌──────────────┬──────────────────────────┐│
│  │ bun dev      │ bun storybook            ││
│  │ --filter=    │ (port 6006)              ││
│  │ client       │ live HMR logs            ││
│  │ (port 3000)  │                          ││
│  │ HMR reloads  │                          ││
│  └──────────────┴──────────────────────────┘│
│  Ctrl-b d  →  detach, keep running          │
├─────────────────────────────────────────────┤
│  Terminal 2 (OpenCode)                      │
│  └──────────────────────────────────────────┘│
│  "fix the error in the logs"                │
└─────────────────────────────────────────────┘
```

**The loop:**

1. **Start** dev servers in tmux sessions
2. **Detach** from tmux (`Ctrl-b d`) — servers keep running
3. **Chat** with OpenCode in the main terminal — make code changes
4. **Check** logs by attaching to tmux (`tmux attach -t client`) or asking the agent to read them
5. **Fix** errors — Vite HMR auto-reloads; repeat from step 3

## Agent Workflow: Start → Poll → Capture → Report

When an agent starts a service in tmux, it MUST follow this protocol so you
see the startup logs directly in the chat:

```
1. tmux new-session -d -s <name> '<command>'
2. curl --retry 10 --retry-delay 0.3 --retry-connrefused -s -o /dev/null http://localhost:<port>/
3. tmux capture-pane -t <name> -p -S -30   # capture last 30 lines
4. Report the output to the user     # show URL, errors, etc.
```

The `curl --retry` approach polls every 0.3s and stops **instantly** when the
server responds — no wasted `sleep 5` waiting more than needed.

**Example — starting the Vite dev server:**

```bash
# Agent runs:
cd apps/client && tmux new-session -d -s client 'bun dev --filter=client'
curl --retry 10 --retry-delay 0.3 --retry-connrefused -s -o /dev/null http://localhost:3000/
tmux capture-pane -t client -p -S -30
```

This produces the startup log in the chat:
```
$ vite --port 3000 --host --clearScreen false "--filter=client"
1:43:32 PM [vite] Re-optimizing dependencies...

  VITE v8.0.1  ready in 490 ms
  ➜  Local:   http://localhost:3000/
```

**Ports by service:**

| Service  | Port |
| -------- | ---- |
| Client   | 3000 |
| Server   | 9000 |
| Storybook| 6006 |

**Why this matters:** The agent sees the actual Vite output (port, URL, any
warnings) and reports it back to you. Without this step, you'd have to
`tmux attach` yourself to check if it started correctly.

## Checking Logs Without Attaching

```bash
# Capture last N lines of a session's output
tmux capture-pane -t client -p -S -50
```

Use this anytime you ask the agent "check the logs" — the agent captures the
pane output and surfaces errors directly in the chat.

## Useful tmux Config

Add to `~/.tmux.conf` for a better experience:

```tmux
# Increase scrollback buffer
set -g history-limit 50000

# Mouse support (scroll, resize panes)
set -g mouse on

# More intuitive prefix (optional — uncomment if you prefer Ctrl-a)
# set -g prefix C-a
# unbind C-b
# bind C-a send-prefix

# Status bar colors
set -g status-bg colour235
set -g status-fg white
```

## Stopping Everything

```bash
# Kill all sessions matching a pattern
for s in client storybook server dev; do
  tmux kill-session -t "$s" 2>/dev/null && echo "Killed $s" || true
done
```

## Summary

| Action                          | Command                                              |
| ------------------------------- | ---------------------------------------------------- |
| Start client (Vite)             | `tmux new-session -d -s client 'bun dev --filter=client'` |
| Start Storybook                 | `tmux new-session -d -s storybook 'bun run storybook'` |
| Start server                    | `tmux new-session -d -s server 'bun dev --filter=server'` |
| List sessions                   | `tmux ls`                                            |
| Attach to logs                  | `tmux attach -t <name>`                              |
| Detach                          | `Ctrl-b d`                                           |
| Capture logs (programmatic)     | `tmux capture-pane -t <name> -p -S -50`              |
| Agent: start + show logs        | 1. `tmux new-session -d -s <n> '<cmd>'` 2. `curl --retry 10 --retry-delay 0.3 --retry-connrefused http://localhost:<port>/` 3. `tmux capture-pane -t <n> -p -S -30` |
| Kill session                    | `tmux kill-session -t <name>`                        |
| Kill all dev sessions           | `tmux kill-session -t client -t storybook -t server` |
