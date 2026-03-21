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
const workflowAllowedActionSchema = z.enum([
  "create_draft",
  "run_claim_check",
  "request_approval",
  "approve_draft",
  "reopen_draft",
  "create_publish_pack",
])
const workflowReadinessSchema = z.enum(["blocked", "attention", "ready"])
const claimCheckStateSchema = z.enum(["not_started", "blocked", "cleared"])
const approvalStateSchema = z.enum(["not_requested", "pending", "approved", "reopened"])
const publishPackStateSchema = z.enum(["not_ready", "ready", "exported"])
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

const workflowCurrentDraftSchema = z.object({
  changelogBody: z.string(),
  createdAt: z.string(),
  createdByUserId: z.string().nullable(),
  id: z.string(),
  releaseNotesBody: z.string(),
  version: z.number().int(),
})

const claimCheckResultSchema = z.object({
  createdAt: z.string(),
  draftRevisionId: z.string(),
  evidenceBlockIds: z.array(z.string()),
  id: z.string(),
  note: z.string().nullable(),
  releaseRecordId: z.string(),
  sentence: z.string(),
  status: claimStatusSchema,
  updatedAt: z.string(),
})

const workflowClaimCheckSummarySchema = z.object({
  blockerNotes: z.array(z.string()),
  draftRevisionId: z.string().nullable(),
  flaggedClaims: z.number().int(),
  items: z.array(claimCheckResultSchema),
  state: claimCheckStateSchema,
  totalClaims: z.number().int(),
})

const workflowApprovalSummarySchema = z.object({
  draftRevisionId: z.string().nullable(),
  note: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  state: approvalStateSchema,
  updatedAt: z.string().nullable(),
})

const workflowPublishPackSummarySchema = z.object({
  draftRevisionId: z.string().nullable(),
  exportId: z.string().nullable(),
  exportedAt: z.string().nullable(),
  state: publishPackStateSchema,
})

const releaseWorkflowListItemSchema = z.object({
  allowedActions: z.array(workflowAllowedActionSchema),
  approvalSummary: workflowApprovalSummarySchema,
  claimCheckSummary: workflowClaimCheckSummarySchema.omit({ items: true }),
  currentDraft: workflowCurrentDraftSchema.pick({
    createdAt: true,
    id: true,
    version: true,
  }).nullable(),
  evidenceCount: z.number().int(),
  latestPublishPackSummary: workflowPublishPackSummarySchema,
  readiness: workflowReadinessSchema,
  releaseRecord: z.object({
    compareRange: z.string().nullable(),
    createdAt: z.string(),
    id: z.string(),
    stage: releaseStageSchema,
    summary: z.string().nullable(),
    title: z.string(),
    updatedAt: z.string(),
    workspaceId: z.string(),
  }),
  sourceLinkCount: z.number().int(),
})

const releaseWorkflowDetailSchema = z.object({
  allowedActions: z.array(workflowAllowedActionSchema),
  approvalSummary: workflowApprovalSummarySchema,
  claimCheckSummary: workflowClaimCheckSummarySchema,
  currentDraft: workflowCurrentDraftSchema.nullable(),
  evidenceBlocks: releaseRecordSnapshotSchema.shape.evidenceBlocks,
  latestPublishPackSummary: workflowPublishPackSummarySchema,
  readiness: workflowReadinessSchema,
  releaseRecord: releaseRecordSnapshotSchema.shape.releaseRecord,
  reviewStatuses: releaseRecordSnapshotSchema.shape.reviewStatuses,
  sourceLinks: releaseRecordSnapshotSchema.shape.sourceLinks,
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
export type ReleaseWorkflowDetail = z.infer<typeof releaseWorkflowDetailSchema>
export type ReleaseWorkflowListItem = z.infer<typeof releaseWorkflowListItemSchema>
export type WorkflowAllowedAction = z.infer<typeof workflowAllowedActionSchema>
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

type CreateReleaseWorkflowDraftPayload = {
  changelogBody?: string
  expectedLatestDraftRevisionId?: string | null
  releaseNotesBody?: string
}

type ReleaseWorkflowDraftCommandPayload = {
  expectedDraftRevisionId: string
  note?: string
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

function resolveConfiguredApiBaseUrl(env: RuntimeEnv | NodeJS.ProcessEnv) {
  const configuredBaseUrl = env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return normalizeApiBaseUrl(configuredBaseUrl)
  }

  throw new Error("NEXT_PUBLIC_API_BASE_URL is required")
}

function mergeHeaders(init: RequestInit = {}) {
  const { body, headers } = init
  const resolvedHeaders = new Headers(headers)

  if (body !== undefined && !resolvedHeaders.has("content-type")) {
    resolvedHeaders.set("content-type", "application/json")
  }

  return Object.fromEntries(resolvedHeaders.entries())
}

export function getApiBaseUrl(env?: RuntimeEnv | NodeJS.ProcessEnv) {
  if (env) {
    return resolveConfiguredApiBaseUrl(env)
  }

  return resolveConfiguredApiBaseUrl({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  })
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
    getReleaseWorkflowDetail(workspaceId: string, releaseRecordId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}`,
        releaseWorkflowDetailSchema,
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
    listReleaseWorkflow(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow`,
        z.array(releaseWorkflowListItemSchema),
        init,
      )
    },
    approveReleaseWorkflowDraft(
      workspaceId: string,
      releaseRecordId: string,
      payload: ReleaseWorkflowDraftCommandPayload,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/approve`,
        releaseWorkflowDetailSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    createReleaseWorkflowDraft(
      workspaceId: string,
      releaseRecordId: string,
      payload: CreateReleaseWorkflowDraftPayload,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/drafts`,
        releaseWorkflowDetailSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    createReleaseWorkflowPublishPack(
      workspaceId: string,
      releaseRecordId: string,
      payload: ReleaseWorkflowDraftCommandPayload,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/publish-pack`,
        releaseWorkflowDetailSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    reopenReleaseWorkflowDraft(
      workspaceId: string,
      releaseRecordId: string,
      payload: ReleaseWorkflowDraftCommandPayload,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/reopen`,
        releaseWorkflowDetailSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    requestReleaseWorkflowApproval(
      workspaceId: string,
      releaseRecordId: string,
      payload: ReleaseWorkflowDraftCommandPayload,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/request-approval`,
        releaseWorkflowDetailSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    runReleaseWorkflowClaimCheck(
      workspaceId: string,
      releaseRecordId: string,
      payload: ReleaseWorkflowDraftCommandPayload,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/claim-check`,
        releaseWorkflowDetailSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
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
