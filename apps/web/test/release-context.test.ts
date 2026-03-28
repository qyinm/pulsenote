import assert from "node:assert/strict"
import test from "node:test"

import { ApiError, type ReleaseRecordSnapshot } from "../lib/api/client.js"
import {
  buildReleaseContextEvidenceNotes,
  buildReleaseContextMetrics,
  buildReleaseContextQueueItem,
  createReleaseContextDetailCache,
  getSelectedReleaseContextSnapshot,
  getServerReleaseContextData,
  getServerReleaseContextGitHubState,
} from "../lib/dashboard/release-context.js"

function createReleaseRecordSnapshot(
  overrides: Omit<Partial<ReleaseRecordSnapshot>, "releaseRecord"> & {
    releaseRecord?: Partial<ReleaseRecordSnapshot["releaseRecord"]>
  } = {},
): ReleaseRecordSnapshot {
  const releaseRecordOverrides: Partial<ReleaseRecordSnapshot["releaseRecord"]> =
    overrides.releaseRecord ?? {}
  const snapshotOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([key]) => key !== "releaseRecord"),
  ) as Omit<Partial<ReleaseRecordSnapshot>, "releaseRecord">

  return {
    ...snapshotOverrides,
    claimCandidates: overrides.claimCandidates ?? [],
    evidenceBlocks: overrides.evidenceBlocks ?? [],
    releaseRecord: {
      compareRange: releaseRecordOverrides.compareRange ?? "main...feature/release-context",
      connectionId: releaseRecordOverrides.connectionId ?? "connection_1",
      createdAt: releaseRecordOverrides.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecordOverrides.id ?? "release_1",
      stage: releaseRecordOverrides.stage ?? "intake",
      summary: releaseRecordOverrides.summary ?? "Release summary",
      title: releaseRecordOverrides.title ?? "SDK rollout v2.4",
      updatedAt: releaseRecordOverrides.updatedAt ?? "2026-03-20T00:00:00.000Z",
      workspaceId: releaseRecordOverrides.workspaceId ?? "workspace_1",
    },
    reviewStatuses: overrides.reviewStatuses ?? [],
    sourceLinks: overrides.sourceLinks ?? [],
  }
}

