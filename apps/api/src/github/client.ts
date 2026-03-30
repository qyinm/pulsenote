import { Octokit } from "octokit"

import type {
  GitHubCompareRange,
  GitHubCompareSummary,
  GitHubPullRequestSummary,
  GitHubRepositoryCommit,
  GitHubReleaseSelector,
  GitHubReleaseSummary,
  GitHubRepositoryScope,
  GitHubSyncAuth,
} from "./models.js"

export type GitHubClient = {
  compareCommits(input: {
    auth: GitHubSyncAuth
    compare: GitHubCompareRange
    repository: GitHubRepositoryScope
  }): Promise<GitHubCompareSummary>
  getDefaultBranch(input: {
    auth: GitHubSyncAuth
    repository: GitHubRepositoryScope
  }): Promise<string>
  getPullRequests(input: {
    auth: GitHubSyncAuth
    pullNumbers: number[]
    repository: GitHubRepositoryScope
  }): Promise<GitHubPullRequestSummary[]>
  getRelease(input: {
    auth: GitHubSyncAuth
    release: GitHubReleaseSelector
    repository: GitHubRepositoryScope
  }): Promise<GitHubReleaseSummary>
  listCommitsSince(input: {
    auth: GitHubSyncAuth
    branch: string
    repository: GitHubRepositoryScope
    since: string
  }): Promise<GitHubRepositoryCommit[]>
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

    async getDefaultBranch({ auth, repository }) {
      const octokit = createOctokit(auth)
      const response = await octokit.rest.repos.get({
        owner: repository.owner,
        repo: repository.repo,
      })

      return response.data.default_branch
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

    async getRelease({ auth, release, repository }) {
      const octokit = createOctokit(auth)
      let response

      if (typeof release.tag === "string") {
        response = await octokit.rest.repos.getReleaseByTag({
          owner: repository.owner,
          repo: repository.repo,
          tag: release.tag,
        })
      } else if (typeof release.releaseId === "number") {
        response = await octokit.rest.repos.getRelease({
          owner: repository.owner,
          release_id: release.releaseId,
          repo: repository.repo,
        })
      } else {
        throw new Error("GitHub release selector is invalid")
      }

      return {
        assets: response.data.assets.map((asset) => ({
          contentType: asset.content_type ?? null,
          downloadUrl: asset.browser_download_url,
          name: asset.name,
          size: asset.size,
        })),
        body: response.data.body ?? null,
        createdAt: response.data.created_at,
        draft: response.data.draft,
        htmlUrl: response.data.html_url,
        id: response.data.id,
        name: response.data.name ?? null,
        prerelease: response.data.prerelease,
        publishedAt: response.data.published_at ?? null,
        tagName: response.data.tag_name,
        targetCommitish: response.data.target_commitish,
      }
    },

    async listCommitsSince({ auth, branch, repository, since }) {
      const octokit = createOctokit(auth)
      const response = await octokit.rest.repos.listCommits({
        owner: repository.owner,
        per_page: 100,
        repo: repository.repo,
        sha: branch,
        since,
      })

      return response.data.map((commit) => ({
        committedAt: commit.commit.committer?.date ?? null,
        message: commit.commit.message,
        parentShas: commit.parents.map((parent) => parent.sha),
        sha: commit.sha,
      }))
    },
  }
}
