import type { IntegrationProvider } from "../domain/models.js"

export const githubTokenStrategies = ["personal_access_token", "installation_token"] as const
export type GitHubTokenStrategy = (typeof githubTokenStrategies)[number]

export type GitHubRepositoryScope = {
  installationId?: string | null
  owner: string
  provider: Extract<IntegrationProvider, "github">
  repo: string
}

export type GitHubCompareRange = {
  base: string
  head: string
}

export type GitHubSyncAuth = {
  token: string
  strategy: GitHubTokenStrategy
}

export type GitHubCompareFile = {
  additions: number
  changes: number
  deletions: number
  filename: string
  patch: string | null
  status: string
}

export type GitHubCompareCommit = {
  committedAt: string | null
  message: string
  sha: string
}

export type GitHubCompareSummary = {
  aheadBy: number
  behindBy: number
  commits: GitHubCompareCommit[]
  files: GitHubCompareFile[]
  mergeBaseSha: string | null
  totalCommits: number
}

export type GitHubCompareSyncRequest = {
  auth: GitHubSyncAuth
  compare: GitHubCompareRange
  connectionId: string
  repository: GitHubRepositoryScope
  workspaceId: string
}

export type GitHubCompareSyncResult = {
  comparison: GitHubCompareSummary
  repository: GitHubRepositoryScope
  scope: string
  syncRunId: string
}
