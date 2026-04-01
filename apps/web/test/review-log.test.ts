import assert from "node:assert/strict"
import test from "node:test"

import type { ReleaseWorkflowHistoryEntry } from "../lib/api/client.js"
import {
  buildReviewLogMetrics,
  getServerReviewLogData,
} from "../lib/dashboard/review-log.js"

function createHistoryEntry(
  overrides: Partial<ReleaseWorkflowHistoryEntry> = {},
): ReleaseWorkflowHistoryEntry {
  return {
    actorName: overrides.actorName ?? "Owner User",
    actorUserId: overrides.actorUserId ?? "user_1",
    createdAt: overrides.createdAt ?? "2026-03-20T00:00:00.000Z",
    draftRevisionId: overrides.draftRevisionId ?? "draft_1",
    draftVersion: overrides.draftVersion ?? 1,
    eventLabel: overrides.eventLabel ?? "Draft approved",
    eventType: overrides.eventType ?? "draft_approved",
    evidenceCount: overrides.evidenceCount ?? 3,
    id: overrides.id ?? "event_1",
    note: overrides.note ?? "Approved and ready for publish pack export.",
    outcome: overrides.outcome ?? "signed_off",
    publishPackExportId: overrides.publishPackExportId ?? null,
    releaseRecordId: overrides.releaseRecordId ?? "release_1",
    releaseTitle: overrides.releaseTitle ?? "SDK rollout v2.4",
    sourceLinkCount: overrides.sourceLinkCount ?? 2,
    stage: overrides.stage ?? "review",
  }
}

test("getServerReviewLogData forwards cookies to the workflow history API", async () => {
  const requests: RequestInit[] = []
  const entries = [createHistoryEntry()]

  const data = await getServerReviewLogData(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    "workspace_1",
    {
      async listReleaseWorkflowHistory(workspaceId, init) {
        requests.push(init ?? {})
        assert.equal(workspaceId, "workspace_1")
        return entries
      },
    },
  )

  assert.deepEqual(data, entries)
  assert.equal(
    ((requests[0]?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
})

test("buildReviewLogMetrics summarizes logged, blocked, reopened, and signed-off events", () => {
  const metrics = buildReviewLogMetrics([
    createHistoryEntry({
      eventType: "draft_created",
      id: "event_1",
      outcome: "revision",
      stage: "draft",
    }),
    createHistoryEntry({
      eventType: "draft_reopened",
      id: "event_2",
      outcome: "blocked",
      stage: "review",
    }),
    createHistoryEntry({
      eventType: "publish_pack_created",
      id: "event_3",
      outcome: "signed_off",
      publishPackExportId: "export_1",
      stage: "publish_pack",
    }),
  ])

  assert.deepEqual(metrics, {
    blockedEvents: 1,
    loggedDecisions: 3,
    reopenedItems: 1,
    signedOffEvents: 1,
  })
})
