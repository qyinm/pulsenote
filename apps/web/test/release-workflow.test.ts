import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspaceMember,
} from "../lib/api/client.js"
import { ApiError } from "../lib/api/client.js"
import {
  buildReleaseWorkflowApprovalNotes,
  buildReleaseWorkflowMetrics,
  buildReleaseWorkflowQueueItem,
  createReleaseWorkflowDetailCache,
  getReleaseWorkflowActionLabel,
  getSelectedReleaseWorkflowDetail,
  getServerReleaseWorkflowData,
} from "../lib/release-workflow/index.js"

type ReleaseWorkflowListItemOverrides = {
  allowedActions?: ReleaseWorkflowListItem["allowedActions"]
  approvalSummary?: Partial<ReleaseWorkflowListItem["approvalSummary"]>
  claimCheckSummary?: Partial<ReleaseWorkflowListItem["claimCheckSummary"]>
  currentDraft?: Partial<NonNullable<ReleaseWorkflowListItem["currentDraft"]>> | null
  evidenceCount?: number
  latestPublishPackSummary?: Partial<ReleaseWorkflowListItem["latestPublishPackSummary"]>
  readiness?: ReleaseWorkflowListItem["readiness"]
  releaseRecord?: Partial<ReleaseWorkflowListItem["releaseRecord"]>
  sourceLinkCount?: number
}

