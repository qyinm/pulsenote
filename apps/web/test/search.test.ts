import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseRecordSnapshot,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
} from "../lib/api/client.js"
import {
  buildLiveSearchData,
  getServerLiveSearchData,
} from "../lib/search.js"

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
    currentDraft = null,
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
      state: approvalSummary.state ?? "pending",
      updatedAt:
        approvalSummary.updatedAt === undefined
          ? "2026-03-20T01:00:00.000Z"
          : approvalSummary.updatedAt,
    },
    claimCheckSummary: {
      blockerNotes: claimCheckSummary.blockerNotes ?? ["Proof is still blocked."],
      draftRevisionId: claimCheckSummary.draftRevisionId ?? "draft_1",
      flaggedClaims: claimCheckSummary.flaggedClaims ?? 1,
      state: claimCheckSummary.state ?? "blocked",
      totalClaims: claimCheckSummary.totalClaims ?? 2,
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
      compareRange: releaseRecord.compareRange ?? "main...feature/search",
      createdAt: releaseRecord.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecord.id ?? "release_1",
      stage: releaseRecord.stage ?? "approval",
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
    eventType: overrides.eventType ?? "approval_requested",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "history_1",
    note: overrides.note ?? "Route this to support review.",
    outcome: overrides.outcome ?? "progressed",
    publishPackExportId: overrides.publishPackExportId ?? null,
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "approval",
  }
}

function createReleaseRecordSnapshot(
  {
    releaseRecord: releaseRecordOverrides = {},
    ...snapshotOverrides
  }: Omit<Partial<ReleaseRecordSnapshot>, "releaseRecord"> & {
    releaseRecord?: Partial<ReleaseRecordSnapshot["releaseRecord"]>
  } = {},
): ReleaseRecordSnapshot {
  return {
    ...snapshotOverrides,
    claimCandidates: snapshotOverrides.claimCandidates ?? [],
    evidenceBlocks: snapshotOverrides.evidenceBlocks ?? [],
    releaseRecord: {
      compareRange: releaseRecordOverrides.compareRange ?? "main...feature/search",
      connectionId: releaseRecordOverrides.connectionId ?? "connection_1",
      createdAt: releaseRecordOverrides.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecordOverrides.id ?? "release_1",
      stage: releaseRecordOverrides.stage ?? "approval",
      summary: releaseRecordOverrides.summary ?? "Release summary",
      title: releaseRecordOverrides.title ?? "SDK rollout v2.4",
      updatedAt: releaseRecordOverrides.updatedAt ?? "2026-03-20T00:00:00.000Z",
      workspaceId: releaseRecordOverrides.workspaceId ?? "workspace_1",
    },
    reviewStatuses: snapshotOverrides.reviewStatuses ?? [],
    sourceLinks: snapshotOverrides.sourceLinks ?? [],
  }
}

function createWorkspacePolicySettings(
  overrides: Partial<WorkspacePolicySettings> = {},
): WorkspacePolicySettings {
  return {
    createdAt: overrides.createdAt ?? "2026-03-20T00:00:00.000Z",
    includeEvidenceLinksInExport: overrides.includeEvidenceLinksInExport ?? true,
    includeSourceLinksInExport: overrides.includeSourceLinksInExport ?? true,
    requireClaimCheckBeforeApproval: overrides.requireClaimCheckBeforeApproval ?? true,
    requireReviewerAssignment: overrides.requireReviewerAssignment ?? true,
    showBlockedClaimsInInbox: overrides.showBlockedClaimsInInbox ?? true,
    showPendingApprovalsInInbox: overrides.showPendingApprovalsInInbox ?? true,
    showReopenedDraftsInInbox: overrides.showReopenedDraftsInInbox ?? true,
    updatedAt: overrides.updatedAt ?? "2026-03-20T00:00:00.000Z",
    workspaceId: overrides.workspaceId ?? "workspace_1",
  }
}

