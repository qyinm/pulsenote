import type { AppRuntimeEnv } from "../types.js"
import type { FoundationStore } from "../foundation/store.js"
import type { SyncRun } from "../domain/models.js"
import type { GitHubClient } from "./client.js"
import type {
  GitHubCompareSummary,
  GitHubResolvedCompareRange,
  GitHubCompareSyncRequest,
  GitHubScopePreviewResult,
  GitHubCompareSyncResult,
  GitHubMergedPullSyncRequest,
  GitHubMergedPullSyncResult,
  GitHubPullRequestSummary,
  GitHubSinceDatePreviewRequest,
  GitHubReleaseSelector,
  GitHubReleaseSummary,
  GitHubSyncAuth,
  GitHubReleaseSyncRequest,
  GitHubReleaseSyncResult,
} from "./models.js"
import {
  buildReleaseAssetLabel,
  buildCommitUrl,
  buildCompareRange,
  buildCompareReleaseSummary,
  buildCompareReleaseTitle,
  buildCompareUrl,
  buildFileEvidenceBody,
  buildMergedPullReleaseSummary,
  buildMergedPullReleaseTitle,
  buildMergedPullScope,
  buildPullRequestEvidenceBody,
  buildReleaseEvidenceBody,
  buildReleaseRecordSummary,
  buildReleaseRecordTitle,
  buildReleaseScope,
  buildReleaseTargetUrl,
  getCommitHeadline,
} from "./normalize.js"

export type GitHubSyncService = ReturnType<typeof createGitHubSyncService>

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`)
  }
}

function nowIso() {
  return new Date().toISOString()
}

function buildCompareScope(input: GitHubCompareSyncRequest) {
  return `github:repo:${input.repository.owner}/${input.repository.repo} compare:${input.compare.base}...${input.compare.head}`
}

function countCompareClaimCandidates(comparison: GitHubCompareSummary) {
  return comparison.commits.reduce((count, commit) => {
    return getCommitHeadline(commit.message) ? count + 1 : count
  }, 0)
}

function buildComparePreview(input: GitHubCompareSyncRequest, comparison: GitHubCompareSummary): GitHubScopePreviewResult {
  const compareRange = buildCompareRange(input.compare.base, input.compare.head)

  return {
    changedFileCount: comparison.files.length,
    commits: comparison.commits,
    compareRange,
    defaultBranch: null,
    expectedClaimCandidateCount: countCompareClaimCandidates(comparison),
    expectedEvidenceBlockCount: comparison.commits.length + comparison.files.length,
    expectedSourceLinkCount: 1 + comparison.commits.length,
    files: comparison.files,
    mode: "compare",
    previewNotes: [
      `PulseNote will freeze ${comparison.totalCommits} commits and ${comparison.files.length} changed files into one release scope.`,
      "The compare scope becomes one reviewable release record before drafting starts.",
    ],
    release: null,
    repository: input.repository,
    resolvedCompare: {
      base: input.compare.base,
      head: input.compare.head,
    },
    scopeLabel: compareRange,
    sinceDate: null,
    summary: buildCompareReleaseSummary(comparison),
    title: buildCompareReleaseTitle(input.repository, compareRange),
    totalCommits: comparison.totalCommits,
  }
}

function buildReleasePreview(
  input: GitHubReleaseSyncRequest,
  release: GitHubReleaseSummary,
): GitHubScopePreviewResult {
  return {
    changedFileCount: 0,
    commits: [],
    compareRange: null,
    defaultBranch: null,
    expectedClaimCandidateCount: 0,
    expectedEvidenceBlockCount: 1,
    expectedSourceLinkCount: 2 + release.assets.length,
    files: [],
    mode: "release",
    previewNotes: [
      `PulseNote will anchor the release record to ${release.tagName} and its published GitHub release evidence.`,
      "Release assets and the tagged target stay attached as source links from the start.",
    ],
    release,
    repository: input.repository,
    resolvedCompare: null,
    scopeLabel: release.tagName,
    sinceDate: null,
    summary: buildReleaseRecordSummary(release),
    title: buildReleaseRecordTitle(input.repository, release),
    totalCommits: 0,
  }
}

function parseSinceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new Error("sinceDate must use YYYY-MM-DD format")
  }

  const parsed = new Date(`${value.trim()}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("sinceDate is invalid")
  }

  return parsed.toISOString()
}

