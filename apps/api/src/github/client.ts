import { Octokit } from "octokit"

import type {
  GitHubCompareRange,
  GitHubCompareSummary,
  GitHubPullRequestSummary,
  GitHubRepositoryScope,
  GitHubSyncAuth,
} from "./models.js"

export type GitHubClient = {
  compareCommits(input: {
    auth: GitHubSyncAuth
    compare: GitHubCompareRange
    repository: GitHubRepositoryScope
  }): Promise<GitHubCompareSummary>
  getPullRequests(input: {
    auth: GitHubSyncAuth
    pullNumbers: number[]
    repository: GitHubRepositoryScope
  }): Promise<GitHubPullRequestSummary[]>
}

export function createGitHubClient(): GitHubClient {
  function createOctokit(auth: GitHubSyncAuth) {
    return new Octokit({
      auth: auth.token,
      request: {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    })
  }

  return {
    async compareCommits({ auth, compare, repository }) {
      const octokit = createOctokit(auth)

      const response = await octokit.rest.repos.compareCommits({
        base: compare.base,
        head: compare.head,
        owner: repository.owner,
        repo: repository.repo,
      })

      return {
        aheadBy: response.data.ahead_by,
        behindBy: response.data.behind_by,
        commits: response.data.commits.map((commit) => ({
          committedAt: commit.commit.committer?.date ?? null,
          message: commit.commit.message,
          sha: commit.sha,
        })),
        files: (response.data.files ?? []).map((file) => ({
          additions: file.additions ?? 0,
          changes: file.changes ?? 0,
          deletions: file.deletions ?? 0,
          filename: file.filename,
          patch: file.patch ?? null,
          status: file.status,
        })),
        mergeBaseSha: response.data.merge_base_commit?.sha ?? null,
        totalCommits: response.data.total_commits,
      }
    },

    async getPullRequests({ auth, pullNumbers, repository }) {
      const octokit = createOctokit(auth)
      const pullRequests = await Promise.all(
        pullNumbers.map(async (pullNumber) => {
          const response = await octokit.rest.pulls.get({
            owner: repository.owner,
            pull_number: pullNumber,
            repo: repository.repo,
          })

          return {
            baseRefName: response.data.base.ref,
            body: response.data.body ?? null,
            htmlUrl: response.data.html_url,
            mergedAt: response.data.merged_at ?? null,
            number: response.data.number,
            title: response.data.title,
          } satisfies GitHubPullRequestSummary
        }),
      )

      return pullRequests
    },
  }
}
