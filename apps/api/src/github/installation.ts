import { createHmac, createPrivateKey, sign, timingSafeEqual } from "node:crypto"

import { Octokit } from "octokit"

import type { AppRuntimeEnv } from "../types.js"
import type { GitHubSyncAuth } from "./models.js"

type GitHubInstallationRepository = {
  defaultBranch: string | null
  fullName: string
  id: number
  name: string
  owner: string
  url: string
}

type CreateGitHubInstallationServiceDependencies = {
  fetch?: typeof fetch
  now?: () => Date
}

type GitHubInstallStateClaims = {
  issuedAt: number
  userId: string
  workspaceId: string
}

function base64UrlEncode(input: Buffer | string) {
  const buffer = typeof input === "string" ? Buffer.from(input) : input
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function requireRuntimeEnv(value: string | null, fieldName: string) {
  if (!value) {
    throw new Error(`${fieldName} is required for GitHub App integration`)
  }

  return value
}

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T
}

export type GitHubInstallationService = ReturnType<typeof createGitHubInstallationService>

export function createGitHubInstallationService(
  runtimeEnv: AppRuntimeEnv,
  dependencies: CreateGitHubInstallationServiceDependencies = {},
) {
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch
  const now = dependencies.now ?? (() => new Date())

  if (!fetchImplementation) {
    throw new Error("fetch is required for GitHub installation service")
  }

  function createStateSignature(encodedPayload: string) {
    const secret =
      runtimeEnv.betterAuthSecret?.trim() ||
      runtimeEnv.githubAppPrivateKey?.trim() ||
      runtimeEnv.githubAppId?.trim()

    if (!secret) {
      throw new Error("GitHub App state signing is unavailable")
    }

    return createHmac("sha256", secret).update(encodedPayload).digest()
  }

  function createInstallState(input: { userId: string; workspaceId: string }) {
    const payload = base64UrlEncode(
      JSON.stringify({
        issuedAt: now().getTime(),
        userId: input.userId,
        workspaceId: input.workspaceId,
      } satisfies GitHubInstallStateClaims),
    )
    const signature = base64UrlEncode(createStateSignature(payload))

    return `${payload}.${signature}`
  }

  function createAppJwt() {
    const githubAppId = requireRuntimeEnv(runtimeEnv.githubAppId, "GITHUB_APP_ID")
    const githubAppPrivateKey = requireRuntimeEnv(
      runtimeEnv.githubAppPrivateKey,
      "GITHUB_APP_PRIVATE_KEY",
    )
    const issuedAt = Math.floor(now().getTime() / 1000) - 60
    const expiresAt = issuedAt + 9 * 60
    const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    const encodedPayload = base64UrlEncode(
      JSON.stringify({
        exp: expiresAt,
        iat: issuedAt,
        iss: githubAppId,
      }),
    )
    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    const signature = sign("RSA-SHA256", Buffer.from(unsignedToken), createPrivateKey(githubAppPrivateKey))

    return `${unsignedToken}.${base64UrlEncode(signature)}`
  }

  return {
    getInstallUrl(input: { userId: string; workspaceId: string }) {
      const githubAppSlug = requireRuntimeEnv(runtimeEnv.githubAppSlug, "GITHUB_APP_SLUG")
      const url = new URL(`https://github.com/apps/${githubAppSlug}/installations/new`)
      url.searchParams.set("state", createInstallState(input))
      return url.toString()
    },

    verifyInstallState(input: { state: string; userId: string; workspaceId: string }) {
      if (!input.state.trim()) {
        throw new Error("state is required")
      }

      const [encodedPayload, encodedSignature] = input.state.split(".")

      if (!encodedPayload || !encodedSignature) {
        throw new Error("GitHub install state is invalid")
      }

      const expectedSignature = createStateSignature(encodedPayload)
      const providedSignature = Buffer.from(encodedSignature, "base64url")

      if (
        expectedSignature.length !== providedSignature.length ||
        !timingSafeEqual(expectedSignature, providedSignature)
      ) {
        throw new Error("GitHub install state is invalid")
      }

      const claims = decodeBase64UrlJson<GitHubInstallStateClaims>(encodedPayload)
      const maxAgeMs = 15 * 60 * 1000

      if (typeof claims.issuedAt !== "number" || now().getTime() - claims.issuedAt > maxAgeMs) {
        throw new Error("GitHub install state has expired")
      }

      if (claims.userId !== input.userId || claims.workspaceId !== input.workspaceId) {
        throw new Error("GitHub install state does not match the current workspace")
      }
    },

    async createInstallationAuth(installationId: string): Promise<GitHubSyncAuth> {
      if (!installationId.trim()) {
        throw new Error("installationId is required")
      }

      const response = await fetchImplementation(
        `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${createAppJwt()}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          method: "POST",
        },
      )

      if (!response.ok) {
        const payload = await response.text().catch(() => "")
        throw new Error(
          payload.trim() || `GitHub installation token request failed with ${response.status}`,
        )
      }

      const payload = (await response.json()) as { token?: string }

      if (!payload.token) {
        throw new Error("GitHub installation token response did not include a token")
      }

      return {
        source: "github_app_installation",
        strategy: "installation_token",
        token: payload.token,
      }
    },

    async listInstallationRepositories(installationId: string): Promise<GitHubInstallationRepository[]> {
      const auth = await this.createInstallationAuth(installationId)
      const octokit = new Octokit({
        auth: auth.token,
        request: {
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      })
      const response = await octokit.request("GET /installation/repositories")

      return response.data.repositories.map((repository) => ({
        defaultBranch: repository.default_branch ?? null,
        fullName: repository.full_name,
        id: repository.id,
        name: repository.name,
        owner: repository.owner.login,
        url: repository.html_url,
      }))
    },
  }
}