function createReleaseWorkflowListItem(
  overrides: ReleaseWorkflowListItemOverrides = {},
): ReleaseWorkflowListItem {
  return {
    allowedActions: overrides.allowedActions ?? ["create_draft"],
    approvalSummary: {
      draftRevisionId: overrides.approvalSummary?.draftRevisionId ?? null,
      note: overrides.approvalSummary?.note ?? null,
      ownerName: overrides.approvalSummary?.ownerName ?? null,
      ownerUserId: overrides.approvalSummary?.ownerUserId ?? null,
      requestedByName: overrides.approvalSummary?.requestedByName ?? null,
      requestedByUserId: overrides.approvalSummary?.requestedByUserId ?? null,
      state: overrides.approvalSummary?.state ?? "not_requested",
      updatedAt: overrides.approvalSummary?.updatedAt ?? null,
    },
    claimCheckSummary: {
      blockerNotes: overrides.claimCheckSummary?.blockerNotes ?? [],
      draftRevisionId: overrides.claimCheckSummary?.draftRevisionId ?? null,
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
    readiness: overrides.readiness ?? "ready",
    releaseRecord: {
      compareRange: overrides.releaseRecord?.compareRange ?? "main...feature/founder-release-path",
      createdAt: overrides.releaseRecord?.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: overrides.releaseRecord?.id ?? "release_1",
      stage: overrides.releaseRecord?.stage ?? "draft",
      summary: overrides.releaseRecord?.summary ?? "Release context is ready to turn into public notes.",
      title: overrides.releaseRecord?.title ?? "SDK rollout v2.4",
      updatedAt: overrides.releaseRecord?.updatedAt ?? "2026-03-20T00:00:00.000Z",
      workspaceId: overrides.releaseRecord?.workspaceId ?? "workspace_1",
    },
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
  }
}

type ReleaseWorkflowDetailOverrides = {
  allowedActions?: ReleaseWorkflowDetail["allowedActions"]
  approvalSummary?: Partial<ReleaseWorkflowDetail["approvalSummary"]>
  claimCheckSummary?: Partial<ReleaseWorkflowDetail["claimCheckSummary"]>
  currentDraft?: Partial<NonNullable<ReleaseWorkflowDetail["currentDraft"]>> | null
  evidenceBlocks?: ReleaseWorkflowDetail["evidenceBlocks"]
  latestPublishPackSummary?: Partial<ReleaseWorkflowDetail["latestPublishPackSummary"]>
  readiness?: ReleaseWorkflowDetail["readiness"]
  releaseRecord?: Partial<ReleaseWorkflowDetail["releaseRecord"]>
  reviewStatuses?: ReleaseWorkflowDetail["reviewStatuses"]
  sourceLinks?: ReleaseWorkflowDetail["sourceLinks"]
}

function createReleaseWorkflowDetail(
  overrides: ReleaseWorkflowDetailOverrides = {},
): ReleaseWorkflowDetail {
  return {
    allowedActions: overrides.allowedActions ?? ["run_claim_check"],
    approvalSummary: {
      draftRevisionId: overrides.approvalSummary?.draftRevisionId ?? "draft_1",
      note: overrides.approvalSummary?.note ?? null,
      ownerName: overrides.approvalSummary?.ownerName ?? null,
      ownerUserId: overrides.approvalSummary?.ownerUserId ?? null,
      requestedByName: overrides.approvalSummary?.requestedByName ?? null,
      requestedByUserId: overrides.approvalSummary?.requestedByUserId ?? null,
      state: overrides.approvalSummary?.state ?? "not_requested",
      updatedAt: overrides.approvalSummary?.updatedAt ?? null,
    },
    claimCheckSummary: {
      blockerNotes: overrides.claimCheckSummary?.blockerNotes ?? [],
      draftRevisionId: overrides.claimCheckSummary?.draftRevisionId ?? "draft_1",
      flaggedClaims: overrides.claimCheckSummary?.flaggedClaims ?? 0,
      items: overrides.claimCheckSummary?.items ?? [],
      state: overrides.claimCheckSummary?.state ?? "not_started",
      totalClaims: overrides.claimCheckSummary?.totalClaims ?? 0,
    },
    currentDraft:
      overrides.currentDraft === null
        ? null
        : {
            changelogBody: overrides.currentDraft?.changelogBody ?? "## SDK rollout v2.4",
            createdAt: overrides.currentDraft?.createdAt ?? "2026-03-20T00:00:00.000Z",
            createdByUserId: overrides.currentDraft?.createdByUserId ?? "user_1",
            id: overrides.currentDraft?.id ?? "draft_1",
            releaseNotesBody: overrides.currentDraft?.releaseNotesBody ?? "SDK rollout v2.4",
            version: overrides.currentDraft?.version ?? 1,
          },
    evidenceBlocks: overrides.evidenceBlocks ?? [],
    latestPublishPackSummary: {
      draftRevisionId: overrides.latestPublishPackSummary?.draftRevisionId ?? "draft_1",
      exportId: overrides.latestPublishPackSummary?.exportId ?? null,
      exportedAt: overrides.latestPublishPackSummary?.exportedAt ?? null,
      state: overrides.latestPublishPackSummary?.state ?? "not_ready",
    },
    readiness: overrides.readiness ?? "ready",
    releaseRecord: {
      compareRange: overrides.releaseRecord?.compareRange ?? "main...feature/founder-release-path",
      connectionId: overrides.releaseRecord?.connectionId ?? "connection_1",
      createdAt: overrides.releaseRecord?.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: overrides.releaseRecord?.id ?? "release_1",
      stage: overrides.releaseRecord?.stage ?? "draft",
      summary: overrides.releaseRecord?.summary ?? "Release context is ready to turn into public notes.",
      title: overrides.releaseRecord?.title ?? "SDK rollout v2.4",
      updatedAt: overrides.releaseRecord?.updatedAt ?? "2026-03-20T00:00:00.000Z",
      workspaceId: overrides.releaseRecord?.workspaceId ?? "workspace_1",
    },
    reviewStatuses: overrides.reviewStatuses ?? [],
    sourceLinks: overrides.sourceLinks ?? [],
  }
}

type ReleaseWorkflowHistoryEntryOverrides = {
  actorName?: ReleaseWorkflowHistoryEntry["actorName"]
  actorUserId?: ReleaseWorkflowHistoryEntry["actorUserId"]
  createdAt?: ReleaseWorkflowHistoryEntry["createdAt"]
  draftRevisionId?: ReleaseWorkflowHistoryEntry["draftRevisionId"]
  draftVersion?: ReleaseWorkflowHistoryEntry["draftVersion"]
  eventLabel?: ReleaseWorkflowHistoryEntry["eventLabel"]
  eventType?: ReleaseWorkflowHistoryEntry["eventType"]
  evidenceCount?: ReleaseWorkflowHistoryEntry["evidenceCount"]
  id?: ReleaseWorkflowHistoryEntry["id"]
  note?: ReleaseWorkflowHistoryEntry["note"]
  outcome?: ReleaseWorkflowHistoryEntry["outcome"]
  publishPackExportId?: ReleaseWorkflowHistoryEntry["publishPackExportId"]
  releaseRecordId?: ReleaseWorkflowHistoryEntry["releaseRecordId"]
  releaseTitle?: ReleaseWorkflowHistoryEntry["releaseTitle"]
  sourceLinkCount?: ReleaseWorkflowHistoryEntry["sourceLinkCount"]
  stage?: ReleaseWorkflowHistoryEntry["stage"]
}

function createReleaseWorkflowHistoryEntry(
  overrides: ReleaseWorkflowHistoryEntryOverrides = {},
): ReleaseWorkflowHistoryEntry {
  return {
    actorName: overrides.actorName ?? "Casey Reviewer",
    actorUserId: overrides.actorUserId ?? "user_1",
    createdAt: overrides.createdAt ?? "2026-03-20T01:00:00.000Z",
    draftRevisionId: overrides.draftRevisionId ?? "draft_1",
    draftVersion: overrides.draftVersion ?? 1,
    eventLabel: overrides.eventLabel ?? "Draft created",
    eventType: overrides.eventType ?? "draft_created",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "The release record now has a reviewable draft.",
    outcome: overrides.outcome ?? "revision",
    publishPackExportId: overrides.publishPackExportId ?? null,
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "draft",
  }
}

function createWorkspaceMember(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
  return {
    membership: {
      createdAt: overrides.membership?.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: overrides.membership?.id ?? "membership_1",
      role: overrides.membership?.role ?? "owner",
      userId: overrides.membership?.userId ?? "user_1",
      workspaceId: overrides.membership?.workspaceId ?? "workspace_1",
    },
    user: {
      email: overrides.user?.email ?? "owner@pulsenote.dev",
      fullName: overrides.user?.fullName ?? "Owner User",
      id: overrides.user?.id ?? "user_1",
    },
  }
}

test("getServerReleaseWorkflowData forwards cookies and loads the first selected workflow detail", async () => {
  const requests: Array<{ init?: RequestInit; kind: "detail" | "history" | "list" }> = []
  const listItem = createReleaseWorkflowListItem()
  const detail = createReleaseWorkflowDetail()
  const history = [createReleaseWorkflowHistoryEntry()]
  const members = [createWorkspaceMember()]

  const data = await getServerReleaseWorkflowData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    {
      async getReleaseWorkflowDetail(workspaceId, releaseRecordId, init) {
        requests.push({ init, kind: "detail" })
        assert.equal(workspaceId, "workspace_1")
        assert.equal(releaseRecordId, "release_1")
        return detail
      },
      async getReleaseWorkflowHistory(workspaceId, releaseRecordId, init) {
        requests.push({ init, kind: "history" })
        assert.equal(workspaceId, "workspace_1")
        assert.equal(releaseRecordId, "release_1")
        return history
      },
      async listWorkspaceMembers(workspaceId, init) {
        requests.push({ init, kind: "list" })
        assert.equal(workspaceId, "workspace_1")
        return members
      },
      async listReleaseWorkflow(workspaceId, init) {
        requests.push({ init, kind: "list" })
        assert.equal(workspaceId, "workspace_1")
        return [listItem]
      },
    },
  )

  assert.equal(data.selectedId, "release_1")
  assert.deepEqual(data.members, members)
  assert.equal(data.membersUnavailable, false)
  assert.deepEqual(data.selectedHistory, history)
  assert.equal(data.selectedHistoryUnavailable, false)
  assert.deepEqual(data.workflow, [listItem])
  assert.deepEqual(data.selectedWorkflow, detail)
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

test("getServerReleaseWorkflowData returns an empty selected history when no workflow record exists", async () => {
  const data = await getServerReleaseWorkflowData(
    new Headers(),
    "workspace_1",
    {
      async getReleaseWorkflowDetail() {
        throw new Error("detail should not be requested when there is no selected workflow")
      },
      async getReleaseWorkflowHistory() {
        throw new Error("history should not be requested when there is no selected workflow")
      },
      async listWorkspaceMembers() {
        return []
      },
      async listReleaseWorkflow() {
        return []
      },
    },
  )

  assert.equal(data.selectedId, null)
  assert.deepEqual(data.members, [])
  assert.equal(data.membersUnavailable, false)
  assert.equal(data.selectedWorkflow, null)
  assert.deepEqual(data.selectedHistory, [])
  assert.equal(data.selectedHistoryUnavailable, false)
  assert.deepEqual(data.workflow, [])
})

test("getServerReleaseWorkflowData keeps workflow detail when the history endpoint fails", async () => {
  const listItem = createReleaseWorkflowListItem()
  const detail = createReleaseWorkflowDetail()

  const data = await getServerReleaseWorkflowData(
    new Headers(),
    "workspace_1",
    {
      async getReleaseWorkflowDetail() {
        return detail
      },
      async getReleaseWorkflowHistory() {
        throw new Error("history unavailable")
      },
      async listWorkspaceMembers() {
        return []
      },
      async listReleaseWorkflow() {
        return [listItem]
      },
    },
  )

  assert.equal(data.selectedId, "release_1")
  assert.deepEqual(data.selectedWorkflow, detail)
  assert.deepEqual(data.selectedHistory, [])
  assert.equal(data.selectedHistoryUnavailable, true)
  assert.deepEqual(data.workflow, [listItem])
})

test("getServerReleaseWorkflowData degrades when the member roster endpoint fails", async () => {
  const listItem = createReleaseWorkflowListItem()
  const detail = createReleaseWorkflowDetail()

  const data = await getServerReleaseWorkflowData(
    new Headers(),
    "workspace_1",
    {
      async getReleaseWorkflowDetail() {
        return detail
      },
      async getReleaseWorkflowHistory() {
        return []
      },
      async listWorkspaceMembers() {
        throw new ApiError("members unavailable", 503, {
          message: "members unavailable",
          status: 503,
        })
      },
      async listReleaseWorkflow() {
        return [listItem]
      },
    },
  )

  assert.deepEqual(data.members, [])
  assert.equal(data.membersUnavailable, true)
  assert.equal(data.selectedId, "release_1")
})

test("getServerReleaseWorkflowData rethrows unexpected member roster errors", async () => {
  const listItem = createReleaseWorkflowListItem()
  const detail = createReleaseWorkflowDetail()

  await assert.rejects(
    () =>
      getServerReleaseWorkflowData(new Headers(), "workspace_1", {
        async getReleaseWorkflowDetail() {
          return detail
        },
        async getReleaseWorkflowHistory() {
          return []
        },
        async listWorkspaceMembers() {
          throw new ApiError("auth failed", 401, {
            message: "auth failed",
            status: 401,
          })
        },
        async listReleaseWorkflow() {
          return [listItem]
        },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiError, true)
      assert.equal((error as ApiError).status, 401)
      return true
    },
  )
})

test("buildReleaseWorkflowApprovalNotes keeps assigned reviewer context for pending approval", () => {
  const notes = buildReleaseWorkflowApprovalNotes(
    createReleaseWorkflowDetail({
      approvalSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        state: "pending",
      },
      reviewStatuses: [
        {
          id: "review_status_1",
          note: null,
          ownerUserId: "user_2",
          releaseRecordId: "release_1",
          stage: "approval",
          state: "pending",
          updatedAt: "2026-03-20T00:00:00.000Z",
        },
      ],
    }),
  )

  assert.deepEqual(notes, ["Approval has been requested and is waiting on Reviewer User."])
})

test("buildReleaseWorkflowQueueItem surfaces workflow labels and next actions", () => {
  const queueItem = buildReleaseWorkflowQueueItem(
    createReleaseWorkflowListItem({
      allowedActions: ["request_approval"],
      approvalSummary: { state: "not_requested" },
      claimCheckSummary: { blockerNotes: [], state: "cleared" },
      currentDraft: { version: 3 },
      latestPublishPackSummary: { state: "not_ready" },
      readiness: "ready",
      releaseRecord: {
        stage: "claim_check",
        summary: "Claim check is clear and ready for sign-off.",
      },
    }),
  )

  assert.deepEqual(queueItem, {
    allowedActions: ["request_approval"],
    approvalLabel: "Not requested",
    claimCheckLabel: "Clear",
    evidenceCount: 3,
    id: "release_1",
    nextAction: "Request approval on the current checked draft.",
    publishPackLabel: "Not ready",
    readinessLabel: "Ready",
    readinessTone: "ready",
    sourceLinkCount: 2,
    stageLabel: "Claim check",
    summary: "Claim check is clear and ready for sign-off.",
    title: "SDK rollout v2.4",
    versionLabel: "Draft v3",
  })

  assert.equal(
    getReleaseWorkflowActionLabel("create_publish_pack"),
    "Freeze the approved publish pack for handoff.",
  )
})

test("buildReleaseWorkflowMetrics summarizes blocked, pending, and export-ready workflow records", () => {
  const metrics = buildReleaseWorkflowMetrics([
    createReleaseWorkflowListItem({
      approvalSummary: { ownerName: "Reviewer User", state: "pending" },
      latestPublishPackSummary: { state: "not_ready" },
      readiness: "blocked",
      releaseRecord: { id: "release_1" },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: { state: "approved" },
      latestPublishPackSummary: { state: "ready" },
      readiness: "ready",
      releaseRecord: { id: "release_2" },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: { state: "approved" },
      latestPublishPackSummary: { state: "exported" },
      readiness: "ready",
      releaseRecord: { id: "release_3" },
    }),
  ])

  assert.deepEqual(metrics, {
    blockedRecords: 1,
    pendingApprovalRecords: 1,
    readyToExportRecords: 2,
    recordsInQueue: 3,
  })
})

test("release workflow detail cache resolves the currently selected workflow detail", () => {
  const selectedWorkflow = createReleaseWorkflowDetail({
    releaseRecord: { id: "release_2", title: "Billing migration notes" },
  })
  const detailById = createReleaseWorkflowDetailCache("release_2", selectedWorkflow)

  assert.deepEqual(getSelectedReleaseWorkflowDetail(detailById, "release_2"), selectedWorkflow)
  assert.equal(getSelectedReleaseWorkflowDetail(detailById, "release_1"), null)
})
