import { and, desc, eq, inArray } from "drizzle-orm"

import {
  claimCandidateEvidenceBlocks,
  claimCandidates,
  evidenceBlocks,
  integrationAccounts,
  integrationConnections,
  releaseRecords,
  reviewStatuses,
  sourceCursors,
  sourceLinks,
  syncRuns,
  users,
  workspaceMemberships,
  workspaces,
} from "../db/schema.js"
import type { DatabaseClient } from "../db/client.js"
import {
  type ClaimCandidate,
  type EvidenceBlock,
  type IntegrationAccount,
  type IntegrationConnection,
  type ReleaseRecord,
  type ReviewStatus,
  type SourceCursor,
  type SourceLink,
  type SyncRun,
  type User,
  type Workspace,
  type WorkspaceMembership,
} from "../domain/models.js"
import type { FoundationStore, ReleaseRecordSnapshot } from "./store.js"

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

    async createReleaseRecord(input) {
      const [releaseRecord] = await db
        .insert(releaseRecords)
        .values({
          compareRange: input.compareRange,
          connectionId: input.connectionId,
          createdAt: nowIso(),
          id: createId(),
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

    async findWorkspaceMembership(workspaceId, userId) {
      const workspaceMembership = await db.query.workspaceMemberships.findFirst({
        where: and(
          eq(workspaceMemberships.userId, userId),
          eq(workspaceMemberships.workspaceId, workspaceId),
        ),
      })

      return workspaceMembership ?? null
    },

    async getIntegrationConnection(connectionId) {
      const integrationConnection = await db.query.integrationConnections.findFirst({
        where: eq(integrationConnections.id, connectionId),
      })

      return integrationConnection ?? null
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

    async getWorkspace(workspaceId) {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      })

      return workspace ?? null
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
  }
}
