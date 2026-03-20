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

type CreateUserInput = Pick<User, "email" | "fullName">
type CreateWorkspaceInput = Pick<Workspace, "name" | "slug">
type CreateWorkspaceMembershipInput = Pick<WorkspaceMembership, "role" | "userId" | "workspaceId">
type BootstrapWorkspaceInput = {
  user: CreateUserInput
  workspace: CreateWorkspaceInput
}
type BootstrapWorkspaceResult = {
  membership: WorkspaceMembership
  user: User
  workspace: Workspace
}
type CreateIntegrationConnectionInput = Pick<
  IntegrationConnection,
  "externalAccountId" | "provider" | "workspaceId"
>
type CreateIntegrationAccountInput = Pick<
  IntegrationAccount,
  "accountLabel" | "accountUrl" | "connectionId" | "provider"
>
type CreateSyncRunInput = Pick<SyncRun, "connectionId" | "scope" | "workspaceId">
type CreateSourceCursorInput = Pick<SourceCursor, "connectionId" | "key" | "value">
type CreateReleaseRecordInput = Pick<
  ReleaseRecord,
  "compareRange" | "connectionId" | "stage" | "summary" | "title" | "workspaceId"
>
type CreateEvidenceBlockInput = Pick<
  EvidenceBlock,
  "body" | "evidenceState" | "provider" | "releaseRecordId" | "sourceRef" | "sourceType" | "title"
> &
  Partial<Pick<EvidenceBlock, "capturedAt">>
type CreateClaimCandidateInput = Pick<ClaimCandidate, "releaseRecordId" | "sentence" | "status">
type LinkClaimCandidateEvidenceBlockInput = {
  claimCandidateId: string
  evidenceBlockId: string
}
type CreateSourceLinkInput = Pick<SourceLink, "label" | "provider" | "releaseRecordId" | "url">
type CreateReviewStatusInput = Pick<
  ReviewStatus,
  "note" | "ownerUserId" | "releaseRecordId" | "stage" | "state"
>
type UpdateSyncRunInput = Pick<SyncRun, "id" | "status"> &
  Partial<Pick<SyncRun, "errorMessage" | "finishedAt">>

export type WorkspaceSnapshot = {
  integrationAccounts: IntegrationAccount[]
  integrations: IntegrationConnection[]
  memberships: WorkspaceMembership[]
  sourceCursors: SourceCursor[]
  syncRuns: SyncRun[]
  workspace: Workspace
}

export type ReleaseRecordSnapshot = {
  claimCandidates: ClaimCandidate[]
  evidenceBlocks: EvidenceBlock[]
  releaseRecord: ReleaseRecord
  reviewStatuses: ReviewStatus[]
  sourceLinks: SourceLink[]
}

export type FoundationStore = {
  bootstrapWorkspace(input: BootstrapWorkspaceInput): Promise<BootstrapWorkspaceResult>
  createClaimCandidate(input: CreateClaimCandidateInput): Promise<ClaimCandidate>
  createEvidenceBlock(input: CreateEvidenceBlockInput): Promise<EvidenceBlock>
  createIntegrationAccount(input: CreateIntegrationAccountInput): Promise<IntegrationAccount>
  createIntegrationConnection(input: CreateIntegrationConnectionInput): Promise<IntegrationConnection>
  createReleaseRecord(input: CreateReleaseRecordInput): Promise<ReleaseRecord>
  createReviewStatus(input: CreateReviewStatusInput): Promise<ReviewStatus>
  createSourceCursor(input: CreateSourceCursorInput): Promise<SourceCursor>
  createSourceLink(input: CreateSourceLinkInput): Promise<SourceLink>
  createSyncRun(input: CreateSyncRunInput): Promise<SyncRun>
  createUser(input: CreateUserInput): Promise<User>
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>
  createWorkspaceMembership(input: CreateWorkspaceMembershipInput): Promise<WorkspaceMembership>
  findWorkspaceMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null>
  getIntegrationConnection(connectionId: string): Promise<IntegrationConnection | null>
  getReleaseRecordSnapshot(releaseRecordId: string): Promise<ReleaseRecordSnapshot | null>
  getSyncRun(syncRunId: string): Promise<SyncRun | null>
  getWorkspace(workspaceId: string): Promise<Workspace | null>
  getWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot | null>
  linkClaimCandidateEvidenceBlock(input: LinkClaimCandidateEvidenceBlockInput): Promise<void>
  listReleaseRecordSnapshots(workspaceId: string): Promise<ReleaseRecordSnapshot[]>
  updateSyncRun(input: UpdateSyncRunInput): Promise<SyncRun>
}

