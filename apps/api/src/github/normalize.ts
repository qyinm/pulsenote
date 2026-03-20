import type { GitHubCompareFile, GitHubCompareSummary, GitHubRepositoryScope } from "./models.js"

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

export function getCommitHeadline(message: string) {
  return message
    .split("\n")[0]
    ?.trim()
    .slice(0, 255) ?? ""
}

export function buildFileEvidenceBody(file: GitHubCompareFile) {
  if (file.patch?.trim()) {
    return file.patch
  }

  return `${file.status} with ${file.additions} additions, ${file.deletions} deletions, and ${file.changes} total changes.`
}
