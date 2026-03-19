import type { AppRuntimeEnv } from "../types.js"
import type { FoundationStore } from "../foundation/store.js"
import type { SyncRun } from "../domain/models.js"
import type { GitHubClient } from "./client.js"
import type { GitHubCompareSyncRequest, GitHubCompareSyncResult } from "./models.js"

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

        await markSyncRunStatus(store, queuedSyncRun, "succeeded")

        return {
          comparison,
          repository: input.repository,
          scope,
          syncRunId: queuedSyncRun.id,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub compare sync failed"
        await markSyncRunStatus(store, queuedSyncRun, "failed", message)
        throw new Error(message)
      }
    },
  }
}
