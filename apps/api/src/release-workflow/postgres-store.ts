import { and, desc, eq, inArray } from "drizzle-orm"

import type { DatabaseClient } from "../db/client.js"
import {
  claimCandidateEvidenceBlocks,
  claimCandidates,
  draftClaimCheckResultEvidenceBlocks,
  draftClaimCheckResults,
  draftRevisions,
  evidenceBlocks,
  publishPackExports,
  releaseRecords,
  reviewStatuses,
  sourceLinks,
  users,
  workflowEvents,
  workspaceMemberships,
  workspacePolicySettings,
} from "../db/schema.js"
import type {
  ClaimCandidate,
  DraftClaimCheckResult,
  DraftRevision,
  PublishPackExport,
  ReleaseRecord,
  ReviewStatus,
  SourceLink,
  WorkflowEvent,
  WorkspacePolicySettings,
} from "../domain/models.js"
import type { ReleaseRecordSnapshot } from "../foundation/store.js"
import type {
  CreateDraftClaimCheckResultInput,
  CreateDraftRevisionInput,
  CreatePublishPackExportInput,
  CreateWorkflowEventInput,
  LinkDraftClaimCheckResultEvidenceBlockInput,
  ReleaseWorkflowStore,
  UpdateReleaseReviewStatusInput,
} from "./store.js"

type PostgresReleaseWorkflowStoreOptions = {
  db: DatabaseClient
}

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  return crypto.randomUUID()
}

function groupClaimCandidateEvidenceLinks(
  claimLinks: { claimCandidateId: string; evidenceBlockId: string }[],
) {
  const evidenceBlockIdsByClaimCandidateId = new Map<string, string[]>()

  for (const link of claimLinks) {
    const evidenceBlockIds = evidenceBlockIdsByClaimCandidateId.get(link.claimCandidateId) ?? []
    evidenceBlockIds.push(link.evidenceBlockId)
    evidenceBlockIdsByClaimCandidateId.set(link.claimCandidateId, evidenceBlockIds)
  }

  return evidenceBlockIdsByClaimCandidateId
}

function groupDraftClaimCheckEvidenceLinks(
  links: { draftClaimCheckResultId: string; evidenceBlockId: string }[],
) {
  const evidenceBlockIdsByResultId = new Map<string, string[]>()

  for (const link of links) {
    const evidenceBlockIds = evidenceBlockIdsByResultId.get(link.draftClaimCheckResultId) ?? []
    evidenceBlockIds.push(link.evidenceBlockId)
    evidenceBlockIdsByResultId.set(link.draftClaimCheckResultId, evidenceBlockIds)
  }

  return evidenceBlockIdsByResultId
}

