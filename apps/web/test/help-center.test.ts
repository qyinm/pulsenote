import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceSnapshot,
} from "../lib/api/client.js"
import {
  buildLiveHelpData,
  getServerHelpCenterData,
} from "../lib/help-center.js"

type WorkflowApprovalSummary = ReleaseWorkflowListItem["reviewSummary"]
type WorkflowClaimCheckSummary = ReleaseWorkflowListItem["reviewSummary"]
type WorkflowCurrentDraft = NonNullable<ReleaseWorkflowListItem["currentDraft"]>
type WorkflowPublishPackSummary = ReleaseWorkflowListItem["latestPublishPackSummary"]
type WorkflowReleaseRecord = ReleaseWorkflowListItem["releaseRecord"]

function createWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    integrationAccounts: [],
    integrations: [
      {
        connectedAt: "2026-03-20T00:00:00.000Z",
        externalAccountId: "account_1",
        id: "integration_1",
        lastSyncedAt: "2026-03-20T01:00:00.000Z",
        provider: "github",
        status: "active",
        workspaceId: "workspace_1",
      },
    ],
    memberships: [
      {
        createdAt: "2026-03-20T00:00:00.000Z",
        id: "membership_1",
        role: "owner",
        userId: "user_1",
        workspaceId: "workspace_1",
      },
      {
        createdAt: "2026-03-20T00:00:00.000Z",
        id: "membership_2",
        role: "member",
        userId: "user_2",
        workspaceId: "workspace_1",
      },
    ],
    sourceCursors: [],
    syncRuns: [],
    workspace: {
      createdAt: "2026-03-20T00:00:00.000Z",
      id: "workspace_1",
      name: "PulseNote Release Ops",
      slug: "pulsenote-release-ops",
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

function createWorkflowItem(
  overrides: Omit<
    Partial<ReleaseWorkflowListItem>,
    | "reviewSummary"
    | "reviewSummary"
    | "currentDraft"
    | "latestPublishPackSummary"
    | "releaseRecord"
  > & {
    reviewSummary?: Partial<WorkflowApprovalSummary>
    reviewSummary?: Partial<WorkflowClaimCheckSummary>
    currentDraft?: Partial<WorkflowCurrentDraft> | null
    latestPublishPackSummary?: Partial<WorkflowPublishPackSummary>
    releaseRecord?: Partial<WorkflowReleaseRecord>
  } = {},
): ReleaseWorkflowListItem {
  const {
    reviewSummary = {} as Partial<WorkflowApprovalSummary>,
    reviewSummary = {} as Partial<WorkflowClaimCheckSummary>,
    currentDraft = {},
    latestPublishPackSummary = {} as Partial<WorkflowPublishPackSummary>,
    releaseRecord = {} as Partial<WorkflowReleaseRecord>,
    ...itemOverrides
  } = overrides

  return {
    allowedActions: itemOverrides.allowedActions ?? ["request_review"],
    reviewSummary: {
      draftRevisionId:
        reviewSummary.draftRevisionId === undefined
          ? "draft_1"
          : reviewSummary.draftRevisionId,
      note: reviewSummary.note === undefined ? null : reviewSummary.note,
      ownerName:
        reviewSummary.ownerName === undefined
          ? "Mina Park"
          : reviewSummary.ownerName,
      ownerUserId:
        reviewSummary.ownerUserId === undefined
          ? "user_1"
          : reviewSummary.ownerUserId,
      requestedByName:
        reviewSummary.requestedByName === undefined
          ? "Grace Lee"
          : reviewSummary.requestedByName,
      requestedByUserId:
        reviewSummary.requestedByUserId === undefined
          ? "user_2"
          : reviewSummary.requestedByUserId,
      state: reviewSummary.state ?? "pending",
      updatedAt:
        reviewSummary.updatedAt === undefined
          ? "2026-03-20T01:00:00.000Z"
          : reviewSummary.updatedAt,
    },
    reviewSummary: {
      blockerNotes: reviewSummary.blockerNotes ?? ["Proof is still blocked."],
      draftRevisionId: reviewSummary.draftRevisionId ?? "draft_1",
      flaggedClaims: reviewSummary.flaggedClaims ?? 1,
      state: reviewSummary.state ?? "blocked",
      totalClaims: reviewSummary.totalClaims ?? 2,
    },
    currentDraft:
      currentDraft === null
        ? null
        : {
            createdAt: currentDraft.createdAt ?? "2026-03-20T00:00:00.000Z",
            id: currentDraft.id ?? "draft_1",
            version: currentDraft.version ?? 3,
          },
    evidenceCount: itemOverrides.evidenceCount ?? 3,
    latestPublishPackSummary: {
      draftRevisionId: latestPublishPackSummary.draftRevisionId ?? null,
      exportedByName: latestPublishPackSummary.exportedByName ?? null,
      exportedByUserId: latestPublishPackSummary.exportedByUserId ?? null,
      exportId: latestPublishPackSummary.exportId ?? null,
      exportedAt: latestPublishPackSummary.exportedAt ?? null,
      includedEvidenceCount: latestPublishPackSummary.includedEvidenceCount ?? 0,
      includedSourceLinkCount: latestPublishPackSummary.includedSourceLinkCount ?? 0,
      includesEvidenceLinks: latestPublishPackSummary.includesEvidenceLinks ?? false,
      includesSourceLinks: latestPublishPackSummary.includesSourceLinks ?? false,
      state: latestPublishPackSummary.state ?? "not_ready",
    },
    readiness: itemOverrides.readiness ?? "blocked",
    releaseRecord: {
      compareRange: releaseRecord.compareRange ?? "main...feature/help",
      createdAt: releaseRecord.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecord.id ?? "release_1",
      stage: releaseRecord.stage ?? "review",
      summary: releaseRecord.summary ?? "Retry wording still needs support.",
      title: releaseRecord.title ?? "SDK rollout v2.4",
      updatedAt: releaseRecord.updatedAt ?? "2026-03-20T01:00:00.000Z",
      workspaceId: releaseRecord.workspaceId ?? "workspace_1",
    },
    sourceLinkCount: itemOverrides.sourceLinkCount ?? 2,
  }
}

function createHistoryEntry(
  overrides: Partial<ReleaseWorkflowHistoryEntry> = {},
): ReleaseWorkflowHistoryEntry {
  return {
    actorName: overrides.actorName ?? "Mina Park",
    actorUserId: overrides.actorUserId ?? "user_1",
    createdAt: overrides.createdAt ?? "2026-03-20T01:10:00.000Z",
    draftRevisionId: overrides.draftRevisionId ?? "draft_1",
    draftVersion: overrides.draftVersion ?? 3,
    eventLabel: overrides.eventLabel ?? "Approval requested",
    eventType: overrides.eventType ?? "review_requested",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "Route this to support review.",
    outcome: overrides.outcome ?? "progressed",
    publishPackExportId: overrides.publishPackExportId ?? null,
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "review",
  }
}

function createWorkspacePolicySettings(
  overrides: Partial<WorkspacePolicySettings> = {},
): WorkspacePolicySettings {
  return {
    createdAt: overrides.createdAt ?? "2026-03-20T00:00:00.000Z",
    includeEvidenceLinksInExport: overrides.includeEvidenceLinksInExport ?? true,
    includeSourceLinksInExport: overrides.includeSourceLinksInExport ?? true,
    requireReviewerAssignment: overrides.requireReviewerAssignment ?? true,
    requireReviewerAssignment: overrides.requireReviewerAssignment ?? true,
    showBlockedClaimsInInbox: overrides.showBlockedClaimsInInbox ?? true,
    showPendingApprovalsInInbox: overrides.showPendingApprovalsInInbox ?? true,
    showReopenedDraftsInInbox: overrides.showReopenedDraftsInInbox ?? true,
    updatedAt: overrides.updatedAt ?? "2026-03-20T00:00:00.000Z",
    workspaceId: overrides.workspaceId ?? "workspace_1",
  }
}

test("buildLiveHelpData reflects live workflow blockers and guidance", () => {
  const data = buildLiveHelpData(
    createWorkspaceSnapshot(),
    [
      createWorkflowItem({
        reviewSummary: {
          ownerName: null,
          ownerUserId: null,
          state: "pending",
        },
        reviewSummary: {
          blockerNotes: ["Attach rollout proof before review."],
          state: "blocked",
        },
        latestPublishPackSummary: {
          state: "not_ready",
        },
      }),
      createWorkflowItem({
        reviewSummary: {
          ownerName: "Noah Lim",
          ownerUserId: "user_3",
          state: "approved",
        },
        reviewSummary: {
          blockerNotes: [],
          flaggedClaims: 0,
          state: "cleared",
          totalClaims: 0,
        },
        latestPublishPackSummary: {
          draftRevisionId: "draft_2",
          exportId: null,
          exportedAt: null,
          state: "ready",
        },
        readiness: "ready",
        releaseRecord: {
          id: "release_2",
          stage: "publish_pack",
          title: "Billing migration notes",
          updatedAt: "2026-03-20T02:00:00.000Z",
        },
      }),
    ],
    [createHistoryEntry()],
    "user_1",
    createWorkspacePolicySettings(),
  )

  assert.equal(data.metrics.workflowGuides, 4)
  assert.equal(data.metrics.activeStages, 2)
  assert.ok(data.metrics.knownLimits >= 3)
  assert.ok(data.metrics.openSignals >= 1)
  assert.equal(data.modules[1]?.status, "1 blocked")
  assert.equal(data.modules[2]?.status, "1 unassigned")
  assert.equal(data.modules[3]?.status, "1 ready")
  assert.match(data.checklist.join(" "), /Assign the pending review request/)
  assert.match(data.issues.map((issue) => issue.title).join(" "), /Approval handoff is missing an owner/)
})

test("buildLiveHelpData does not mark unstarted claim checks as clear", () => {
  const data = buildLiveHelpData(
    createWorkspaceSnapshot(),
    [
      createWorkflowItem({
        reviewSummary: {
          state: "not_requested",
        },
        reviewSummary: {
          blockerNotes: [],
          flaggedClaims: 0,
          state: "not_started",
          totalClaims: 0,
        },
        latestPublishPackSummary: {
          state: "not_ready",
        },
        readiness: "attention",
        releaseRecord: {
          id: "release_3",
          stage: "draft",
          title: "Usage analytics export",
        },
      }),
    ],
    [],
    "user_1",
    createWorkspacePolicySettings(),
  )

  assert.equal(data.modules[1]?.status, "1 not started")
  assert.match(data.checklist.join(" "), /Run claim check/)
})

test("getServerHelpCenterData forwards auth headers and returns live help data", async () => {
  const requests: RequestInit[] = []
  const workspace = createWorkspaceSnapshot()

  const data = await getServerHelpCenterData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    workspace,
    "user_1",
    {
      async listReleaseWorkflow(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return [createWorkflowItem()]
      },
      async listReleaseWorkflowHistory(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return [createHistoryEntry()]
      },
      async getWorkspacePolicySettings(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return createWorkspacePolicySettings()
      },
    },
  )

  assert.equal(data.metrics.workflowGuides, 4)
  assert.equal(requests.length, 3)

  for (const request of requests) {
    const headers = request.headers
    const cookie =
      headers instanceof Headers
        ? headers.get("cookie")
        : (headers as Record<string, string> | undefined)?.cookie

    assert.equal(cookie, "better-auth.session=abc123")
  }
})
