import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
} from "../lib/api/client.js"
import {
  buildReviewInboxItems,
  getServerReviewInboxData,
} from "../lib/review-inbox.js"

function createReleaseWorkflowListItem(
  overrides: Omit<
    Partial<ReleaseWorkflowListItem>,
    | "approvalSummary"
    | "claimCheckSummary"
    | "currentDraft"
    | "latestPublishPackSummary"
    | "releaseRecord"
  > & {
    approvalSummary?: Partial<ReleaseWorkflowListItem["approvalSummary"]>
    claimCheckSummary?: Partial<ReleaseWorkflowListItem["claimCheckSummary"]>
    currentDraft?: Partial<NonNullable<ReleaseWorkflowListItem["currentDraft"]>> | null
    latestPublishPackSummary?: Partial<ReleaseWorkflowListItem["latestPublishPackSummary"]>
    releaseRecord?: Partial<ReleaseWorkflowListItem["releaseRecord"]>
  } = {},
): ReleaseWorkflowListItem {
  return {
    allowedActions: overrides.allowedActions ?? ["request_approval"],
    approvalSummary: {
      draftRevisionId: overrides.approvalSummary?.draftRevisionId ?? "draft_1",
      note: overrides.approvalSummary?.note ?? null,
      ownerName: overrides.approvalSummary?.ownerName ?? null,
      ownerUserId: overrides.approvalSummary?.ownerUserId ?? null,
      requestedByName: overrides.approvalSummary?.requestedByName ?? null,
      requestedByUserId: overrides.approvalSummary?.requestedByUserId ?? null,
      state: overrides.approvalSummary?.state ?? "not_requested",
      updatedAt: overrides.approvalSummary?.updatedAt ?? "2026-03-20T01:00:00.000Z",
    },
    claimCheckSummary: {
      blockerNotes: overrides.claimCheckSummary?.blockerNotes ?? [],
      draftRevisionId: overrides.claimCheckSummary?.draftRevisionId ?? "draft_1",
      flaggedClaims: overrides.claimCheckSummary?.flaggedClaims ?? 0,
      state: overrides.claimCheckSummary?.state ?? "not_started",
      totalClaims: overrides.claimCheckSummary?.totalClaims ?? 0,
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
      exportId: overrides.latestPublishPackSummary?.exportId ?? null,
      exportedAt: overrides.latestPublishPackSummary?.exportedAt ?? null,
      state: overrides.latestPublishPackSummary?.state ?? "not_ready",
    },
    readiness: overrides.readiness ?? "attention",
    releaseRecord: {
      compareRange: overrides.releaseRecord?.compareRange ?? "main...release",
      createdAt: overrides.releaseRecord?.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: overrides.releaseRecord?.id ?? "release_1",
      stage: overrides.releaseRecord?.stage ?? "approval",
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
    eventType: overrides.eventType ?? "approval_requested",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "Review the pricing sentence before publish.",
    outcome: overrides.outcome ?? "progressed",
    publishPackExportId: overrides.publishPackExportId ?? null,
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "approval",
  }
}

test("buildReviewInboxItems surfaces approval, blocked claim, and reopened notifications", () => {
  const workflow = [
    createReleaseWorkflowListItem({
      approvalSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        requestedByName: "Owner User",
        requestedByUserId: "user_1",
        state: "pending",
      },
      releaseRecord: {
        id: "release_approval",
        title: "Approval release",
      },
    }),
    createReleaseWorkflowListItem({
      allowedActions: ["run_claim_check"],
      approvalSummary: {
        state: "not_requested",
      },
      claimCheckSummary: {
        blockerNotes: ["Availability claim is still unsupported."],
        flaggedClaims: 2,
        state: "blocked",
        totalClaims: 4,
      },
      releaseRecord: {
        id: "release_claim",
        stage: "claim_check",
        title: "Blocked claim release",
      },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "reopened",
      },
      releaseRecord: {
        id: "release_reopen",
        stage: "approval",
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
      stage: "approval",
    }),
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T02:00:00.000Z",
      eventType: "claim_check_completed",
      id: "history_claim",
      note: "Availability claim is still unsupported.",
      releaseRecordId: "release_claim",
      releaseTitle: "Blocked claim release",
      stage: "claim_check",
    }),
    createReleaseWorkflowHistoryEntry({
      createdAt: "2026-03-20T01:00:00.000Z",
      eventType: "approval_requested",
      id: "history_approval",
      note: "Review the pricing sentence before publish.",
      releaseRecordId: "release_approval",
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
        id: "approval:release_approval",
        source: "approval",
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
      approvalSummary: {
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
      stage: "approval",
    }),
  ]

  const items = buildReviewInboxItems(workflow, history, "user_2")

  assert.equal(items.length, 0)
})

test("getServerReviewInboxData forwards auth headers and returns badge count", async () => {
  const requests: Array<{ init?: RequestInit; kind: "history" | "workflow" }> = []
  const workflow = [
    createReleaseWorkflowListItem({
      approvalSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "pending",
      },
    }),
  ]
  const history = [
    createReleaseWorkflowHistoryEntry({
      eventType: "approval_requested",
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
    },
  )

  assert.equal(data.count, 1)
  assert.equal(data.items[0]?.source, "approval")
  assert.equal(
    ((requests[0]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.equal(
    ((requests[1]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
})