async function buildReleaseSnapshots(
  db: DatabaseClient,
  releaseRecordRows: ReleaseRecord[],
): Promise<ReleaseRecordSnapshot[]> {
  if (releaseRecordRows.length === 0) {
    return []
  }

  const releaseRecordIds = releaseRecordRows.map((releaseRecord) => releaseRecord.id)
  const [evidenceBlockRows, claimCandidateRows, sourceLinkRows, reviewStatusRows] = await Promise.all([
    db.query.evidenceBlocks.findMany({
      orderBy: [desc(evidenceBlocks.capturedAt), desc(evidenceBlocks.title)],
      where: inArray(evidenceBlocks.releaseRecordId, releaseRecordIds),
    }),
    db.query.claimCandidates.findMany({
      orderBy: [desc(claimCandidates.updatedAt), desc(claimCandidates.createdAt)],
      where: inArray(claimCandidates.releaseRecordId, releaseRecordIds),
    }),
    db.query.sourceLinks.findMany({
      orderBy: [sourceLinks.label],
      where: inArray(sourceLinks.releaseRecordId, releaseRecordIds),
    }),
    db.query.reviewStatuses.findMany({
      orderBy: [reviewStatuses.stage],
      where: inArray(reviewStatuses.releaseRecordId, releaseRecordIds),
    }),
  ])
  const claimCandidateIds = claimCandidateRows.map((claimCandidate) => claimCandidate.id)
  const claimLinks =
    claimCandidateIds.length > 0
      ? await db.query.claimCandidateEvidenceBlocks.findMany({
          where: inArray(claimCandidateEvidenceBlocks.claimCandidateId, claimCandidateIds),
        })
      : []

  const evidenceBlockIdsByClaimCandidateId = groupClaimCandidateEvidenceLinks(claimLinks)
  const evidenceBlocksByReleaseRecordId = new Map<string, ReleaseRecordSnapshot["evidenceBlocks"]>()
  const claimCandidatesByReleaseRecordId = new Map<string, ClaimCandidate[]>()
  const sourceLinksByReleaseRecordId = new Map<string, SourceLink[]>()
  const reviewStatusesByReleaseRecordId = new Map<string, ReviewStatus[]>()

  for (const evidenceBlock of evidenceBlockRows) {
    const rows = evidenceBlocksByReleaseRecordId.get(evidenceBlock.releaseRecordId) ?? []
    rows.push(evidenceBlock)
    evidenceBlocksByReleaseRecordId.set(evidenceBlock.releaseRecordId, rows)
  }

  for (const claimCandidate of claimCandidateRows) {
    const rows = claimCandidatesByReleaseRecordId.get(claimCandidate.releaseRecordId) ?? []
    rows.push({
      ...claimCandidate,
      evidenceBlockIds: evidenceBlockIdsByClaimCandidateId.get(claimCandidate.id) ?? [],
    })
    claimCandidatesByReleaseRecordId.set(claimCandidate.releaseRecordId, rows)
  }

  for (const sourceLink of sourceLinkRows) {
    const rows = sourceLinksByReleaseRecordId.get(sourceLink.releaseRecordId) ?? []
    rows.push(sourceLink)
    sourceLinksByReleaseRecordId.set(sourceLink.releaseRecordId, rows)
  }

  for (const reviewStatus of reviewStatusRows) {
    const rows = reviewStatusesByReleaseRecordId.get(reviewStatus.releaseRecordId) ?? []
    rows.push(reviewStatus)
    reviewStatusesByReleaseRecordId.set(reviewStatus.releaseRecordId, rows)
  }

  return releaseRecordRows.map((releaseRecord) => ({
    claimCandidates: claimCandidatesByReleaseRecordId.get(releaseRecord.id) ?? [],
    evidenceBlocks: evidenceBlocksByReleaseRecordId.get(releaseRecord.id) ?? [],
    releaseRecord,
    reviewStatuses: reviewStatusesByReleaseRecordId.get(releaseRecord.id) ?? [],
    sourceLinks: sourceLinksByReleaseRecordId.get(releaseRecord.id) ?? [],
  }))
}

