import { Octokit } from "octokit"

import type {
  GitHubCompareRange,
  GitHubCompareSummary,
  GitHubRepositoryScope,
  GitHubSyncAuth,
} from "./models.js"

export type GitHubClient = {
  compareCommits(input: {
    auth: GitHubSyncAuth
    compare: GitHubCompareRange
    repository: GitHubRepositoryScope
  }): Promise<GitHubCompareSummary>
}

export function createGitHubClient(): GitHubClient {
  return {
    async compareCommits({ auth, compare, repository }) {
      const octokit = new Octokit({
        auth: auth.token,
        request: {
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      })

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
  }
}