async function resolveConnection(
  store: FoundationStore,
  input: {
    connectionId: string
    workspaceId: string
  },
) {
  const connection = await store.getIntegrationConnection(input.connectionId)

  if (!connection) {
    throw new Error(`Integration connection ${input.connectionId} was not found`)
  }

  if (connection.provider !== "github") {
    throw new Error(`Integration connection ${input.connectionId} is not a GitHub connection`)
  }

  if (connection.workspaceId !== input.workspaceId) {
    throw new Error(
      `Integration connection ${input.connectionId} does not belong to workspace ${input.workspaceId}`,
    )
  }

  return connection
}

async function resolveSinceDateCompareRange(input: {
  auth: GitHubSyncAuth
  githubClient: Pick<GitHubClient, "compareCommits"> &
    Partial<Pick<GitHubClient, "getDefaultBranch" | "listCommitsSince">>
  repository: GitHubCompareSyncRequest["repository"]
  sinceDate: string
}): Promise<{
  commits: GitHubCompareSummary["commits"]
  defaultBranch: string
  comparison: GitHubCompareSummary
  resolvedCompare: GitHubResolvedCompareRange
}> {
  if (!input.githubClient.getDefaultBranch || !input.githubClient.listCommitsSince) {
    throw new Error("GitHub since-date preview is unavailable")
  }

  const sinceIso = parseSinceDate(input.sinceDate)
  const defaultBranch = await input.githubClient.getDefaultBranch({
    auth: input.auth,
    repository: input.repository,
  })
  const commits = await input.githubClient.listCommitsSince({
    auth: input.auth,
    branch: defaultBranch,
    repository: input.repository,
    since: sinceIso,
  })

  if (commits.length === 0) {
    return {
      commits: [],
      defaultBranch,
      comparison: {
        aheadBy: 0,
        behindBy: 0,
        commits: [],
        files: [],
        mergeBaseSha: null,
        totalCommits: 0,
      },
      resolvedCompare: {
        base: defaultBranch,
        head: defaultBranch,
      },
    }
  }

  const latestCommit = commits[0]
  const oldestCommit = commits[commits.length - 1]
  const base = oldestCommit?.parentShas[0] ?? oldestCommit?.sha ?? defaultBranch
  const head = latestCommit?.sha ?? defaultBranch
  const comparison = await input.githubClient.compareCommits({
    auth: input.auth,
    compare: {
      base,
      head,
    },
    repository: input.repository,
  })

  return {
    commits: comparison.commits,
    comparison,
    defaultBranch,
    resolvedCompare: {
      base,
      head,
    },
  }
}

function buildSinceDatePreview(input: {
  repository: GitHubCompareSyncRequest["repository"]
  sinceDate: string
  defaultBranch: string
  comparison: GitHubCompareSummary
  resolvedCompare: GitHubResolvedCompareRange
}): GitHubScopePreviewResult {
  const scopeLabel = `${input.defaultBranch} since ${input.sinceDate}`

  return {
    changedFileCount: input.comparison.files.length,
    commits: input.comparison.commits,
    compareRange: buildCompareRange(input.resolvedCompare.base, input.resolvedCompare.head),
    defaultBranch: input.defaultBranch,
    expectedClaimCandidateCount: countCompareClaimCandidates(input.comparison),
    expectedEvidenceBlockCount: input.comparison.commits.length + input.comparison.files.length,
    expectedSourceLinkCount: 1 + input.comparison.commits.length,
    files: input.comparison.files,
    mode: "since_date",
    previewNotes: input.comparison.totalCommits > 0
      ? [
          `PulseNote resolved ${input.comparison.totalCommits} commits on ${input.defaultBranch} after ${input.sinceDate}.`,
          "The since-date scope is confirmed as one explicit compare range before the release record is created.",
        ]
      : [
          `No commits were found on ${input.defaultBranch} after ${input.sinceDate}.`,
          "Pick an earlier date or another scope before creating a release record.",
        ],
    release: null,
    repository: input.repository,
    resolvedCompare: input.resolvedCompare,
    scopeLabel,
    sinceDate: input.sinceDate,
    summary:
      input.comparison.totalCommits > 0
        ? buildCompareReleaseSummary(input.comparison)
        : `No GitHub commits were found on ${input.defaultBranch} after ${input.sinceDate}.`,
    title: `${input.repository.owner}/${input.repository.repo} activity since ${input.sinceDate}`,
    totalCommits: input.comparison.totalCommits,
  }
}

