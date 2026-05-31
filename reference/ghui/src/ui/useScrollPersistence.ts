import type { ScrollBoxRenderable } from "@opentui/core"
import { useEffect, useLayoutEffect, type MutableRefObject } from "react"

/**
 * Persists a scrollbox's scrollTop across mount/unmount cycles by polling
 * while active and restoring on mount. Polling matches the diff view pattern
 * since opentui's ScrollBoxRenderable doesn't expose a scroll event.
 *
 * Use one call per (scrollRef, persistedRef, active) tuple — the captured
 * `persisted` is closed over in the polling interval, so a hook can't track
 * a backing ref that switches between renders.
 */
export const useScrollPersistence = (scrollRef: MutableRefObject<ScrollBoxRenderable | null>, persisted: MutableRefObject<number>, active: boolean, pollMs = 400): void => {
	useLayoutEffect(() => {
		if (!active) return
		const scroll = scrollRef.current
		if (!scroll) return
		let cancelled = false
		let attempts = 0
		const apply = () => {
			if (cancelled) return
			if (scroll.viewport.height <= 0) {
				if (attempts++ < 20) globalThis.setTimeout(apply, 16)
				return
			}
			const target = persisted.current
			if (target > 0 && target !== scroll.scrollTop) scroll.scrollTo({ x: 0, y: target })
		}
		apply()
		return () => {
			cancelled = true
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active])

	useEffect(() => {
		if (!active) return
		const interval = globalThis.setInterval(() => {
			const top = scrollRef.current?.scrollTop
			if (top !== undefined) persisted.current = top
		}, pollMs)
		return () => globalThis.clearInterval(interval)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active])
}
