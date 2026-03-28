import assert from "node:assert/strict"
import test from "node:test"

import type { ReleaseRecordSnapshot } from "../lib/api/client.js"
import {
  buildEvidenceLibraryData,
  getServerEvidenceLibraryData,
} from "../lib/evidence-library.js"

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
      compareRange: releaseRecordOverrides.compareRange ?? "main...feature/evidence",
      connectionId: releaseRecordOverrides.connectionId ?? "connection_1",
      createdAt: releaseRecordOverrides.createdAt ?? "2026-03-20T00:00:00.000Z",
      id: releaseRecordOverrides.id ?? "release_1",
      stage: releaseRecordOverrides.stage ?? "claim_check",
      summary: releaseRecordOverrides.summary ?? "Release summary",
      title: releaseRecordOverrides.title ?? "SDK rollout v2.4",
      updatedAt: releaseRecordOverrides.updatedAt ?? "2026-03-20T00:00:00.000Z",
      workspaceId: releaseRecordOverrides.workspaceId ?? "workspace_1",
    },
    reviewStatuses: snapshotOverrides.reviewStatuses ?? [],
    sourceLinks: snapshotOverrides.sourceLinks ?? [],
  }
}

test("buildEvidenceLibraryData aggregates live evidence across linked release records", () => {
  const snapshots = [
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: "Retry rollout note",
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
      releaseRecord: {
        id: "release_1",
        stage: "claim_check",
        title: "SDK rollout v2.4",
      },
      reviewStatuses: [
        {
          id: "review_1",
          note: "Keep staged rollout wording narrow.",
          ownerUserId: "user_1",
          releaseRecordId: "release_1",
          stage: "claim_check",
          state: "blocked",
          updatedAt: "2026-03-20T00:10:00.000Z",
        },
      ],
    }),
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: "Retry rollout note",
          capturedAt: "2026-03-20T01:00:00.000Z",
          evidenceState: "stale",
          id: "evidence_2",
          provider: "github",
          releaseRecordId: "release_2",
          sourceRef: "pull/42",
          sourceType: "pull_request",
          title: "PR #42",
        },
      ],
      releaseRecord: {
        id: "release_2",
        stage: "approval",
        title: "Audit log filters",
      },
      reviewStatuses: [
        {
          id: "review_2",
          note: "Reconfirm this proof before approval closes.",
          ownerUserId: "user_2",
          releaseRecordId: "release_2",
          stage: "approval",
          state: "pending",
          updatedAt: "2026-03-20T01:10:00.000Z",
        },
      ],
    }),
  ]

  const data = buildEvidenceLibraryData(snapshots)

  assert.equal(data.entries.length, 1)
  assert.equal(data.metrics.totalSources, 1)
  assert.equal(data.metrics.linkedReleaseRecords, 2)
  assert.equal(data.metrics.staleSources, 0)
  assert.equal(data.metrics.freshSources, 0)

  const entry = data.entries[0]
  assert.ok(entry)
  assert.equal(entry?.freshness, "Watch")
  assert.equal(entry?.linkedReleaseCount, 2)
  assert.equal(entry?.providerLabel, "GitHub")
  assert.equal(entry?.sourceTypeLabel, "Pull request")
  assert.equal(entry?.sourceRef, "pull/42")
  assert.match(entry?.captureTrail[0] ?? "", /Audit log filters/)
  assert.match(entry?.reviewNotes.join(" ") ?? "", /staged rollout wording/i)
})

test("buildEvidenceLibraryData marks missing or unsupported evidence as stale", () => {
  const snapshots = [
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: null,
          capturedAt: "2026-03-20T00:00:00.000Z",
          evidenceState: "unsupported",
          id: "evidence_1",
          provider: "github",
          releaseRecordId: "release_1",
          sourceRef: "release:v2.4.0",
          sourceType: "release",
          title: "Release v2.4.0",
        },
      ],
    }),
  ]

  const data = buildEvidenceLibraryData(snapshots)

  assert.equal(data.metrics.staleSources, 1)
  assert.equal(data.priorityEntry?.freshness, "Stale")
  assert.match(data.priorityEntry?.nextChecks[0] ?? "", /refresh or replace/i)
})

test("buildEvidenceLibraryData scopes flagged claim notes to the linked evidence block", () => {
  const data = buildEvidenceLibraryData([
    createReleaseRecordSnapshot({
      claimCandidates: [
        {
          createdAt: "2026-03-20T00:05:00.000Z",
          evidenceBlockIds: ["evidence_1"],
          id: "claim_1",
          releaseRecordId: "release_1",
          sentence: "Retry messaging is already approved.",
          status: "flagged",
          updatedAt: "2026-03-20T00:05:00.000Z",
        },
        {
          createdAt: "2026-03-20T00:06:00.000Z",
          evidenceBlockIds: ["evidence_2"],
          id: "claim_2",
          releaseRecordId: "release_1",
          sentence: "Unrelated wording should stay out of this source.",
          status: "flagged",
          updatedAt: "2026-03-20T00:06:00.000Z",
        },
      ],
      evidenceBlocks: [
        {
          body: "Retry rollout note",
          capturedAt: "2026-03-20T00:00:00.000Z",
          evidenceState: "fresh",
          id: "evidence_1",
          provider: "github",
          releaseRecordId: "release_1",
          sourceRef: "pull/42",
          sourceType: "pull_request",
          title: "PR #42",
        },
        {
          body: "Migration note",
          capturedAt: "2026-03-20T00:30:00.000Z",
          evidenceState: "fresh",
          id: "evidence_2",
          provider: "github",
          releaseRecordId: "release_1",
          sourceRef: "pull/99",
          sourceType: "pull_request",
          title: "PR #99",
        },
      ],
    }),
  ])

  const retryEntry = data.entries.find((entry) => entry.sourceRef === "pull/42")
  assert.ok(retryEntry)
  assert.match(retryEntry?.reviewNotes.join(" ") ?? "", /Retry messaging is already approved/)
  assert.doesNotMatch(
    retryEntry?.reviewNotes.join(" ") ?? "",
    /Unrelated wording should stay out of this source/,
  )
})

test("buildEvidenceLibraryData uses actual timestamps when choosing the latest capture", () => {
  const data = buildEvidenceLibraryData([
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: "Earlier captured note",
          capturedAt: "2026-03-09T00:00:00.000Z",
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
    createReleaseRecordSnapshot({
      evidenceBlocks: [
        {
          body: "Later captured note",
          capturedAt: "2026-03-10T00:00:00.000Z",
          evidenceState: "fresh",
          id: "evidence_2",
          provider: "github",
          releaseRecordId: "release_2",
          sourceRef: "pull/42",
          sourceType: "pull_request",
          title: "PR #42",
        },
      ],
      releaseRecord: {
        id: "release_2",
        title: "Later release",
      },
    }),
  ])

  assert.equal(data.entries[0]?.note, "Later captured note")
  assert.match(data.entries[0]?.captureTrail[0] ?? "", /Later release/)
})

test("getServerEvidenceLibraryData forwards auth headers and returns live evidence data", async () => {
  const requests: RequestInit[] = []
  const snapshots = [
    createReleaseRecordSnapshot({
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
    }),
  ]

  const data = await getServerEvidenceLibraryData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    {
      async listReleaseRecords(workspaceId, init) {
        assert.equal(workspaceId, "workspace_1")
        requests.push(init ?? {})
        return snapshots
      },
    },
  )

  assert.equal(data.metrics.totalSources, 1)
  assert.equal(data.entries[0]?.title, "PR #42")
  assert.equal(
    ((requests[0]?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
})