function validateReleaseSelector(release: {
  releaseId?: number
  tag?: string
}): GitHubReleaseSelector {
  const hasTag = typeof release.tag === "string" && release.tag.trim().length > 0
  const hasReleaseId = typeof release.releaseId === "number" && Number.isInteger(release.releaseId) && release.releaseId > 0

  if (hasTag === hasReleaseId) {
    throw new Error("release selector must provide exactly one of release.tag or release.releaseId")
  }

  if (hasTag) {
    return { tag: release.tag!.trim() }
  }

  return { releaseId: release.releaseId! }
}

async function persistCompareReleaseRecord(
  store: FoundationStore,
  input: GitHubCompareSyncRequest,
  comparison: GitHubCompareSummary,
  scope: string,
) {
  const compareRange = buildCompareRange(input.compare.base, input.compare.head)
  const releaseRecord = await store.createReleaseRecord({
    compareRange,
    connectionId: input.connectionId,
    stage: "intake",
    summary: buildCompareReleaseSummary(comparison),
    title: buildCompareReleaseTitle(input.repository, compareRange),
    workspaceId: input.workspaceId,
  })
  const compareSourceLink = await store.createSourceLink({
    label: `GitHub compare ${compareRange}`,
    provider: "github",
    releaseRecordId: releaseRecord.id,
    url: buildCompareUrl(input.repository, compareRange),
  })

  const persistedEvidenceBlocks = []
  const persistedSourceLinks = [compareSourceLink]
  const persistedClaimCandidates = []

  for (const commit of comparison.commits) {
    const headline = getCommitHeadline(commit.message)
    const evidenceBlock = await store.createEvidenceBlock({
      body: commit.message,
      capturedAt: commit.committedAt ?? nowIso(),
      evidenceState: "fresh",
      provider: "github",
      releaseRecordId: releaseRecord.id,
      sourceRef: commit.sha,
      sourceType: "commit",
      title: headline || commit.sha,
    })

    persistedEvidenceBlocks.push(evidenceBlock)
    persistedSourceLinks.push(
      await store.createSourceLink({
        label: `Commit ${commit.sha.slice(0, 7)}`,
        provider: "github",
        releaseRecordId: releaseRecord.id,
        url: buildCommitUrl(input.repository, commit.sha),
      }),
    )

    if (headline) {
      const claimCandidate = await store.createClaimCandidate({
        releaseRecordId: releaseRecord.id,
        sentence: headline,
        status: "pending",
      })

      await store.linkClaimCandidateEvidenceBlock({
        claimCandidateId: claimCandidate.id,
        evidenceBlockId: evidenceBlock.id,
      })

      persistedClaimCandidates.push(claimCandidate)
    }
  }

  for (const file of comparison.files) {
    persistedEvidenceBlocks.push(
      await store.createEvidenceBlock({
        body: buildFileEvidenceBody(file),
        capturedAt: nowIso(),
        evidenceState: "fresh",
        provider: "github",
        releaseRecordId: releaseRecord.id,
        sourceRef: file.filename,
        sourceType: "document",
        title: file.filename,
      }),
    )
  }

  await store.createReviewStatus({
    note: `Queued from ${scope}`,
    ownerUserId: null,
    releaseRecordId: releaseRecord.id,
    stage: "intake",
    state: "pending",
  })

  return {
    claimCandidateCount: persistedClaimCandidates.length,
    evidenceBlockCount: persistedEvidenceBlocks.length,
    releaseRecordId: releaseRecord.id,
    sourceLinkCount: persistedSourceLinks.length,
  }
}

