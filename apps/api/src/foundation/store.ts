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

type CreateUserInput = Pick<User, "email" | "fullName">
type SyncAuthenticatedUserInput = Pick<User, "email" | "fullName" | "id">
type SetCurrentWorkspaceSelectionInput = Pick<CurrentWorkspaceSelection, "userId" | "workspaceId">
type CreateWorkspaceInput = Pick<Workspace, "name" | "slug">
type CreateWorkspacePolicySettingsInput = Omit<WorkspacePolicySettings, "createdAt" | "updatedAt">
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
type BootstrapAuthenticatedWorkspaceInput = {
  user: SyncAuthenticatedUserInput
  workspace: CreateWorkspaceInput
}
type CreateIntegrationConnectionInput = Pick<
  IntegrationConnection,
  "externalAccountId" | "provider" | "workspaceId"
>
type CreateIntegrationAccountInput = Pick<
  IntegrationAccount,
  "accountLabel" | "accountUrl" | "connectionId" | "provider"
>
type UpsertGitHubConnectionConfigInput = Omit<GitHubConnectionConfig, "createdAt" | "updatedAt">
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
type UpdateIntegrationConnectionInput = Pick<IntegrationConnection, "id"> &
  Partial<Pick<IntegrationConnection, "externalAccountId" | "lastSyncedAt" | "status">>
type UpdateWorkspacePolicySettingsInput = Pick<WorkspacePolicySettings, "workspaceId"> &
  Partial<
    Pick<
      WorkspacePolicySettings,
      | "includeEvidenceLinksInExport"
      | "includeSourceLinksInExport"
      | "requireClaimCheckBeforeApproval"
      | "requireReviewerAssignment"
      | "showBlockedClaimsInInbox"
      | "showPendingApprovalsInInbox"
      | "showReopenedDraftsInInbox"
    >
  >

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

export type WorkspaceChoice = {
  membership: WorkspaceMembership
  workspace: Workspace
}

export type GitHubWorkspaceConnection = {
  config: GitHubConnectionConfig
  connection: IntegrationConnection
}

