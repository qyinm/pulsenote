import assert from "node:assert/strict"
import test from "node:test"

import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceMember,
} from "../lib/api/client.js"
import { ApiError } from "../lib/api/client.js"
import { buildReleaseDraftEditorFields } from "../lib/draft-templates.js"
import {
  buildReleaseWorkspaceHref,
  buildReleaseWorkflowApprovalFilterCounts,
  buildReleaseWorkflowApprovalNotes,
  buildReleaseWorkflowBoardColumns,
  formatReleaseWorkflowCompareRange,
  buildReleaseWorkflowMetrics,
  buildReleaseWorkflowPublishPackArtifactNotes,
  buildReleaseWorkflowPublishPackNotes,
  buildReleaseWorkflowQueueItem,
  createReleaseWorkflowDetailCache,
  filterReleaseWorkflowQueueByMode,
  filterReleaseWorkflowApprovalQueue,
  getReleaseWorkflowActionLabel,
  getReleaseWorkflowDisplayTitle,
  getReleaseWorkflowBoardStage,
  getReleaseWorkflowOwnershipCue,
  getSelectedReleaseWorkflowDetail,
  getServerReleaseWorkflowData,
  isReleaseWorkflowWorkspaceFocus,
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
  latestPublishPackArtifact?: ReleaseWorkflowDetail["latestPublishPackArtifact"]
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
            changelogBody: overrides.currentDraft?.changelogBody ?? "SDK rollout v2.4\n\n## Included changes\n\n- Adds release workflow sections",
            createdAt: overrides.currentDraft?.createdAt ?? "2026-03-20T00:00:00.000Z",
            createdByUserId: overrides.currentDraft?.createdByUserId ?? "user_1",
            evidenceRefs: overrides.currentDraft?.evidenceRefs ?? [],
            fieldSnapshots:
              overrides.currentDraft?.fieldSnapshots ??
              [
                {
                  content: "SDK rollout v2.4\n\n## Included changes\n\n- Adds release workflow sections",
                  contentFormat: "markdown",
                  fieldKey: "publish_pack",
                  label: "Publish pack",
                  plainText: "SDK rollout v2.4 Included changes Adds release workflow sections",
                  sortOrder: 0,
                },
              ],
            id: overrides.currentDraft?.id ?? "draft_1",
            releaseNotesBody:
              overrides.currentDraft?.releaseNotesBody ??
              "SDK rollout v2.4\n\n## Included changes\n\n- Adds release workflow sections",
            templateId: overrides.currentDraft?.templateId ?? "release_note_packet",
            templateLabel: overrides.currentDraft?.templateLabel ?? "Release notes packet",
            templateVersion: overrides.currentDraft?.templateVersion ?? 1,
            version: overrides.currentDraft?.version ?? 1,
          },
    evidenceBlocks: overrides.evidenceBlocks ?? [],
    latestPublishPackArtifact:
      overrides.latestPublishPackArtifact === undefined
        ? null
        : overrides.latestPublishPackArtifact,
    latestPublishPackSummary: {
      draftRevisionId: overrides.latestPublishPackSummary?.draftRevisionId ?? "draft_1",
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

test("getServerReleaseWorkflowData forwards cookies and loads the first selected workflow detail", async () => {
  const requests: Array<{ init?: RequestInit; kind: "detail" | "history" | "list" | "policy" }> = []
  const listItem = createReleaseWorkflowListItem()
  const detail = createReleaseWorkflowDetail()
  const history = [createReleaseWorkflowHistoryEntry()]
  const members = [createWorkspaceMember()]
  const policy = createWorkspacePolicySettings()

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
      async getWorkspacePolicySettings(workspaceId, init) {
        requests.push({ init, kind: "policy" })
        assert.equal(workspaceId, "workspace_1")
        return policy
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
  assert.deepEqual(data.policy, policy)
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
  assert.equal(
    ((requests[3]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
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
      async getWorkspacePolicySettings() {
        return createWorkspacePolicySettings()
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
  assert.equal(data.policy.requireReviewerAssignment, true)
  assert.equal(data.selectedWorkflow, null)
  assert.deepEqual(data.selectedHistory, [])
  assert.equal(data.selectedHistoryUnavailable, false)
  assert.deepEqual(data.workflow, [])
})

test("getServerReleaseWorkflowData prefers the requested selected release when it exists", async () => {
  const releaseOne = createReleaseWorkflowListItem()
  const releaseTwo = createReleaseWorkflowListItem({
    releaseRecord: {
      id: "release_2",
      title: "SDK rollout v2.5",
    },
  })
  const detail = createReleaseWorkflowDetail({
    releaseRecord: {
      id: "release_2",
      title: "SDK rollout v2.5",
    },
  })

  const requests: string[] = []
  const data = await getServerReleaseWorkflowData(
    new Headers(),
    "workspace_1",
    {
      async getReleaseWorkflowDetail(_workspaceId, releaseRecordId) {
        requests.push(`detail:${releaseRecordId}`)
        assert.equal(releaseRecordId, "release_2")
        return detail
      },
      async getReleaseWorkflowHistory(_workspaceId, releaseRecordId) {
        requests.push(`history:${releaseRecordId}`)
        assert.equal(releaseRecordId, "release_2")
        return []
      },
      async getWorkspacePolicySettings() {
        return createWorkspacePolicySettings()
      },
      async listWorkspaceMembers() {
        return []
      },
      async listReleaseWorkflow() {
        return [releaseOne, releaseTwo]
      },
    },
    "release_2",
  )

  assert.equal(data.selectedId, "release_2")
  assert.deepEqual(data.selectedWorkflow, detail)
  assert.deepEqual(requests, ["detail:release_2", "history:release_2"])
})

test("buildReleaseWorkspaceHref keeps selected release and focus in one releases route", () => {
  assert.equal(
    buildReleaseWorkspaceHref({
      focus: "claim_check",
      selectedId: "release_1",
    }),
    "/dashboard/releases/release_1?focus=claim_check",
  )
  assert.equal(buildReleaseWorkspaceHref({ focus: "approval" }), "/dashboard/releases?focus=approval")
  assert.equal(isReleaseWorkflowWorkspaceFocus("publish_pack"), true)
  assert.equal(isReleaseWorkflowWorkspaceFocus("not-a-section"), false)
})

test("getServerReleaseWorkflowData falls back to a focus-matching release when no selected id is provided", async () => {
  const intakeRelease = createReleaseWorkflowListItem({
    releaseRecord: {
      id: "release_1",
      stage: "intake",
      title: "Initial scope",
    },
  })
  const approvalRelease = createReleaseWorkflowListItem({
    allowedActions: ["approve_draft"],
    approvalSummary: {
      ownerName: "Reviewer User",
      ownerUserId: "user_2",
      requestedByName: "Owner User",
      requestedByUserId: "user_1",
      state: "pending",
    },
    currentDraft: {
      id: "draft_2",
      version: 2,
    },
    releaseRecord: {
      id: "release_2",
      stage: "approval",
      title: "Needs sign-off",
    },
  })
  const detail = createReleaseWorkflowDetail({
    approvalSummary: {
      ownerName: "Reviewer User",
      ownerUserId: "user_2",
      requestedByName: "Owner User",
      requestedByUserId: "user_1",
      state: "pending",
    },
    currentDraft: {
      id: "draft_2",
      version: 2,
    },
    releaseRecord: {
      id: "release_2",
      stage: "approval",
      title: "Needs sign-off",
    },
  })

  const data = await getServerReleaseWorkflowData(
    new Headers(),
    "workspace_1",
    {
      async getReleaseWorkflowDetail(_workspaceId, releaseRecordId) {
        assert.equal(releaseRecordId, "release_2")
        return detail
      },
      async getReleaseWorkflowHistory() {
        return []
      },
      async getWorkspacePolicySettings() {
        return createWorkspacePolicySettings()
      },
      async listWorkspaceMembers() {
        return []
      },
      async listReleaseWorkflow() {
        return [intakeRelease, approvalRelease]
      },
    },
    null,
    "approval",
  )

  assert.equal(data.selectedId, "release_2")
  assert.equal(data.selectedWorkflow?.releaseRecord.id, "release_2")
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
      async getWorkspacePolicySettings() {
        return createWorkspacePolicySettings({
          requireReviewerAssignment: false,
        })
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
  assert.equal(data.policy.requireReviewerAssignment, false)
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
      async getWorkspacePolicySettings() {
        return createWorkspacePolicySettings()
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

test("getServerReleaseWorkflowData falls back to strict default policy when settings are unavailable", async () => {
  const data = await getServerReleaseWorkflowData(
    new Headers(),
    "workspace_1",
    {
      async getReleaseWorkflowDetail() {
        return createReleaseWorkflowDetail()
      },
      async getReleaseWorkflowHistory() {
        return []
      },
      async getWorkspacePolicySettings() {
        throw new ApiError("settings unavailable", 503, {
          message: "settings unavailable",
          status: 503,
        })
      },
      async listWorkspaceMembers() {
        return []
      },
      async listReleaseWorkflow() {
        return [createReleaseWorkflowListItem()]
      },
    },
  )

  assert.equal(data.policy.requireClaimCheckBeforeApproval, true)
  assert.equal(data.policy.requireReviewerAssignment, true)
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
        async getWorkspacePolicySettings() {
          return createWorkspacePolicySettings()
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

test("filterReleaseWorkflowQueueByMode keeps claim-check records scoped to drafted releases", () => {
  const draftedRelease = createReleaseWorkflowListItem({
    currentDraft: {
      id: "draft_1",
      version: 1,
    },
    releaseRecord: {
      id: "release_draft",
      stage: "draft",
    },
  })
  const intakeOnlyRelease = createReleaseWorkflowListItem({
    currentDraft: null,
    releaseRecord: {
      id: "release_intake",
      stage: "intake",
    },
  })

  const queue = filterReleaseWorkflowQueueByMode(
    [draftedRelease, intakeOnlyRelease],
    "user_1",
    "claim_check",
    "all",
  )

  assert.deepEqual(queue.map((item) => item.releaseRecord.id), ["release_draft"])
})

test("filterReleaseWorkflowQueueByMode keeps publish-pack records scoped to approved, ready, or exported releases", () => {
  const exportedRelease = createReleaseWorkflowListItem({
    latestPublishPackSummary: {
      state: "exported",
    },
    releaseRecord: {
      id: "release_exported",
      stage: "publish_pack",
    },
  })
  const readyRelease = createReleaseWorkflowListItem({
    latestPublishPackSummary: {
      state: "ready",
    },
    releaseRecord: {
      id: "release_ready",
      stage: "publish_pack",
    },
  })
  const approvedRelease = createReleaseWorkflowListItem({
    approvalSummary: {
      state: "approved",
    },
    releaseRecord: {
      id: "release_approved",
      stage: "publish_pack",
    },
  })
  const intakeOnlyRelease = createReleaseWorkflowListItem({
    currentDraft: null,
    releaseRecord: {
      id: "release_intake",
      stage: "intake",
    },
  })

  const queue = filterReleaseWorkflowQueueByMode(
    [exportedRelease, readyRelease, approvedRelease, intakeOnlyRelease],
    "user_1",
    "publish_pack",
    "all",
  )

  assert.deepEqual(queue.map((item) => item.releaseRecord.id), [
    "release_exported",
    "release_ready",
    "release_approved",
  ])
})

test("getReleaseWorkflowBoardStage collapses workflow status into kanban columns", () => {
  assert.equal(
    getReleaseWorkflowBoardStage(
      createReleaseWorkflowListItem({
        releaseRecord: { stage: "intake" },
      }),
    ),
    "intake",
  )
  assert.equal(
    getReleaseWorkflowBoardStage(
      createReleaseWorkflowListItem({
        releaseRecord: { stage: "draft" },
      }),
    ),
    "claim_check",
  )
  assert.equal(
    getReleaseWorkflowBoardStage(
      createReleaseWorkflowListItem({
        releaseRecord: { stage: "approval" },
      }),
    ),
    "approval",
  )
  assert.equal(
    getReleaseWorkflowBoardStage(
      createReleaseWorkflowListItem({
        approvalSummary: { state: "approved" },
        releaseRecord: { stage: "publish_pack" },
      }),
    ),
    "publish_pack",
  )
  assert.equal(
    getReleaseWorkflowBoardStage(
      createReleaseWorkflowListItem({
        latestPublishPackSummary: { state: "exported" },
        releaseRecord: { stage: "publish_pack" },
      }),
    ),
    "exported",
  )
})

test("buildReleaseWorkflowBoardColumns groups release records into workflow board columns", () => {
  const columns = buildReleaseWorkflowBoardColumns([
    createReleaseWorkflowListItem({
      releaseRecord: { id: "release_intake", stage: "intake", title: "Intake scope" },
    }),
    createReleaseWorkflowListItem({
      releaseRecord: { id: "release_draft", stage: "draft", title: "Draft scope" },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: { state: "pending" },
      releaseRecord: { id: "release_approval", stage: "approval", title: "Approval scope" },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: { state: "approved" },
      latestPublishPackSummary: { state: "ready" },
      releaseRecord: { id: "release_publish", stage: "publish_pack", title: "Publish scope" },
    }),
    createReleaseWorkflowListItem({
      latestPublishPackSummary: { state: "exported" },
      releaseRecord: { id: "release_exported", stage: "publish_pack", title: "Exported scope" },
    }),
  ])

  assert.deepEqual(
    columns.map((column) => ({
      ids: column.items.map((item) => item.id),
      stage: column.stage,
    })),
    [
      { ids: ["release_intake"], stage: "intake" },
      { ids: ["release_draft"], stage: "claim_check" },
      { ids: ["release_approval"], stage: "approval" },
      { ids: ["release_publish"], stage: "publish_pack" },
      { ids: ["release_exported"], stage: "exported" },
    ],
  )
  assert.deepEqual(
    columns.map((column) => ({
      stage: column.stage,
      stageLabels: column.items.map((item) => item.stageLabel),
    })),
    [
      { stage: "intake", stageLabels: ["Intake"] },
      { stage: "claim_check", stageLabels: ["Claim check"] },
      { stage: "approval", stageLabels: ["Approval"] },
      { stage: "publish_pack", stageLabels: ["Publish pack"] },
      { stage: "exported", stageLabels: ["Exported"] },
    ],
  )
})

test("buildReleaseWorkflowPublishPackNotes and artifact notes keep frozen handoff context visible", () => {
  const detail = createReleaseWorkflowDetail({
    latestPublishPackArtifact: {
      changelogBody: "## Changelog\n\n- Frozen change summary",
      context: {
        approvalNote: "Approved for export",
        approvalOwnerName: "Reviewer User",
        approvalOwnerUserId: "user_2",
        approvalRequestedByName: "Owner User",
        approvalRequestedByUserId: "user_1",
        approvalState: "approved",
        exportedByName: "Owner User",
        exportedByUserId: "user_1",
      },
      evidenceSnapshots: [
        {
          capturedAt: "2026-03-20T00:00:00.000Z",
          evidenceBlockId: "evidence_1",
          evidenceState: "fresh",
          sourceRef: "pull/123",
          sourceType: "pull_request",
          title: "Pull request evidence",
        },
      ],
      exportId: "export_1",
      exportedAt: "2026-03-20T03:00:00.000Z",
      policy: {
        includeEvidenceLinksInExport: true,
        includeSourceLinksInExport: false,
      },
      releaseNotesBody: "## Release notes\n\n- Frozen release note summary",
      sourceSnapshots: [],
    },
    latestPublishPackSummary: {
      draftRevisionId: "draft_1",
      exportedByName: "Owner User",
      exportedByUserId: "user_1",
      exportId: "export_1",
      exportedAt: "2026-03-20T03:00:00.000Z",
      includedEvidenceCount: 0,
      includedSourceLinkCount: 0,
      includesEvidenceLinks: true,
      includesSourceLinks: false,
      state: "exported",
    },
  })

  assert.deepEqual(buildReleaseWorkflowPublishPackNotes(detail), [
    "The current draft revision is already frozen into a publish pack export.",
    "The frozen handoff was exported by Owner User.",
    "The frozen handoff includes 1 evidence link and 0 source links.",
  ])
  assert.deepEqual(buildReleaseWorkflowPublishPackArtifactNotes(detail), [
    "Exported 2026-03-20T03:00:00.000Z by Owner User.",
    "Approval was frozen as approved with Reviewer User as the reviewer and Owner User as the requester.",
    "Evidence links were included in the frozen handoff (1 total).",
    "Source links were intentionally excluded from the frozen handoff by workspace policy.",
  ])
})

test("approval queue filters keep ownership handoff explicit", () => {
  const workflow = [
    createReleaseWorkflowListItem({
      approvalSummary: {
        ownerName: "Owner User",
        ownerUserId: "user_1",
        requestedByName: "Requester User",
        requestedByUserId: "user_3",
        state: "pending",
      },
      releaseRecord: {
        id: "release_assigned_to_me",
      },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: {
        ownerName: "Reviewer User",
        ownerUserId: "user_2",
        requestedByName: "Owner User",
        requestedByUserId: "user_1",
        state: "pending",
      },
      releaseRecord: {
        id: "release_requested_by_me",
      },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: {
        ownerName: null,
        ownerUserId: null,
        requestedByName: "Owner User",
        requestedByUserId: "user_1",
        state: "pending",
      },
      releaseRecord: {
        id: "release_unassigned",
      },
    }),
    createReleaseWorkflowListItem({
      approvalSummary: {
        state: "approved",
      },
      releaseRecord: {
        id: "release_signed_off",
      },
    }),
  ]

  assert.deepEqual(
    filterReleaseWorkflowApprovalQueue(workflow, "user_1", "all").map((item) => item.releaseRecord.id),
    ["release_assigned_to_me", "release_requested_by_me", "release_unassigned"],
  )
  assert.deepEqual(
    filterReleaseWorkflowApprovalQueue(workflow, "user_1", "assigned_to_me").map(
      (item) => item.releaseRecord.id,
    ),
    ["release_assigned_to_me"],
  )
  assert.deepEqual(
    filterReleaseWorkflowApprovalQueue(workflow, "user_1", "requested_by_me").map(
      (item) => item.releaseRecord.id,
    ),
    ["release_requested_by_me", "release_unassigned"],
  )
  assert.deepEqual(
    filterReleaseWorkflowApprovalQueue(workflow, "user_1", "unassigned").map(
      (item) => item.releaseRecord.id,
    ),
    ["release_unassigned"],
  )
})

test("approval filter metrics and ownership cues use the current reviewer identity", () => {
  const assignedToMe = createReleaseWorkflowListItem({
    approvalSummary: {
      ownerName: "Owner User",
      ownerUserId: "user_1",
      requestedByName: "Requester User",
      requestedByUserId: "user_3",
      state: "pending",
    },
  })
  const requestedByMe = createReleaseWorkflowListItem({
    approvalSummary: {
      ownerName: "Reviewer User",
      ownerUserId: "user_2",
      requestedByName: "Owner User",
      requestedByUserId: "user_1",
      state: "pending",
    },
  })
  const unassigned = createReleaseWorkflowListItem({
    approvalSummary: {
      ownerName: null,
      ownerUserId: null,
      requestedByName: "Owner User",
      requestedByUserId: "user_1",
      state: "pending",
    },
  })

  assert.deepEqual(buildReleaseWorkflowApprovalFilterCounts([assignedToMe, requestedByMe, unassigned], "user_1"), {
    all: 3,
    assigned_to_me: 1,
    requested_by_me: 2,
    unassigned: 1,
  })
  assert.deepEqual(getReleaseWorkflowOwnershipCue(assignedToMe, "user_1"), {
    description: "You currently own the approval decision for this draft revision.",
    label: "Assigned to you",
    tone: "assigned_to_me",
  })
  assert.deepEqual(getReleaseWorkflowOwnershipCue(requestedByMe, "user_1"), {
    description: "You routed this approval request to Reviewer User.",
    label: "Requested by you",
    tone: "requested_by_me",
  })
  assert.deepEqual(getReleaseWorkflowOwnershipCue(unassigned, "user_1"), {
    description:
      "Approval is pending without an assigned reviewer, so this record can drift unless someone claims it.",
    label: "Reviewer missing",
    tone: "unassigned",
  })

  assert.deepEqual(
    getReleaseWorkflowOwnershipCue(
      createReleaseWorkflowListItem({
        approvalSummary: {
          ownerName: null,
          ownerUserId: "user_3",
          requestedByName: "Owner User",
          requestedByUserId: "user_2",
          state: "pending",
        },
      }),
      "user_1",
    ),
    {
      description:
        "This release is waiting on an assigned reviewer before it can move toward publish-pack export.",
      label: "Waiting on assigned reviewer",
      tone: "attention",
    },
  )
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
    ownerName: null,
    ownerUserId: null,
    publishPackLabel: "Not ready",
    requestedByName: null,
    requestedByUserId: null,
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

test("release workflow display helpers shorten raw commit compare ranges for UI", () => {
  assert.equal(
    formatReleaseWorkflowCompareRange(
      "68b4a8d16a6497e4b559fef89885f401a7b0b4d1...eafbd117a544530e4c93f76bcc1fdb05529e0c4f",
    ),
    "68b4a8d...eafbd11",
  )

  assert.equal(
    getReleaseWorkflowDisplayTitle({
      compareRange:
        "68b4a8d16a6497e4b559fef89885f401a7b0b4d1...eafbd117a544530e4c93f76bcc1fdb05529e0c4f",
      title:
        "qyinm/pulsenote 68b4a8d16a6497e4b559fef89885f401a7b0b4d1...eafbd117a544530e4c93f76bcc1fdb05529e0c4f",
    }),
    "qyinm/pulsenote 68b4a8d...eafbd11",
  )
})

test("buildReleaseDraftEditorFields matches the API fallback for changelog-only publish packs", () => {
  const detail = createReleaseWorkflowDetail({
    currentDraft: {
      changelogBody: "- Only changelog content",
      fieldSnapshots: [],
      releaseNotesBody: "",
      templateId: "release_note_packet",
      templateLabel: "Release notes packet",
      templateVersion: 1,
    },
  })

  const fields = buildReleaseDraftEditorFields(detail.currentDraft!)

  assert.equal(fields[0]?.fieldKey, "publish_pack")
  assert.equal(fields[0]?.content, "- Only changelog content")
})

test("buildReleaseDraftEditorFields keeps legacy customer drafts on one visible field", () => {
  const detail = createReleaseWorkflowDetail({
    currentDraft: {
      changelogBody: "Legacy summary",
      evidenceRefs: [
        {
          anchorText: null,
          createdAt: "2026-03-20T00:00:00.000Z",
          evidenceBlockId: "evidence_1",
          fieldKey: "subject",
          id: "evidence_ref_1",
          note: null,
          sourceLinkId: null,
        },
      ],
      fieldSnapshots: [
        {
          content: "Legacy subject",
          contentFormat: "plain_text",
          fieldKey: "subject",
          label: "Subject",
          plainText: "Legacy subject",
          sortOrder: 0,
        },
      ],
      releaseNotesBody: "Legacy subject\n\nLegacy summary",
      templateId: "customer_update",
      templateLabel: "Customer update",
      templateVersion: 1,
    },
  })

  const fields = buildReleaseDraftEditorFields(detail.currentDraft!)

  assert.equal(fields.length, 1)
  assert.equal(fields[0]?.fieldKey, "customer_update")
  assert.equal(fields[0]?.label, "Customer update")
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
