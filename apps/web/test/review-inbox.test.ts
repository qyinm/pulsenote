import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
} from "../lib/api/client.js"
import {
  buildReviewInboxItems,
  getServerReviewInboxData,
} from "../lib/review-inbox.js"

function createReleaseWorkflowListItem(
  overrides: Omit<
    Partial<ReleaseWorkflowListItem>,
    | "reviewSummary"
    | "reviewSummary"
    | "currentDraft"
    | "latestPublishPackSummary"
    | "releaseRecord"
  > & {
    reviewSummary?: Partial<ReleaseWorkflowListItem["reviewSummary"]>
    reviewSummary?: Partial<ReleaseWorkflowListItem["reviewSummary"]>
    currentDraft?: Partial<NonNullable<ReleaseWorkflowListItem["currentDraft"]>> | null
    latestPublishPackSummary?: Partial<ReleaseWorkflowListItem["latestPublishPackSummary"]>
    releaseRecord?: Partial<ReleaseWorkflowListItem["releaseRecord"]>
  } = {},
): ReleaseWorkflowListItem {
  return {
    allowedActions: overrides.allowedActions ?? ["request_review"],
    reviewSummary: {
      draftRevisionId: overrides.reviewSummary?.draftRevisionId ?? "draft_1",
      note: overrides.reviewSummary?.note ?? null,
      ownerName: overrides.reviewSummary?.ownerName ?? null,
      ownerUserId: overrides.reviewSummary?.ownerUserId ?? null,
      requestedByName: overrides.reviewSummary?.requestedByName ?? null,
      requestedByUserId: overrides.reviewSummary?.requestedByUserId ?? null,
      state: overrides.reviewSummary?.state ?? "not_requested",
      updatedAt: overrides.reviewSummary?.updatedAt ?? "2026-03-20T01:00:00.000Z",
    },
    reviewSummary: {
      blockerNotes: overrides.reviewSummary?.blockerNotes ?? [],
      draftRevisionId: overrides.reviewSummary?.draftRevisionId ?? "draft_1",
      flaggedClaims: overrides.reviewSummary?.flaggedClaims ?? 0,
      state: overrides.reviewSummary?.state ?? "not_started",
      totalClaims: overrides.reviewSummary?.totalClaims ?? 0,
    },
    currentDraft:
      overrides.currentDraft === null
        ? null
        : {
            createdAt: overrides.currentDraft?.createdAt ?? "2026-03-20T00:00:00.000Z",
            id: overrides.currentDraft?.id ?? "draft_1",
            version: overrides.currentDraft?.version ?? 1,
          },
    evidenceCount: overrides.evidenceCount ?? 3,
    latestPublishPackSummary: {
      draftRevisionId: overrides.latestPublishPackSummary?.draftRevisionId ?? null,
      exportedByName: overrides.latestPublishPackSummary?.exportedByName ?? null,
      exportedByUserId: overrides.latestPublishPackSummary?.exportedByUserId ?? null,
      exportId: overrides.latestPublishPackSummary?.exportId ?? null,
      exportedAt: overrides.latestPublishPackSummary?.exportedAt ?? null,
      includedEvidenceCount: overrides.latestPublishPackSummary?.includedEvidenceCount ?? 0,
      includedSourceLinkCount: overrides.latestPublishPackSummary?.includedSourceLinkCount ?? 0,
      includesEvidenceLinks: overrides.latestPublishPackSummary?.includesEvidenceLinks ?? false,
      includesSourceLinks: overrides.latestPublishPackSummary?.includesSourceLinks ?? false,
      state: overrides.latestPublishPackSummary?.state ?? "not_ready",
    },
    readiness: overrides.readiness ?? "attention",
    releaseRecord: {
      compareRange: overrides.releaseRecord?.compareRange ?? "main...release",
      createdAt: overrides.releaseRecord?.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: overrides.releaseRecord?.id ?? "release_1",
      stage: overrides.releaseRecord?.stage ?? "review",
      summary: overrides.releaseRecord?.summary ?? "Release summary",
      title: overrides.releaseRecord?.title ?? "SDK rollout v2.4",
      updatedAt: overrides.releaseRecord?.updatedAt ?? "2026-03-20T00:30:00.000Z",
      workspaceId: overrides.releaseRecord?.workspaceId ?? "workspace_1",
    },
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
  }
}