test("getServerReleaseContextData forwards cookies and loads the first selected detail", async () => {
  const requests: Array<{ init?: RequestInit; kind: "detail" | "list" }> = []
  const listSnapshot = createReleaseRecordSnapshot()
  const detailSnapshot = createReleaseRecordSnapshot({
    releaseRecord: {
      id: "release_1",
      summary: "Selected detail summary",
    },
  })

  const data = await getServerReleaseContextData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    {
      async getReleaseRecord(workspaceId, releaseRecordId, init) {
        requests.push({ init, kind: "detail" })
        assert.equal(workspaceId, "workspace_1")
        assert.equal(releaseRecordId, "release_1")
        return detailSnapshot
      },
      async listReleaseRecords(workspaceId, init) {
        requests.push({ init, kind: "list" })
        assert.equal(workspaceId, "workspace_1")
        return [listSnapshot]
      },
    },
  )

  assert.equal(data.selectedId, "release_1")
  assert.deepEqual(data.releaseRecords, [listSnapshot])
  assert.deepEqual(data.selectedReleaseRecord, detailSnapshot)
  assert.equal(
    ((requests[0]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.equal(
    ((requests[1]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
})

test("getServerReleaseContextData skips detail fetches when the queue is empty", async () => {
  let detailRequests = 0

  const data = await getServerReleaseContextData(new Headers(), "workspace_1", {
    async getReleaseRecord() {
      detailRequests += 1
      return createReleaseRecordSnapshot()
    },
    async listReleaseRecords() {
      return []
    },
  })

  assert.equal(detailRequests, 0)
  assert.equal(data.selectedId, null)
  assert.equal(data.selectedReleaseRecord, null)
  assert.deepEqual(data.releaseRecords, [])
})

test("getServerReleaseContextGitHubState forwards cookies and tolerates expected empty GitHub state", async () => {
  const requests: Array<{ init?: RequestInit; kind: "connection" | "install" }> = []

  const githubState = await getServerReleaseContextGitHubState(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    {
      async beginGitHubInstall(workspaceId, init) {
        requests.push({ init, kind: "install" })
        assert.equal(workspaceId, "workspace_1")
        throw new ApiError("GitHub App integration is unavailable", 503, {
          message: "GitHub App integration is unavailable",
          status: 503,
        })
      },
      async getGitHubConnection(workspaceId, init) {
        requests.push({ init, kind: "connection" })
        assert.equal(workspaceId, "workspace_1")
        throw new ApiError("GitHub connection was not found", 404, {
          message: "GitHub connection was not found",
          status: 404,
        })
      },
    },
  )

  assert.deepEqual(githubState, {
    connection: null,
    installUrl: null,
  })
  assert.equal(
    ((requests[0]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.equal(
    ((requests[1]?.init?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
})

test("getServerReleaseContextGitHubState rethrows unexpected GitHub state failures", async () => {
  await assert.rejects(
    () =>
      getServerReleaseContextGitHubState(new Headers(), "workspace_1", {
        async beginGitHubInstall() {
          return {
            url: "https://github.com/apps/pulsenote/installations/new",
          }
        },
        async getGitHubConnection() {
          throw new ApiError("Authentication is required", 401, {
            message: "Authentication is required",
            status: 401,
          })
        },
      }),
    /Authentication is required/,
  )
})

test("buildReleaseContextQueueItem marks blocked or unsupported evidence as at risk", () => {
  const snapshot = createReleaseRecordSnapshot({
    claimCandidates: [
      {
        createdAt: "2026-03-20T00:00:00.000Z",
        evidenceBlockIds: [],
        id: "claim_1",
        releaseRecordId: "release_1",
        sentence: "All enterprise workspaces can enable the control immediately.",
        status: "flagged",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
    evidenceBlocks: [
      {
        body: null,
        capturedAt: "2026-03-20T00:00:00.000Z",
        evidenceState: "missing",
        id: "evidence_1",
        provider: "github",
        releaseRecordId: "release_1",
        sourceRef: "pull/42",
        sourceType: "pull_request",
        title: "PR #42",
      },
    ],
    reviewStatuses: [
      {
        id: "review_1",
        note: "Availability wording is still blocked on rollout proof.",
        ownerUserId: "user_42",
        releaseRecordId: "release_1",
        stage: "intake",
        state: "blocked",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
    sourceLinks: [
      {
        id: "link_1",
        label: "PR #42",
        provider: "github",
        releaseRecordId: "release_1",
        url: "https://github.com/qyinm/pulsenote/pull/42",
      },
    ],
  })

  const queueItem = buildReleaseContextQueueItem(snapshot)

  assert.equal(queueItem.readiness, "At risk")
  assert.equal(queueItem.freshness, "Stale")
  assert.equal(queueItem.sourceSummary, "PR")
  assert.equal(queueItem.claimSummary, "0/1 claims linked")
  assert.match(queueItem.blockerSummary, /blocked/i)
})

test("buildReleaseContextMetrics summarizes reviewable release intake records", () => {
  const readySnapshot = createReleaseRecordSnapshot({
    claimCandidates: [
      {
        createdAt: "2026-03-20T00:00:00.000Z",
        evidenceBlockIds: ["evidence_1"],
        id: "claim_1",
        releaseRecordId: "release_1",
        sentence: "Retry logic now covers the rollout cohort already enabled.",
        status: "approved",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
    evidenceBlocks: [
      {
        body: null,
        capturedAt: "2026-03-20T00:00:00.000Z",
        evidenceState: "fresh",
        id: "evidence_1",
        provider: "github",
        releaseRecordId: "release_1",
        sourceRef: "release:v2.4.0",
        sourceType: "release",
        title: "Release v2.4.0",
      },
    ],
    reviewStatuses: [
      {
        id: "review_1",
        note: null,
        ownerUserId: "user_1",
        releaseRecordId: "release_1",
        stage: "intake",
        state: "approved",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
  })
  const reviewSnapshot = createReleaseRecordSnapshot({
    releaseRecord: {
      id: "release_2",
      title: "Billing migration notes",
    },
    claimCandidates: [
      {
        createdAt: "2026-03-20T00:00:00.000Z",
        evidenceBlockIds: [],
        id: "claim_2",
        releaseRecordId: "release_2",
        sentence: "Exports are available on every paid plan.",
        status: "pending",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
    evidenceBlocks: [
      {
        body: null,
        capturedAt: "2026-03-20T00:00:00.000Z",
        evidenceState: "stale",
        id: "evidence_2",
        provider: "github",
        releaseRecordId: "release_2",
        sourceRef: "commit:abc123",
        sourceType: "commit",
        title: "Commit abc123",
      },
    ],
    reviewStatuses: [
      {
        id: "review_2",
        note: "Pricing scope still needs confirmation.",
        ownerUserId: "user_2",
        releaseRecordId: "release_2",
        stage: "intake",
        state: "pending",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
  })

  const metrics = buildReleaseContextMetrics([readySnapshot, reviewSnapshot])

  assert.deepEqual(metrics, {
    atRiskRecords: 0,
    linkedClaims: 1,
    recordsInQueue: 2,
    totalEvidence: 2,
  })
})

test("createReleaseContextDetailCache resets the selected detail cache to the current record", () => {
  const selectedReleaseRecord = createReleaseRecordSnapshot({
    releaseRecord: {
      id: "release_2",
      title: "Billing migration notes",
    },
  })

  assert.deepEqual(createReleaseContextDetailCache("release_2", selectedReleaseRecord), {
    release_2: selectedReleaseRecord,
  })
})

test("getSelectedReleaseContextSnapshot falls back to the list snapshot until detail data arrives", () => {
  const listSnapshot = createReleaseRecordSnapshot({
    releaseRecord: {
      id: "release_2",
      title: "Billing migration notes",
    },
  })

  const selectedReleaseRecord = getSelectedReleaseContextSnapshot([listSnapshot], {}, "release_2")

  assert.deepEqual(selectedReleaseRecord, listSnapshot)
})

test("getSelectedReleaseContextSnapshot prefers fetched detail for the selected record", () => {
  const listSnapshot = createReleaseRecordSnapshot({
    releaseRecord: {
      id: "release_2",
      summary: "List summary",
      title: "Billing migration notes",
    },
  })
  const detailSnapshot = createReleaseRecordSnapshot({
    releaseRecord: {
      id: "release_2",
      summary: "Detail summary",
      title: "Billing migration notes",
    },
  })

  const selectedReleaseRecord = getSelectedReleaseContextSnapshot(
    [listSnapshot],
    createReleaseContextDetailCache("release_2", detailSnapshot),
    "release_2",
  )

  assert.deepEqual(selectedReleaseRecord, detailSnapshot)
})

test("buildReleaseContextEvidenceNotes keeps linked sources visible alongside evidence blocks", () => {
  const snapshot = createReleaseRecordSnapshot({
    evidenceBlocks: [
      {
        body: null,
        capturedAt: "2026-03-20T00:00:00.000Z",
        evidenceState: "fresh",
        id: "evidence_1",
        provider: "github",
        releaseRecordId: "release_1",
        sourceRef: "pull/42",
        sourceType: "pull_request",
        title: "PR #42",
      },
    ],
    sourceLinks: [
      {
        id: "link_1",
        label: "Release notes",
        provider: "github",
        releaseRecordId: "release_1",
        url: "https://github.com/qyinm/pulsenote/releases/tag/v2.4.0",
      },
    ],
  })

  assert.deepEqual(buildReleaseContextEvidenceNotes(snapshot), [
    "Fresh: PR #42",
    "Linked source: Release notes",
  ])
})
