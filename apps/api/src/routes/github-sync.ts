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

  if (normalizedMessage.includes("not available in production")) {
    return 403
  }

  return fallbackStatus
}

export function createGitHubSyncRoute(
  githubSyncService: GitHubSyncService,
  foundationService?: FoundationService,
  githubInstallationService?: GitHubInstallationService,
) {
  const route = new Hono<AppBindings>()

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

    const token = asString(auth?.token)
    const strategy = asGitHubTokenStrategy(auth?.strategy)
    const owner = asString(repository?.owner)
    const repo = asString(repository?.repo)
    const installationId = asString(repository?.installationId)

    if (auth !== null || repository !== null) {
      if (!token || !strategy || !owner || !repo) {
        return context.json(
          {
            message:
              "connectionId, auth.token, auth.strategy, compare.base, compare.head, repository.owner, and repository.repo are required",
            status: 400,
          },
          400,
        )
      }
    }

    try {
      const resolved =
        token && strategy && owner && repo
          ? {
              auth: {
                strategy,
                token,
              } satisfies GitHubSyncAuth,
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

    if (auth !== null || repository !== null) {
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
                strategy,
                token,
              } satisfies GitHubSyncAuth,
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

    const token = asString(auth?.token)
    const strategy = asGitHubTokenStrategy(auth?.strategy)
    const owner = asString(repository?.owner)
    const repo = asString(repository?.repo)
    const installationId = asString(repository?.installationId)

    if (auth !== null || repository !== null) {
      if (
        !workspaceId ||
        !connectionId ||
        hasTag === hasReleaseId ||
        !token ||
        !strategy ||
        !owner ||
        !repo
      ) {
        return context.json(
          {
            message:
              "connectionId, auth.token, auth.strategy, repository.owner, repository.repo, and exactly one of release.tag or release.releaseId are required",
            status: 400,
          },
          400,
        )
      }
    } else if (!workspaceId || !connectionId || hasTag === hasReleaseId) {
      return context.json(
        {
          message: "connectionId, workspaceId, and exactly one of release.tag or release.releaseId are required",
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
                strategy,
                token,
              } satisfies GitHubSyncAuth,
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

  return route
}
