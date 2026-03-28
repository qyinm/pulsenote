export const integrationProviders = ["github", "linear"] as const
export type IntegrationProvider = (typeof integrationProviders)[number]

export const workspaceMembershipRoles = ["owner", "member"] as const
export type WorkspaceMembershipRole = (typeof workspaceMembershipRoles)[number]

export const integrationConnectionStatuses = ["active", "disconnected"] as const
export type IntegrationConnectionStatus = (typeof integrationConnectionStatuses)[number]

export const syncRunStatuses = ["queued", "running", "succeeded", "failed"] as const
export type SyncRunStatus = (typeof syncRunStatuses)[number]

export const reviewStages = ["intake", "draft", "claim_check", "approval", "publish_pack"] as const
export type ReviewStage = (typeof reviewStages)[number]

export const claimStatuses = ["pending", "flagged", "approved", "rejected"] as const
export type ClaimStatus = (typeof claimStatuses)[number]

export const evidenceStates = ["fresh", "stale", "missing", "unsupported"] as const
export type EvidenceState = (typeof evidenceStates)[number]

export const evidenceSourceTypes = [
  "pull_request",
  "commit",
  "release",
  "ticket",
  "document",
] as const
export type EvidenceSourceType = (typeof evidenceSourceTypes)[number]

export const reviewStates = ["pending", "blocked", "approved"] as const
export type ReviewState = (typeof reviewStates)[number]

export const workflowEventTypes = [
  "draft_created",
  "claim_check_completed",
  "approval_requested",
  "draft_approved",
  "draft_reopened",
  "publish_pack_created",
] as const
export type WorkflowEventType = (typeof workflowEventTypes)[number]

export type User = {
  id: string
  email: string
  fullName: string | null
  createdAt: string
  updatedAt: string
}

export type Workspace = {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export type WorkspaceMembership = {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceMembershipRole
  createdAt: string
}

export type CurrentWorkspaceSelection = {
  userId: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export type IntegrationConnection = {
  id: string
  workspaceId: string
  provider: IntegrationProvider
  externalAccountId: string
  status: IntegrationConnectionStatus
  connectedAt: string
  lastSyncedAt: string | null
}

export type GitHubConnectionConfig = {
  connectionId: string
  installationId: string
  repositoryOwner: string
  repositoryName: string
  repositoryUrl: string
  connectedByUserId: string
  createdAt: string
  updatedAt: string
}

export type IntegrationAccount = {
  id: string
  connectionId: string
  provider: IntegrationProvider
  accountLabel: string
  accountUrl: string | null
  createdAt: string
}

export type SyncRun = {
  id: string
  workspaceId: string
  connectionId: string
  provider: IntegrationProvider
  status: SyncRunStatus
  scope: string
  startedAt: string
  finishedAt: string | null
  errorMessage: string | null
}

export type SourceCursor = {
  id: string
  connectionId: string
  key: string
  value: string
  updatedAt: string
}

export type ReleaseRecord = {
  id: string
  workspaceId: string
  connectionId: string
  title: string
  summary: string | null
  stage: ReviewStage
  compareRange: string | null
  createdAt: string
  updatedAt: string
}

export type EvidenceBlock = {
  id: string
  releaseRecordId: string
  provider: IntegrationProvider
  sourceType: EvidenceSourceType
  sourceRef: string
  title: string
  body: string | null
  evidenceState: EvidenceState
  capturedAt: string
}

export type ClaimCandidate = {
  id: string
  releaseRecordId: string
  sentence: string
  status: ClaimStatus
  evidenceBlockIds: string[]
  createdAt: string
  updatedAt: string
}

export type SourceLink = {
  id: string
  releaseRecordId: string
  provider: IntegrationProvider
  url: string
  label: string
}

export type ReviewStatus = {
  id: string
  releaseRecordId: string
  stage: ReviewStage
  ownerUserId: string | null
  state: ReviewState
  note: string | null
  updatedAt: string
}

export type DraftRevision = {
  id: string
  releaseRecordId: string
  version: number
  changelogBody: string
  createdAt: string
  createdByUserId: string | null
  releaseNotesBody: string
}

export type DraftClaimCheckResult = {
  createdAt: string
  draftRevisionId: string
  evidenceBlockIds: string[]
  id: string
  note: string | null
  releaseRecordId: string
  sentence: string
  status: ClaimStatus
  updatedAt: string
}

export type WorkflowEvent = {
  actorUserId: string | null
  createdAt: string
  draftRevisionId: string | null
  id: string
  note: string | null
  releaseRecordId: string
  stage: ReviewStage
  type: WorkflowEventType
}

export type PublishPackExport = {
  changelogBody: string
  createdAt: string
  createdByUserId: string | null
  draftRevisionId: string
  id: string
  releaseNotesBody: string
  releaseRecordId: string
}

export const foundationModelNames = [
  "user",
  "workspace",
  "workspace_membership",
  "current_workspace_selection",
  "integration_connection",
  "github_connection_config",
  "integration_account",
  "sync_run",
  "source_cursor",
  "release_record",
  "evidence_block",
  "claim_candidate",
  "source_link",
  "review_status",
  "draft_revision",
  "draft_claim_check_result",
  "workflow_event",
  "publish_pack_export",
] as const
