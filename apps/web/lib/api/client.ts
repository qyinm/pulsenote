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
const releaseWorkflowHistoryOutcomeSchema = z.enum([
  "blocked",
  "progressed",
  "revision",
  "signed_off",
])

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
  ownerName: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  requestedByName: z.string().nullable(),
  requestedByUserId: z.string().nullable(),
  state: approvalStateSchema,
  updatedAt: z.string().nullable(),
})

const workflowPublishPackSummarySchema = z.object({
  draftRevisionId: z.string().nullable(),
  exportedByName: z.string().nullable(),
  exportedByUserId: z.string().nullable(),
  exportId: z.string().nullable(),
  exportedAt: z.string().nullable(),
  includedEvidenceCount: z.number().int(),
  includedSourceLinkCount: z.number().int(),
  includesEvidenceLinks: z.boolean(),
  includesSourceLinks: z.boolean(),
  state: publishPackStateSchema,
})

const workflowPublishPackArtifactSchema = z.object({
  changelogBody: z.string(),
  context: z.object({
    approvalNote: z.string().nullable(),
    approvalOwnerName: z.string().nullable(),
    approvalOwnerUserId: z.string().nullable(),
    approvalRequestedByName: z.string().nullable(),
    approvalRequestedByUserId: z.string().nullable(),
    approvalState: approvalStateSchema,
    exportedByName: z.string().nullable(),
    exportedByUserId: z.string().nullable(),
  }),
  evidenceSnapshots: z.array(
    z.object({
      capturedAt: z.string(),
      evidenceBlockId: z.string(),
      evidenceState: evidenceStateSchema,
      sourceRef: z.string(),
      sourceType: evidenceSourceTypeSchema,
      title: z.string(),
    }),
  ),
  exportId: z.string(),
  exportedAt: z.string(),
  policy: z.object({
    includeEvidenceLinksInExport: z.boolean(),
    includeSourceLinksInExport: z.boolean(),
  }),
  releaseNotesBody: z.string(),
  sourceSnapshots: z.array(
    z.object({
      label: z.string(),
      sourceLinkId: z.string(),
      url: z.string().url(),
    }),
  ),
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
  latestPublishPackArtifact: workflowPublishPackArtifactSchema.nullable(),
  latestPublishPackSummary: workflowPublishPackSummarySchema,
  readiness: workflowReadinessSchema,
  releaseRecord: releaseRecordSnapshotSchema.shape.releaseRecord,
  reviewStatuses: releaseRecordSnapshotSchema.shape.reviewStatuses,
  sourceLinks: releaseRecordSnapshotSchema.shape.sourceLinks,
})

