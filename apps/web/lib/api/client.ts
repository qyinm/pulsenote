import { z } from "zod"

type RuntimeEnv = {
  NEXT_PUBLIC_API_BASE_URL?: string | undefined
}

type FetchLike = typeof fetch

const integrationProviderSchema = z.enum(["github", "linear"])
const releaseStageSchema = z.enum(["intake", "draft", "claim_check", "approval", "publish_pack"])
const reviewStateSchema = z.enum(["pending", "blocked", "approved"])
const claimStatusSchema = z.enum(["pending", "flagged", "approved", "rejected"])
const evidenceStateSchema = z.enum(["fresh", "stale", "missing", "unsupported"])
const evidenceSourceTypeSchema = z.enum(["pull_request", "commit", "release", "ticket", "document"])
const workspaceMembershipRoleSchema = z.enum(["owner", "member"])
const integrationStatusSchema = z.enum(["active", "disconnected"])
const syncRunStatusSchema = z.enum(["queued", "running", "succeeded", "failed"])

const apiSessionSchema = z.object({
  session: z.object({
    createdAt: z.string(),
    expiresAt: z.string(),
    id: z.string(),
    updatedAt: z.string(),
    userId: z.string(),
  }),
  user: z.object({
    createdAt: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    id: z.string(),
    image: z.string().nullable().optional(),
    name: z.string(),
    updatedAt: z.string(),
  }),
})

const releaseRecordSnapshotSchema = z.object({
  claimCandidates: z.array(
    z.object({
      createdAt: z.string(),
      evidenceBlockIds: z.array(z.string()),
      id: z.string(),
      releaseRecordId: z.string(),
      sentence: z.string(),
      status: claimStatusSchema,
      updatedAt: z.string(),
    }),
  ),
  evidenceBlocks: z.array(
    z.object({
      body: z.string().nullable(),
      capturedAt: z.string(),
      evidenceState: evidenceStateSchema,
      id: z.string(),
      provider: integrationProviderSchema,
      releaseRecordId: z.string(),
      sourceRef: z.string(),
      sourceType: evidenceSourceTypeSchema,
      title: z.string(),
    }),
  ),
  releaseRecord: z.object({
    compareRange: z.string().nullable(),
    connectionId: z.string(),
    createdAt: z.string(),
    id: z.string(),
    stage: releaseStageSchema,
    summary: z.string().nullable(),
    title: z.string(),
    updatedAt: z.string(),
    workspaceId: z.string(),
  }),
  reviewStatuses: z.array(
    z.object({
      id: z.string(),
      note: z.string().nullable(),
      ownerUserId: z.string().nullable(),
      releaseRecordId: z.string(),
      stage: releaseStageSchema,
      state: reviewStateSchema,
      updatedAt: z.string(),
    }),
  ),
  sourceLinks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      provider: integrationProviderSchema,
      releaseRecordId: z.string(),
      url: z.string().url(),
    }),
  ),
})

const workspaceSnapshotSchema = z.object({
  integrationAccounts: z.array(
    z.object({
      accountLabel: z.string(),
      accountUrl: z.string().nullable(),
      connectionId: z.string(),
      createdAt: z.string(),
      id: z.string(),
      provider: integrationProviderSchema,
    }),
  ),
  integrations: z.array(
    z.object({
      connectedAt: z.string(),
      externalAccountId: z.string(),
      id: z.string(),
      lastSyncedAt: z.string().nullable(),
      provider: integrationProviderSchema,
      status: integrationStatusSchema,
      workspaceId: z.string(),
    }),
  ),
  memberships: z.array(
    z.object({
      createdAt: z.string(),
      id: z.string(),
      role: workspaceMembershipRoleSchema,
      userId: z.string(),
      workspaceId: z.string(),
    }),
  ),
  sourceCursors: z.array(
    z.object({
      connectionId: z.string(),
      id: z.string(),
      key: z.string(),
      updatedAt: z.string(),
      value: z.string(),
    }),
  ),
  syncRuns: z.array(
    z.object({
      connectionId: z.string(),
      errorMessage: z.string().nullable(),
      finishedAt: z.string().nullable(),
      id: z.string(),
      scope: z.string(),
      startedAt: z.string(),
      status: syncRunStatusSchema,
      workspaceId: z.string(),
    }),
  ),
  workspace: z.object({
    createdAt: z.string(),
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    updatedAt: z.string(),
  }),
})

const workspaceChoiceSchema = z.object({
  membership: z.object({
    createdAt: z.string(),
    id: z.string(),
    role: workspaceMembershipRoleSchema,
    userId: z.string(),
    workspaceId: z.string(),
  }),
  workspace: z.object({
    createdAt: z.string(),
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    updatedAt: z.string(),
  }),
})

export type ApiSession = z.infer<typeof apiSessionSchema>
export type ReleaseRecordSnapshot = z.infer<typeof releaseRecordSnapshotSchema>
export type WorkspaceChoice = z.infer<typeof workspaceChoiceSchema>
export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>

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

function mergeHeaders(init: RequestInit = {}) {
  const { body, headers } = init
  const resolvedHeaders = new Headers(headers)

  if (body !== undefined && !resolvedHeaders.has("content-type")) {
    resolvedHeaders.set("content-type", "application/json")
  }

  return Object.fromEntries(resolvedHeaders.entries())
}

export function getApiBaseUrl(env: RuntimeEnv | NodeJS.ProcessEnv = process.env) {
  const configuredBaseUrl = env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return normalizeApiBaseUrl(configuredBaseUrl)
  }

  throw new Error("NEXT_PUBLIC_API_BASE_URL is required")
}

async function readJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await response.json())
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl ?? getApiBaseUrl())
  const fetchImplementation = options.fetch ?? globalThis.fetch

  if (!fetchImplementation) {
    throw new Error("fetch is required to create the PulseNote API client")
  }

  async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: mergeHeaders(init),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const error = payload as ApiErrorPayload | null

      throw new ApiError(error?.message ?? "Request failed", response.status, payload)
    }

    return readJson(response, schema)
  }

  return {
    bootstrapCurrentUserWorkspace(
      payload: {
        workspace: {
          name: string
          slug: string
        }
      },
      init?: RequestInit,
    ) {
      return request("/v1/workspaces/bootstrap-current-user", workspaceSnapshotSchema, {
        ...init,
        body: JSON.stringify(payload),
        method: "POST",
      })
    },
    getCurrentWorkspace(init?: RequestInit) {
      return request("/v1/workspaces/current", workspaceSnapshotSchema, init)
    },
    listWorkspaceChoices(init?: RequestInit) {
      return request("/v1/workspaces/choices", z.array(workspaceChoiceSchema), init)
    },
    getSession(init?: RequestInit) {
      return request("/v1/session", apiSessionSchema, init)
    },
    getReleaseRecord(workspaceId: string, releaseRecordId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-records/${encodeURIComponent(releaseRecordId)}`,
        releaseRecordSnapshotSchema,
        init,
      )
    },
    listReleaseRecords(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-records`,
        z.array(releaseRecordSnapshotSchema),
        init,
      )
    },
    setCurrentWorkspace(
      payload: {
        workspaceId: string
      },
      init?: RequestInit,
    ) {
      return request("/v1/workspaces/current", workspaceSnapshotSchema, {
        ...init,
        body: JSON.stringify(payload),
        method: "PUT",
      })
    },
  }
}