function createReleaseWorkflowHistoryEntry(
  overrides: Partial<ReleaseWorkflowHistoryEntry> = {},
): ReleaseWorkflowHistoryEntry {
  return {
    actorName: overrides.actorName ?? "Owner User",
    actorUserId: overrides.actorUserId ?? "user_1",
    createdAt: overrides.createdAt ?? "2026-03-20T01:00:00.000Z",
    draftRevisionId: overrides.draftRevisionId ?? "draft_1",
    draftVersion: overrides.draftVersion ?? 1,
    eventLabel: overrides.eventLabel ?? "Approval requested",
    eventType: overrides.eventType ?? "review_requested",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "Review the pricing sentence before publish.",
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

test("buildReviewInboxItems surfaces review, blocked claim, and reopened notifications", () => {
  const workflow = [
    createReleaseWorkflowListItem({
      reviewSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        requestedByName: "Owner User",
        requestedByUserId: "user_1",
        state: "pending",
      },
      releaseRecord: {
        id: "release_review",
        title: "Approval release",
      },
    }),
    createReleaseWorkflowListItem({
      allowedActions: ["request_review"],
      reviewSummary: {
        state: "not_requested",
      },
      reviewSummary: {
        blockerNotes: ["Availability claim is still unsupported."],
        flaggedClaims: 2,
        state: "blocked",
        totalClaims: 4,
      },
      releaseRecord: {
        id: "release_claim",
        stage: "review",
        title: "Blocked claim release",
      },
    }),
    createReleaseWorkflowListItem({
      reviewSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "reopened",
      },
      releaseRecord: {
        id: "release_reopen",
        stage: "review",
        title: "Reopened release",
      },
    }),
  ]
  const history = [
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T03:00:00.000Z",
      eventLabel: "Draft reopened",
      eventType: "draft_reopened",
      id: "history_reopen",
      note: "The rollout caveat needs another pass.",
      releaseRecordId: "release_reopen",
      releaseTitle: "Reopened release",
      stage: "review",
    }),
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T02:00:00.000Z",
      eventType: "review_completed",
      id: "history_claim",
      note: "Availability claim is still unsupported.",
      releaseRecordId: "release_claim",
      releaseTitle: "Blocked claim release",
      stage: "review",
    }),
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T01:00:00.000Z",
      eventType: "review_requested",
      id: "history_review",
      note: "Review the pricing sentence before publish.",
      releaseRecordId: "release_review",
      releaseTitle: "Approval release",
    }),
  ]

  const items = buildReviewInboxItems(workflow, history, "user_2")

  assert.equal(items.length, 3)
  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      source: item.source,
      status: item.status,
      title: item.title,
    })),
    [
      {
        id: "workflow:history_reopen",
        source: "workflow",
        status: "Reopened",
        title: "Reopened release",
      },
      {
        id: "claim:release_claim",
        source: "claim",
        status: "Blocked",
        title: "Blocked claim release",
      },
      {
        id: "review:release_review",
        source: "review",
        status: "Pending",
        title: "Approval release",
      },
    ],
  )
  assert.equal(items[2]?.meta, "Assigned to you")
  assert.equal(items[1]?.preview, "Availability claim is still unsupported.")
})

test("buildReviewInboxItems excludes reopened history when the workflow is no longer reopened", () => {
  const workflow = [
    createReleaseWorkflowListItem({
      reviewSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "approved",
      },
      releaseRecord: {
        id: "release_reopen",
        stage: "publish_pack",
        title: "Formerly reopened release",
      },
    }),
  ]
  const history = [
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T03:00:00.000Z",
      eventLabel: "Draft reopened",
      eventType: "draft_reopened",
      id: "history_reopen",
      note: "The rollout caveat needed another pass.",
      releaseRecordId: "release_reopen",
      releaseTitle: "Formerly reopened release",
      stage: "review",
    }),
  ]

  const items = buildReviewInboxItems(workflow, history, "user_2")

  assert.equal(items.length, 0)
})

test("buildReviewInboxItems respects workspace inbox visibility policy", () => {
  const workflow = [
    createReleaseWorkflowListItem({
      reviewSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "pending",
      },
      reviewSummary: {
        blockerNotes: ["Availability claim is still unsupported."],
        flaggedClaims: 2,
        state: "blocked",
        totalClaims: 4,
      },
      releaseRecord: {
        id: "release_policy",
        title: "Policy gated release",
      },
    }),
  ]
  const history = [
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T03:00:00.000Z",
      eventLabel: "Draft reopened",
      eventType: "draft_reopened",
      id: "history_reopen",
      releaseRecordId: "release_policy",
      releaseTitle: "Policy gated release",
      stage: "review",
    }),
  ]

  const items = buildReviewInboxItems(
    workflow,
    history,
    "user_2",
    createWorkspacePolicySettings({
      showBlockedClaimsInInbox: false,
      showPendingApprovalsInInbox: true,
      showReopenedDraftsInInbox: false,
    }),
  )

  assert.equal(items.length, 1)
  assert.equal(items[0]?.source, "review")
})

test("getServerReviewInboxData forwards auth headers and returns badge count", async () => {
  const requests: Array<{ init?: RequestInit; kind: "history" | "workflow" }> = []
  const workflow = [
    createReleaseWorkflowListItem({
      reviewSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "pending",
      },
    }),
  ]
  const history = [
    createReleaseWorkflowHistoryEntry({
      eventType: "review_requested",
    }),
  ]

  const data = await getServerReviewInboxData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    "user_2",
    {
      async listReleaseWorkflow(workspaceId, init) {
        requests.push({ init, kind: "workflow" })
        assert.equal(workspaceId, "workspace_1")
        return workflow
      },
      async listReleaseWorkflowHistory(workspaceId, init) {
        requests.push({ init, kind: "history" })
        assert.equal(workspaceId, "workspace_1")
        return history
      },
      async getWorkspacePolicySettings(workspaceId, init) {
        requests.push({ init, kind: "workflow" })
        assert.equal(workspaceId, "workspace_1")
        return createWorkspacePolicySettings()
      },
    },
  )

  assert.equal(data.count, 1)
  assert.equal(data.items[0]?.source, "review")
  assert.equal(
    ((requests[0]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.equal(
    ((requests[1]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.equal(
    ((requests[2]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
})
