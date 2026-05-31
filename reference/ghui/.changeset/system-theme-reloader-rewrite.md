---
"@kitlangton/ghui": patch
---

rework system theme auto-reload to retry until the terminal palette
actually changes, refuse to overwrite the active theme with incomplete
or stale palette data, prime a baseline at startup so the first signal
behaves correctly, and emit structured events for opt-in debug logging
via `GHUI_DEBUG_THEME_RELOAD_LOG`
