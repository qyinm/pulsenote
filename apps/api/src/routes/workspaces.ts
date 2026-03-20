import { Hono } from "hono"

import { integrationProviders, type IntegrationProvider } from "../domain/models.js"
import {
  CurrentWorkspaceNotFoundError,
  CurrentWorkspaceSelectionRequiredError,
  type FoundationService,
  WorkspaceAccessDeniedError,
} from "../foundation/service.js"
import type { GitHubSyncService } from "../github/service.js"
import { createGitHubSyncRoute } from "./github-sync.js"
import type { AppBindings } from "../types.js"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
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

export function createWorkspacesRoute(
  foundationService: FoundationService,
  githubSyncService?: GitHubSyncService,
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
    route.route("/:workspaceId/github", createGitHubSyncRoute(githubSyncService))
  }

  return route
}
