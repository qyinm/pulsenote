import { Hono } from "hono"

import type { GitHubSyncService } from "../github/service.js"
import type { AppBindings } from "../types.js"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asPositiveIntegerArray(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const numbers = value.map((item) => (typeof item === "number" ? item : Number.NaN))

  return numbers.every((item) => Number.isInteger(item) && item > 0) ? numbers : null
}

function asPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
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
      const normalizedMessage = message.toLowerCase()
      const status =
        message.includes("not available in production")
          ? 403
          : normalizedMessage.includes("was not found") ||
              normalizedMessage.includes("not found") ||
              normalizedMessage.includes("does not belong")
            ? 404
            : 502

      return context.json({ message, status }, status)
    }
  })

  route.post("/sync/merged-pulls", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const repository = asRecord(payload?.repository)

    const connectionId = asString(payload?.connectionId)
    const token = asString(auth?.token)
    const strategy = asString(auth?.strategy)
    const owner = asString(repository?.owner)
    const repo = asString(repository?.repo)
    const installationId = asString(repository?.installationId)
    const pullNumbers = asPositiveIntegerArray(payload?.pullNumbers)

    if (!connectionId || !token || !strategy || !owner || !repo || !pullNumbers) {
      return context.json(
        {
          message:
            "connectionId, auth.token, auth.strategy, repository.owner, repository.repo, and a non-empty pullNumbers array are required",
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
      const result = await githubSyncService.syncMergedPullRequests({
        auth: {
          strategy: strategy as "personal_access_token" | "installation_token",
          token,
        },
        connectionId,
        pullNumbers,
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
      const message = error instanceof Error ? error.message : "GitHub merged pull sync failed"
      const normalizedMessage = message.toLowerCase()
      const status =
        message.includes("not available in production")
          ? 403
          : normalizedMessage.includes("was not found") ||
              normalizedMessage.includes("not found") ||
              normalizedMessage.includes("does not belong")
            ? 404
            : 400

      return context.json({ message, status }, status)
    }
  })

  route.post("/sync/release", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const repository = asRecord(payload?.repository)
    const release = asRecord(payload?.release)

    const connectionId = asString(payload?.connectionId)
    const token = asString(auth?.token)
    const strategy = asString(auth?.strategy)
    const owner = asString(repository?.owner)
    const repo = asString(repository?.repo)
    const installationId = asString(repository?.installationId)
    const tag = asString(release?.tag)
    const releaseId = asPositiveInteger(release?.releaseId)
    const hasTag = Boolean(tag)
    const hasReleaseId = releaseId !== null

    if (!connectionId || !token || !strategy || !owner || !repo || hasTag === hasReleaseId) {
      return context.json(
        {
          message:
            "connectionId, auth.token, auth.strategy, repository.owner, repository.repo, and exactly one of release.tag or release.releaseId are required",
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
      const result = await githubSyncService.syncRelease({
        auth: {
          strategy: strategy as "personal_access_token" | "installation_token",
          token,
        },
        connectionId,
        release:
          releaseId !== null
            ? {
                releaseId,
              }
            : {
                tag: tag!,
              },
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
      const message = error instanceof Error ? error.message : "GitHub release sync failed"
      const normalizedMessage = message.toLowerCase()
      const status =
        message.includes("not available in production")
          ? 403
          : normalizedMessage.includes("was not found") ||
              normalizedMessage.includes("not found") ||
              normalizedMessage.includes("does not belong")
            ? 404
            : 400

      return context.json({ message, status }, status)
    }
  })

  return route
}
