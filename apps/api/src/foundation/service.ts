import type { IntegrationConnection, SyncRun, User, Workspace, WorkspaceMembership } from "../domain/models.js"
import type { FoundationStore, WorkspaceSnapshot } from "./store.js"

type BootstrapWorkspaceInput = {
  user: {
    email: string
    fullName: string | null
  }
  workspace: {
    name: string
    slug: string
  }
}

type BootstrapWorkspaceResult = {
  membership: WorkspaceMembership
  user: User
  workspace: Workspace
}

type CreateIntegrationConnectionInput = {
  externalAccountId: string
  provider: IntegrationConnection["provider"]
  workspaceId: string
}

type CreateSyncRunInput = {
  connectionId: string
  scope: string
  workspaceId: string
}

export type FoundationService = ReturnType<typeof createFoundationService>

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`)
  }
}

export function createFoundationService(store: FoundationStore) {
  return {
    async bootstrapWorkspace(input: BootstrapWorkspaceInput): Promise<BootstrapWorkspaceResult> {
      requireNonEmpty(input.user.email, "user.email")
      requireNonEmpty(input.workspace.name, "workspace.name")
      requireNonEmpty(input.workspace.slug, "workspace.slug")

      const user = await store.createUser({
        email: input.user.email.trim().toLowerCase(),
        fullName: input.user.fullName,
      })
      const workspace = await store.createWorkspace({
        name: input.workspace.name.trim(),
        slug: input.workspace.slug.trim(),
      })
      const membership = await store.createWorkspaceMembership({
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

    async createIntegrationConnection(input: CreateIntegrationConnectionInput): Promise<IntegrationConnection> {
      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.externalAccountId, "externalAccountId")

      const workspace = await store.getWorkspace(input.workspaceId)

      if (!workspace) {
        throw new Error(`Workspace ${input.workspaceId} was not found`)
      }

      return store.createIntegrationConnection({
        externalAccountId: input.externalAccountId.trim(),
        provider: input.provider,
        workspaceId: workspace.id,
      })
    },

    async createSyncRun(input: CreateSyncRunInput): Promise<SyncRun> {
      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectionId, "connectionId")
      requireNonEmpty(input.scope, "scope")

      const workspace = await store.getWorkspace(input.workspaceId)

      if (!workspace) {
        throw new Error(`Workspace ${input.workspaceId} was not found`)
      }

      const integrationConnection = await store.getIntegrationConnection(input.connectionId)

      if (!integrationConnection) {
        throw new Error(`Integration connection ${input.connectionId} was not found`)
      }

      if (integrationConnection.workspaceId !== input.workspaceId) {
        throw new Error(
          `Integration connection ${input.connectionId} does not belong to workspace ${input.workspaceId}`,
        )
      }

      return store.createSyncRun({
        connectionId: input.connectionId,
        scope: input.scope.trim(),
        workspaceId: input.workspaceId,
      })
    },

    async getWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
      requireNonEmpty(workspaceId, "workspaceId")

      const snapshot = await store.getWorkspaceSnapshot(workspaceId)

      if (!snapshot) {
        throw new Error(`Workspace ${workspaceId} was not found`)
      }

      return snapshot
    },
  }
}
