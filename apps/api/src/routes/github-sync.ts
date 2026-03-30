import { Hono } from "hono"

import type { FoundationService } from "../foundation/service.js"
import type { GitHubInstallationService } from "../github/installation.js"
import {
  githubTokenStrategies,
  type GitHubRepositoryScope,
  type GitHubSyncAuth,
  type GitHubTokenStrategy,
} from "../github/models.js"
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

function asGitHubTokenStrategy(value: unknown): GitHubTokenStrategy | null {
  return typeof value === "string" && githubTokenStrategies.includes(value as GitHubTokenStrategy)
    ? (value as GitHubTokenStrategy)
    : null
}

function createClientSuppliedGitHubSyncAuth(token: string, strategy: GitHubTokenStrategy): GitHubSyncAuth {
  if (strategy !== "personal_access_token") {
    throw new Error("Client-supplied installation tokens are not supported")
  }

  return {
    strategy,
    token,
  }
}

async function resolveStoredGitHubSyncContext(
  foundationService: FoundationService | undefined,
  githubInstallationService: GitHubInstallationService | undefined,
  workspaceId: string,
  connectionId: string,
): Promise<{ auth: GitHubSyncAuth; repository: GitHubRepositoryScope }> {
  if (!foundationService || !githubInstallationService) {
    throw new Error("Stored GitHub connection sync is unavailable")
  }

  const githubConnection = await foundationService.getGitHubWorkspaceConnection(workspaceId)

  if (!githubConnection || githubConnection.connection.id !== connectionId) {
    throw new Error(`GitHub connection ${connectionId} was not found in workspace`)
  }

  const auth = await githubInstallationService.createInstallationAuth(
    githubConnection.config.installationId,
  )

  return {
    auth,
    repository: {
      installationId: githubConnection.config.installationId,
      owner: githubConnection.config.repositoryOwner,
      provider: "github",
      repo: githubConnection.config.repositoryName,
    },
  }
}

function getErrorStatus(message: string, fallbackStatus: number) {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("was not found") ||
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("does not belong")
  ) {
    return 404
  }

  if (normalizedMessage.includes("required")) {
    return 400
  }

  if (normalizedMessage.includes("not supported")) {
    return 400
  }

  if (normalizedMessage.includes("not available in production")) {
    return 403
  }

  return fallbackStatus
}

async function resolveGitHubSyncContextFromPayload(input: {
  auth: Record<string, unknown> | null
  connectionId: string
  foundationService: FoundationService | undefined
  githubInstallationService: GitHubInstallationService | undefined
  repository: Record<string, unknown> | null
  workspaceId: string
}) {
  const token = asString(input.auth?.token)
  const strategy = asGitHubTokenStrategy(input.auth?.strategy)
  const owner = asString(input.repository?.owner)
  const repo = asString(input.repository?.repo)
  const installationId = asString(input.repository?.installationId)

  if (input.auth !== null || input.repository !== null) {
    if (!token || !strategy || !owner || !repo) {
      throw new Error(
        "connectionId, auth.token, auth.strategy, repository.owner, and repository.repo are required",
      )
    }

    return {
      auth: {
        ...createClientSuppliedGitHubSyncAuth(token, strategy),
      },
      repository: {
        installationId,
        owner,
        provider: "github" as const,
        repo,
      } satisfies GitHubRepositoryScope,
    }
  }

  return resolveStoredGitHubSyncContext(
    input.foundationService,
    input.githubInstallationService,
    input.workspaceId,
    input.connectionId,
  )
}

