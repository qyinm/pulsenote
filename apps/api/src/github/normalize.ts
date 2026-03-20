import type {
  GitHubCompareFile,
  GitHubCompareSummary,
  GitHubPullRequestSummary,
  GitHubRepositoryScope,
} from "./models.js"

export function buildCompareRange(base: string, head: string) {
  return `${base}...${head}`
}

export function buildCompareReleaseTitle(repository: GitHubRepositoryScope, compareRange: string) {
  return `${repository.owner}/${repository.repo} ${compareRange}`
}

export function buildCompareReleaseSummary(comparison: GitHubCompareSummary) {
  const commitLabel = comparison.totalCommits === 1 ? "commit" : "commits"
  const fileLabel = comparison.files.length === 1 ? "file" : "files"

  return `${comparison.totalCommits} ${commitLabel} and ${comparison.files.length} changed ${fileLabel} captured from GitHub compare.`
}

export function buildCompareUrl(repository: GitHubRepositoryScope, compareRange: string) {
  return `https://github.com/${repository.owner}/${repository.repo}/compare/${compareRange}`
}

export function buildCommitUrl(repository: GitHubRepositoryScope, sha: string) {
  return `https://github.com/${repository.owner}/${repository.repo}/commit/${sha}`
}

export function buildMergedPullScope(repository: GitHubRepositoryScope, pullNumbers: number[]) {
  return `github:repo:${repository.owner}/${repository.repo} pulls:merged#${pullNumbers.join(",")}`
}

export function buildMergedPullReleaseTitle(
  repository: GitHubRepositoryScope,
  pullRequests: GitHubPullRequestSummary[],
) {
  return `${repository.owner}/${repository.repo} merged pull requests #${pullRequests
    .map((pullRequest) => pullRequest.number)
    .join(", ")}`
}

export function buildMergedPullReleaseSummary(pullRequests: GitHubPullRequestSummary[]) {
  const pullLabel = pullRequests.length === 1 ? "pull request" : "pull requests"

  return `${pullRequests.length} merged ${pullLabel} captured from GitHub.`
}

export function getCommitHeadline(message: string) {
  return message
    .split("\n")[0]
    ?.trim()
    .slice(0, 255) ?? ""
}

export function buildPullRequestEvidenceBody(pullRequest: GitHubPullRequestSummary) {
  if (pullRequest.body?.trim()) {
    return pullRequest.body
  }

  return `Merged pull request #${pullRequest.number} into ${pullRequest.baseRefName}.`
}

export function buildFileEvidenceBody(file: GitHubCompareFile) {
  if (file.patch?.trim()) {
    return file.patch
  }

  return `${file.status} with ${file.additions} additions, ${file.deletions} deletions, and ${file.changes} total changes.`
}
