import { Hono } from "hono"

import { integrationProviders, type IntegrationProvider } from "../domain/models.js"
import {
  CurrentWorkspaceNotFoundError,
  CurrentWorkspaceSelectionRequiredError,
  type FoundationService,
  WorkspaceAccessDeniedError,
  WorkspaceSlugConflictError,
} from "../foundation/service.js"
import type { GitHubInstallationService } from "../github/installation.js"
import type { GitHubSyncService } from "../github/service.js"
import type { ReleaseWorkflowService } from "../release-workflow/service.js"
import { createReleaseWorkflowRoute } from "./release-workflow.js"
import { createGitHubSyncRoute } from "./github-sync.js"
import type { AppBindings } from "../types.js"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function asIntegrationProvider(value: unknown): IntegrationProvider | null {
  return typeof value === "string" && integrationProviders.includes(value as IntegrationProvider)
    ? (value as IntegrationProvider)
    : null
}

function badRequest(message: string) {
  return {
    message,
    status: 400,
  } as const
}

function notFound(message: string) {
  return {
    message,
    status: 404,
  } as const
}

function forbidden(message: string) {
  return {
    message,
    status: 403,
  } as const
}

function internalServerError(message: string) {
  return {
    message,
    status: 500,
  } as const
}

function getRouteErrorStatus(error: unknown, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : ""

  if (message.includes(" is required")) {
    return 400
  }

  if (message.includes("access is not allowed")) {
    return 403
  }

  if (message.includes("was not found")) {
    return 404
  }

  return fallbackStatus
}

function buildRouteErrorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : fallbackMessage
  const status = getRouteErrorStatus(error, fallbackStatus)

  if (status === 400) {
    return badRequest(message)
  }

  if (status === 404) {
    return notFound(message)
  }

  if (status === 403) {
    return forbidden(message)
  }

  return internalServerError(message)
}