export function createGitHubSyncRoute(
  githubSyncService: GitHubSyncService,
  foundationService?: FoundationService,
  githubInstallationService?: GitHubInstallationService,
) {
  const route = new Hono<AppBindings>()

  route.post("/sync/compare/preview", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const compare = asRecord(payload?.compare)
    const repository = asRecord(payload?.repository)
    const connectionId = asString(payload?.connectionId)
    const base = asString(compare?.base)
    const head = asString(compare?.head)

    if (!workspaceId || !connectionId || !base || !head) {
      return context.json(
        {
          message: "connectionId, compare.base, compare.head, and workspaceId are required",
          status: 400,
        },
        400,
      )
    }

    try {
      const resolved = await resolveGitHubSyncContextFromPayload({
        auth,
        connectionId,
        foundationService,
        githubInstallationService,
        repository,
        workspaceId,
      })

      const result = await githubSyncService.previewCompareRange({
        auth: resolved.auth,
        compare: {
          base,
          head,
        },
        connectionId,
        repository: resolved.repository,
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub compare preview failed"
      const status = getErrorStatus(message, 502)
      return context.json({ message, status }, status as 400 | 403 | 404 | 502)
    }
  })

  route.post("/sync/compare", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const compare = asRecord(payload?.compare)
    const repository = asRecord(payload?.repository)
    const connectionId = asString(payload?.connectionId)
    const base = asString(compare?.base)
    const head = asString(compare?.head)

    if (!workspaceId || !connectionId || !base || !head) {
      return context.json(
        {
          message: "connectionId, compare.base, compare.head, and workspaceId are required",
          status: 400,
        },
        400,
      )
    }

    try {
      const resolved = await resolveGitHubSyncContextFromPayload({
        auth,
        connectionId,
        foundationService,
        githubInstallationService,
        repository,
        workspaceId,
      })

      const result = await githubSyncService.syncCompareRange({
        auth: resolved.auth,
        compare: {
          base,
          head,
        },
        connectionId,
        repository: resolved.repository,
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub compare sync failed"
      const status = getErrorStatus(message, 502)
      return context.json({ message, status }, status as 400 | 403 | 404 | 502)
    }
  })

  route.post("/sync/merged-pulls", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const repository = asRecord(payload?.repository)
    const connectionId = asString(payload?.connectionId)
    const pullNumbers = asPositiveIntegerArray(payload?.pullNumbers)
    const token = asString(auth?.token)
    const strategy = asGitHubTokenStrategy(auth?.strategy)
    const owner = asString(repository?.owner)
    const repo = asString(repository?.repo)
    const installationId = asString(repository?.installationId)

    if (auth !== null && repository !== null) {
      if (!workspaceId || !connectionId || !pullNumbers || !token || !strategy || !owner || !repo) {
        return context.json(
          {
            message:
              "connectionId, auth.token, auth.strategy, repository.owner, repository.repo, and a non-empty pullNumbers array are required",
            status: 400,
          },
          400,
        )
      }
    } else if (auth !== null || repository !== null) {
      return context.json(
        {
          message: "auth and repository must be provided together for merged pull sync",
          status: 400,
        },
        400,
      )
    } else if (!workspaceId || !connectionId || !pullNumbers) {
      return context.json(
        {
          message: "connectionId, a non-empty pullNumbers array, and workspaceId are required",
          status: 400,
        },
        400,
      )
    }

    try {
      const resolved =
        token && strategy && owner && repo
          ? {
              auth: {
                ...createClientSuppliedGitHubSyncAuth(token, strategy),
              },
              repository: {
                installationId,
                owner,
                provider: "github",
                repo,
              } satisfies GitHubRepositoryScope,
            }
          : await resolveStoredGitHubSyncContext(
              foundationService,
              githubInstallationService,
              workspaceId,
              connectionId,
            )

      const result = await githubSyncService.syncMergedPullRequests({
        auth: resolved.auth,
        connectionId,
        pullNumbers,
        repository: resolved.repository,
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub merged pull sync failed"
      const status = getErrorStatus(message, 502)
      return context.json({ message, status }, status as 400 | 403 | 404 | 502)
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
    const tag = asString(release?.tag)
    const releaseId = asPositiveInteger(release?.releaseId)
    const hasTag = Boolean(tag)
    const hasReleaseId = releaseId !== null

    if (!workspaceId || !connectionId || hasTag === hasReleaseId) {
      return context.json(
        {
          message: "connectionId, workspaceId, and exactly one of release.tag or release.releaseId are required",
          status: 400,
        },
        400,
      )
    }

    try {
      const resolved = await resolveGitHubSyncContextFromPayload({
        auth,
        connectionId,
        foundationService,
        githubInstallationService,
        repository,
        workspaceId,
      })

      const result = await githubSyncService.syncRelease({
        auth: resolved.auth,
        connectionId,
        release:
          releaseId !== null
            ? {
                releaseId,
              }
            : {
                tag: tag!,
              },
        repository: resolved.repository,
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub release sync failed"
      const status = getErrorStatus(message, 502)
      return context.json({ message, status }, status as 400 | 403 | 404 | 502)
    }
  })

  route.post("/sync/release/preview", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const repository = asRecord(payload?.repository)
    const release = asRecord(payload?.release)
    const connectionId = asString(payload?.connectionId)
    const tag = asString(release?.tag)
    const releaseId = asPositiveInteger(release?.releaseId)
    const hasTag = Boolean(tag)
    const hasReleaseId = releaseId !== null

    if (!workspaceId || !connectionId || hasTag === hasReleaseId) {
      return context.json(
        {
          message: "connectionId, workspaceId, and exactly one of release.tag or release.releaseId are required",
          status: 400,
        },
        400,
      )
    }

    try {
      const resolved = await resolveGitHubSyncContextFromPayload({
        auth,
        connectionId,
        foundationService,
        githubInstallationService,
        repository,
        workspaceId,
      })

      const result = await githubSyncService.previewRelease({
        auth: resolved.auth,
        connectionId,
        release:
          releaseId !== null
            ? {
                releaseId,
              }
            : {
                tag: tag!,
              },
        repository: resolved.repository,
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub release preview failed"
      const status = getErrorStatus(message, 502)
      return context.json({ message, status }, status as 400 | 403 | 404 | 502)
    }
  })

  route.post("/sync/since-date/preview", async (context) => {
    const workspaceId = context.req.param("workspaceId")
    const body = await context.req.json().catch(() => null)
    const payload = asRecord(body)
    const auth = asRecord(payload?.auth)
    const repository = asRecord(payload?.repository)
    const connectionId = asString(payload?.connectionId)
    const sinceDate = asString(payload?.sinceDate)

    if (!workspaceId || !connectionId || !sinceDate) {
      return context.json(
        {
          message: "connectionId, sinceDate, and workspaceId are required",
          status: 400,
        },
        400,
      )
    }

    try {
      const resolved = await resolveGitHubSyncContextFromPayload({
        auth,
        connectionId,
        foundationService,
        githubInstallationService,
        repository,
        workspaceId,
      })

      const result = await githubSyncService.previewSinceDate({
        auth: resolved.auth,
        connectionId,
        repository: resolved.repository,
        sinceDate,
        workspaceId,
      })

      return context.json(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub since-date preview failed"
      const status = getErrorStatus(message, 502)
      return context.json({ message, status }, status as 400 | 403 | 404 | 502)
    }
  })

  return route
}