test("buildLiveSearchData indexes workflow, evidence, history, and review signals", () => {
  const workflow = [
    createWorkflowItem(),
    createWorkflowItem({
      approvalSummary: {
        ownerName: null,
        ownerUserId: null,
        requestedByName: "Grace Lee",
        requestedByUserId: "user_2",
        state: "pending",
        updatedAt: "2026-03-20T01:20:00.000Z",
      },
      claimCheckSummary: {
        blockerNotes: [],
        flaggedClaims: 0,
        state: "cleared",
        totalClaims: 0,
      },
      currentDraft: {
        id: "draft_2",
        version: 4,
      },
      readiness: "attention",
      releaseRecord: {
        id: "release_2",
        stage: "approval",
        summary: "Reviewer assignment is still missing.",
        title: "Billing migration notes",
        updatedAt: "2026-03-20T01:20:00.000Z",
      },
    }),
  ]

  const history = [
    createHistoryEntry(),
    createHistoryEntry({
      createdAt: "2026-03-20T01:30:00.000Z",
      eventLabel: "Draft reopened",
      eventType: "draft_reopened",
      id: "history_2",
      note: "Tighten the rollout eligibility sentence.",
      outcome: "revision",
      releaseRecordId: "release_2",
      releaseTitle: "Billing migration notes",
      stage: "approval",
    }),
  ]

  const snapshots = [
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: "Retry rollout note",
          capturedAt: "2026-03-20T00:30:00.000Z",
          evidenceState: "stale",
          id: "evidence_1",
          provider: "github",
          releaseRecordId: "release_1",
          sourceRef: "pull/42",
          sourceType: "pull_request",
          title: "PR #42",
        },
      ],
    }),
  ]

  const data = buildLiveSearchData(workflow, history, snapshots, "user_1")

  assert.ok(data.results.some((result) => result.type === "Release workflow"))
  assert.ok(data.results.some((result) => result.type === "Approval handoff"))
  assert.ok(data.results.some((result) => result.type === "Evidence source"))
  assert.ok(data.results.some((result) => result.type === "Review event"))
  assert.ok(data.results.some((result) => result.type === "Review signal"))
  assert.equal(
    data.results.find((result) => result.type === "Evidence source")?.route,
    "/dashboard/releases/release_1?focus=claim_check",
  )
  assert.equal(data.metrics.evidenceSources, 1)
  assert.ok(data.metrics.blockedResults >= 2)
  assert.ok(data.metrics.reviewSignals >= 2)
  assert.ok(data.suggestedQueries.includes("approval"))
  assert.ok(data.suggestedQueries.includes("evidence"))
})

test("buildLiveSearchData omits the blocked shortcut when blocked state is not searchable text", () => {
  const data = buildLiveSearchData(
    [
      createWorkflowItem({
        approvalSummary: {
          ownerName: null,
          ownerUserId: null,
          requestedByName: "Grace Lee",
          requestedByUserId: "user_2",
          state: "pending",
          updatedAt: "2026-03-20T01:20:00.000Z",
        },
        claimCheckSummary: {
          blockerNotes: [],
          draftRevisionId: "draft_2",
          flaggedClaims: 0,
          state: "cleared",
          totalClaims: 0,
        },
        currentDraft: {
          createdAt: "2026-03-20T01:00:00.000Z",
          id: "draft_2",
          version: 4,
        },
        readiness: "attention",
        releaseRecord: {
          compareRange: "main...feature/approval",
          createdAt: "2026-03-20T00:00:00.000Z",
          id: "release_2",
          stage: "approval",
          summary: "Reviewer assignment is still missing.",
          title: "Billing migration notes",
          updatedAt: "2026-03-20T01:20:00.000Z",
          workspaceId: "workspace_1",
        },
      }),
    ],
    [],
    [],
    "user_9",
  )

  assert.ok(data.metrics.blockedResults > 0)
  assert.ok(!data.suggestedQueries.includes("blocked"))
})

test("buildLiveSearchData removes review signal results when inbox visibility is disabled", () => {
  const data = buildLiveSearchData(
    [createWorkflowItem()],
    [createHistoryEntry()],
    [],
    "user_1",
    createWorkspacePolicySettings({
      showBlockedClaimsInInbox: false,
      showPendingApprovalsInInbox: false,
      showReopenedDraftsInInbox: false,
    }),
  )

  assert.equal(data.results.some((result) => result.type === "Review signal"), false)
  assert.equal(data.metrics.reviewSignals, 0)
})

test("getServerLiveSearchData forwards auth headers to live search reads", async () => {
  const requests: RequestInit[] = []
  const workflow = [createWorkflowItem()]
  const history = [createHistoryEntry()]
  const snapshots = [
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: "Retry rollout note",
          capturedAt: "2026-03-20T00:30:00.000Z",
          evidenceState: "fresh",
          id: "evidence_1",
          provider: "github",
          releaseRecordId: "release_1",
          sourceRef: "pull/42",
          sourceType: "pull_request",
          title: "PR #42",
        },
      ],
    }),
  ]

  const data = await getServerLiveSearchData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    "user_1",
    {
      async listReleaseRecords(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return snapshots
      },
      async listReleaseWorkflow(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return workflow
      },
      async listReleaseWorkflowHistory(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return history
      },
      async getWorkspacePolicySettings(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return createWorkspacePolicySettings()
      },
    },
  )

  assert.ok(data.metrics.indexedRecords > 0)
  for (const request of requests) {
    const headers = request.headers
    const cookie =
      headers instanceof Headers
        ? headers.get("cookie")
        : (headers as Record<string, string> | undefined)?.cookie

    assert.equal(cookie, "better-auth.session=abc123")
  }
})
