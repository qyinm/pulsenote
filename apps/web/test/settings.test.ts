import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceSnapshot,
} from "../lib/api/client.js"
import {
  buildLiveSettingsData,
  getServerSettingsData,
} from "../lib/dashboard/settings.js"

type WorkflowReviewSummary = ReleaseWorkflowListItem["reviewSummary"]
type WorkflowPublishPackSummary = ReleaseWorkflowListItem["latestPublishPackSummary"]
type WorkflowReleaseRecord = ReleaseWorkflowListItem["releaseRecord"]

function createWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    integrationAccounts: [],
    integrations: [
      {
        connectedAt: "2026-03-20T00:00:00.000Z",
        externalAccountId: "installation_1",
        id: "integration_1",
        lastSyncedAt: "2026-03-20T02:00:00.000Z",
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
    syncRuns: [
      {
        connectionId: "connection_1",
        errorMessage: null,
        finishedAt: "2026-03-20T02:15:00.000Z",
        id: "sync_1",
        scope: "release:v2.4.0",
        startedAt: "2026-03-20T02:00:00.000Z",
        status: "succeeded",
        workspaceId: "workspace_1",
      },
    ],
    workspace: {
      createdAt: "2026-03-20T00:00:00.000Z",
      id: "workspace_1",
      name: "PulseNote Ops",
      slug: "pulsenote-ops",
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

function createWorkflowItem(
  overrides: Omit<
    Partial<ReleaseWorkflowListItem>,
    "reviewSummary" | "latestPublishPackSummary" | "releaseRecord"
  > & {
    reviewSummary?: Partial<WorkflowReviewSummary>
    latestPublishPackSummary?: Partial<WorkflowPublishPackSummary>
    releaseRecord?: Partial<WorkflowReleaseRecord>
  } = {},
): ReleaseWorkflowListItem {
  const {
    reviewSummary = {} as Partial<WorkflowReviewSummary>,
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
    currentDraft: itemOverrides.currentDraft ?? {
      createdAt: "2026-03-20T00:00:00.000Z",
      id: "draft_1",
      version: 3,
    },
    evidenceCount: itemOverrides.evidenceCount ?? 3,
    latestPublishPackSummary: {
      draftRevisionId:
        latestPublishPackSummary.draftRevisionId === undefined
          ? "draft_1"
          : latestPublishPackSummary.draftRevisionId,
      exportedByName:
        latestPublishPackSummary.exportedByName === undefined
          ? null
          : latestPublishPackSummary.exportedByName,
      exportedByUserId:
        latestPublishPackSummary.exportedByUserId === undefined
          ? null
          : latestPublishPackSummary.exportedByUserId,
      exportId:
        latestPublishPackSummary.exportId === undefined
          ? null
          : latestPublishPackSummary.exportId,
      exportedAt:
        latestPublishPackSummary.exportedAt === undefined
          ? null
          : latestPublishPackSummary.exportedAt,
      includedEvidenceCount: latestPublishPackSummary.includedEvidenceCount ?? 0,
      includedSourceLinkCount: latestPublishPackSummary.includedSourceLinkCount ?? 0,
      includesEvidenceLinks: latestPublishPackSummary.includesEvidenceLinks ?? false,
      includesSourceLinks: latestPublishPackSummary.includesSourceLinks ?? false,
      state: latestPublishPackSummary.state ?? "not_ready",
    },
    readiness: itemOverrides.readiness ?? "blocked",
    releaseRecord: {
      compareRange: releaseRecord.compareRange ?? "main...feature/settings",
      createdAt: releaseRecord.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecord.id ?? "release_1",
      stage: releaseRecord.stage ?? "review",
      summary: releaseRecord.summary ?? "Retry rollout wording still needs support.",
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
    createdAt: overrides.createdAt ?? "2026-03-20T02:30:00.000Z",
    draftRevisionId: overrides.draftRevisionId ?? "draft_1",
    draftVersion: overrides.draftVersion ?? 3,
    eventLabel: overrides.eventLabel ?? "Publish pack created",
    eventType: overrides.eventType ?? "publish_pack_created",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "Exported after final support review.",
    outcome: overrides.outcome ?? "signed_off",
    publishPackExportId: overrides.publishPackExportId ?? "export_1",
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "publish_pack",
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
    showBlockedClaimsInInbox: overrides.showBlockedClaimsInInbox ?? true,
    showPendingApprovalsInInbox: overrides.showPendingApprovalsInInbox ?? true,
    showReopenedDraftsInInbox: overrides.showReopenedDraftsInInbox ?? true,
    updatedAt: overrides.updatedAt ?? "2026-03-20T00:00:00.000Z",
    workspaceId: overrides.workspaceId ?? "workspace_1",
  }
}

test("buildLiveSettingsData summarizes live workspace settings coverage", () => {
  const workspace = createWorkspaceSnapshot()
  const workflow = [
    createWorkflowItem({
      latestPublishPackSummary: {
        state: "ready",
      },
    }),
    createWorkflowItem({
      reviewSummary: {
        ownerName: null,
        ownerUserId: null,
      },
      evidenceCount: 0,
      latestPublishPackSummary: {
        draftRevisionId: null,
        exportId: null,
        exportedAt: null,
        state: "not_ready",
      },
      readiness: "attention",
      releaseRecord: {
        id: "release_2",
        stage: "review",
        title: "Billing migration notes",
        updatedAt: "2026-03-20T01:30:00.000Z",
      },
    }),
  ]
  const history = [
    createHistoryEntry(),
    createHistoryEntry({
      createdAt: "2026-03-20T01:45:00.000Z",
      eventLabel: "Draft reopened",
      eventType: "draft_reopened",
      id: "history_2",
      outcome: "revision",
      publishPackExportId: null,
      releaseRecordId: "release_2",
      releaseTitle: "Billing migration notes",
      stage: "review",
    }),
  ]
  const policy = createWorkspacePolicySettings({
    includeSourceLinksInExport: false,
    showPendingApprovalsInInbox: false,
  })

  const data = buildLiveSettingsData(workspace, workflow, history, policy, "user_1")

  assert.equal(data.metrics.activeMembers, 2)
  assert.equal(data.metrics.activeIntegrations, 1)
  assert.equal(data.metrics.readyToExport, 1)
  assert.equal(data.metrics.openReviewSignals, 1)
  assert.deepEqual(data.workspaceProfile.items[0], {
    label: "Workspace",
    value: "PulseNote Ops",
  })
  assert.ok(
    data.reviewPolicy.items.some(
      (item) => item.label === "Unassigned handoffs" && item.value === "1",
    ),
  )
  assert.ok(
    data.notifications.items.some(
      (item) => item.label === "Pending approvals in inbox" && item.value === "Disabled",
    ),
  )
  assert.ok(
    data.exportReadiness.items.some(
      (item) => item.label === "Publish packs exported" && item.value === "1",
    ),
  )
  assert.ok(
    data.exportReadiness.items.some(
      (item) => item.label === "Include source links" && item.value === "Disabled",
    ),
  )
})

test("getServerSettingsData forwards auth headers and returns live settings data", async () => {
  const requests: RequestInit[] = []
  const workspace = createWorkspaceSnapshot()

  const data = await getServerSettingsData(
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

  assert.equal(data.metrics.activeMembers, 2)
  assert.equal(data.metrics.activeIntegrations, 1)
  assert.equal(data.policy.requireReviewerAssignment, true)

  for (const request of requests) {
    const headers = request.headers
    const cookie =
      headers instanceof Headers
        ? headers.get("cookie")
        : (headers as Record<string, string> | undefined)?.cookie

    assert.equal(cookie, "better-auth.session=abc123")
  }
})