async function persistMergedPullReleaseRecord(
  store: FoundationStore,
  input: GitHubMergedPullSyncRequest,
  pullRequests: GitHubPullRequestSummary[],
  scope: string,
) {
  for (const pullRequest of pullRequests) {
    if (!pullRequest.mergedAt) {
      throw new Error(`Pull request #${pullRequest.number} is not merged`)
    }
  }

  const releaseRecord = await store.createReleaseRecord({
    compareRange: null,
    connectionId: input.connectionId,
    stage: "intake",
    summary: buildMergedPullReleaseSummary(pullRequests),
    title: buildMergedPullReleaseTitle(input.repository, pullRequests),
    workspaceId: input.workspaceId,
  })

  const persistedEvidenceBlocks = []
  const persistedSourceLinks = []
  const persistedClaimCandidates = []

  for (const pullRequest of pullRequests) {
    const mergedAt = pullRequest.mergedAt!

    const evidenceBlock = await store.createEvidenceBlock({
      body: buildPullRequestEvidenceBody(pullRequest),
      capturedAt: mergedAt,
      evidenceState: "fresh",
      provider: "github",
      releaseRecordId: releaseRecord.id,
      sourceRef: String(pullRequest.number),
      sourceType: "pull_request",
      title: pullRequest.title,
    })

    persistedEvidenceBlocks.push(evidenceBlock)
    persistedSourceLinks.push(
      await store.createSourceLink({
        label: `Pull request #${pullRequest.number}`,
        provider: "github",
        releaseRecordId: releaseRecord.id,
        url: pullRequest.htmlUrl,
      }),
    )

    const claimCandidate = await store.createClaimCandidate({
      releaseRecordId: releaseRecord.id,
      sentence: pullRequest.title,
      status: "pending",
    })

    await store.linkClaimCandidateEvidenceBlock({
      claimCandidateId: claimCandidate.id,
      evidenceBlockId: evidenceBlock.id,
    })

    persistedClaimCandidates.push(claimCandidate)
  }

  await store.createReviewStatus({
    note: `Queued from ${scope}`,
    ownerUserId: null,
    releaseRecordId: releaseRecord.id,
    stage: "intake",
    state: "pending",
  })

  return {
    claimCandidateCount: persistedClaimCandidates.length,
    evidenceBlockCount: persistedEvidenceBlocks.length,
    mergedPullCount: pullRequests.length,
    releaseRecordId: releaseRecord.id,
    sourceLinkCount: persistedSourceLinks.length,
  }
}

async function persistReleaseRecord(
  store: FoundationStore,
  input: GitHubReleaseSyncRequest,
  release: GitHubReleaseSummary,
  scope: string,
) {
  const releaseRecord = await store.createReleaseRecord({
    compareRange: null,
    connectionId: input.connectionId,
    stage: "intake",
    summary: buildReleaseRecordSummary(release),
    title: buildReleaseRecordTitle(input.repository, release),
    workspaceId: input.workspaceId,
  })

  const evidenceBlock = await store.createEvidenceBlock({
    body: buildReleaseEvidenceBody(release),
    capturedAt: release.publishedAt ?? release.createdAt,
    evidenceState: "fresh",
    provider: "github",
    releaseRecordId: releaseRecord.id,
    sourceRef: String(release.id),
    sourceType: "release",
    title: release.name?.trim() || release.tagName,
  })

  const persistedSourceLinks = [
    await store.createSourceLink({
      label: `GitHub release ${release.tagName}`,
      provider: "github",
      releaseRecordId: releaseRecord.id,
      url: release.htmlUrl,
    }),
    await store.createSourceLink({
      label: `Release target ${release.targetCommitish}`,
      provider: "github",
      releaseRecordId: releaseRecord.id,
      url: buildReleaseTargetUrl(input.repository, release.targetCommitish),
    }),
  ]

  for (const asset of release.assets) {
    persistedSourceLinks.push(
      await store.createSourceLink({
        label: buildReleaseAssetLabel(asset),
        provider: "github",
        releaseRecordId: releaseRecord.id,
        url: asset.downloadUrl,
      }),
    )
  }

  await store.createReviewStatus({
    note: `Queued from ${scope}`,
    ownerUserId: null,
    releaseRecordId: releaseRecord.id,
    stage: "intake",
    state: "pending",
  })

  return {
    claimCandidateCount: 0,
    evidenceBlockCount: 1,
    releaseRecordId: releaseRecord.id,
    sourceLinkCount: persistedSourceLinks.length,
  }
}

