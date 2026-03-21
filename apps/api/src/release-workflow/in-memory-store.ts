import type {
  DraftClaimCheckResult,
  DraftRevision,
  PublishPackExport,
  ReleaseRecord,
  WorkflowEvent,
} from "../domain/models.js"
import type { FoundationStore } from "../foundation/store.js"
import type {
  CreateDraftClaimCheckResultInput,
  CreateDraftRevisionInput,
  CreatePublishPackExportInput,
  CreateWorkflowEventInput,
  LinkDraftClaimCheckResultEvidenceBlockInput,
  ReleaseWorkflowStore,
  UpdateReleaseReviewStatusInput,
} from "./store.js"

type DraftClaimCheckResultEvidenceLink = {
  draftClaimCheckResultId: string
  evidenceBlockId: string
}

type InMemoryReleaseWorkflowState = {
  draftClaimCheckResultEvidenceLinks: DraftClaimCheckResultEvidenceLink[]
  draftClaimCheckResults: Map<string, DraftClaimCheckResult>
  draftRevisions: Map<string, DraftRevision>
  publishPackExports: Map<string, PublishPackExport>
  workflowEvents: Map<string, WorkflowEvent>
}

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  return crypto.randomUUID()
}

export function createInMemoryReleaseWorkflowStore(
  foundationStore: FoundationStore,
): ReleaseWorkflowStore {
  let state: InMemoryReleaseWorkflowState = {
    draftClaimCheckResultEvidenceLinks: [],
    draftClaimCheckResults: new Map(),
    draftRevisions: new Map(),
    publishPackExports: new Map(),
    workflowEvents: new Map(),
  }

  function cloneState(): InMemoryReleaseWorkflowState {
    return {
      draftClaimCheckResultEvidenceLinks: state.draftClaimCheckResultEvidenceLinks.map((link) => ({ ...link })),
      draftClaimCheckResults: new Map(
        Array.from(state.draftClaimCheckResults.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      draftRevisions: new Map(
        Array.from(state.draftRevisions.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      publishPackExports: new Map(
        Array.from(state.publishPackExports.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      workflowEvents: new Map(
        Array.from(state.workflowEvents.entries()).map(([key, value]) => [key, { ...value }]),
      ),
    }
  }

  function restoreState(snapshot: InMemoryReleaseWorkflowState) {
    state = snapshot
  }

  function listDraftClaimCheckResultsWithEvidence(draftRevisionIds: string[]) {
    if (draftRevisionIds.length === 0) {
      return []
    }

    const draftRevisionIdSet = new Set(draftRevisionIds)
    const evidenceBlockIdsByResultId = new Map<string, string[]>()

    for (const link of state.draftClaimCheckResultEvidenceLinks) {
      const evidenceBlockIds = evidenceBlockIdsByResultId.get(link.draftClaimCheckResultId) ?? []
      evidenceBlockIds.push(link.evidenceBlockId)
      evidenceBlockIdsByResultId.set(link.draftClaimCheckResultId, evidenceBlockIds)
    }

    return Array.from(state.draftClaimCheckResults.values())
      .filter((result) => draftRevisionIdSet.has(result.draftRevisionId))
      .map((result) => ({
        ...result,
        evidenceBlockIds: evidenceBlockIdsByResultId.get(result.id) ?? [],
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  }

  const store: ReleaseWorkflowStore = {
    async createDraftClaimCheckResult(input: CreateDraftClaimCheckResultInput) {
      const draftClaimCheckResult: DraftClaimCheckResult = {
        createdAt: nowIso(),
        draftRevisionId: input.draftRevisionId,
        evidenceBlockIds: [],
        id: createId(),
        note: input.note,
        releaseRecordId: input.releaseRecordId,
        sentence: input.sentence,
        status: input.status,
        updatedAt: nowIso(),
      }

      state.draftClaimCheckResults.set(draftClaimCheckResult.id, draftClaimCheckResult)
      return draftClaimCheckResult
    },

    async createDraftRevision(input: CreateDraftRevisionInput) {
      const draftRevision: DraftRevision = {
        changelogBody: input.changelogBody,
        createdAt: nowIso(),
        createdByUserId: input.createdByUserId,
        id: createId(),
        releaseNotesBody: input.releaseNotesBody,
        releaseRecordId: input.releaseRecordId,
        version: input.version,
      }

      state.draftRevisions.set(draftRevision.id, draftRevision)
      return draftRevision
    },

    async createPublishPackExport(input: CreatePublishPackExportInput) {
      const publishPackExport: PublishPackExport = {
        changelogBody: input.changelogBody,
        createdAt: nowIso(),
        createdByUserId: input.createdByUserId,
        draftRevisionId: input.draftRevisionId,
        id: createId(),
        releaseNotesBody: input.releaseNotesBody,
        releaseRecordId: input.releaseRecordId,
      }

      state.publishPackExports.set(publishPackExport.id, publishPackExport)
      return publishPackExport
    },

    async createWorkflowEvent(input: CreateWorkflowEventInput) {
      const workflowEvent: WorkflowEvent = {
        actorUserId: input.actorUserId,
        createdAt: nowIso(),
        draftRevisionId: input.draftRevisionId,
        id: createId(),
        note: input.note,
        releaseRecordId: input.releaseRecordId,
        stage: input.stage,
        type: input.type,
      }

      state.workflowEvents.set(workflowEvent.id, workflowEvent)
      return workflowEvent
    },

    async deleteDraftClaimCheckResultsByDraftRevisionId(draftRevisionId: string) {
      const resultIds = Array.from(state.draftClaimCheckResults.values())
        .filter((draftClaimCheckResult) => draftClaimCheckResult.draftRevisionId === draftRevisionId)
        .map((draftClaimCheckResult) => draftClaimCheckResult.id)
      const resultIdSet = new Set(resultIds)

      for (const resultId of resultIds) {
        state.draftClaimCheckResults.delete(resultId)
      }

      state.draftClaimCheckResultEvidenceLinks = state.draftClaimCheckResultEvidenceLinks.filter(
        (draftClaimCheckResultEvidenceLink) =>
          !resultIdSet.has(draftClaimCheckResultEvidenceLink.draftClaimCheckResultId),
      )
    },

    async getDraftRevision(draftRevisionId: string) {
      return state.draftRevisions.get(draftRevisionId) ?? null
    },

    async getLatestDraftRevision(releaseRecordId: string) {
      const draftRevisions = Array.from(state.draftRevisions.values())
        .filter((draftRevision) => draftRevision.releaseRecordId === releaseRecordId)
        .sort((left, right) => right.version - left.version)

      return draftRevisions[0] ?? null
    },

    async getReleaseRecord(releaseRecordId: string) {
      return foundationStore.getReleaseRecord(releaseRecordId)
    },

    async getReleaseSnapshot(workspaceId: string, releaseRecordId: string) {
      const snapshot = await foundationStore.getReleaseRecordSnapshot(releaseRecordId)

      if (!snapshot || snapshot.releaseRecord.workspaceId !== workspaceId) {
        return null
      }

      return snapshot
    },

    async linkDraftClaimCheckResultEvidenceBlock(input: LinkDraftClaimCheckResultEvidenceBlockInput) {
      state.draftClaimCheckResultEvidenceLinks.push({
        draftClaimCheckResultId: input.draftClaimCheckResultId,
        evidenceBlockId: input.evidenceBlockId,
      })
    },

    async listDraftClaimCheckResultsByDraftRevisionIds(draftRevisionIds: string[]) {
      return listDraftClaimCheckResultsWithEvidence(draftRevisionIds)
    },

    async listLatestDraftRevisionsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      const releaseRecordIdSet = new Set(releaseRecordIds)
      const latestDraftsByReleaseRecordId = new Map<string, DraftRevision>()

      for (const draftRevision of state.draftRevisions.values()) {
        if (!releaseRecordIdSet.has(draftRevision.releaseRecordId)) {
          continue
        }

        const currentDraftRevision = latestDraftsByReleaseRecordId.get(draftRevision.releaseRecordId)

        if (!currentDraftRevision || draftRevision.version > currentDraftRevision.version) {
          latestDraftsByReleaseRecordId.set(draftRevision.releaseRecordId, draftRevision)
        }
      }

      return Array.from(latestDraftsByReleaseRecordId.values())
    },

    async listLatestPublishPackExportsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      const releaseRecordIdSet = new Set(releaseRecordIds)
      const latestExportsByReleaseRecordId = new Map<string, PublishPackExport>()

      for (const publishPackExport of state.publishPackExports.values()) {
        if (!releaseRecordIdSet.has(publishPackExport.releaseRecordId)) {
          continue
        }

        const currentExport = latestExportsByReleaseRecordId.get(publishPackExport.releaseRecordId)

        if (!currentExport || publishPackExport.createdAt > currentExport.createdAt) {
          latestExportsByReleaseRecordId.set(publishPackExport.releaseRecordId, publishPackExport)
        }
      }

      return Array.from(latestExportsByReleaseRecordId.values())
    },

    async listReleaseSnapshots(workspaceId: string) {
      return foundationStore.listReleaseRecordSnapshots(workspaceId)
    },

    async listWorkflowEventsByReleaseRecordIds(releaseRecordIds: string[]) {
      if (releaseRecordIds.length === 0) {
        return []
      }

      const releaseRecordIdSet = new Set(releaseRecordIds)

      return Array.from(state.workflowEvents.values())
        .filter((workflowEvent) => releaseRecordIdSet.has(workflowEvent.releaseRecordId))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    },

    async transaction<T>(callback: (store: ReleaseWorkflowStore) => Promise<T>) {
      const snapshot = cloneState()

      try {
        return await foundationStore.transaction(async () => callback(store))
      } catch (error) {
        restoreState(snapshot)
        throw error
      }
    },

    async updateReleaseRecordStage(releaseRecordId: string, stage: ReleaseRecord["stage"]) {
      return foundationStore.updateReleaseRecordStage(releaseRecordId, stage)
    },

    async upsertReviewStatus(input: UpdateReleaseReviewStatusInput) {
      await foundationStore.upsertReviewStatus(input)
    },
  }

  return store
}
