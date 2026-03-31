import type {
  DraftEvidenceRef,
  DraftFieldSnapshot,
  DraftRevision,
  PublishPackExport,
  PublishPackExportContextSnapshot,
  PublishPackExportEvidenceSnapshot,
  PublishPackExportPolicySnapshot,
  PublishPackExportSourceSnapshot,
  ReleaseRecord,
  ReviewStage,
  ReviewState,
  User,
  WorkflowEvent,
  WorkflowEventType,
  WorkspacePolicySettings,
  WorkspaceMembership,
} from "../domain/models.js"
import type { ReleaseRecordSnapshot } from "../foundation/store.js"

export type CreateDraftRevisionInput = {
  changelogBody: string
  createdByUserId: string | null
  evidenceRefs: DraftEvidenceRef[]
  fieldSnapshots: DraftFieldSnapshot[]
  releaseNotesBody: string
  releaseRecordId: string
  templateId: string
  templateLabel: string
  templateVersion: number
  version: number
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
  contextSnapshot: PublishPackExportContextSnapshot
  createdByUserId: string | null
  draftRevisionId: string
  evidenceSnapshots: PublishPackExportEvidenceSnapshot[]
  policySnapshot: PublishPackExportPolicySnapshot
  releaseNotesBody: string
  releaseRecordId: string
  sourceSnapshots: PublishPackExportSourceSnapshot[]
}

export type UpdateReleaseReviewStatusInput = {
  note: string | null
  ownerUserId: string | null
  releaseRecordId: string
  stage: ReviewStage
  state: ReviewState
}

export type ReleaseWorkflowStore = {
  createDraftRevision(input: CreateDraftRevisionInput): Promise<DraftRevision>
  createPublishPackExport(input: CreatePublishPackExportInput): Promise<PublishPackExport>
  createWorkflowEvent(input: CreateWorkflowEventInput): Promise<WorkflowEvent>
  findWorkspaceMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null>
  getDraftRevision(draftRevisionId: string): Promise<DraftRevision | null>
  getLatestDraftRevision(releaseRecordId: string): Promise<DraftRevision | null>
  getReleaseRecord(releaseRecordId: string): Promise<ReleaseRecord | null>
  getReleaseSnapshot(workspaceId: string, releaseRecordId: string): Promise<ReleaseRecordSnapshot | null>
  getWorkspacePolicySettings(workspaceId: string): Promise<WorkspacePolicySettings | null>
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