const releaseWorkflowHistoryEntrySchema = z.object({
  actorName: z.string().nullable(),
  actorUserId: z.string().nullable(),
  createdAt: z.string(),
  draftRevisionId: z.string().nullable(),
  draftVersion: z.number().int().nullable(),
  eventLabel: z.string(),
  eventType: z.enum([
    "draft_created",
    "claim_check_completed",
    "approval_requested",
    "draft_approved",
    "draft_reopened",
    "publish_pack_created",
  ]),
  evidenceCount: z.number().int(),
  id: z.string(),
  note: z.string().nullable(),
  outcome: releaseWorkflowHistoryOutcomeSchema,
  publishPackExportId: z.string().nullable(),
  releaseRecordId: z.string(),
  releaseTitle: z.string(),
  sourceLinkCount: z.number().int(),
  stage: releaseStageSchema,
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

const workspaceMemberSchema = z.object({
  membership: workspaceChoiceSchema.shape.membership,
  user: z.object({
    email: z.string().email(),
    fullName: z.string().nullable(),
    id: z.string(),
  }),
})

const workspacePolicySettingsSchema = z.object({
  createdAt: z.string(),
  includeEvidenceLinksInExport: z.boolean(),
  includeSourceLinksInExport: z.boolean(),
  requireClaimCheckBeforeApproval: z.boolean(),
  requireReviewerAssignment: z.boolean(),
  showBlockedClaimsInInbox: z.boolean(),
  showPendingApprovalsInInbox: z.boolean(),
  showReopenedDraftsInInbox: z.boolean(),
  updatedAt: z.string(),
  workspaceId: z.string(),
})

const githubInstallUrlSchema = z.object({
  url: z.string().url(),
})

const githubInstallationRepositorySchema = z.object({
  defaultBranch: z.string().nullable(),
  fullName: z.string(),
  id: z.number().int(),
  name: z.string(),
  owner: z.string(),
  url: z.string().url(),
})

const githubConnectionSchema = z.object({
  connectedAt: z.string(),
  connectionId: z.string(),
  installationId: z.string(),
  lastSyncedAt: z.string().nullable(),
  repositoryName: z.string(),
  repositoryOwner: z.string(),
  repositoryUrl: z.string().url(),
  status: integrationStatusSchema,
})

const githubSyncCompareResultSchema = z.object({
  claimCandidateCount: z.number().int(),
  comparison: z.object({
    aheadBy: z.number().int(),
    behindBy: z.number().int(),
    commits: z.array(
      z.object({
        committedAt: z.string().nullable(),
        message: z.string(),
        sha: z.string(),
      }),
    ),
    files: z.array(
      z.object({
        additions: z.number().int(),
        changes: z.number().int(),
        deletions: z.number().int(),
        filename: z.string(),
        patch: z.string().nullable(),
        status: z.string(),
      }),
    ),
    mergeBaseSha: z.string().nullable(),
    totalCommits: z.number().int(),
  }),
  evidenceBlockCount: z.number().int(),
  releaseRecordId: z.string(),
  scope: z.string(),
  sourceLinkCount: z.number().int(),
  syncRunId: z.string(),
})

const githubScopePreviewSchema = z.object({
  changedFileCount: z.number().int(),
  commits: githubSyncCompareResultSchema.shape.comparison.shape.commits,
  compareRange: z.string().nullable(),
  defaultBranch: z.string().nullable(),
  expectedClaimCandidateCount: z.number().int(),
  expectedEvidenceBlockCount: z.number().int(),
  expectedSourceLinkCount: z.number().int(),
  files: githubSyncCompareResultSchema.shape.comparison.shape.files,
  mode: z.enum(["compare", "release", "since_date"]),
  previewNotes: z.array(z.string()),
  release: z
    .object({
      assets: z.array(
        z.object({
          contentType: z.string().nullable(),
          downloadUrl: z.string().url(),
          name: z.string(),
          size: z.number().int(),
        }),
      ),
      body: z.string().nullable(),
      createdAt: z.string(),
      draft: z.boolean(),
      htmlUrl: z.string().url(),
      id: z.number().int(),
      name: z.string().nullable(),
      prerelease: z.boolean(),
      publishedAt: z.string().nullable(),
      tagName: z.string(),
      targetCommitish: z.string(),
    })
    .nullable(),
  resolvedCompare: z
    .object({
      base: z.string(),
      head: z.string(),
    })
    .nullable(),
  scopeLabel: z.string(),
  sinceDate: z.string().nullable(),
  summary: z.string(),
  title: z.string(),
  totalCommits: z.number().int(),
})

const githubSyncReleaseResultSchema = z.object({
  claimCandidateCount: z.number().int(),
  evidenceBlockCount: z.number().int(),
  release: z.object({
    assets: z.array(
      z.object({
        contentType: z.string().nullable(),
        downloadUrl: z.string().url(),
        name: z.string(),
        size: z.number().int(),
      }),
    ),
    body: z.string().nullable(),
    createdAt: z.string(),
    draft: z.boolean(),
    htmlUrl: z.string().url(),
    id: z.number().int(),
    name: z.string().nullable(),
    prerelease: z.boolean(),
    publishedAt: z.string().nullable(),
    tagName: z.string(),
    targetCommitish: z.string(),
  }),
  releaseRecordId: z.string(),
  scope: z.string(),
  sourceLinkCount: z.number().int(),
})

export type ApiSession = z.infer<typeof apiSessionSchema>
export type GitHubConnection = z.infer<typeof githubConnectionSchema>
export type GitHubInstallationRepository = z.infer<typeof githubInstallationRepositorySchema>
export type GitHubScopePreview = z.infer<typeof githubScopePreviewSchema>
export type ReleaseRecordSnapshot = z.infer<typeof releaseRecordSnapshotSchema>
export type ReleaseWorkflowDetail = z.infer<typeof releaseWorkflowDetailSchema>
export type ReleaseWorkflowHistoryEntry = z.infer<typeof releaseWorkflowHistoryEntrySchema>
export type ReleaseWorkflowListItem = z.infer<typeof releaseWorkflowListItemSchema>
export type WorkflowAllowedAction = z.infer<typeof workflowAllowedActionSchema>
export type WorkspaceChoice = z.infer<typeof workspaceChoiceSchema>
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>
export type WorkspacePolicySettings = z.infer<typeof workspacePolicySettingsSchema>
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

type ReleaseWorkflowApprovalCommandPayload = ReleaseWorkflowDraftCommandPayload & {
  reviewerUserId?: string
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
    beginGitHubInstall(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/github/install-url`,
        githubInstallUrlSchema,
        init,
      )
    },
    connectGitHubRepository(
      workspaceId: string,
      payload: {
        installationId: string
        state: string
        repository: {
          name: string
          owner: string
          url: string
        }
      },
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/github`,
        githubConnectionSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "PUT",
        },
      )
    },
    disconnectGitHubConnection(workspaceId: string, init?: RequestInit) {
      return fetchImplementation(
        `${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/github`,
        {
          ...init,
          credentials: "include",
          headers: mergeHeaders(init),
          method: "DELETE",
        },
      ).then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const error = payload as ApiErrorPayload | null
          throw new ApiError(error?.message ?? "Request failed", response.status, payload)
        }
      })
    },
    getCurrentWorkspace(init?: RequestInit) {
      return request("/v1/workspaces/current", workspaceSnapshotSchema, init)
    },
    getWorkspacePolicySettings(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/settings`,
        workspacePolicySettingsSchema,
        init,
      )
    },
    getGitHubConnection(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/github`,
        githubConnectionSchema,
        init,
      )
    },
    listWorkspaceChoices(init?: RequestInit) {
      return request("/v1/workspaces/choices", z.array(workspaceChoiceSchema), init)
    },
    listWorkspaceMembers(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
        z.array(workspaceMemberSchema),
        init,
      )
    },
    updateWorkspacePolicySettings(
      workspaceId: string,
      payload: Pick<
        WorkspacePolicySettings,
        | "includeEvidenceLinksInExport"
        | "includeSourceLinksInExport"
        | "requireClaimCheckBeforeApproval"
        | "requireReviewerAssignment"
        | "showBlockedClaimsInInbox"
        | "showPendingApprovalsInInbox"
        | "showReopenedDraftsInInbox"
      >,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/settings`,
        workspacePolicySettingsSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "PUT",
        },
      )
    },
    listGitHubInstallationRepositories(
      workspaceId: string,
      installationId: string,
      state: string,
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/github/installations/${encodeURIComponent(installationId)}/repositories?state=${encodeURIComponent(state)}`,
        z.array(githubInstallationRepositorySchema),
        init,
      )
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
    getReleaseWorkflowHistory(workspaceId: string, releaseRecordId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/${encodeURIComponent(releaseRecordId)}/history`,
        z.array(releaseWorkflowHistoryEntrySchema),
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
    listReleaseWorkflowHistory(workspaceId: string, init?: RequestInit) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/release-workflow/history`,
        z.array(releaseWorkflowHistoryEntrySchema),
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
      payload: ReleaseWorkflowApprovalCommandPayload,
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
    syncGitHubCompare(
      workspaceId: string,
      payload: {
        compare: {
          base: string
          head: string
        }
        connectionId: string
      },
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/github/sync/compare`,
        githubSyncCompareResultSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    previewGitHubCompare(
      workspaceId: string,
      payload: {
        compare: {
          base: string
          head: string
        }
        connectionId: string
      },
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/github/sync/compare/preview`,
        githubScopePreviewSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    previewGitHubRelease(
      workspaceId: string,
      payload: {
        connectionId: string
        release: {
          releaseId?: number
          tag?: string
        }
      },
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/github/sync/release/preview`,
        githubScopePreviewSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    previewGitHubSinceDate(
      workspaceId: string,
      payload: {
        connectionId: string
        sinceDate: string
      },
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/github/sync/since-date/preview`,
        githubScopePreviewSchema,
        {
          ...init,
          body: JSON.stringify(payload),
          method: "POST",
        },
      )
    },
    syncGitHubRelease(
      workspaceId: string,
      payload: {
        connectionId: string
        release: {
          releaseId?: number
          tag?: string
        }
      },
      init?: RequestInit,
    ) {
      return request(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/github/sync/release`,
        githubSyncReleaseResultSchema,
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
