import type { AppRuntimeEnv } from "../types.js"
import type { FoundationStore } from "../foundation/store.js"
import type { SyncRun } from "../domain/models.js"
import type { GitHubClient } from "./client.js"
import type {
  GitHubCompareSummary,
  GitHubCompareSyncRequest,
  GitHubCompareSyncResult,
  GitHubMergedPullSyncRequest,
  GitHubMergedPullSyncResult,
  GitHubPullRequestSummary,
} from "./models.js"
import {
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
    if (!pullRequest.mergedAt) {
      throw new Error(`Pull request #${pullRequest.number} is not merged`)
    }

    const evidenceBlock = await store.createEvidenceBlock({
      body: buildPullRequestEvidenceBody(pullRequest),
      capturedAt: pullRequest.mergedAt,
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
  githubClient: GitHubClient
  runtimeEnv: AppRuntimeEnv
  store: FoundationStore
}) {
  const { githubClient, runtimeEnv, store } = options

  return {
    async syncCompareRange(input: GitHubCompareSyncRequest): Promise<GitHubCompareSyncResult> {
      if (runtimeEnv.nodeEnv === "production") {
        throw new Error("Development-only GitHub ingest is not available in production")
      }

      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.repository.owner, "repository.owner")
      requireNonEmpty(input.repository.repo, "repository.repo")
      requireNonEmpty(input.compare.base, "compare.base")
      requireNonEmpty(input.compare.head, "compare.head")
      requireNonEmpty(input.auth.token, "auth.token")

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
      if (runtimeEnv.nodeEnv === "production") {
        throw new Error("Development-only GitHub ingest is not available in production")
      }

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
  }
}
