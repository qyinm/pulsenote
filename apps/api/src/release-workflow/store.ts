import type {
  ClaimStatus,
  DraftClaimCheckResult,
  DraftRevision,
  PublishPackExport,
  ReleaseRecord,
  ReviewStage,
  ReviewState,
  User,
  WorkflowEvent,
  WorkflowEventType,
} from "../domain/models.js"
import type { ReleaseRecordSnapshot } from "../foundation/store.js"

export type CreateDraftRevisionInput = {
  changelogBody: string
  createdByUserId: string | null
  releaseNotesBody: string
  releaseRecordId: string
  version: number
}

export type CreateDraftClaimCheckResultInput = {
  draftRevisionId: string
  note: string | null
  releaseRecordId: string
  sentence: string
  status: ClaimStatus
}

export type LinkDraftClaimCheckResultEvidenceBlockInput = {
  draftClaimCheckResultId: string
  evidenceBlockId: string
}

export type CreateWorkflowEventInput = {
  actorUserId: string | null
  draftRevisionId: string | null
  note: string | null
  releaseRecordId: string
  stage: ReviewStage
  type: WorkflowEventType
}

export type CreatePublishPackExportInput = {
  changelogBody: string
  createdByUserId: string | null
  draftRevisionId: string
  releaseNotesBody: string
  releaseRecordId: string
}

export type UpdateReleaseReviewStatusInput = {
  note: string | null
  ownerUserId: string | null
  releaseRecordId: string
  stage: ReviewStage
  state: ReviewState
}

export type ReleaseWorkflowStore = {
  createDraftClaimCheckResult(input: CreateDraftClaimCheckResultInput): Promise<DraftClaimCheckResult>
  createDraftRevision(input: CreateDraftRevisionInput): Promise<DraftRevision>
  createPublishPackExport(input: CreatePublishPackExportInput): Promise<PublishPackExport>
  createWorkflowEvent(input: CreateWorkflowEventInput): Promise<WorkflowEvent>
  deleteDraftClaimCheckResultsByDraftRevisionId(draftRevisionId: string): Promise<void>
  getDraftRevision(draftRevisionId: string): Promise<DraftRevision | null>
  getLatestDraftRevision(releaseRecordId: string): Promise<DraftRevision | null>
  getReleaseRecord(releaseRecordId: string): Promise<ReleaseRecord | null>
  getReleaseSnapshot(workspaceId: string, releaseRecordId: string): Promise<ReleaseRecordSnapshot | null>
  linkDraftClaimCheckResultEvidenceBlock(
    input: LinkDraftClaimCheckResultEvidenceBlockInput,
  ): Promise<void>
  listDraftClaimCheckResultsByDraftRevisionIds(
    draftRevisionIds: string[],
  ): Promise<DraftClaimCheckResult[]>
  listDraftRevisionsByReleaseRecordIds(releaseRecordIds: string[]): Promise<DraftRevision[]>
  listLatestDraftRevisionsByReleaseRecordIds(releaseRecordIds: string[]): Promise<DraftRevision[]>
  listPublishPackExportsByReleaseRecordIds(releaseRecordIds: string[]): Promise<PublishPackExport[]>
  listLatestPublishPackExportsByReleaseRecordIds(releaseRecordIds: string[]): Promise<PublishPackExport[]>
  listReleaseSnapshots(workspaceId: string): Promise<ReleaseRecordSnapshot[]>
  listUsersByIds(userIds: string[]): Promise<User[]>
  listWorkflowEventsByReleaseRecordIds(releaseRecordIds: string[]): Promise<WorkflowEvent[]>
  transaction<T>(callback: (store: ReleaseWorkflowStore) => Promise<T>): Promise<T>
  updateReleaseRecordStage(releaseRecordId: string, stage: ReleaseRecord["stage"]): Promise<ReleaseRecord>
  upsertReviewStatus(input: UpdateReleaseReviewStatusInput): Promise<void>
}
