import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
} from "../lib/api/client.js"
import {
  buildLiveExportFramesData,
  getServerLiveExportFramesData,
} from "../lib/export-frames.js"

type WorkflowApprovalSummary = ReleaseWorkflowListItem["approvalSummary"]
type WorkflowClaimCheckSummary = ReleaseWorkflowListItem["claimCheckSummary"]
type WorkflowCurrentDraft = NonNullable<ReleaseWorkflowListItem["currentDraft"]>
type WorkflowPublishPackSummary = ReleaseWorkflowListItem["latestPublishPackSummary"]
type WorkflowReleaseRecord = ReleaseWorkflowListItem["releaseRecord"]

function createWorkflowItem(
  overrides: Omit<
    Partial<ReleaseWorkflowListItem>,
    | "approvalSummary"
    | "claimCheckSummary"
    | "currentDraft"
    | "latestPublishPackSummary"
    | "releaseRecord"
  > & {
    approvalSummary?: Partial<WorkflowApprovalSummary>
    claimCheckSummary?: Partial<WorkflowClaimCheckSummary>
    currentDraft?: Partial<WorkflowCurrentDraft> | null
    latestPublishPackSummary?: Partial<WorkflowPublishPackSummary>
    releaseRecord?: Partial<WorkflowReleaseRecord>
  } = {},
): ReleaseWorkflowListItem {
  const {
    approvalSummary = {} as Partial<WorkflowApprovalSummary>,
    claimCheckSummary = {} as Partial<WorkflowClaimCheckSummary>,
    currentDraft = {},
    latestPublishPackSummary = {} as Partial<WorkflowPublishPackSummary>,
    releaseRecord = {} as Partial<WorkflowReleaseRecord>,
    ...itemOverrides
  } = overrides

  return {
    allowedActions: itemOverrides.allowedActions ?? ["request_approval"],
    approvalSummary: {
      draftRevisionId:
        approvalSummary.draftRevisionId === undefined
          ? "draft_1"
          : approvalSummary.draftRevisionId,
      note: approvalSummary.note === undefined ? null : approvalSummary.note,
      ownerName:
        approvalSummary.ownerName === undefined
          ? "Mina Park"
          : approvalSummary.ownerName,
      ownerUserId:
        approvalSummary.ownerUserId === undefined
          ? "user_1"
          : approvalSummary.ownerUserId,
      requestedByName:
        approvalSummary.requestedByName === undefined
          ? "Grace Lee"
          : approvalSummary.requestedByName,
      requestedByUserId:
        approvalSummary.requestedByUserId === undefined
          ? "user_2"
          : approvalSummary.requestedByUserId,
      state: approvalSummary.state ?? "approved",
      updatedAt:
        approvalSummary.updatedAt === undefined
          ? "2026-03-20T01:00:00.000Z"
          : approvalSummary.updatedAt,
    },
    claimCheckSummary: {
      blockerNotes: claimCheckSummary.blockerNotes ?? [],
      draftRevisionId: claimCheckSummary.draftRevisionId ?? "draft_1",
      flaggedClaims: claimCheckSummary.flaggedClaims ?? 0,
      state: claimCheckSummary.state ?? "cleared",
      totalClaims: claimCheckSummary.totalClaims ?? 0,
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
      draftRevisionId: latestPublishPackSummary.draftRevisionId ?? "draft_1",
      exportId: latestPublishPackSummary.exportId ?? null,
      exportedAt: latestPublishPackSummary.exportedAt ?? null,
      state: latestPublishPackSummary.state ?? "ready",
    },
    readiness: itemOverrides.readiness ?? "ready",
    releaseRecord: {
      compareRange: releaseRecord.compareRange ?? "main...feature/export-frames",
      createdAt: releaseRecord.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecord.id ?? "release_1",
      stage: releaseRecord.stage ?? "publish_pack",
      summary: releaseRecord.summary ?? "Publish pack can freeze now.",
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
    eventLabel: overrides.eventLabel ?? "Publish pack created",
    eventType: overrides.eventType ?? "publish_pack_created",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "Freeze the current pack for release handoff.",
    outcome: overrides.outcome ?? "signed_off",
    publishPackExportId: overrides.publishPackExportId ?? "export_1",
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "publish_pack",
  }
}

test("buildLiveExportFramesData reflects live export readiness instead of template presets", () => {
  const data = buildLiveExportFramesData(
    [
      createWorkflowItem({
        latestPublishPackSummary: {
          exportId: "export_1",
          exportedAt: "2026-03-20T02:00:00.000Z",
          state: "exported",
        },
        releaseRecord: {
          id: "release_1",
          title: "SDK rollout v2.4",
          updatedAt: "2026-03-20T02:00:00.000Z",
        },
      }),
      createWorkflowItem({
        approvalSummary: {
          ownerName: null,
          ownerUserId: null,
          requestedByName: "Grace Lee",
          requestedByUserId: "user_2",
          state: "pending",
        },
        claimCheckSummary: {
          blockerNotes: ["Attach rollout evidence before export."],
          state: "blocked",
        },
        latestPublishPackSummary: {
          draftRevisionId: null,
          exportId: null,
          exportedAt: null,
          state: "not_ready",
        },
        readiness: "blocked",
        releaseRecord: {
          id: "release_2",
          stage: "approval",
          summary: "Still blocked before export.",
          title: "Billing migration notes",
          updatedAt: "2026-03-20T03:00:00.000Z",
        },
      }),
    ],
    [
      createHistoryEntry({
        createdAt: "2026-03-20T02:00:00.000Z",
        releaseRecordId: "release_1",
        releaseTitle: "SDK rollout v2.4",
      }),
      createHistoryEntry({
        createdAt: "2026-03-20T03:10:00.000Z",
        eventLabel: "Approval requested",
        eventType: "approval_requested",
        id: "history_2",
        note: "Route this to support review.",
        outcome: "progressed",
        publishPackExportId: null,
        releaseRecordId: "release_2",
        releaseTitle: "Billing migration notes",
        stage: "approval",
      }),
    ],
  )

  assert.equal(data.metrics.framesInScope, 2)
  assert.equal(data.metrics.exportedFrames, 1)
  assert.equal(data.metrics.readyFrames, 0)
  assert.equal(data.metrics.needsReviewFrames, 1)
  assert.equal(data.priorityFrame?.title, "Billing migration notes")
  assert.equal(data.priorityFrame?.state, "Needs review")
  assert.match(data.priorityFrame?.guardrails.join(" ") ?? "", /Attach rollout evidence/)
  assert.match(data.priorityFrame?.guardrails.join(" ") ?? "", /Assign a reviewer/)
  assert.match(data.entries[1]?.recentActivity[0] ?? "", /Publish pack created/)
})

test("getServerLiveExportFramesData forwards auth headers and returns live export data", async () => {
  const requests: RequestInit[] = []
  const workflow = [createWorkflowItem()]
  const history = [createHistoryEntry()]

  const data = await getServerLiveExportFramesData(
    new Headers({
      cookie: "better-auth.session_token=token",
    }),
    "workspace_1",
    {
      async listReleaseWorkflow(_workspaceId, init) {
        requests.push(init ?? {})
        return workflow
      },
      async listReleaseWorkflowHistory(_workspaceId, init) {
        requests.push(init ?? {})
        return history
      },
    },
  )

  assert.equal(data.metrics.framesInScope, 1)

  const headers = requests.map((request) => request.headers)

  for (const header of headers) {
    const cookieHeader =
      header instanceof Headers
        ? header.get("cookie")
        : ((header as Record<string, string> | undefined)?.cookie ??
            (header as Record<string, string> | undefined)?.Cookie)

    assert.match(
      cookieHeader ?? "",
      /better-auth\.session_token=token/,
    )
  }
})
