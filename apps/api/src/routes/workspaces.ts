import { Hono } from "hono"

import type { FoundationService } from "../foundation/service.js"
import type { AppBindings } from "../types.js"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
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

export function createWorkspacesRoute(foundationService: FoundationService) {
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

  route.get("/:workspaceId", async (context) => {
    try {
      const snapshot = await foundationService.getWorkspaceSnapshot(context.req.param("workspaceId"))
      return context.json(snapshot)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace was not found"
      return context.json(notFound(message), 404)
    }
  })

  route.post("/:workspaceId/integrations", async (context) => {
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const provider = asString(payload?.provider)
    const externalAccountId = asString(payload?.externalAccountId)

    if (!provider || !externalAccountId) {
      return context.json(badRequest("provider and externalAccountId are required"), 400)
    }

    try {
      const integration = await foundationService.createIntegrationConnection({
        externalAccountId,
        provider: provider as "github" | "linear",
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

  return route
}