async function markSyncRunStatus(
  store: FoundationStore,
  syncRun: SyncRun,
  status: SyncRun["status"],
  errorMessage?: string | null,
) {
  return store.updateSyncRun({
    errorMessage: errorMessage ?? null,
    finishedAt: status === "running" ? null : nowIso(),
    id: syncRun.id,
    status,
  })
}

export function createGitHubSyncService(options: {
  githubClient: Pick<GitHubClient, "compareCommits" | "getPullRequests" | "getRelease"> &
    Partial<Pick<GitHubClient, "getDefaultBranch" | "listCommitsSince">>
  runtimeEnv: AppRuntimeEnv
  store: FoundationStore
}) {
  const { githubClient, runtimeEnv, store } = options

  function assertProductionAuth(input: { auth: GitHubSyncAuth }) {
    if (runtimeEnv.nodeEnv !== "production") {
      return
    }

    if (input.auth.strategy !== "installation_token" || input.auth.source !== "github_app_installation") {
      throw new Error("Development-only GitHub ingest is not available in production")
    }
  }

  return {
    async syncCompareRange(input: GitHubCompareSyncRequest): Promise<GitHubCompareSyncResult> {
      assertProductionAuth(input)

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.compare.base, "compare.base")
      requireNonEmpty(input.compare.head, "compare.head")
      requireNonEmpty(input.auth.token, "auth.token")

      await resolveConnection(store, input)

      const scope = buildCompareScope(input)
      const queuedSyncRun = await store.createSyncRun({
        connectionId: input.connectionId,
        scope,
        workspaceId: input.workspaceId,
      })

      await markSyncRunStatus(store, queuedSyncRun, "running")

      try {
        const comparison = await githubClient.compareCommits({
          auth: input.auth,
          compare: input.compare,
          repository: input.repository,
        })
        const persisted = await persistCompareReleaseRecord(
          store,
          input,
          comparison,
          scope,
        )

        await store.updateIntegrationConnection({
          id: input.connectionId,
          lastSyncedAt: nowIso(),
        })
        await markSyncRunStatus(store, queuedSyncRun, "succeeded")

        return {
          claimCandidateCount: persisted.claimCandidateCount,
          comparison,
          evidenceBlockCount: persisted.evidenceBlockCount,
          releaseRecordId: persisted.releaseRecordId,
          repository: input.repository,
          scope,
          sourceLinkCount: persisted.sourceLinkCount,
          syncRunId: queuedSyncRun.id,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub compare sync failed"
        await markSyncRunStatus(store, queuedSyncRun, "failed", message)
        throw new Error(message)
      }
    },

    async syncMergedPullRequests(
      input: GitHubMergedPullSyncRequest,
    ): Promise<GitHubMergedPullSyncResult> {
      assertProductionAuth(input)

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.auth.token, "auth.token")

      if (input.pullNumbers.length === 0) {
        throw new Error("pullNumbers must contain at least one pull request number")
      }

      if (input.pullNumbers.some((pullNumber) => !Number.isInteger(pullNumber) || pullNumber <= 0)) {
        throw new Error("pullNumbers must only contain positive integers")
      }

      await resolveConnection(store, input)

      const scope = buildMergedPullScope(input.repository, input.pullNumbers)
      const queuedSyncRun = await store.createSyncRun({
        connectionId: input.connectionId,
        scope,
        workspaceId: input.workspaceId,
      })

      await markSyncRunStatus(store, queuedSyncRun, "running")

      try {
        const pullRequests = await githubClient.getPullRequests({
          auth: input.auth,
          pullNumbers: input.pullNumbers,
          repository: input.repository,
        })
        const persisted = await persistMergedPullReleaseRecord(store, input, pullRequests, scope)

        await store.updateIntegrationConnection({
          id: input.connectionId,
          lastSyncedAt: nowIso(),
        })
        await markSyncRunStatus(store, queuedSyncRun, "succeeded")

        return {
          claimCandidateCount: persisted.claimCandidateCount,
          evidenceBlockCount: persisted.evidenceBlockCount,
          mergedPullCount: persisted.mergedPullCount,
          releaseRecordId: persisted.releaseRecordId,
          repository: input.repository,
          scope,
          sourceLinkCount: persisted.sourceLinkCount,
          syncRunId: queuedSyncRun.id,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub merged pull sync failed"
        await markSyncRunStatus(store, queuedSyncRun, "failed", message)
        throw new Error(message)
      }
    },

    async syncRelease(input: GitHubReleaseSyncRequest): Promise<GitHubReleaseSyncResult> {
      assertProductionAuth(input)

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.auth.token, "auth.token")

      const releaseSelector = validateReleaseSelector(input.release)
      await resolveConnection(store, input)

      const scopeSeed =
        "tag" in releaseSelector
          ? `release-tag:${releaseSelector.tag}`
          : `release-id:${releaseSelector.releaseId}`
      const queuedSyncRun = await store.createSyncRun({
        connectionId: input.connectionId,
        scope: `github:repo:${input.repository.owner}/${input.repository.repo} ${scopeSeed}`,
        workspaceId: input.workspaceId,
      })

      await markSyncRunStatus(store, queuedSyncRun, "running")

      try {
        const release = await githubClient.getRelease({
          auth: input.auth,
          release: releaseSelector,
          repository: input.repository,
        })
        const scope = buildReleaseScope(input.repository, release)
        const persisted = await persistReleaseRecord(store, input, release, scope)

        await store.updateIntegrationConnection({
          id: input.connectionId,
          lastSyncedAt: nowIso(),
        })
        await markSyncRunStatus(store, queuedSyncRun, "succeeded")

        return {
          claimCandidateCount: persisted.claimCandidateCount,
          evidenceBlockCount: persisted.evidenceBlockCount,
          release,
          releaseRecordId: persisted.releaseRecordId,
          repository: input.repository,
          scope,
          sourceLinkCount: persisted.sourceLinkCount,
          syncRunId: queuedSyncRun.id,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub release sync failed"
        await markSyncRunStatus(store, queuedSyncRun, "failed", message)
        throw new Error(message)
      }
    },

    async previewCompareRange(input: GitHubCompareSyncRequest): Promise<GitHubScopePreviewResult> {
      assertProductionAuth(input)

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.compare.base, "compare.base")
      requireNonEmpty(input.compare.head, "compare.head")
      requireNonEmpty(input.auth.token, "auth.token")

      await resolveConnection(store, input)

      const comparison = await githubClient.compareCommits({
        auth: input.auth,
        compare: input.compare,
        repository: input.repository,
      })

      return buildComparePreview(input, comparison)
    },

    async previewRelease(input: GitHubReleaseSyncRequest): Promise<GitHubScopePreviewResult> {
      assertProductionAuth(input)

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.auth.token, "auth.token")

      const releaseSelector = validateReleaseSelector(input.release)

      await resolveConnection(store, input)

      const release = await githubClient.getRelease({
        auth: input.auth,
        release: releaseSelector,
        repository: input.repository,
      })

      return buildReleasePreview(input, release)
    },

    async previewSinceDate(input: GitHubSinceDatePreviewRequest): Promise<GitHubScopePreviewResult> {
      assertProductionAuth(input)

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.auth.token, "auth.token")
      requireNonEmpty(input.sinceDate, "sinceDate")

      await resolveConnection(store, input)

      const resolved = await resolveSinceDateCompareRange({
        auth: input.auth,
        githubClient,
        repository: input.repository,
        sinceDate: input.sinceDate,
      })

      return buildSinceDatePreview({
        comparison: resolved.comparison,
        defaultBranch: resolved.defaultBranch,
        repository: input.repository,
        resolvedCompare: resolved.resolvedCompare,
        sinceDate: input.sinceDate,
      })
    },
  }
}
