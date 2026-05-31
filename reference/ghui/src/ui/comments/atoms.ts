import * as Atom from "effect/unstable/reactivity/Atom"
import type { CreatePullRequestCommentInput, PullRequestComment } from "../../domain.js"
import { GitHubService } from "../../services/GitHubService.js"
import { githubRuntime } from "../../services/runtime.js"

// === UI state atoms ===
export const commentsViewActiveAtom = Atom.make(false)
export const commentsViewSelectionAtom = Atom.make(0)
export const pullRequestCommentsAtom = Atom.make<Record<string, readonly PullRequestComment[]>>({}).pipe(Atom.keepAlive)
export const pullRequestCommentsLoadedAtom = Atom.make<Record<string, "loading" | "ready">>({}).pipe(Atom.keepAlive)

// === Data-fetching atoms ===
export const listPullRequestCommentsAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number }>()((input) =>
	GitHubService.use((github) => github.listPullRequestComments(input.repository, input.number)),
)
export const listIssueCommentsAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number }>()((input) =>
	GitHubService.use((github) => github.listIssueComments(input.repository, input.number)),
)
export const createPullRequestCommentAtom = githubRuntime.fn<CreatePullRequestCommentInput>()((input) => GitHubService.use((github) => github.createPullRequestComment(input)))
export const createPullRequestIssueCommentAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly body: string }>()((input) =>
	GitHubService.use((github) => github.createPullRequestIssueComment(input.repository, input.number, input.body)),
)
export const replyToReviewCommentAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly inReplyTo: string; readonly body: string }>()((input) =>
	GitHubService.use((github) => github.replyToReviewComment(input.repository, input.number, input.inReplyTo, input.body)),
)
export const editPullRequestIssueCommentAtom = githubRuntime.fn<{ readonly repository: string; readonly commentId: string; readonly body: string }>()((input) =>
	GitHubService.use((github) => github.editPullRequestIssueComment(input.repository, input.commentId, input.body)),
)
export const editReviewCommentAtom = githubRuntime.fn<{ readonly repository: string; readonly commentId: string; readonly body: string }>()((input) =>
	GitHubService.use((github) => github.editReviewComment(input.repository, input.commentId, input.body)),
)
export const deletePullRequestIssueCommentAtom = githubRuntime.fn<{ readonly repository: string; readonly commentId: string }>()((input) =>
	GitHubService.use((github) => github.deletePullRequestIssueComment(input.repository, input.commentId)),
)
export const deleteReviewCommentAtom = githubRuntime.fn<{ readonly repository: string; readonly commentId: string }>()((input) =>
	GitHubService.use((github) => github.deleteReviewComment(input.repository, input.commentId)),
)
