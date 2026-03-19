export const integrationProviders = ["github", "linear"] as const
export type IntegrationProvider = (typeof integrationProviders)[number]

export const syncRunStatuses = ["queued", "running", "succeeded", "failed"] as const
export type SyncRunStatus = (typeof syncRunStatuses)[number]

export const reviewStages = ["intake", "draft", "claim_check", "approval", "publish_pack"] as const
export type ReviewStage = (typeof reviewStages)[number]

export const claimStatuses = ["pending", "flagged", "approved", "rejected"] as const
export type ClaimStatus = (typeof claimStatuses)[number]

export const evidenceStates = ["fresh", "stale", "missing", "unsupported"] as const
export type EvidenceState = (typeof evidenceStates)[number]

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
  role: "owner" | "member"
  createdAt: string
}

export type IntegrationConnection = {
  id: string
  workspaceId: string
  provider: IntegrationProvider
  externalAccountId: string
  status: "active" | "disconnected"
  connectedAt: string
  lastSyncedAt: string | null
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
  sourceType: "pull_request" | "commit" | "release" | "ticket" | "document"
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
  state: "pending" | "blocked" | "approved"
  note: string | null
  updatedAt: string
}

export const foundationModelNames = [
  "user",
  "workspace",
  "workspace_membership",
  "integration_connection",
  "sync_run",
  "source_cursor",
  "release_record",
  "evidence_block",
  "claim_candidate",
  "source_link",
  "review_status",
] as const
