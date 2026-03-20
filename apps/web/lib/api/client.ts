const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787"

type RuntimeEnv = {
  NEXT_PUBLIC_API_BASE_URL?: string | undefined
}

type FetchLike = typeof fetch

export type ApiSession = {
  session: {
    createdAt: Date | string
    expiresAt: Date | string
    id: string
    updatedAt: Date | string
    userId: string
  }
  user: {
    createdAt: Date | string
    email: string
    emailVerified: boolean
    id: string
    image?: string | null
    name: string
    updatedAt: Date | string
  }
}

export type ReleaseRecordSnapshot = {
  claimCandidates: Array<{
    createdAt: string
    evidenceBlockIds: string[]
    id: string
    releaseRecordId: string
    sentence: string
    status: "pending" | "flagged" | "approved" | "rejected"
    updatedAt: string
  }>
  evidenceBlocks: Array<{
    body: string | null
    capturedAt: string
    evidenceState: "fresh" | "stale" | "missing" | "unsupported"
    id: string
    provider: "github" | "linear"
    releaseRecordId: string
    sourceRef: string
    sourceType: "pull_request" | "commit" | "release" | "ticket" | "document"
    title: string
  }>
  releaseRecord: {
    compareRange: string | null
    connectionId: string
    createdAt: string
    id: string
    stage: "intake" | "draft" | "claim_check" | "approval" | "publish_pack"
    summary: string | null
    title: string
    updatedAt: string
    workspaceId: string
  }
  reviewStatuses: Array<{
    id: string
    note: string | null
    ownerUserId: string | null
    releaseRecordId: string
    stage: "intake" | "draft" | "claim_check" | "approval" | "publish_pack"
    state: "pending" | "blocked" | "approved"
    updatedAt: string
  }>
  sourceLinks: Array<{
    id: string
    label: string
    provider: "github" | "linear"
    releaseRecordId: string
    url: string
  }>
}

type CreateApiClientOptions = {
  baseUrl?: string
  fetch?: FetchLike
}

type ApiErrorPayload = {
  message?: string
  status?: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function normalizeApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "")
}

function mergeHeaders(headers?: HeadersInit) {
  const resolvedHeaders = new Headers(headers)

  if (!resolvedHeaders.has("content-type")) {
    resolvedHeaders.set("content-type", "application/json")
  }

  return Object.fromEntries(resolvedHeaders.entries())
}

export function getApiBaseUrl(env: RuntimeEnv | NodeJS.ProcessEnv = process.env) {
  const configuredBaseUrl = env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL
  }

  return normalizeApiBaseUrl(configuredBaseUrl)
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl ?? getApiBaseUrl())
  const fetchImplementation = options.fetch ?? globalThis.fetch

  if (!fetchImplementation) {
    throw new Error("fetch is required to create the PulseNote API client")
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: mergeHeaders(init.headers),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const error = payload as ApiErrorPayload | null

      throw new ApiError(error?.message ?? "Request failed", response.status, payload)
    }

    return readJson<T>(response)
  }

  return {
    getSession(init?: RequestInit) {
      return request<ApiSession>("/v1/session", init)
    },
    getReleaseRecord(workspaceId: string, releaseRecordId: string, init?: RequestInit) {
      return request<ReleaseRecordSnapshot>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-records/${encodeURIComponent(releaseRecordId)}`,
        init,
      )
    },
    listReleaseRecords(workspaceId: string, init?: RequestInit) {
      return request<ReleaseRecordSnapshot[]>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-records`,
        init,
      )
    },
  }
}
