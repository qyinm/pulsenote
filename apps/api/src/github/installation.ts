import { createPrivateKey, sign } from "node:crypto"

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
    getInstallUrl() {
      const githubAppSlug = requireRuntimeEnv(runtimeEnv.githubAppSlug, "GITHUB_APP_SLUG")
      return `https://github.com/apps/${githubAppSlug}/installations/new`
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