type ClaimCandidateEvidenceLink = {
  claimCandidateId: string
  evidenceBlockId: string
}

type InMemoryState = {
  claimCandidateEvidenceLinks: ClaimCandidateEvidenceLink[]
  claimCandidates: Map<string, ClaimCandidate>
  evidenceBlocks: Map<string, EvidenceBlock>
  integrationAccounts: Map<string, IntegrationAccount>
  integrationConnections: Map<string, IntegrationConnection>
  releaseRecords: Map<string, ReleaseRecord>
  reviewStatuses: Map<string, ReviewStatus>
  sourceCursors: Map<string, SourceCursor>
  sourceLinks: Map<string, SourceLink>
  syncRuns: Map<string, SyncRun>
  users: Map<string, User>
  workspaceMemberships: Map<string, WorkspaceMembership>
  workspaces: Map<string, Workspace>
}

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  return crypto.randomUUID()
}

export function createInMemoryFoundationStore(): FoundationStore {
  const state: InMemoryState = {
    claimCandidateEvidenceLinks: [],
    claimCandidates: new Map(),
    evidenceBlocks: new Map(),
    integrationAccounts: new Map(),
    integrationConnections: new Map(),
    releaseRecords: new Map(),
    reviewStatuses: new Map(),
    sourceCursors: new Map(),
    sourceLinks: new Map(),
    syncRuns: new Map(),
    users: new Map(),
    workspaceMemberships: new Map(),
    workspaces: new Map(),
  }

  function buildReleaseRecordSnapshot(releaseRecordId: string): ReleaseRecordSnapshot | null {
    const releaseRecord = state.releaseRecords.get(releaseRecordId)

    if (!releaseRecord) {
      return null
    }

    const evidenceBlocks = Array.from(state.evidenceBlocks.values()).filter(
      (evidenceBlock) => evidenceBlock.releaseRecordId === releaseRecordId,
    )
    const evidenceBlockIdsByClaimCandidateId = new Map<string, string[]>()

    for (const link of state.claimCandidateEvidenceLinks) {
      const evidenceBlockIds = evidenceBlockIdsByClaimCandidateId.get(link.claimCandidateId) ?? []
      evidenceBlockIds.push(link.evidenceBlockId)
      evidenceBlockIdsByClaimCandidateId.set(link.claimCandidateId, evidenceBlockIds)
    }

    const claimCandidates = Array.from(state.claimCandidates.values())
      .filter((claimCandidate) => claimCandidate.releaseRecordId === releaseRecordId)
      .map((claimCandidate) => ({
        ...claimCandidate,
        evidenceBlockIds: evidenceBlockIdsByClaimCandidateId.get(claimCandidate.id) ?? [],
      }))
    const sourceLinks = Array.from(state.sourceLinks.values()).filter(
      (sourceLink) => sourceLink.releaseRecordId === releaseRecordId,
    )
    const reviewStatuses = Array.from(state.reviewStatuses.values()).filter(
      (reviewStatus) => reviewStatus.releaseRecordId === releaseRecordId,
    )

    return {
      claimCandidates,
      evidenceBlocks,
      releaseRecord,
      reviewStatuses,
      sourceLinks,
    }
  }

  return {
    async bootstrapWorkspace(input) {
      const user = await this.createUser({
        email: input.user.email,
        fullName: input.user.fullName,
      })
      const workspace = await this.createWorkspace({
        name: input.workspace.name,
        slug: input.workspace.slug,
      })
      const membership = await this.createWorkspaceMembership({
        role: "owner",
        userId: user.id,
        workspaceId: workspace.id,
      })

      return {
        membership,
        user,
        workspace,
      }
    },

    async createClaimCandidate(input) {
      const claimCandidate: ClaimCandidate = {
        createdAt: nowIso(),
        evidenceBlockIds: [],
        id: createId(),
        releaseRecordId: input.releaseRecordId,
        sentence: input.sentence,
        status: input.status,
        updatedAt: nowIso(),
      }

      state.claimCandidates.set(claimCandidate.id, claimCandidate)
      return claimCandidate
    },

    async createEvidenceBlock(input) {
      const evidenceBlock: EvidenceBlock = {
        body: input.body,
        capturedAt: input.capturedAt ?? nowIso(),
        evidenceState: input.evidenceState,
        id: createId(),
        provider: input.provider,
        releaseRecordId: input.releaseRecordId,
        sourceRef: input.sourceRef,
        sourceType: input.sourceType,
        title: input.title,
      }

      state.evidenceBlocks.set(evidenceBlock.id, evidenceBlock)
      return evidenceBlock
    },

    async createIntegrationAccount(input) {
      const integrationAccount: IntegrationAccount = {
        accountLabel: input.accountLabel,
        accountUrl: input.accountUrl,
        connectionId: input.connectionId,
        createdAt: nowIso(),
        id: createId(),
        provider: input.provider,
      }

      state.integrationAccounts.set(integrationAccount.id, integrationAccount)
      return integrationAccount
    },

    async createIntegrationConnection(input) {
      const integrationConnection: IntegrationConnection = {
        connectedAt: nowIso(),
        externalAccountId: input.externalAccountId,
        id: createId(),
        lastSyncedAt: null,
        provider: input.provider,
        status: "active",
        workspaceId: input.workspaceId,
      }

      state.integrationConnections.set(integrationConnection.id, integrationConnection)
      return integrationConnection
    },

    async createReleaseRecord(input) {
      const releaseRecord: ReleaseRecord = {
        compareRange: input.compareRange,
        connectionId: input.connectionId,
        createdAt: nowIso(),
        id: createId(),
        stage: input.stage,
        summary: input.summary,
        title: input.title,
        updatedAt: nowIso(),
        workspaceId: input.workspaceId,
      }

      state.releaseRecords.set(releaseRecord.id, releaseRecord)
      return releaseRecord
    },

    async createReviewStatus(input) {
      const reviewStatus: ReviewStatus = {
        id: createId(),
        note: input.note,
        ownerUserId: input.ownerUserId,
        releaseRecordId: input.releaseRecordId,
        stage: input.stage,
        state: input.state,
        updatedAt: nowIso(),
      }

      state.reviewStatuses.set(reviewStatus.id, reviewStatus)
      return reviewStatus
    },

    async createSourceCursor(input) {
      const sourceCursor: SourceCursor = {
        connectionId: input.connectionId,
        id: createId(),
        key: input.key,
        updatedAt: nowIso(),
        value: input.value,
      }

      state.sourceCursors.set(sourceCursor.id, sourceCursor)
      return sourceCursor
    },

    async createSourceLink(input) {
      const sourceLink: SourceLink = {
        id: createId(),
        label: input.label,
        provider: input.provider,
        releaseRecordId: input.releaseRecordId,
        url: input.url,
      }

      state.sourceLinks.set(sourceLink.id, sourceLink)
      return sourceLink
    },

    async createSyncRun(input) {
      const connection = state.integrationConnections.get(input.connectionId)

      if (!connection) {
        throw new Error(`Integration connection ${input.connectionId} was not found`)
      }

      const syncRun: SyncRun = {
        connectionId: input.connectionId,
        errorMessage: null,
        finishedAt: null,
        id: createId(),
        provider: connection.provider,
        scope: input.scope,
        startedAt: nowIso(),
        status: "queued",
        workspaceId: input.workspaceId,
      }

      state.syncRuns.set(syncRun.id, syncRun)
      return syncRun
    },

    async createUser(input) {
      const user: User = {
        createdAt: nowIso(),
        email: input.email,
        fullName: input.fullName,
        id: createId(),
        updatedAt: nowIso(),
      }

      state.users.set(user.id, user)
      return user
    },

    async createWorkspace(input) {
      const workspace: Workspace = {
        createdAt: nowIso(),
        id: createId(),
        name: input.name,
        slug: input.slug,
        updatedAt: nowIso(),
      }

      state.workspaces.set(workspace.id, workspace)
      return workspace
    },

    async createWorkspaceMembership(input) {
      const workspaceMembership: WorkspaceMembership = {
        createdAt: nowIso(),
        id: createId(),
        role: input.role,
        userId: input.userId,
        workspaceId: input.workspaceId,
      }

      state.workspaceMemberships.set(workspaceMembership.id, workspaceMembership)
      return workspaceMembership
    },

    async findWorkspaceMembership(workspaceId, userId) {
      return (
        Array.from(state.workspaceMemberships.values()).find(
          (membership) => membership.workspaceId === workspaceId && membership.userId === userId,
        ) ?? null
      )
    },

    async getIntegrationConnection(connectionId) {
      return state.integrationConnections.get(connectionId) ?? null
    },

    async getReleaseRecordSnapshot(releaseRecordId) {
      return buildReleaseRecordSnapshot(releaseRecordId)
    },

    async getSyncRun(syncRunId) {
      return state.syncRuns.get(syncRunId) ?? null
    },

    async getWorkspace(workspaceId) {
      return state.workspaces.get(workspaceId) ?? null
    },

    async getWorkspaceSnapshot(workspaceId) {
      const workspace = state.workspaces.get(workspaceId)

      if (!workspace) {
        return null
      }

      const integrations = Array.from(state.integrationConnections.values()).filter(
        (integration) => integration.workspaceId === workspaceId,
      )
      const integrationIds = new Set(integrations.map((integration) => integration.id))
      const integrationAccounts = Array.from(state.integrationAccounts.values()).filter((account) =>
        integrationIds.has(account.connectionId),
      )
      const sourceCursors = Array.from(state.sourceCursors.values()).filter((cursor) =>
        integrationIds.has(cursor.connectionId),
      )
      const memberships = Array.from(state.workspaceMemberships.values()).filter(
        (membership) => membership.workspaceId === workspaceId,
      )
      const syncRuns = Array.from(state.syncRuns.values())
        .filter((syncRun) => syncRun.workspaceId === workspaceId)
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))

      return {
        integrationAccounts,
        integrations,
        memberships,
        sourceCursors,
        syncRuns,
        workspace,
      }
    },

    async linkClaimCandidateEvidenceBlock(input) {
      state.claimCandidateEvidenceLinks.push({
        claimCandidateId: input.claimCandidateId,
        evidenceBlockId: input.evidenceBlockId,
      })
    },

    async listReleaseRecordSnapshots(workspaceId) {
      const releaseRecords = Array.from(state.releaseRecords.values())
        .filter((releaseRecord) => releaseRecord.workspaceId === workspaceId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

      const snapshots = releaseRecords.map((releaseRecord) => buildReleaseRecordSnapshot(releaseRecord.id))

      return snapshots.filter((snapshot): snapshot is ReleaseRecordSnapshot => snapshot !== null)
    },

    async updateSyncRun(input) {
      const existingSyncRun = state.syncRuns.get(input.id)

      if (!existingSyncRun) {
        throw new Error(`Sync run ${input.id} was not found`)
      }

      const syncRun: SyncRun = {
        ...existingSyncRun,
        errorMessage: input.errorMessage ?? existingSyncRun.errorMessage,
        finishedAt: input.finishedAt ?? existingSyncRun.finishedAt,
        status: input.status,
      }

      state.syncRuns.set(syncRun.id, syncRun)
      return syncRun
    },
  }
}
