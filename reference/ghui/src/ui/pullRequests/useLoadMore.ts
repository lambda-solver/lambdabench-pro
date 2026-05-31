import { RegistryContext, useAtomSet } from "@effect/atom-react"
import { type MutableRefObject, useContext, useState } from "react"
import { config } from "../../config.js"
import { errorMessage } from "../../errors.js"
import type { PullRequestLoad } from "../../pullRequestLoad.js"
import { type PullRequestView, viewToListInput } from "../../pullRequestViews.js"
import { pullRequestPageSize } from "../../services/runtime.js"
import { cacheViewerFor, listOpenPullRequestPageAtom, nextLoadAfterPage, queueLoadCacheAtom, writeQueueCacheAtom } from "./atoms.js"

export interface UseLoadMoreInput {
	readonly activeView: PullRequestView
	readonly currentQueueCacheKey: string
	readonly pullRequestLoad: PullRequestLoad | null
	readonly hasMorePullRequests: boolean
	readonly username: string | null
	readonly refreshGenerationRef: MutableRefObject<number>
	readonly flashNotice: (message: string) => void
	readonly setQueueLoadCache: (next: (prev: Partial<Record<string, PullRequestLoad>>) => Partial<Record<string, PullRequestLoad>>) => void
}

export interface UseLoadMoreResult {
	/** Fire a "load more" page fetch. Returns false if a fetch couldn't start
	 * (already loading, no more pages, no cursor, or limit reached). */
	readonly loadMorePullRequests: () => boolean
	/** Whether a load-more for the active queue cache key is in flight. */
	readonly isLoadingMorePullRequests: boolean
	/** Reset on view switch / hard refresh so a stale "loading more" never
	 * sticks on a queue the user has navigated away from. */
	readonly resetLoadingMore: () => void
}

/**
 * Owns the load-more pagination state machine: gates, generation guard,
 * cache append, optimistic-write to in-memory cache, and SQLite persistence.
 *
 * Generation guard via the shared `refreshGenerationRef`: if a refresh or
 * view switch happens mid-flight, the response is silently dropped. The
 * `.finally` clears the loading flag iff this fetch is still the one we
 * care about (`current === cacheKey`).
 */
export const useLoadMore = ({
	activeView,
	currentQueueCacheKey,
	pullRequestLoad,
	hasMorePullRequests,
	username,
	refreshGenerationRef,
	flashNotice,
	setQueueLoadCache,
}: UseLoadMoreInput): UseLoadMoreResult => {
	const registry = useContext(RegistryContext)
	const loadPullRequestPage = useAtomSet(listOpenPullRequestPageAtom, { mode: "promise" })
	const writeQueueCache = useAtomSet(writeQueueCacheAtom, { mode: "promise" })
	// Component-local loading flag: a keepAlive atom would retain the
	// "in flight" key across hot reloads even though the original Promise
	// was abandoned mid-flight, leaving the spinner stuck. The atom shadow
	// in atoms.ts (`loadingMoreKeyAtom` / `isLoadingMorePullRequestsAtom`)
	// is still exported so commands can read the flag once dispatch is
	// wired through there — we just don't depend on it here.
	const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null)
	const isLoadingMorePullRequests = loadingMoreKey === currentQueueCacheKey

	const loadMorePullRequests = (): boolean => {
		if (!pullRequestLoad || !hasMorePullRequests || isLoadingMorePullRequests || !pullRequestLoad.endCursor) return false
		const remaining = config.prFetchLimit - pullRequestLoad.data.length
		if (remaining <= 0) return false
		const cacheKey = currentQueueCacheKey
		const generation = refreshGenerationRef.current
		setLoadingMoreKey(cacheKey)
		void loadPullRequestPage(viewToListInput(activeView, pullRequestLoad.endCursor, Math.min(pullRequestPageSize, remaining)))
			.then((page) => {
				if (generation !== refreshGenerationRef.current) return
				const currentLoad = registry.get(queueLoadCacheAtom)[cacheKey]
				if (!currentLoad) return
				const persistedLoad = nextLoadAfterPage(currentLoad, page, config.prFetchLimit)
				setQueueLoadCache((current) => {
					if (!current[cacheKey]) return current
					return { ...current, [cacheKey]: persistedLoad }
				})
				const viewer = cacheViewerFor(activeView, username)
				if (viewer) void writeQueueCache({ viewer, load: persistedLoad }).catch(() => {})
			})
			.catch((error) => {
				flashNotice(errorMessage(error))
			})
			.finally(() => {
				setLoadingMoreKey((current) => (current === cacheKey ? null : current))
			})
		return true
	}

	const resetLoadingMore = () => setLoadingMoreKey(null)

	return { loadMorePullRequests, isLoadingMorePullRequests, resetLoadingMore }
}
