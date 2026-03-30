import { and, asc, desc, eq, inArray } from "drizzle-orm"

import {
  claimCandidateEvidenceBlocks,
  claimCandidates,
  currentWorkspaceSelections,
  evidenceBlocks,
  githubConnectionConfigs,
  integrationAccounts,
  integrationConnections,
  releaseRecords,
  reviewStatuses,
  sourceCursors,
  sourceLinks,
  syncRuns,
  users,
  workspaceMemberships,
  workspacePolicySettings,
  workspaces,
} from "../db/schema.js"
import type { DatabaseClient } from "../db/client.js"
import {
  type ClaimCandidate,
  type CurrentWorkspaceSelection,
  type EvidenceBlock,
  type GitHubConnectionConfig,
  type IntegrationAccount,
  type IntegrationConnection,
  type IntegrationProvider,
  type ReleaseRecord,
  type ReviewStatus,
  type SourceCursor,
  type SourceLink,
  type SyncRun,
  type User,
  type Workspace,
  type WorkspacePolicySettings,
  type WorkspaceMembership,
  createDefaultWorkspacePolicySettings,
} from "../domain/models.js"
import type { FoundationStore, GitHubWorkspaceConnection, ReleaseRecordSnapshot } from "./store.js"

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  return crypto.randomUUID()
}

type PostgresFoundationStoreOptions = {
  db: DatabaseClient
}

