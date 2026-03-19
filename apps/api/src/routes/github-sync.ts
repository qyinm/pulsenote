import { Hono } from "hono"

import type { GitHubSyncService } from "../github/service.js"
import type { AppBindings } from "../types.js"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function createGitHubSyncRoute(githubSyncService: GitHubSyncService) {
  const route = new Hono<AppBindings>()

  route.post("/sync/compare", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const compare = asRecord(payload?.compare)
    const repository = asRecord(payload?.repository)

    const connectionId = asString(payload?.connectionId)
    const token = asString(auth?.token)
    const strategy = asString(auth?.strategy)
    const base = asString(compare?.base)
    const head = asString(compare?.head)
    const owner = asString(repository?.owner)
    const repo = asString(repository?.repo)
    const installationId = asString(repository?.installationId)

    if (!connectionId || !token || !strategy || !base || !head || !owner || !repo) {
      return context.json(
        {
          message:
            "connectionId, auth.token, auth.strategy, compare.base, compare.head, repository.owner, and repository.repo are required",
          status: 400,
        },
        400,
      )
    }

    if (!workspaceId) {
      return context.json(
        {
          message: "workspaceId is required",
          status: 400,
        },
        400,
      )
    }

    try {
      const result = await githubSyncService.syncCompareRange({
        auth: {
          strategy: strategy as "personal_access_token" | "installation_token",
          token,
        },
        compare: {
          base,
          head,
        },
        connectionId,
        repository: {
          installationId,
          owner,
          provider: "github",
          repo,
        },
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub compare sync failed"
      const status =
        message.includes("not available in production")
          ? 403
          : message.includes("was not found") || message.includes("does not belong")
            ? 404
            : 502

      return context.json({ message, status }, status)
    }
  })

  return route
}