export function createWorkspacesRoute(
  foundationService: FoundationService,
  githubSyncService?: GitHubSyncService,
  releaseWorkflowService?: ReleaseWorkflowService,
  githubInstallationService?: GitHubInstallationService,
) {
  const route = new Hono<AppBindings>()

  route.post("/bootstrap", async (context) => {
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const user = asRecord(payload?.user)
    const workspace = asRecord(payload?.workspace)

    const email = asString(user?.email)
    const workspaceName = asString(workspace?.name)
    const workspaceSlug = asString(workspace?.slug)
    const fullName = asString(user?.fullName)

    if (!email || !workspaceName || !workspaceSlug) {
      return context.json(badRequest("user.email, workspace.name, and workspace.slug are required"), 400)
    }

    const bootstrap = await foundationService.bootstrapWorkspace({
      user: {
        email,
        fullName,
      },
      workspace: {
        name: workspaceName,
        slug: workspaceSlug,
      },
    })
    const snapshot = await foundationService.getWorkspaceSnapshot(bootstrap.workspace.id)

    return context.json(snapshot, 201)
  })

  route.post("/bootstrap-current-user", async (context) => {
    const authUser = context.get("authUser")

    if (!authUser) {
      return context.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        401,
      )
    }

    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const workspace = asRecord(payload?.workspace)
    const workspaceName = asString(workspace?.name)
    const workspaceSlug = asString(workspace?.slug)

    if (!workspaceName || !workspaceSlug) {
      return context.json(badRequest("workspace.name and workspace.slug are required"), 400)
    }

    try {
      const bootstrap = await foundationService.bootstrapCurrentUserWorkspace({
        user: {
          email: authUser.email,
          fullName: authUser.name,
          id: authUser.id,
        },
        workspace: {
          name: workspaceName,
          slug: workspaceSlug,
        },
      })
      const snapshot = await foundationService.getWorkspaceSnapshot(bootstrap.workspace.id)

      return context.json(snapshot, 201)
    } catch (error) {
      if (error instanceof WorkspaceSlugConflictError) {
        return context.json({ message: error.message, status: 409 }, 409)
      }

      throw error
    }
  })

  route.get("/choices", async (context) => {
    const user = context.get("authUser")

    if (!user) {
      return context.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        401,
      )
    }

    const choices = await foundationService.listWorkspaceChoicesForUser(user.id)
    return context.json(choices)
  })

  route.get("/current", async (context) => {
    const user = context.get("authUser")

    if (!user) {
      return context.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        401,
      )
    }

    try {
      const snapshot = await foundationService.getCurrentWorkspaceSnapshotForUser(user.id)
      return context.json(snapshot)
    } catch (error) {
      if (error instanceof CurrentWorkspaceSelectionRequiredError) {
        return context.json(
          {
            message: error.message,
            status: 409,
          },
          409,
        )
      }

      const message =
        error instanceof CurrentWorkspaceNotFoundError
          ? error.message
          : "Current workspace was not found"
      return context.json(notFound(message), 404)
    }
  })

  route.put("/current", async (context) => {
    const user = context.get("authUser")

    if (!user) {
      return context.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        401,
      )
    }

    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const workspaceId = asString(payload?.workspaceId)

    if (!workspaceId) {
      return context.json(badRequest("workspaceId is required"), 400)
    }

    try {
      const snapshot = await foundationService.selectCurrentWorkspaceForUser({
        userId: user.id,
        workspaceId,
      })
      return context.json(snapshot)
    } catch (error) {
      if (error instanceof WorkspaceAccessDeniedError) {
        return context.json({ message: error.message, status: 403 }, 403)
      }

      const message = error instanceof Error ? error.message : "Failed to select workspace"
      return context.json({ message, status: 400 }, 400)
    }
  })

  route.use("/:workspaceId", async (context, next) => {
    const user = context.get("authUser")

    if (!user) {
      return context.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        401,
      )
    }

    try {
      await foundationService.assertWorkspaceAccess({
        userId: user.id,
        workspaceId: context.req.param("workspaceId"),
      })

      await next()
    } catch (error) {
      const message =
        error instanceof WorkspaceAccessDeniedError
          ? error.message
          : "Workspace access is not allowed"
      return context.json({ message, status: 403 }, 403)
    }
  })

  route.use("/:workspaceId/*", async (context, next) => {
    const user = context.get("authUser")

    if (!user) {
      return context.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        401,
      )
    }

    try {
      await foundationService.assertWorkspaceAccess({
        userId: user.id,
        workspaceId: context.req.param("workspaceId"),
      })

      await next()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace access is not allowed"
      return context.json({ message, status: 403 }, 403)
    }
  })

  route.get("/:workspaceId", async (context) => {
    try {
      const snapshot = await foundationService.getWorkspaceSnapshot(context.req.param("workspaceId"))
      return context.json(snapshot)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace was not found"
      return context.json(notFound(message), 404)
    }
  })

  route.get("/:workspaceId/members", async (context) => {
    try {
      const members = await foundationService.listWorkspaceMembers(context.req.param("workspaceId"))
      return context.json(
        members.map((member) => ({
          membership: member.membership,
          user: {
            email: member.user.email,
            fullName: member.user.fullName,
            id: member.user.id,
          },
        })),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace members were not found"
      if (message.includes("was not found")) {
        return context.json(notFound(message), 404)
      }

      return context.json(internalServerError(message), 500)
    }
  })

  route.get("/:workspaceId/settings", async (context) => {
    try {
      const settings = await foundationService.getWorkspacePolicySettings(context.req.param("workspaceId"))
      return context.json(settings)
    } catch (error) {
      const response = buildRouteErrorResponse(
        error,
        "Workspace policy settings were not found",
      )
      return context.json(response, response.status)
    }
  })

  route.put("/:workspaceId/settings", async (context) => {
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const includeEvidenceLinksInExport = asBoolean(payload?.includeEvidenceLinksInExport)
    const includeSourceLinksInExport = asBoolean(payload?.includeSourceLinksInExport)
    const requireReviewerAssignment = asBoolean(payload?.requireReviewerAssignment)
    const showBlockedClaimsInInbox = asBoolean(payload?.showBlockedClaimsInInbox)
    const showPendingApprovalsInInbox = asBoolean(payload?.showPendingApprovalsInInbox)
    const showReopenedDraftsInInbox = asBoolean(payload?.showReopenedDraftsInInbox)

    if (
      [
        includeEvidenceLinksInExport,
        includeSourceLinksInExport,
        requireReviewerAssignment,
        showBlockedClaimsInInbox,
        showPendingApprovalsInInbox,
        showReopenedDraftsInInbox,
      ].some((value) => value === null)
    ) {
      return context.json(
        badRequest(
          "includeEvidenceLinksInExport, includeSourceLinksInExport, requireReviewerAssignment, showBlockedClaimsInInbox, showPendingApprovalsInInbox, and showReopenedDraftsInInbox are required",
        ),
        400,
      )
    }

    const nextSettings = {
      includeEvidenceLinksInExport: includeEvidenceLinksInExport as boolean,
      includeSourceLinksInExport: includeSourceLinksInExport as boolean,
      requireReviewerAssignment: requireReviewerAssignment as boolean,
      showBlockedClaimsInInbox: showBlockedClaimsInInbox as boolean,
      showPendingApprovalsInInbox: showPendingApprovalsInInbox as boolean,
      showReopenedDraftsInInbox: showReopenedDraftsInInbox as boolean,
    }

    try {
      const settings = await foundationService.updateWorkspacePolicySettings({
        ...nextSettings,
        workspaceId: context.req.param("workspaceId"),
      })

      return context.json(settings)
    } catch (error) {
      const response = buildRouteErrorResponse(
        error,
        "Workspace policy settings could not be updated",
      )
      return context.json(response, response.status)
    }
  })

  route.get("/:workspaceId/release-records", async (context) => {
    try {
      const releaseRecords = await foundationService.listReleaseRecordSnapshots(
        context.req.param("workspaceId"),
      )
      return context.json(releaseRecords)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace was not found"
      return context.json(notFound(message), 404)
    }
  })

  route.get("/:workspaceId/release-records/:releaseRecordId", async (context) => {
    try {
      const releaseRecord = await foundationService.getReleaseRecordSnapshot(
        context.req.param("workspaceId"),
        context.req.param("releaseRecordId"),
      )
      return context.json(releaseRecord)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Release record was not found"
      return context.json(notFound(message), 404)
    }
  })

  route.post("/:workspaceId/integrations", async (context) => {
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const provider = asIntegrationProvider(payload?.provider)
    const externalAccountId = asString(payload?.externalAccountId)

    if (!provider || !externalAccountId) {
      return context.json(badRequest("provider and externalAccountId are required"), 400)
    }

    try {
      const integration = await foundationService.createIntegrationConnection({
        externalAccountId,
        provider,
        workspaceId: context.req.param("workspaceId"),
      })

      return context.json(integration, 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace was not found"
      const status = message.includes("was not found") ? 404 : 400
      return context.json({ message, status }, status)
    }
  })

  route.get("/:workspaceId/integrations/github", async (context) => {
    try {
      const githubConnection = await foundationService.getGitHubWorkspaceConnection(
        context.req.param("workspaceId"),
      )

      if (!githubConnection) {
        return context.json(notFound("GitHub connection was not found"), 404)
      }

      return context.json({
        connectedAt: githubConnection.connection.connectedAt,
        connectionId: githubConnection.connection.id,
        installationId: githubConnection.config.installationId,
        lastSyncedAt: githubConnection.connection.lastSyncedAt,
        repositoryName: githubConnection.config.repositoryName,
        repositoryOwner: githubConnection.config.repositoryOwner,
        repositoryUrl: githubConnection.config.repositoryUrl,
        status: githubConnection.connection.status,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace was not found"
      const status = message.includes("was not found") ? 404 : 400
      return context.json({ message, status }, status)
    }
  })

  route.get("/:workspaceId/integrations/github/install-url", async (context) => {
    if (!githubInstallationService) {
      return context.json({ message: "GitHub App integration is unavailable", status: 503 }, 503)
    }

    try {
      const authUser = context.get("authUser")

      if (!authUser) {
        return context.json({ message: "Authentication is required", status: 401 }, 401)
      }

      return context.json({
        url: githubInstallationService.getInstallUrl({
          userId: authUser.id,
          workspaceId: context.req.param("workspaceId"),
        }),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub App integration is unavailable"
      return context.json({ message, status: 503 }, 503)
    }
  })

  route.get("/:workspaceId/integrations/github/installations/:installationId/repositories", async (context) => {
    if (!githubInstallationService) {
      return context.json({ message: "GitHub App integration is unavailable", status: 503 }, 503)
    }

    try {
      const authUser = context.get("authUser")
      const state = context.req.query("state")

      if (!authUser) {
        return context.json({ message: "Authentication is required", status: 401 }, 401)
      }

      if (!state) {
        return context.json(badRequest("state is required"), 400)
      }

      githubInstallationService.verifyInstallState({
        state,
        userId: authUser.id,
        workspaceId: context.req.param("workspaceId"),
      })

      const repositories = await githubInstallationService.listInstallationRepositories(
        context.req.param("installationId"),
      )
      return context.json(repositories)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub installation repositories could not be loaded"
      return context.json({ message, status: 400 }, 400)
    }
  })

  route.put("/:workspaceId/integrations/github", async (context) => {
    if (!githubInstallationService) {
      return context.json({ message: "GitHub App integration is unavailable", status: 503 }, 503)
    }

    const authUser = context.get("authUser")

    if (!authUser) {
      return context.json({ message: "Authentication is required", status: 401 }, 401)
    }

    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const repository = asRecord(payload?.repository)
    const installationId = asString(payload?.installationId)
    const state = asString(payload?.state)
    const repositoryOwner = asString(repository?.owner)
    const repositoryName = asString(repository?.name)
    const repositoryUrl = asString(repository?.url)

    if (!installationId || !state || !repositoryOwner || !repositoryName || !repositoryUrl) {
      return context.json(
        badRequest("installationId, state, repository.owner, repository.name, and repository.url are required"),
        400,
      )
    }

    try {
      githubInstallationService.verifyInstallState({
        state,
        userId: authUser.id,
        workspaceId: context.req.param("workspaceId"),
      })

      const githubConnection = await foundationService.connectGitHubWorkspace({
        connectedByUserId: authUser.id,
        installationId,
        repositoryName,
        repositoryOwner,
        repositoryUrl,
        workspaceId: context.req.param("workspaceId"),
      })

      return context.json({
        connectedAt: githubConnection.connection.connectedAt,
        connectionId: githubConnection.connection.id,
        installationId: githubConnection.config.installationId,
        lastSyncedAt: githubConnection.connection.lastSyncedAt,
        repositoryName: githubConnection.config.repositoryName,
        repositoryOwner: githubConnection.config.repositoryOwner,
        repositoryUrl: githubConnection.config.repositoryUrl,
        status: githubConnection.connection.status,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub connection could not be saved"
      const status = message.includes("was not found") ? 404 : 400
      return context.json({ message, status }, status)
    }
  })

  route.delete("/:workspaceId/integrations/github", async (context) => {
    try {
      await foundationService.disconnectGitHubWorkspace(context.req.param("workspaceId"))
      return context.body(null, 204)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub connection could not be disconnected"
      const status = message.includes("was not found") ? 404 : 400
      return context.json({ message, status }, status)
    }
  })

  route.post("/:workspaceId/sync-runs", async (context) => {
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const connectionId = asString(payload?.connectionId)
    const scope = asString(payload?.scope)

    if (!connectionId || !scope) {
      return context.json(badRequest("connectionId and scope are required"), 400)
    }

    try {
      const syncRun = await foundationService.createSyncRun({
        connectionId,
        scope,
        workspaceId: context.req.param("workspaceId"),
      })

      return context.json(syncRun, 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace was not found"
      const status = message.includes("was not found") ? 404 : 400
      return context.json({ message, status }, status)
    }
  })

  if (githubSyncService) {
    route.route(
      "/:workspaceId/github",
      createGitHubSyncRoute(githubSyncService, foundationService, githubInstallationService),
    )
  }

  if (releaseWorkflowService) {
    route.route("/:workspaceId/release-workflow", createReleaseWorkflowRoute(releaseWorkflowService))
  }

  return route
}