export function createPostgresFoundationStore(
  dbOrOptions: DatabaseClient | PostgresFoundationStoreOptions,
): FoundationStore {
  const db = "db" in dbOrOptions ? dbOrOptions.db : dbOrOptions

  async function buildReleaseRecordSnapshot(releaseRecordId: string): Promise<ReleaseRecordSnapshot | null> {
    const releaseRecord = await db.query.releaseRecords.findFirst({
      where: eq(releaseRecords.id, releaseRecordId),
    })

    if (!releaseRecord) {
      return null
    }

    const [evidenceBlockRows, claimCandidateRows, sourceLinkRows, reviewStatusRows] = await Promise.all([
      db.query.evidenceBlocks.findMany({
        where: eq(evidenceBlocks.releaseRecordId, releaseRecordId),
      }),
      db.query.claimCandidates.findMany({
        where: eq(claimCandidates.releaseRecordId, releaseRecordId),
      }),
      db.query.sourceLinks.findMany({
        where: eq(sourceLinks.releaseRecordId, releaseRecordId),
      }),
      db.query.reviewStatuses.findMany({
        where: eq(reviewStatuses.releaseRecordId, releaseRecordId),
      }),
    ])
    const claimCandidateIds = claimCandidateRows.map((claimCandidate) => claimCandidate.id)
    const claimLinks =
      claimCandidateIds.length > 0
        ? await db.query.claimCandidateEvidenceBlocks.findMany({
            where: inArray(claimCandidateEvidenceBlocks.claimCandidateId, claimCandidateIds),
          })
        : []

    const evidenceBlockIdsByClaimCandidateId = new Map<string, string[]>()

    for (const link of claimLinks) {
      const evidenceBlockIds = evidenceBlockIdsByClaimCandidateId.get(link.claimCandidateId) ?? []
      evidenceBlockIds.push(link.evidenceBlockId)
      evidenceBlockIdsByClaimCandidateId.set(link.claimCandidateId, evidenceBlockIds)
    }

    const normalizedClaimCandidates = claimCandidateRows.map((claimCandidate) => ({
      ...claimCandidate,
      evidenceBlockIds: evidenceBlockIdsByClaimCandidateId.get(claimCandidate.id) ?? [],
    }))

    return {
      claimCandidates: normalizedClaimCandidates,
      evidenceBlocks: evidenceBlockRows,
      releaseRecord,
      reviewStatuses: reviewStatusRows,
      sourceLinks: sourceLinkRows,
    } satisfies ReleaseRecordSnapshot
  }

  return {
    async bootstrapAuthenticatedWorkspace(input) {
      return db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            createdAt: nowIso(),
            email: input.user.email,
            fullName: input.user.fullName,
            id: input.user.id,
            updatedAt: nowIso(),
          })
          .onConflictDoUpdate({
            set: {
              email: input.user.email,
              fullName: input.user.fullName,
              updatedAt: nowIso(),
            },
            target: users.id,
          })
          .returning()

        const [workspace] = await tx
          .insert(workspaces)
          .values({
            createdAt: nowIso(),
            id: createId(),
            name: input.workspace.name,
            slug: input.workspace.slug,
            updatedAt: nowIso(),
          })
          .returning()

        const [membership] = await tx
          .insert(workspaceMemberships)
          .values({
            createdAt: nowIso(),
            id: createId(),
            role: "owner",
            userId: user.id,
            workspaceId: workspace.id,
          })
          .returning()

        await tx.insert(workspacePolicySettings).values({
          ...createDefaultWorkspacePolicySettings(workspace.id),
        })

        return {
          membership: membership satisfies WorkspaceMembership,
          user: user satisfies User,
          workspace: workspace satisfies Workspace,
        }
      })
    },

    async bootstrapWorkspace(input) {
      return db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            createdAt: nowIso(),
            email: input.user.email,
            fullName: input.user.fullName,
            id: createId(),
            updatedAt: nowIso(),
          })
          .returning()

        const [workspace] = await tx
          .insert(workspaces)
          .values({
            createdAt: nowIso(),
            id: createId(),
            name: input.workspace.name,
            slug: input.workspace.slug,
            updatedAt: nowIso(),
          })
          .returning()

        const [membership] = await tx
          .insert(workspaceMemberships)
          .values({
            createdAt: nowIso(),
            id: createId(),
            role: "owner",
            userId: user.id,
            workspaceId: workspace.id,
          })
          .returning()

        await tx.insert(workspacePolicySettings).values({
          ...createDefaultWorkspacePolicySettings(workspace.id),
        })

        return {
          membership: membership satisfies WorkspaceMembership,
          user: user satisfies User,
          workspace: workspace satisfies Workspace,
        }
      })
    },

    async createClaimCandidate(input) {
      const [claimCandidate] = await db
        .insert(claimCandidates)
        .values({
          createdAt: nowIso(),
          id: createId(),
          releaseRecordId: input.releaseRecordId,
          sentence: input.sentence,
          status: input.status,
          updatedAt: nowIso(),
        })
        .returning()

      return {
        ...claimCandidate,
        evidenceBlockIds: [],
      } satisfies ClaimCandidate
    },

    async createEvidenceBlock(input) {
      const [evidenceBlock] = await db
        .insert(evidenceBlocks)
        .values({
          body: input.body,
          capturedAt: input.capturedAt ?? nowIso(),
          evidenceState: input.evidenceState,
          id: createId(),
          provider: input.provider,
          releaseRecordId: input.releaseRecordId,
          sourceRef: input.sourceRef,
          sourceType: input.sourceType,
          title: input.title,
        })
        .returning()

      return evidenceBlock satisfies EvidenceBlock
    },

    async createIntegrationAccount(input) {
      const [integrationAccount] = await db
        .insert(integrationAccounts)
        .values({
          accountLabel: input.accountLabel,
          accountUrl: input.accountUrl,
          connectionId: input.connectionId,
          createdAt: nowIso(),
          id: createId(),
          provider: input.provider,
        })
        .returning()

      return integrationAccount satisfies IntegrationAccount
    },

    async createIntegrationConnection(input) {
      const [integrationConnection] = await db
        .insert(integrationConnections)
        .values({
          connectedAt: nowIso(),
          externalAccountId: input.externalAccountId,
          id: createId(),
          lastSyncedAt: null,
          provider: input.provider,
          status: "active",
          workspaceId: input.workspaceId,
        })
        .returning()

      return integrationConnection satisfies IntegrationConnection
    },

    async upsertGitHubConnectionConfig(input) {
      const existingConfig = await db.query.githubConnectionConfigs.findFirst({
        where: eq(githubConnectionConfigs.connectionId, input.connectionId),
      })

      const [githubConnectionConfig] = await db
        .insert(githubConnectionConfigs)
        .values({
          connectedByUserId: input.connectedByUserId,
          connectionId: input.connectionId,
          createdAt: existingConfig?.createdAt ?? nowIso(),
          installationId: input.installationId,
          repositoryName: input.repositoryName,
          repositoryOwner: input.repositoryOwner,
          repositoryUrl: input.repositoryUrl,
          updatedAt: nowIso(),
        })
        .onConflictDoUpdate({
          set: {
            connectedByUserId: input.connectedByUserId,
            installationId: input.installationId,
            repositoryName: input.repositoryName,
            repositoryOwner: input.repositoryOwner,
            repositoryUrl: input.repositoryUrl,
            updatedAt: nowIso(),
          },
          target: githubConnectionConfigs.connectionId,
        })
        .returning()

      return githubConnectionConfig satisfies GitHubConnectionConfig
    },

    async createReleaseRecord(input) {
      const [releaseRecord] = await db
        .insert(releaseRecords)
        .values({
          compareRange: input.compareRange,
          connectionId: input.connectionId,
          createdAt: nowIso(),
          id: createId(),
          preferredDraftTemplateId: input.preferredDraftTemplateId,
          stage: input.stage,
          summary: input.summary,
          title: input.title,
          updatedAt: nowIso(),
          workspaceId: input.workspaceId,
        })
        .returning()

      return releaseRecord satisfies ReleaseRecord
    },

    async createReviewStatus(input) {
      const [reviewStatus] = await db
        .insert(reviewStatuses)
        .values({
          id: createId(),
          note: input.note,
          ownerUserId: input.ownerUserId,
          releaseRecordId: input.releaseRecordId,
          stage: input.stage,
          state: input.state,
          updatedAt: nowIso(),
        })
        .returning()

      return reviewStatus satisfies ReviewStatus
    },

    async createSourceCursor(input) {
      const [sourceCursor] = await db
        .insert(sourceCursors)
        .values({
          connectionId: input.connectionId,
          id: createId(),
          key: input.key,
          updatedAt: nowIso(),
          value: input.value,
        })
        .returning()

      return sourceCursor satisfies SourceCursor
    },

    async createSourceLink(input) {
      const [sourceLink] = await db
        .insert(sourceLinks)
        .values({
          id: createId(),
          label: input.label,
          provider: input.provider,
          releaseRecordId: input.releaseRecordId,
          url: input.url,
        })
        .returning()

      return sourceLink satisfies SourceLink
    },

    async createSyncRun(input) {
      const integrationConnection = await db.query.integrationConnections.findFirst({
        where: eq(integrationConnections.id, input.connectionId),
      })

      if (!integrationConnection) {
        throw new Error(`Integration connection ${input.connectionId} was not found`)
      }

      const [syncRun] = await db
        .insert(syncRuns)
        .values({
          connectionId: input.connectionId,
          errorMessage: null,
          finishedAt: null,
          id: createId(),
          provider: integrationConnection.provider,
          scope: input.scope,
          startedAt: nowIso(),
          status: "queued",
          workspaceId: input.workspaceId,
        })
        .returning()

      return syncRun satisfies SyncRun
    },

    async createUser(input) {
      const [user] = await db
        .insert(users)
        .values({
          createdAt: nowIso(),
          email: input.email,
          fullName: input.fullName,
          id: createId(),
          updatedAt: nowIso(),
        })
        .returning()

      return user satisfies User
    },

    async createWorkspace(input) {
      const [workspace] = await db
        .insert(workspaces)
        .values({
          createdAt: nowIso(),
          id: createId(),
          name: input.name,
          slug: input.slug,
          updatedAt: nowIso(),
        })
        .returning()

      return workspace satisfies Workspace
    },

    async createWorkspacePolicySettings(input) {
      const [settings] = await db
        .insert(workspacePolicySettings)
        .values({
          ...createDefaultWorkspacePolicySettings(input.workspaceId),
          ...input,
        })
        .returning()

      return settings satisfies WorkspacePolicySettings
    },

    async createWorkspaceMembership(input) {
      const [workspaceMembership] = await db
        .insert(workspaceMemberships)
        .values({
          createdAt: nowIso(),
          id: createId(),
          role: input.role,
          userId: input.userId,
          workspaceId: input.workspaceId,
        })
        .returning()

      return workspaceMembership satisfies WorkspaceMembership
    },

    async syncAuthenticatedUser(input) {
      const [user] = await db
        .insert(users)
        .values({
          createdAt: nowIso(),
          email: input.email,
          fullName: input.fullName,
          id: input.id,
          updatedAt: nowIso(),
        })
        .onConflictDoUpdate({
          set: {
            email: input.email,
            fullName: input.fullName,
            updatedAt: nowIso(),
          },
          target: users.id,
        })
        .returning()

      return user satisfies User
    },

    async transaction(callback) {
      return db.transaction(async (tx) =>
        callback(createPostgresFoundationStore(tx as DatabaseClient)),
      )
    },

    async updateReleaseRecordStage(releaseRecordId, stage) {
      const [releaseRecord] = await db
        .update(releaseRecords)
        .set({
          stage,
          updatedAt: nowIso(),
        })
        .where(eq(releaseRecords.id, releaseRecordId))
        .returning()

      if (!releaseRecord) {
        throw new Error(`Release record ${releaseRecordId} was not found`)
      }

      return releaseRecord satisfies ReleaseRecord
    },

    async findWorkspaceMembership(workspaceId, userId) {
      const workspaceMembership = await db.query.workspaceMemberships.findFirst({
        where: and(
          eq(workspaceMemberships.userId, userId),
          eq(workspaceMemberships.workspaceId, workspaceId),
        ),
      })

      return workspaceMembership ?? null
    },

    async findWorkspaceIntegrationConnection(workspaceId, provider) {
      if (provider === "github") {
        const configuredConnection = await db
          .select({
            connection: integrationConnections,
          })
          .from(githubConnectionConfigs)
          .innerJoin(
            integrationConnections,
            eq(githubConnectionConfigs.connectionId, integrationConnections.id),
          )
          .where(
            and(
              eq(integrationConnections.workspaceId, workspaceId),
              eq(integrationConnections.provider, "github"),
            ),
          )
          .orderBy(desc(integrationConnections.connectedAt))
          .limit(1)

        if (configuredConnection[0]?.connection) {
          return configuredConnection[0].connection
        }
      }

      const integrationConnection = await db.query.integrationConnections.findFirst({
        where: and(
          eq(integrationConnections.workspaceId, workspaceId),
          eq(integrationConnections.provider, provider as IntegrationProvider),
        ),
      })

      return integrationConnection ?? null
    },

    async getGitHubConnectionConfig(connectionId) {
      const githubConnectionConfig = await db.query.githubConnectionConfigs.findFirst({
        where: eq(githubConnectionConfigs.connectionId, connectionId),
      })

      return githubConnectionConfig ?? null
    },

    async getGitHubWorkspaceConnection(workspaceId) {
      const configuredConnection = await db
        .select({
          config: githubConnectionConfigs,
          connection: integrationConnections,
        })
        .from(githubConnectionConfigs)
        .innerJoin(
          integrationConnections,
          eq(githubConnectionConfigs.connectionId, integrationConnections.id),
        )
        .where(
          and(
            eq(integrationConnections.workspaceId, workspaceId),
            eq(integrationConnections.provider, "github"),
          ),
        )
        .orderBy(desc(integrationConnections.connectedAt))
        .limit(1)

      const result = configuredConnection[0]

      if (!result) {
        return null
      }

      return {
        config: result.config,
        connection: result.connection,
      } satisfies GitHubWorkspaceConnection
    },

    async listWorkspaceMembershipsForUser(userId) {
      return db.query.workspaceMemberships.findMany({
        orderBy: asc(workspaceMemberships.createdAt),
        where: eq(workspaceMemberships.userId, userId),
      })
    },

    async getIntegrationConnection(connectionId) {
      const integrationConnection = await db.query.integrationConnections.findFirst({
        where: eq(integrationConnections.id, connectionId),
      })

      return integrationConnection ?? null
    },

    async getCurrentWorkspaceSelection(userId) {
      const selection = await db.query.currentWorkspaceSelections.findFirst({
        where: eq(currentWorkspaceSelections.userId, userId),
      })

      return selection ?? null
    },

    async getReleaseRecord(releaseRecordId) {
      const releaseRecord = await db.query.releaseRecords.findFirst({
        where: eq(releaseRecords.id, releaseRecordId),
      })

      return releaseRecord ?? null
    },

    async getReleaseRecordSnapshot(releaseRecordId) {
      return buildReleaseRecordSnapshot(releaseRecordId)
    },

    async getSyncRun(syncRunId) {
      const syncRun = await db.query.syncRuns.findFirst({
        where: eq(syncRuns.id, syncRunId),
      })

      return syncRun ?? null
    },

    async getUser(userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      })

      return user ?? null
    },

    async getWorkspace(workspaceId) {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      })

      return workspace ?? null
    },

    async getWorkspacePolicySettings(workspaceId) {
      const settings = await db.query.workspacePolicySettings.findFirst({
        where: eq(workspacePolicySettings.workspaceId, workspaceId),
      })

      return settings ?? null
    },

    async getWorkspaceSnapshot(workspaceId) {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      })

      if (!workspace) {
        return null
      }

      const [memberships, integrations, syncRunRows] = await Promise.all([
        db.query.workspaceMemberships.findMany({
          where: eq(workspaceMemberships.workspaceId, workspaceId),
        }),
        db.query.integrationConnections.findMany({
          where: eq(integrationConnections.workspaceId, workspaceId),
        }),
        db.query.syncRuns.findMany({
          orderBy: desc(syncRuns.startedAt),
          where: eq(syncRuns.workspaceId, workspaceId),
        }),
      ])

      const integrationIds = integrations.map((integration) => integration.id)

      let integrationAccountRows: IntegrationAccount[] = []
      let sourceCursorRows: SourceCursor[] = []

      if (integrationIds.length > 0) {
        ;[integrationAccountRows, sourceCursorRows] = await Promise.all([
          db.query.integrationAccounts.findMany({
            where: inArray(integrationAccounts.connectionId, integrationIds),
          }),
          db.query.sourceCursors.findMany({
            where: inArray(sourceCursors.connectionId, integrationIds),
          }),
        ])
      }

      return {
        integrationAccounts: integrationAccountRows,
        integrations,
        memberships,
        sourceCursors: sourceCursorRows,
        syncRuns: syncRunRows,
        workspace,
      }
    },

    async linkClaimCandidateEvidenceBlock(input) {
      await db.insert(claimCandidateEvidenceBlocks).values({
        claimCandidateId: input.claimCandidateId,
        createdAt: nowIso(),
        evidenceBlockId: input.evidenceBlockId,
      })
    },

    async listReleaseRecordSnapshots(workspaceId) {
      const releaseRecordRows = await db.query.releaseRecords.findMany({
        orderBy: desc(releaseRecords.createdAt),
        where: eq(releaseRecords.workspaceId, workspaceId),
      })

      const snapshots = await Promise.all(
        releaseRecordRows.map((releaseRecord) => buildReleaseRecordSnapshot(releaseRecord.id)),
      )

      return snapshots.filter((snapshot): snapshot is ReleaseRecordSnapshot => snapshot !== null)
    },

    async setCurrentWorkspaceSelection(input) {
      const [selection] = await db
        .insert(currentWorkspaceSelections)
        .values({
          createdAt: nowIso(),
          updatedAt: nowIso(),
          userId: input.userId,
          workspaceId: input.workspaceId,
        })
        .onConflictDoUpdate({
          set: {
            updatedAt: nowIso(),
            workspaceId: input.workspaceId,
          },
          target: currentWorkspaceSelections.userId,
        })
        .returning()

      return selection satisfies CurrentWorkspaceSelection
    },

    async updateIntegrationConnection(input) {
      const existingConnection = await db.query.integrationConnections.findFirst({
        where: eq(integrationConnections.id, input.id),
      })

      if (!existingConnection) {
        throw new Error(`Integration connection ${input.id} was not found`)
      }

      const [integrationConnection] = await db
        .update(integrationConnections)
        .set({
          externalAccountId: input.externalAccountId ?? existingConnection.externalAccountId,
          lastSyncedAt:
            input.lastSyncedAt === undefined ? existingConnection.lastSyncedAt : input.lastSyncedAt,
          status: input.status ?? existingConnection.status,
        })
        .where(eq(integrationConnections.id, input.id))
        .returning()

      return integrationConnection satisfies IntegrationConnection
    },

    async updateSyncRun(input) {
      const existingSyncRun = await db.query.syncRuns.findFirst({
        where: eq(syncRuns.id, input.id),
      })

      if (!existingSyncRun) {
        throw new Error(`Sync run ${input.id} was not found`)
      }

      const [syncRun] = await db
        .update(syncRuns)
        .set({
          errorMessage: input.errorMessage ?? existingSyncRun.errorMessage,
          finishedAt: input.finishedAt ?? existingSyncRun.finishedAt,
          status: input.status,
        })
        .where(eq(syncRuns.id, input.id))
        .returning()

      return syncRun satisfies SyncRun
    },

    async updateWorkspacePolicySettings(input) {
      const existingSettings = await db.query.workspacePolicySettings.findFirst({
        where: eq(workspacePolicySettings.workspaceId, input.workspaceId),
      })

      if (!existingSettings) {
        throw new Error(`Workspace policy settings for ${input.workspaceId} were not found`)
      }

      const [settings] = await db
        .update(workspacePolicySettings)
        .set({
          includeEvidenceLinksInExport:
            input.includeEvidenceLinksInExport ?? existingSettings.includeEvidenceLinksInExport,
          includeSourceLinksInExport:
            input.includeSourceLinksInExport ?? existingSettings.includeSourceLinksInExport,
          requireClaimCheckBeforeApproval:
            input.requireClaimCheckBeforeApproval ?? existingSettings.requireClaimCheckBeforeApproval,
          requireReviewerAssignment:
            input.requireReviewerAssignment ?? existingSettings.requireReviewerAssignment,
          showBlockedClaimsInInbox:
            input.showBlockedClaimsInInbox ?? existingSettings.showBlockedClaimsInInbox,
          showPendingApprovalsInInbox:
            input.showPendingApprovalsInInbox ?? existingSettings.showPendingApprovalsInInbox,
          showReopenedDraftsInInbox:
            input.showReopenedDraftsInInbox ?? existingSettings.showReopenedDraftsInInbox,
          updatedAt: nowIso(),
        })
        .where(eq(workspacePolicySettings.workspaceId, input.workspaceId))
        .returning()

      return settings satisfies WorkspacePolicySettings
    },

    async deleteGitHubConnectionConfig(connectionId) {
      await db
        .delete(githubConnectionConfigs)
        .where(eq(githubConnectionConfigs.connectionId, connectionId))
    },

    async upsertReviewStatus(input) {
      const [reviewStatus] = await db
        .insert(reviewStatuses)
        .values({
          id: createId(),
          note: input.note,
          ownerUserId: input.ownerUserId,
          releaseRecordId: input.releaseRecordId,
          stage: input.stage,
          state: input.state,
          updatedAt: nowIso(),
        })
        .onConflictDoUpdate({
          set: {
            note: input.note,
            ownerUserId: input.ownerUserId,
            state: input.state,
            updatedAt: nowIso(),
          },
          target: [reviewStatuses.releaseRecordId, reviewStatuses.stage],
        })
        .returning()

      return reviewStatus satisfies ReviewStatus
    },
  }
}