export type FoundationStore = {
  bootstrapAuthenticatedWorkspace(input: BootstrapAuthenticatedWorkspaceInput): Promise<BootstrapWorkspaceResult>
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
  createWorkspacePolicySettings(input: CreateWorkspacePolicySettingsInput): Promise<WorkspacePolicySettings>
  createWorkspaceMembership(input: CreateWorkspaceMembershipInput): Promise<WorkspaceMembership>
  deleteGitHubConnectionConfig(connectionId: string): Promise<void>
  findWorkspaceMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null>
  findWorkspaceIntegrationConnection(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationConnection | null>
  getGitHubConnectionConfig(connectionId: string): Promise<GitHubConnectionConfig | null>
  getGitHubWorkspaceConnection(workspaceId: string): Promise<GitHubWorkspaceConnection | null>
  getIntegrationConnection(connectionId: string): Promise<IntegrationConnection | null>
  getCurrentWorkspaceSelection(userId: string): Promise<CurrentWorkspaceSelection | null>
  getReleaseRecord(releaseRecordId: string): Promise<ReleaseRecord | null>
  getReleaseRecordSnapshot(releaseRecordId: string): Promise<ReleaseRecordSnapshot | null>
  getSyncRun(syncRunId: string): Promise<SyncRun | null>
  getUser(userId: string): Promise<User | null>
  getWorkspace(workspaceId: string): Promise<Workspace | null>
  getWorkspacePolicySettings(workspaceId: string): Promise<WorkspacePolicySettings | null>
  getWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot | null>
  linkClaimCandidateEvidenceBlock(input: LinkClaimCandidateEvidenceBlockInput): Promise<void>
  listWorkspaceMembershipsForUser(userId: string): Promise<WorkspaceMembership[]>
  listReleaseRecordSnapshots(workspaceId: string): Promise<ReleaseRecordSnapshot[]>
  setCurrentWorkspaceSelection(input: SetCurrentWorkspaceSelectionInput): Promise<CurrentWorkspaceSelection>
  syncAuthenticatedUser(input: SyncAuthenticatedUserInput): Promise<User>
  transaction<T>(callback: (store: FoundationStore) => Promise<T>): Promise<T>
  updateIntegrationConnection(input: UpdateIntegrationConnectionInput): Promise<IntegrationConnection>
  updateReleaseRecordStage(releaseRecordId: string, stage: ReleaseRecord["stage"]): Promise<ReleaseRecord>
  updateSyncRun(input: UpdateSyncRunInput): Promise<SyncRun>
  updateWorkspacePolicySettings(
    input: UpdateWorkspacePolicySettingsInput,
  ): Promise<WorkspacePolicySettings>
  upsertGitHubConnectionConfig(input: UpsertGitHubConnectionConfigInput): Promise<GitHubConnectionConfig>
  upsertReviewStatus(input: CreateReviewStatusInput): Promise<ReviewStatus>
}

type ClaimCandidateEvidenceLink = {
  claimCandidateId: string
  evidenceBlockId: string
}

type InMemoryState = {
  currentWorkspaceSelections: Map<string, CurrentWorkspaceSelection>
  claimCandidateEvidenceLinks: ClaimCandidateEvidenceLink[]
  claimCandidates: Map<string, ClaimCandidate>
  evidenceBlocks: Map<string, EvidenceBlock>
  githubConnectionConfigs: Map<string, GitHubConnectionConfig>
  integrationAccounts: Map<string, IntegrationAccount>
  integrationConnections: Map<string, IntegrationConnection>
  releaseRecords: Map<string, ReleaseRecord>
  reviewStatuses: Map<string, ReviewStatus>
  sourceCursors: Map<string, SourceCursor>
  sourceLinks: Map<string, SourceLink>
  syncRuns: Map<string, SyncRun>
  users: Map<string, User>
  workspaceMemberships: Map<string, WorkspaceMembership>
  workspacePolicySettings: Map<string, WorkspacePolicySettings>
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
    currentWorkspaceSelections: new Map(),
    claimCandidateEvidenceLinks: [],
    claimCandidates: new Map(),
    evidenceBlocks: new Map(),
    githubConnectionConfigs: new Map(),
    integrationAccounts: new Map(),
    integrationConnections: new Map(),
    releaseRecords: new Map(),
    reviewStatuses: new Map(),
    sourceCursors: new Map(),
    sourceLinks: new Map(),
    syncRuns: new Map(),
    users: new Map(),
    workspaceMemberships: new Map(),
    workspacePolicySettings: new Map(),
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

  function cloneState(): InMemoryState {
    return {
      claimCandidateEvidenceLinks: state.claimCandidateEvidenceLinks.map((link) => ({ ...link })),
      claimCandidates: new Map(
        Array.from(state.claimCandidates.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      currentWorkspaceSelections: new Map(
        Array.from(state.currentWorkspaceSelections.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      evidenceBlocks: new Map(
        Array.from(state.evidenceBlocks.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      githubConnectionConfigs: new Map(
        Array.from(state.githubConnectionConfigs.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      integrationAccounts: new Map(
        Array.from(state.integrationAccounts.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      integrationConnections: new Map(
        Array.from(state.integrationConnections.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      releaseRecords: new Map(
        Array.from(state.releaseRecords.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      reviewStatuses: new Map(
        Array.from(state.reviewStatuses.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      sourceCursors: new Map(
        Array.from(state.sourceCursors.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      sourceLinks: new Map(
        Array.from(state.sourceLinks.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      syncRuns: new Map(
        Array.from(state.syncRuns.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      users: new Map(Array.from(state.users.entries()).map(([key, value]) => [key, { ...value }])),
      workspaceMemberships: new Map(
        Array.from(state.workspaceMemberships.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      workspacePolicySettings: new Map(
        Array.from(state.workspacePolicySettings.entries()).map(([key, value]) => [key, { ...value }]),
      ),
      workspaces: new Map(
        Array.from(state.workspaces.entries()).map(([key, value]) => [key, { ...value }]),
      ),
    }
  }

  function restoreState(snapshot: InMemoryState) {
    state.claimCandidateEvidenceLinks = snapshot.claimCandidateEvidenceLinks
    state.claimCandidates = snapshot.claimCandidates
    state.currentWorkspaceSelections = snapshot.currentWorkspaceSelections
    state.evidenceBlocks = snapshot.evidenceBlocks
    state.githubConnectionConfigs = snapshot.githubConnectionConfigs
    state.integrationAccounts = snapshot.integrationAccounts
    state.integrationConnections = snapshot.integrationConnections
    state.releaseRecords = snapshot.releaseRecords
    state.reviewStatuses = snapshot.reviewStatuses
    state.sourceCursors = snapshot.sourceCursors
    state.sourceLinks = snapshot.sourceLinks
    state.syncRuns = snapshot.syncRuns
    state.users = snapshot.users
    state.workspaceMemberships = snapshot.workspaceMemberships
    state.workspacePolicySettings = snapshot.workspacePolicySettings
    state.workspaces = snapshot.workspaces
  }

  return {
    async bootstrapAuthenticatedWorkspace(input) {
      const previousUser = state.users.get(input.user.id) ?? null
      let createdWorkspace: Workspace | null = null
      let createdMembership: WorkspaceMembership | null = null
      let createdPolicyWorkspaceId: string | null = null

      try {
        if (Array.from(state.workspaces.values()).some((workspace) => workspace.slug === input.workspace.slug)) {
          throw new Error("Workspace slug is already in use")
        }

        const user = await this.syncAuthenticatedUser({
          email: input.user.email,
          fullName: input.user.fullName,
          id: input.user.id,
        })
        const workspace = await this.createWorkspace({
          name: input.workspace.name,
          slug: input.workspace.slug,
        })
        createdWorkspace = workspace
        const membership = await this.createWorkspaceMembership({
          role: "owner",
          userId: user.id,
          workspaceId: workspace.id,
        })
        createdMembership = membership
        await this.createWorkspacePolicySettings({
          ...createDefaultWorkspacePolicySettings(workspace.id),
        })
        createdPolicyWorkspaceId = workspace.id

        return {
          membership,
          user,
          workspace,
        }
      } catch (error) {
        if (createdMembership) {
          state.workspaceMemberships.delete(createdMembership.id)
        }

        if (createdWorkspace) {
          state.workspaces.delete(createdWorkspace.id)
        }

        if (createdPolicyWorkspaceId) {
          state.workspacePolicySettings.delete(createdPolicyWorkspaceId)
        }

        if (previousUser) {
          state.users.set(previousUser.id, previousUser)
        } else {
          state.users.delete(input.user.id)
        }

        throw error
      }
    },

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
      await this.createWorkspacePolicySettings({
        ...createDefaultWorkspacePolicySettings(workspace.id),
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
      const existingConnection = Array.from(state.integrationConnections.values()).find(
        (connection) =>
          connection.workspaceId === input.workspaceId && connection.provider === input.provider,
      )

      if (existingConnection) {
        throw new Error(
          `Integration connection for provider ${input.provider} already exists in workspace ${input.workspaceId}`,
        )
      }

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

    async upsertGitHubConnectionConfig(input) {
      const existingConfig = state.githubConnectionConfigs.get(input.connectionId)
      const githubConnectionConfig: GitHubConnectionConfig = {
        connectedByUserId: input.connectedByUserId,
        connectionId: input.connectionId,
        createdAt: existingConfig?.createdAt ?? nowIso(),
        installationId: input.installationId,
        repositoryName: input.repositoryName,
        repositoryOwner: input.repositoryOwner,
        repositoryUrl: input.repositoryUrl,
        updatedAt: nowIso(),
      }

      state.githubConnectionConfigs.set(githubConnectionConfig.connectionId, githubConnectionConfig)
      return githubConnectionConfig
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

    async createWorkspacePolicySettings(input) {
      const defaults = createDefaultWorkspacePolicySettings(input.workspaceId)
      const workspacePolicySettings: WorkspacePolicySettings = {
        ...defaults,
        ...input,
      }

      state.workspacePolicySettings.set(workspacePolicySettings.workspaceId, workspacePolicySettings)
      return workspacePolicySettings
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

    async syncAuthenticatedUser(input) {
      const existingUser = state.users.get(input.id)
      const user: User = {
        createdAt: existingUser?.createdAt ?? nowIso(),
        email: input.email,
        fullName: input.fullName,
        id: input.id,
        updatedAt: nowIso(),
      }

      state.users.set(user.id, user)
      return user
    },

    async transaction(callback) {
      const snapshot = cloneState()

      try {
        return await callback(this)
      } catch (error) {
        restoreState(snapshot)
        throw error
      }
    },

    async updateReleaseRecordStage(releaseRecordId, stage) {
      const existingReleaseRecord = state.releaseRecords.get(releaseRecordId)

      if (!existingReleaseRecord) {
        throw new Error(`Release record ${releaseRecordId} was not found`)
      }

      const releaseRecord: ReleaseRecord = {
        ...existingReleaseRecord,
        stage,
        updatedAt: nowIso(),
      }

      state.releaseRecords.set(releaseRecord.id, releaseRecord)
      return releaseRecord
    },

    async findWorkspaceMembership(workspaceId, userId) {
      return (
        Array.from(state.workspaceMemberships.values()).find(
          (membership) => membership.workspaceId === workspaceId && membership.userId === userId,
        ) ?? null
      )
    },

    async findWorkspaceIntegrationConnection(workspaceId, provider) {
      if (provider === "github") {
        const configuredConnection =
          Array.from(state.githubConnectionConfigs.values())
            .map((config) => ({
              config,
              connection: state.integrationConnections.get(config.connectionId) ?? null,
            }))
            .filter(
              (entry): entry is { config: GitHubConnectionConfig; connection: IntegrationConnection } =>
                entry.connection !== null &&
                entry.connection.workspaceId === workspaceId &&
                entry.connection.provider === "github",
            )
            .sort((left, right) => right.connection.connectedAt.localeCompare(left.connection.connectedAt))[0]
            ?.connection ?? null

        if (configuredConnection) {
          return configuredConnection
        }
      }

      return (
        Array.from(state.integrationConnections.values()).find(
          (connection) => connection.workspaceId === workspaceId && connection.provider === provider,
        ) ?? null
      )
    },

    async getGitHubConnectionConfig(connectionId) {
      return state.githubConnectionConfigs.get(connectionId) ?? null
    },

    async getGitHubWorkspaceConnection(workspaceId) {
      const configuredConnection =
        Array.from(state.githubConnectionConfigs.values())
          .map((config) => ({
            config,
            connection: state.integrationConnections.get(config.connectionId) ?? null,
          }))
          .filter(
            (entry): entry is { config: GitHubConnectionConfig; connection: IntegrationConnection } =>
              entry.connection !== null &&
              entry.connection.workspaceId === workspaceId &&
              entry.connection.provider === "github",
          )
          .sort((left, right) => right.connection.connectedAt.localeCompare(left.connection.connectedAt))[0] ??
        null

      if (!configuredConnection) {
        return null
      }

      return {
        config: configuredConnection.config,
        connection: configuredConnection.connection,
      }
    },

    async getIntegrationConnection(connectionId) {
      return state.integrationConnections.get(connectionId) ?? null
    },

    async getCurrentWorkspaceSelection(userId) {
      return state.currentWorkspaceSelections.get(userId) ?? null
    },

    async getReleaseRecord(releaseRecordId) {
      return state.releaseRecords.get(releaseRecordId) ?? null
    },

    async getReleaseRecordSnapshot(releaseRecordId) {
      return buildReleaseRecordSnapshot(releaseRecordId)
    },

    async getSyncRun(syncRunId) {
      return state.syncRuns.get(syncRunId) ?? null
    },

    async getUser(userId) {
      return state.users.get(userId) ?? null
    },

    async getWorkspace(workspaceId) {
      return state.workspaces.get(workspaceId) ?? null
    },

    async getWorkspacePolicySettings(workspaceId) {
      return state.workspacePolicySettings.get(workspaceId) ?? null
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

    async listWorkspaceMembershipsForUser(userId) {
      return Array.from(state.workspaceMemberships.values())
        .filter((membership) => membership.userId === userId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
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

    async setCurrentWorkspaceSelection(input) {
      const existingSelection = state.currentWorkspaceSelections.get(input.userId)
      const selection: CurrentWorkspaceSelection = {
        createdAt: existingSelection?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        userId: input.userId,
        workspaceId: input.workspaceId,
      }

      state.currentWorkspaceSelections.set(input.userId, selection)
      return selection
    },

    async updateIntegrationConnection(input) {
      const existingConnection = state.integrationConnections.get(input.id)

      if (!existingConnection) {
        throw new Error(`Integration connection ${input.id} was not found`)
      }

      const integrationConnection: IntegrationConnection = {
        ...existingConnection,
        externalAccountId: input.externalAccountId ?? existingConnection.externalAccountId,
        lastSyncedAt:
          input.lastSyncedAt === undefined ? existingConnection.lastSyncedAt : input.lastSyncedAt,
        status: input.status ?? existingConnection.status,
      }

      state.integrationConnections.set(integrationConnection.id, integrationConnection)
      return integrationConnection
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

    async updateWorkspacePolicySettings(input) {
      const existingSettings = state.workspacePolicySettings.get(input.workspaceId)

      if (!existingSettings) {
        throw new Error(`Workspace policy settings for ${input.workspaceId} were not found`)
      }

      const workspacePolicySettings: WorkspacePolicySettings = {
        ...existingSettings,
        ...input,
        updatedAt: nowIso(),
      }

      state.workspacePolicySettings.set(workspacePolicySettings.workspaceId, workspacePolicySettings)
      return workspacePolicySettings
    },

    async deleteGitHubConnectionConfig(connectionId) {
      state.githubConnectionConfigs.delete(connectionId)
    },

    async upsertReviewStatus(input) {
      const existingReviewStatus = Array.from(state.reviewStatuses.values()).find(
        (reviewStatus) =>
          reviewStatus.releaseRecordId === input.releaseRecordId && reviewStatus.stage === input.stage,
      )

      if (existingReviewStatus) {
        const reviewStatus: ReviewStatus = {
          ...existingReviewStatus,
          note: input.note,
          ownerUserId: input.ownerUserId,
          state: input.state,
          updatedAt: nowIso(),
        }

        state.reviewStatuses.set(reviewStatus.id, reviewStatus)
        return reviewStatus
      }

      return this.createReviewStatus(input)
    },
  }
}
