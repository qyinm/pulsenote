import {
  type IntegrationAccount,
  type IntegrationConnection,
  type IntegrationProvider,
  type SourceCursor,
  type SyncRun,
  type User,
  type Workspace,
  type WorkspaceMembership,
} from "../domain/models.js"

type CreateUserInput = Pick<User, "email" | "fullName">
type CreateWorkspaceInput = Pick<Workspace, "name" | "slug">
type CreateWorkspaceMembershipInput = Pick<WorkspaceMembership, "role" | "userId" | "workspaceId">
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

export type FoundationStore = {
  createIntegrationAccount(input: CreateIntegrationAccountInput): Promise<IntegrationAccount>
  createIntegrationConnection(input: CreateIntegrationConnectionInput): Promise<IntegrationConnection>
  createSourceCursor(input: CreateSourceCursorInput): Promise<SourceCursor>
  createSyncRun(input: CreateSyncRunInput): Promise<SyncRun>
  createUser(input: CreateUserInput): Promise<User>
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>
  createWorkspaceMembership(input: CreateWorkspaceMembershipInput): Promise<WorkspaceMembership>
  findWorkspaceMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null>
  getIntegrationConnection(connectionId: string): Promise<IntegrationConnection | null>
  getSyncRun(syncRunId: string): Promise<SyncRun | null>
  getWorkspace(workspaceId: string): Promise<Workspace | null>
  getWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot | null>
  updateSyncRun(input: UpdateSyncRunInput): Promise<SyncRun>
}

type InMemoryState = {
  integrationAccounts: Map<string, IntegrationAccount>
  integrationConnections: Map<string, IntegrationConnection>
  sourceCursors: Map<string, SourceCursor>
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
    integrationAccounts: new Map(),
    integrationConnections: new Map(),
    sourceCursors: new Map(),
    syncRuns: new Map(),
    users: new Map(),
    workspaceMemberships: new Map(),
    workspaces: new Map(),
  }

  return {
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

    async createSyncRun(input) {
      const syncRun: SyncRun = {
        connectionId: input.connectionId,
        errorMessage: null,
        finishedAt: null,
        id: createId(),
        provider: (state.integrationConnections.get(input.connectionId)?.provider ?? "github") as IntegrationProvider,
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