export function createPostgresReleaseWorkflowStore(
  dbOrOptions: DatabaseClient | PostgresReleaseWorkflowStoreOptions,
): ReleaseWorkflowStore {
  const db = "db" in dbOrOptions ? dbOrOptions.db : dbOrOptions

  return {
    async createDraftClaimCheckResult(input) {
      const [draftClaimCheckResult] = await db
        .insert(draftClaimCheckResults)
        .values({
          createdAt: nowIso(),
          draftRevisionId: input.draftRevisionId,
          id: createId(),
          note: input.note,
          releaseRecordId: input.releaseRecordId,
          sentence: input.sentence,
          status: input.status,
          updatedAt: nowIso(),
        })
        .returning()

      return {
        ...draftClaimCheckResult,
        evidenceBlockIds: [],
      } satisfies DraftClaimCheckResult
    },

    async createDraftRevision(input) {
      const [draftRevision] = await db
        .insert(draftRevisions)
        .values({
          changelogBody: input.changelogBody,
          createdAt: nowIso(),
          createdByUserId: input.createdByUserId,
          evidenceRefs: input.evidenceRefs,
          fieldSnapshots: input.fieldSnapshots,
          id: createId(),
          releaseNotesBody: input.releaseNotesBody,
          releaseRecordId: input.releaseRecordId,
          templateId: input.templateId,
          templateLabel: input.templateLabel,
          templateVersion: input.templateVersion,
          version: input.version,
        })
        .returning()

      return draftRevision satisfies DraftRevision
    },

    async createPublishPackExport(input) {
      const [publishPackExport] = await db
        .insert(publishPackExports)
        .values({
          changelogBody: input.changelogBody,
          contextSnapshot: input.contextSnapshot,
          createdAt: nowIso(),
          createdByUserId: input.createdByUserId,
          draftRevisionId: input.draftRevisionId,
          evidenceSnapshots: input.evidenceSnapshots,
          id: createId(),
          policySnapshot: input.policySnapshot,
          releaseNotesBody: input.releaseNotesBody,
          releaseRecordId: input.releaseRecordId,
          sourceSnapshots: input.sourceSnapshots,
        })
        .returning()

      return publishPackExport satisfies PublishPackExport
    },

    async createWorkflowEvent(input) {
      const [workflowEvent] = await db
        .insert(workflowEvents)
        .values({
          actorUserId: input.actorUserId,
          createdAt: nowIso(),
          draftRevisionId: input.draftRevisionId,
          id: createId(),
          note: input.note,
          releaseRecordId: input.releaseRecordId,
          stage: input.stage,
          type: input.type,
        })
        .returning()

      return workflowEvent satisfies WorkflowEvent
    },

    async deleteDraftClaimCheckResultsByDraftRevisionId(draftRevisionId: string) {
      const resultRows = await db.query.draftClaimCheckResults.findMany({
        columns: {
          id: true,
        },
        where: eq(draftClaimCheckResults.draftRevisionId, draftRevisionId),
      })
      const resultIds = resultRows.map((resultRow) => resultRow.id)

      if (resultIds.length > 0) {
        await db
          .delete(draftClaimCheckResultEvidenceBlocks)
          .where(inArray(draftClaimCheckResultEvidenceBlocks.draftClaimCheckResultId, resultIds))
      }

      await db.delete(draftClaimCheckResults).where(eq(draftClaimCheckResults.draftRevisionId, draftRevisionId))
    },

    async findWorkspaceMembership(workspaceId, userId) {
      return (
        (await db.query.workspaceMemberships.findFirst({
          where: and(
            eq(workspaceMemberships.userId, userId),
            eq(workspaceMemberships.workspaceId, workspaceId),
          ),
        })) ?? null
      )
    },

    async getDraftRevision(draftRevisionId: string) {
      const draftRevision = await db.query.draftRevisions.findFirst({
        where: eq(draftRevisions.id, draftRevisionId),
      })

      return draftRevision ?? null
    },

    async getLatestDraftRevision(releaseRecordId: string) {
      const draftRevision = await db.query.draftRevisions.findFirst({
        orderBy: [desc(draftRevisions.version)],
        where: eq(draftRevisions.releaseRecordId, releaseRecordId),
      })

      return draftRevision ?? null
    },

    async getReleaseRecord(releaseRecordId: string) {
      const releaseRecord = await db.query.releaseRecords.findFirst({
        where: eq(releaseRecords.id, releaseRecordId),
      })

      return releaseRecord ?? null
    },

    async getReleaseSnapshot(workspaceId: string, releaseRecordId: string) {
      const releaseRecord = await db.query.releaseRecords.findFirst({
        where: and(
          eq(releaseRecords.id, releaseRecordId),
          eq(releaseRecords.workspaceId, workspaceId),
        ),
      })

      if (!releaseRecord) {
        return null
      }

      const [snapshot] = await buildReleaseSnapshots(db, [releaseRecord])
      return snapshot ?? null
    },

    async getWorkspacePolicySettings(workspaceId: string) {
      const settings = await db.query.workspacePolicySettings.findFirst({
        where: eq(workspacePolicySettings.workspaceId, workspaceId),
      })

      return (settings ?? null) satisfies WorkspacePolicySettings | null
    },

    async linkDraftClaimCheckResultEvidenceBlock(input) {
      await db.insert(draftClaimCheckResultEvidenceBlocks).values({
        draftClaimCheckResultId: input.draftClaimCheckResultId,
        evidenceBlockId: input.evidenceBlockId,
      })
    },

    async listDraftClaimCheckResultsByDraftRevisionIds(draftRevisionIds: string[]) {
      if (draftRevisionIds.length === 0) {
        return []
      }

      const draftClaimCheckResultRows = await db.query.draftClaimCheckResults.findMany({
        orderBy: [desc(draftClaimCheckResults.updatedAt), desc(draftClaimCheckResults.createdAt)],
        where: inArray(draftClaimCheckResults.draftRevisionId, draftRevisionIds),
      })
      const resultIds = draftClaimCheckResultRows.map((result) => result.id)
      const links =
        resultIds.length > 0
          ? await db.query.draftClaimCheckResultEvidenceBlocks.findMany({
              where: inArray(draftClaimCheckResultEvidenceBlocks.draftClaimCheckResultId, resultIds),
            })
          : []
      const evidenceBlockIdsByResultId = groupDraftClaimCheckEvidenceLinks(links)

      return draftClaimCheckResultRows.map((result) => ({
        ...result,
        evidenceBlockIds: evidenceBlockIdsByResultId.get(result.id) ?? [],
      }))
    },

    async listDraftRevisionsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      return db.query.draftRevisions.findMany({
        orderBy: [desc(draftRevisions.createdAt), desc(draftRevisions.version)],
        where: inArray(draftRevisions.releaseRecordId, releaseRecordIds),
      })
    },

    async listLatestDraftRevisionsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      const draftRevisionRows = await db.query.draftRevisions.findMany({
        orderBy: [desc(draftRevisions.version), desc(draftRevisions.createdAt)],
        where: inArray(draftRevisions.releaseRecordId, releaseRecordIds),
      })
      const latestDraftsByReleaseRecordId = new Map<string, DraftRevision>()

      for (const draftRevision of draftRevisionRows) {
        if (!latestDraftsByReleaseRecordId.has(draftRevision.releaseRecordId)) {
          latestDraftsByReleaseRecordId.set(draftRevision.releaseRecordId, draftRevision)
        }
      }

      return Array.from(latestDraftsByReleaseRecordId.values())
    },

    async listLatestPublishPackExportsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      const exportRows = await db.query.publishPackExports.findMany({
        orderBy: [desc(publishPackExports.createdAt)],
        where: inArray(publishPackExports.releaseRecordId, releaseRecordIds),
      })
      const latestExportsByReleaseRecordId = new Map<string, PublishPackExport>()

      for (const publishPackExport of exportRows) {
        if (!latestExportsByReleaseRecordId.has(publishPackExport.releaseRecordId)) {
          latestExportsByReleaseRecordId.set(publishPackExport.releaseRecordId, publishPackExport)
        }
      }

      return Array.from(latestExportsByReleaseRecordId.values())
    },

    async listPublishPackExportsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      return db.query.publishPackExports.findMany({
        orderBy: [desc(publishPackExports.createdAt)],
        where: inArray(publishPackExports.releaseRecordId, releaseRecordIds),
      })
    },

    async listReleaseSnapshots(workspaceId: string) {
      const releaseRecordRows = await db.query.releaseRecords.findMany({
        orderBy: [desc(releaseRecords.updatedAt), desc(releaseRecords.createdAt)],
        where: eq(releaseRecords.workspaceId, workspaceId),
      })

      return buildReleaseSnapshots(db, releaseRecordRows)
    },

    async listWorkflowEventsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      return db.query.workflowEvents.findMany({
        orderBy: [workflowEvents.createdAt],
        where: inArray(workflowEvents.releaseRecordId, releaseRecordIds),
      })
    },

    async listUsersByIds(userIds) {
      if (userIds.length === 0) {
        return []
      }

      return db.query.users.findMany({
        where: inArray(users.id, userIds),
      })
    },

    async transaction<T>(callback: (store: ReleaseWorkflowStore) => Promise<T>) {
      return db.transaction(async (tx) => callback(createPostgresReleaseWorkflowStore(tx as DatabaseClient)))
    },

    async updateReleaseRecordStage(releaseRecordId: string, stage: ReleaseRecord["stage"]) {
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

    async upsertReviewStatus(input: UpdateReleaseReviewStatusInput) {
      await db
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
    },
  }
}
