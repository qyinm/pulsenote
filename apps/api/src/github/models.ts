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

export type GitHubSyncAuth =
  | {
      source?: never
      token: string
      strategy: "personal_access_token"
    }
  | {
      source: "github_app_installation"
      token: string
      strategy: "installation_token"
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

export type GitHubRepositoryCommit = GitHubCompareCommit & {
  parentShas: string[]
}

export type GitHubPullRequestSummary = {
  baseRefName: string
  body: string | null
  htmlUrl: string
  mergedAt: string | null
  number: number
  title: string
}

export type GitHubReleaseAsset = {
  contentType: string | null
  downloadUrl: string
  name: string
  size: number
}

export type GitHubReleaseSummary = {
  assets: GitHubReleaseAsset[]
  body: string | null
  createdAt: string
  draft: boolean
  htmlUrl: string
  id: number
  name: string | null
  prerelease: boolean
  publishedAt: string | null
  tagName: string
  targetCommitish: string
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

export type GitHubMergedPullSyncRequest = {
  auth: GitHubSyncAuth
  connectionId: string
  pullNumbers: number[]
  repository: GitHubRepositoryScope
  workspaceId: string
}

export type GitHubReleaseSelector = {
  releaseId?: number
  tag?: string
}

export type GitHubReleaseSyncRequest = {
  auth: GitHubSyncAuth
  connectionId: string
  release: GitHubReleaseSelector
  repository: GitHubRepositoryScope
  workspaceId: string
}

export type GitHubSinceDatePreviewRequest = {
  auth: GitHubSyncAuth
  connectionId: string
  repository: GitHubRepositoryScope
  sinceDate: string
  workspaceId: string
}

export type GitHubResolvedCompareRange = {
  base: string
  head: string
}

export type GitHubScopePreviewResult = {
  changedFileCount: number
  commits: GitHubCompareCommit[]
  compareRange: string | null
  defaultBranch: string | null
  expectedClaimCandidateCount: number
  expectedEvidenceBlockCount: number
  expectedSourceLinkCount: number
  files: GitHubCompareFile[]
  mode: "compare" | "release" | "since_date"
  previewNotes: string[]
  release: GitHubReleaseSummary | null
  repository: GitHubRepositoryScope
  resolvedCompare: GitHubResolvedCompareRange | null
  scopeLabel: string
  sinceDate: string | null
  summary: string
  title: string
  totalCommits: number
}

export type GitHubCompareSyncResult = {
  claimCandidateCount: number
  comparison: GitHubCompareSummary
  evidenceBlockCount: number
  releaseRecordId: string
  repository: GitHubRepositoryScope
  scope: string
  sourceLinkCount: number
  syncRunId: string
}

export type GitHubMergedPullSyncResult = {
  claimCandidateCount: number
  evidenceBlockCount: number
  mergedPullCount: number
  releaseRecordId: string
  repository: GitHubRepositoryScope
  scope: string
  sourceLinkCount: number
  syncRunId: string
}

export type GitHubReleaseSyncResult = {
  claimCandidateCount: number
  evidenceBlockCount: number
  release: GitHubReleaseSummary
  releaseRecordId: string
  repository: GitHubRepositoryScope
  scope: string
  sourceLinkCount: number
  syncRunId: string
}
