import {
  integrationProviders,
  type IntegrationConnection,
  type IntegrationProvider,
  type SyncRun,
  type User,
  type Workspace,
  type WorkspaceMembership,
} from "../domain/models.js"
import type {
  FoundationStore,
  GitHubWorkspaceConnection,
  ReleaseRecordSnapshot,
  WorkspaceChoice,
  WorkspaceSnapshot,
} from "./store.js"

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

type BootstrapCurrentUserWorkspaceInput = {
  user: {
    email: string
    fullName: string | null
    id: string
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

type ConnectGitHubWorkspaceInput = {
  connectedByUserId: string
  installationId: string
  repositoryName: string
  repositoryOwner: string
  repositoryUrl: string
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

type SelectCurrentWorkspaceInput = {
  userId: string
  workspaceId: string
}

export type FoundationService = ReturnType<typeof createFoundationService>

export class CurrentWorkspaceNotFoundError extends Error {
  constructor() {
    super("Current workspace was not found")
    this.name = "CurrentWorkspaceNotFoundError"
  }
}

export class CurrentWorkspaceSelectionRequiredError extends Error {
  constructor() {
    super("Multiple workspaces found; specify the current workspace before loading the dashboard")
    this.name = "CurrentWorkspaceSelectionRequiredError"
  }
}

export class WorkspaceAccessDeniedError extends Error {
  constructor() {
    super("Workspace access is not allowed")
    this.name = "WorkspaceAccessDeniedError"
  }
}

export class WorkspaceSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Workspace slug "${slug}" is already in use`)
    this.name = "WorkspaceSlugConflictError"
  }
}

function isWorkspaceSlugConflictError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const cause = error as { code?: string; message?: string }

  return (
    cause.code === "23505" ||
    cause.message === "Workspace slug is already in use" ||
    cause.message?.includes("workspaces_slug_unique") === true
  )
}

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

    async bootstrapCurrentUserWorkspace(
      input: BootstrapCurrentUserWorkspaceInput,
    ): Promise<BootstrapWorkspaceResult> {
      requireNonEmpty(input.user.id, "user.id")
      requireNonEmpty(input.user.email, "user.email")
      requireNonEmpty(input.workspace.name, "workspace.name")
      requireNonEmpty(input.workspace.slug, "workspace.slug")
      const normalizedSlug = input.workspace.slug.trim()

      try {
        return await store.bootstrapAuthenticatedWorkspace({
          user: {
            email: input.user.email.trim().toLowerCase(),
            fullName: input.user.fullName,
            id: input.user.id.trim(),
          },
          workspace: {
            name: input.workspace.name.trim(),
            slug: normalizedSlug,
          },
        })
      } catch (error) {
        if (isWorkspaceSlugConflictError(error)) {
          throw new WorkspaceSlugConflictError(normalizedSlug)
        }

        throw error
      }
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

    async getGitHubWorkspaceConnection(workspaceId: string): Promise<GitHubWorkspaceConnection | null> {
      requireNonEmpty(workspaceId, "workspaceId")

      const workspace = await store.getWorkspace(workspaceId)

      if (!workspace) {
        throw new Error(`Workspace ${workspaceId} was not found`)
      }

      return store.getGitHubWorkspaceConnection(workspaceId)
    },

    async connectGitHubWorkspace(input: ConnectGitHubWorkspaceInput): Promise<GitHubWorkspaceConnection> {
      requireNonEmpty(input.workspaceId, "workspaceId")
      requireNonEmpty(input.connectedByUserId, "connectedByUserId")
      requireNonEmpty(input.installationId, "installationId")
      requireNonEmpty(input.repositoryOwner, "repositoryOwner")
      requireNonEmpty(input.repositoryName, "repositoryName")
      requireNonEmpty(input.repositoryUrl, "repositoryUrl")

      const workspace = await store.getWorkspace(input.workspaceId)

      if (!workspace) {
        throw new Error(`Workspace ${input.workspaceId} was not found`)
      }

      const user = await store.getUser(input.connectedByUserId)

      if (!user) {
        throw new Error(`User ${input.connectedByUserId} was not found`)
      }

      const existingConnection = await store.findWorkspaceIntegrationConnection(input.workspaceId, "github")
      const connection =
        existingConnection === null
          ? await store.createIntegrationConnection({
              externalAccountId: input.installationId.trim(),
              provider: "github",
              workspaceId: input.workspaceId,
            })
          : await store.updateIntegrationConnection({
              externalAccountId: input.installationId.trim(),
              id: existingConnection.id,
              status: "active",
            })

      const config = await store.upsertGitHubConnectionConfig({
        connectedByUserId: input.connectedByUserId.trim(),
        connectionId: connection.id,
        installationId: input.installationId.trim(),
        repositoryName: input.repositoryName.trim(),
        repositoryOwner: input.repositoryOwner.trim(),
        repositoryUrl: input.repositoryUrl.trim(),
      })

      return {
        config,
        connection,
      }
    },

    async disconnectGitHubWorkspace(workspaceId: string): Promise<void> {
      requireNonEmpty(workspaceId, "workspaceId")

      const connection = await store.findWorkspaceIntegrationConnection(workspaceId, "github")

      if (!connection) {
        return
      }

      await store.deleteGitHubConnectionConfig(connection.id)
      await store.updateIntegrationConnection({
        id: connection.id,
        status: "disconnected",
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
        throw new WorkspaceAccessDeniedError()
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

    async getCurrentWorkspaceSnapshotForUser(userId: string): Promise<WorkspaceSnapshot> {
      requireNonEmpty(userId, "userId")

      const memberships = await store.listWorkspaceMembershipsForUser(userId)

      if (memberships.length === 0) {
        throw new CurrentWorkspaceNotFoundError()
      }

      if (memberships.length > 1) {
        const selection = await store.getCurrentWorkspaceSelection(userId)

        if (!selection) {
          throw new CurrentWorkspaceSelectionRequiredError()
        }

        const currentMembership = memberships.find(
          (membership) => membership.workspaceId === selection.workspaceId,
        )

        if (!currentMembership) {
          throw new CurrentWorkspaceSelectionRequiredError()
        }

        return this.getWorkspaceSnapshot(currentMembership.workspaceId)
      }

      const currentMembership = memberships[0]

      return this.getWorkspaceSnapshot(currentMembership.workspaceId)
    },

    async listWorkspaceChoicesForUser(userId: string): Promise<WorkspaceChoice[]> {
      requireNonEmpty(userId, "userId")

      const memberships = await store.listWorkspaceMembershipsForUser(userId)

      const choices = await Promise.all(
        memberships.map(async (membership) => {
          const workspace = await store.getWorkspace(membership.workspaceId)

          if (!workspace) {
            return null
          }

          return {
            membership,
            workspace,
          } satisfies WorkspaceChoice
        }),
      )

      return choices.filter((choice): choice is WorkspaceChoice => choice !== null)
    },

    async selectCurrentWorkspaceForUser(input: SelectCurrentWorkspaceInput): Promise<WorkspaceSnapshot> {
      requireNonEmpty(input.userId, "userId")
      requireNonEmpty(input.workspaceId, "workspaceId")

      const membership = await store.findWorkspaceMembership(input.workspaceId, input.userId)

      if (!membership) {
        throw new WorkspaceAccessDeniedError()
      }

      await store.setCurrentWorkspaceSelection({
        userId: input.userId,
        workspaceId: input.workspaceId,
      })

      return this.getWorkspaceSnapshot(input.workspaceId)
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
