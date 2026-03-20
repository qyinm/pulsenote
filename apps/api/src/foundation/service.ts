import {
  integrationProviders,
  type IntegrationConnection,
  type IntegrationProvider,
  type SyncRun,
  type User,
  type Workspace,
  type WorkspaceMembership,
} from "../domain/models.js"
import type { FoundationStore, ReleaseRecordSnapshot, WorkspaceSnapshot } from "./store.js"

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

type WorkspaceAccessInput = {
  userId: string
  workspaceId: string
}

export type FoundationService = ReturnType<typeof createFoundationService>

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`)
  }
}

function isIntegrationProvider(value: string): value is IntegrationProvider {
  return integrationProviders.includes(value as IntegrationProvider)
}

export function createFoundationService(store: FoundationStore) {
  return {
    store,

    async bootstrapWorkspace(input: BootstrapWorkspaceInput): Promise<BootstrapWorkspaceResult> {
      requireNonEmpty(input.user.email, "user.email")
      requireNonEmpty(input.workspace.name, "workspace.name")
      requireNonEmpty(input.workspace.slug, "workspace.slug")

      return store.bootstrapWorkspace({
        user: {
          email: input.user.email.trim().toLowerCase(),
          fullName: input.user.fullName,
        },
        workspace: {
          name: input.workspace.name.trim(),
          slug: input.workspace.slug.trim(),
        },
      })
    },

    async createIntegrationConnection(input: CreateIntegrationConnectionInput): Promise<IntegrationConnection> {
      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.externalAccountId, "externalAccountId")
      const provider = input.provider.trim()

      if (!isIntegrationProvider(provider)) {
        throw new Error("provider must be one of: github, linear")
      }

      const workspace = await store.getWorkspace(input.workspaceId)

      if (!workspace) {
        throw new Error(`Workspace ${input.workspaceId} was not found`)
      }

      return store.createIntegrationConnection({
        externalAccountId: input.externalAccountId.trim(),
        provider,
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

    async assertWorkspaceAccess(input: WorkspaceAccessInput): Promise<WorkspaceMembership> {
      requireNonEmpty(input.userId, "userId")
      requireNonEmpty(input.workspaceId, "workspaceId")

      const membership = await store.findWorkspaceMembership(input.workspaceId, input.userId)

      if (!membership) {
        throw new Error("Workspace access is not allowed")
      }

      return membership
    },

    async getWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
      requireNonEmpty(workspaceId, "workspaceId")

      const snapshot = await store.getWorkspaceSnapshot(workspaceId)

      if (!snapshot) {
        throw new Error(`Workspace ${workspaceId} was not found`)
      }

      return snapshot
    },

    async getReleaseRecordSnapshot(
      workspaceId: string,
      releaseRecordId: string,
    ): Promise<ReleaseRecordSnapshot> {
      requireNonEmpty(workspaceId, "workspaceId")
      requireNonEmpty(releaseRecordId, "releaseRecordId")

      const snapshot = await store.getReleaseRecordSnapshot(releaseRecordId)

      if (!snapshot || snapshot.releaseRecord.workspaceId !== workspaceId) {
        throw new Error(`Release record ${releaseRecordId} was not found in workspace`)
      }

      return snapshot
    },

    async listReleaseRecordSnapshots(workspaceId: string): Promise<ReleaseRecordSnapshot[]> {
      requireNonEmpty(workspaceId, "workspaceId")

      const workspace = await store.getWorkspace(workspaceId)

      if (!workspace) {
        throw new Error(`Workspace ${workspaceId} was not found`)
      }

      return store.listReleaseRecordSnapshots(workspaceId)
    },
  }
}
