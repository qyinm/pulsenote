import type {
  DraftClaimCheckResult,
  DraftEvidenceRef,
  DraftFieldSnapshot,
  DraftRevision,
  PublishPackExport,
  PublishPackExportContextSnapshot,
  PublishPackExportEvidenceSnapshot,
  PublishPackExportPolicySnapshot,
  PublishPackExportSourceSnapshot,
  ReleaseRecord,
  ReviewStatus,
  ReviewStage,
  WorkflowEventType,
} from "../domain/models.js"
import type { ReleaseRecordSnapshot } from "../foundation/store.js"

export const workflowAllowedActions = [
  "create_draft",
  "run_claim_check",
  "request_approval",
  "approve_draft",
  "reopen_draft",
  "create_publish_pack",
] as const

export type WorkflowAllowedAction = (typeof workflowAllowedActions)[number]

export const workflowReadinesses = ["blocked", "attention", "ready"] as const
export type WorkflowReadiness = (typeof workflowReadinesses)[number]

export const claimCheckStates = ["not_started", "blocked", "cleared"] as const
export type ClaimCheckState = (typeof claimCheckStates)[number]

export const approvalStates = ["not_requested", "pending", "approved", "reopened"] as const
export type ApprovalState = (typeof approvalStates)[number]

export const publishPackStates = ["not_ready", "ready", "exported"] as const
export type PublishPackState = (typeof publishPackStates)[number]

export type ReleaseWorkflowBaseRecord = {
  currentDraft: DraftRevision | null
  latestPublishPackExport: PublishPackExport | null
  releaseSnapshot: ReleaseRecordSnapshot
  reviewStatusesByStage: Partial<Record<ReviewStatus["stage"], ReviewStatus>>
}

export type ClaimCheckSummary = {
  blockerNotes: string[]
  draftRevisionId: string | null
  flaggedClaims: number
  items: DraftClaimCheckResult[]
  state: ClaimCheckState
  totalClaims: number
}

export type ApprovalSummary = {
  draftRevisionId: string | null
  note: string | null
  ownerName: string | null
  ownerUserId: string | null
  requestedByName: string | null
  requestedByUserId: string | null
  state: ApprovalState
  updatedAt: string | null
}

export type PublishPackSummary = {
  draftRevisionId: string | null
  exportedByName: string | null
  exportedByUserId: string | null
  includedEvidenceCount: number
  includedSourceLinkCount: number
  includesEvidenceLinks: boolean
  includesSourceLinks: boolean
  exportId: string | null
  exportedAt: string | null
  state: PublishPackState
}

export type PublishPackArtifact = {
  changelogBody: string
  context: PublishPackExportContextSnapshot
  evidenceSnapshots: PublishPackExportEvidenceSnapshot[]
  exportId: string
  exportedAt: string
  policy: PublishPackExportPolicySnapshot
  releaseNotesBody: string
  sourceSnapshots: PublishPackExportSourceSnapshot[]
}

export type WorkflowCurrentDraft = Pick<
  DraftRevision,
  | "changelogBody"
  | "createdAt"
  | "createdByUserId"
  | "evidenceRefs"
  | "fieldSnapshots"
  | "id"
  | "releaseNotesBody"
  | "templateId"
  | "templateLabel"
  | "templateVersion"
  | "version"
>

export type ReleaseWorkflowListItem = {
  allowedActions: WorkflowAllowedAction[]
  approvalSummary: ApprovalSummary
  claimCheckSummary: Omit<ClaimCheckSummary, "items">
  currentDraft: Pick<WorkflowCurrentDraft, "createdAt" | "id" | "version"> | null
  evidenceCount: number
  latestPublishPackSummary: PublishPackSummary
  readiness: WorkflowReadiness
  releaseRecord: Pick<
    ReleaseRecord,
    "compareRange" | "createdAt" | "id" | "stage" | "summary" | "title" | "updatedAt" | "workspaceId"
  >
  sourceLinkCount: number
}

export type ReleaseWorkflowDetail = {
  allowedActions: WorkflowAllowedAction[]
  approvalSummary: ApprovalSummary
  claimCheckSummary: ClaimCheckSummary
  currentDraft: WorkflowCurrentDraft | null
  evidenceBlocks: ReleaseRecordSnapshot["evidenceBlocks"]
  latestPublishPackArtifact: PublishPackArtifact | null
  latestPublishPackSummary: PublishPackSummary
  readiness: WorkflowReadiness
  releaseRecord: ReleaseRecord
  reviewStatuses: ReleaseRecordSnapshot["reviewStatuses"]
  sourceLinks: ReleaseRecordSnapshot["sourceLinks"]
}

export const releaseWorkflowHistoryOutcomes = [
  "blocked",
  "progressed",
  "revision",
  "signed_off",
] as const

export type ReleaseWorkflowHistoryOutcome = (typeof releaseWorkflowHistoryOutcomes)[number]

export type ReleaseWorkflowHistoryEntry = {
  actorName: string | null
  actorUserId: string | null
  createdAt: string
  draftRevisionId: string | null
  draftVersion: number | null
  eventLabel: string
  eventType: WorkflowEventType
  evidenceCount: number
  id: string
  note: string | null
  outcome: ReleaseWorkflowHistoryOutcome
  publishPackExportId: string | null
  releaseRecordId: string
  releaseTitle: string
  sourceLinkCount: number
  stage: ReviewStage
}

export type CreateDraftInput = {
  actorUserId: string | null
  changelogBody?: string
  expectedLatestDraftRevisionId: string | null
  releaseNotesBody?: string
  releaseRecordId: string
  templateId?: string
  workspaceId: string
}

export type UpdateDraftInput = {
  actorUserId: string | null
  evidenceRefs?: DraftEvidenceRef[]
  expectedDraftRevisionId: string
  fieldSnapshots: DraftFieldSnapshot[]
  releaseRecordId: string
  workspaceId: string
}

export type DraftScopedCommandInput = {
  actorUserId: string | null
  expectedDraftRevisionId: string
  note?: string
  releaseRecordId: string
  workspaceId: string
}

export type RequestApprovalInput = DraftScopedCommandInput & {
  reviewerUserId?: string
}
