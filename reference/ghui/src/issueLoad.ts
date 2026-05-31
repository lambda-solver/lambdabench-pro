import type { IssueItem } from "./domain.js"
import type { IssueView } from "./issueViews.js"

export interface IssueLoad {
	readonly view: IssueView
	readonly data: readonly IssueItem[]
	readonly fetchedAt: Date | null
	readonly endCursor: string | null
	readonly hasNextPage: boolean
}
