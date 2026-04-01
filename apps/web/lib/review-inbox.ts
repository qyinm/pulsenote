import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
} from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import {
  buildReleaseWorkspaceHref,
  getReleaseWorkflowOwnershipCue,
} from "./release-workflow"
import {
  createDefaultWorkspacePolicySettings,
  getWorkspacePolicySettingsOrDefault,
} from "./workspace-policy"

type ReviewInboxApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getWorkspacePolicySettings" | "listReleaseWorkflow" | "listReleaseWorkflowHistory"
>

export type ReviewInboxView = "all" | "claims" | "approvals" | "signals"
export type ReviewInboxSource = "claim" | "review" | "workflow"

export type ReviewInboxItem = {
  evidence: string[]
  id: string
  lane: string
  meta: string
  nextActions: string[]
  orderTimestamp: string
  overview: string[]
  owner: string
  preview: string
  routeHref: string
  routeLabel: string
  secondaryHref: string
  secondaryLabel: string
  source: ReviewInboxSource
  status: string
  timeLabel: string
  title: string
}

export type ReviewInboxData = {
  count: number
  items: ReviewInboxItem[]
}

const inboxTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatInboxTimestamp(value: string) {
  return `${inboxTimestampFormatter.format(new Date(value))} UTC`
}

function buildHistoryIndex(history: ReleaseWorkflowHistoryEntry[]) {
  const latestByKey = new Map<string, ReleaseWorkflowHistoryEntry>()

  for (const entry of history) {
    const key = `${entry.releaseRecordId}:${entry.eventType}`
    const current = latestByKey.get(key)

    if (!current || current.createdAt < entry.createdAt) {
      latestByKey.set(key, entry)
    }
  }

  return latestByKey
}

function buildBlockedClaimItems(
  workflow: ReleaseWorkflowListItem[],
  latestHistoryByKey: Map<string, ReleaseWorkflowHistoryEntry>,
): ReviewInboxItem[] {
  return workflow
    .filter((item) => item.readiness === "blocked")
    .map((item) => {
      const historyEntry = latestHistoryByKey.get(`${item.releaseRecord.id}:review_requested`)
      const blockerNote = historyEntry?.note?.trim() || "Review is still blocked."
      const timestamp = historyEntry?.createdAt ?? item.releaseRecord.updatedAt

      return {
        evidence: [
          `${item.evidenceCount} evidence blocks and ${item.sourceLinkCount} source links are attached to this release.`,
        ],
        id: `claim:${item.releaseRecord.id}`,
        lane: "Claim review",
        meta: `Blocked review`,
        nextActions: [
          blockerNote,
          "Keep the release out of export until the public sentence and source evidence match exactly.",
        ],
        orderTimestamp: timestamp,
        overview: [
          blockerNote,
          "This release still has risky public wording or evidence gaps that must be narrowed before sign-off.",
        ],
        owner: "Review queue",
        preview: blockerNote,
        routeHref: buildReleaseWorkspaceHref({
          focus: "review",
          selectedId: item.releaseRecord.id,
        }),
        routeLabel: "Open release",
        secondaryHref: "/dashboard/new-release",
        secondaryLabel: "Create another release",
        source: "claim",
        status: "Blocked",
        timeLabel: formatInboxTimestamp(timestamp),
        title: item.releaseRecord.title,
      }
    })
}

function buildReviewItems(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
  latestHistoryByKey: Map<string, ReleaseWorkflowHistoryEntry>,
): ReviewInboxItem[] {
  return workflow
    .filter((item) => item.reviewSummary.state === "pending")
    .map((item) => {
      const ownershipCue = getReleaseWorkflowOwnershipCue(item, currentUserId)
      const historyEntry = latestHistoryByKey.get(`${item.releaseRecord.id}:review_requested`)
      const ownerLabel = item.reviewSummary.ownerName ?? "Unassigned reviewer"
      const timestamp = historyEntry?.createdAt ?? item.reviewSummary.updatedAt ?? item.releaseRecord.updatedAt

      return {
        evidence: [
          `${item.evidenceCount} evidence blocks and ${item.sourceLinkCount} source links are attached to the current draft.`,
          item.currentDraft
            ? `Review is still bound to Draft v${item.currentDraft.version}.`
            : "Review is waiting on the current draft revision to stay explicit.",
        ],
        id: `review:${item.releaseRecord.id}`,
        lane: "Review handoff",
        meta: ownershipCue.label,
        nextActions: [
          ownershipCue.description,
          item.reviewSummary.ownerUserId
            ? "Leave the release in review until the assigned reviewer records an explicit decision."
            : "Assign a reviewer before the review handoff can move forward.",
        ],
        orderTimestamp: timestamp,
        overview: [
          historyEntry?.note ??
            item.releaseRecord.summary ??
            "Review was requested for the current release draft.",
          ownershipCue.description,
        ],
        owner: ownerLabel,
        preview:
          historyEntry?.note ??
          (item.reviewSummary.ownerName
            ? `Waiting on ${item.reviewSummary.ownerName} to review the current draft.`
            : "Review is pending without an assigned reviewer."),
        routeHref: buildReleaseWorkspaceHref({
          focus: "review",
          selectedId: item.releaseRecord.id,
        }),
        routeLabel: "Open release",
        secondaryHref: "/dashboard/review-log",
        secondaryLabel: "Open review log",
        source: "review",
        status: ownershipCue.tone === "unassigned" ? "Unassigned" : "Pending",
        timeLabel: formatInboxTimestamp(timestamp),
        title: item.releaseRecord.title,
      }
    })
}

function buildReopenedDraftItems(
  latestHistoryByKey: Map<string, ReleaseWorkflowHistoryEntry>,
  workflowByReleaseId: Map<string, ReleaseWorkflowListItem>,
): ReviewInboxItem[] {
  const reopenedEntries: ReleaseWorkflowHistoryEntry[] = []

  for (const entry of latestHistoryByKey.values()) {
    if (entry.eventType === "draft_reopened") {
      reopenedEntries.push(entry)
    }
  }

  return reopenedEntries.flatMap((entry) => {
    const workflowItem = workflowByReleaseId.get(entry.releaseRecordId)

    if (workflowItem?.reviewSummary.state !== "reopened") {
      return []
    }

    const stageLabel = workflowItem?.releaseRecord.stage === "review" ? "Review follow-up" : "Workflow follow-up"
    const ownerLabel =
      workflowItem?.reviewSummary.ownerName ??
      (workflowItem?.reviewSummary.ownerUserId ? "Assigned reviewer" : "Release owner")

    return [
      {
        evidence: [
          `${entry.evidenceCount} evidence blocks and ${entry.sourceLinkCount} source links are still linked to this release.`,
          entry.draftVersion
            ? `The reopen event landed on Draft v${entry.draftVersion}.`
            : "The draft was reopened for another wording pass.",
        ],
        id: `workflow:${entry.id}`,
        lane: stageLabel,
        meta: "Draft reopened",
        nextActions: [
          entry.note ?? "Tighten the reopened wording before sending the release back into approval.",
          "Use review log history to confirm what changed before you re-request approval.",
        ],
        orderTimestamp: entry.createdAt,
        overview: [
          entry.note ?? "The draft was reopened after an approval decision.",
          "Reopened drafts should stay visible until another clean review pass is complete.",
        ],
        owner: ownerLabel,
        preview: entry.note ?? "The draft was reopened and needs another review pass.",
        routeHref: "/dashboard/review-log",
        routeLabel: "Open review log",
        secondaryHref: buildReleaseWorkspaceHref({
          focus: "draft",
          selectedId: entry.releaseRecordId,
        }),
        secondaryLabel: "Open release",
        source: "workflow",
        status: "Reopened",
        timeLabel: formatInboxTimestamp(entry.createdAt),
        title: entry.releaseTitle,
      },
    ]
  })
}

export function buildReviewInboxItems(
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
  currentUserId: string,
  policy: Pick<
    WorkspacePolicySettings,
    "showBlockedClaimsInInbox" | "showPendingApprovalsInInbox" | "showReopenedDraftsInInbox"
  > = createDefaultWorkspacePolicySettings(),
): ReviewInboxItem[] {
  const latestHistoryByKey = buildHistoryIndex(history)
  const workflowByReleaseId = new Map(workflow.map((item) => [item.releaseRecord.id, item]))
  const items: ReviewInboxItem[] = []

  if (policy.showPendingApprovalsInInbox) {
    items.push(...buildReviewItems(workflow, currentUserId, latestHistoryByKey))
  }

  if (policy.showBlockedClaimsInInbox) {
    items.push(...buildBlockedClaimItems(workflow, latestHistoryByKey))
  }

  if (policy.showReopenedDraftsInInbox) {
    items.push(...buildReopenedDraftItems(latestHistoryByKey, workflowByReleaseId))
  }

  return items.sort((left, right) => right.orderTimestamp.localeCompare(left.orderTimestamp))
}

export async function getServerReviewInboxData(
  requestHeaders: Headers,
  workspaceId: string,
  currentUserId: string,
  apiClient: ReviewInboxApiClient = createApiClient(),
): Promise<ReviewInboxData> {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const [workflow, history, persistedPolicy] = await Promise.all([
    apiClient.listReleaseWorkflow(workspaceId, init),
    apiClient.listReleaseWorkflowHistory(workspaceId, init),
    getWorkspacePolicySettingsOrDefault(workspaceId, () =>
      apiClient.getWorkspacePolicySettings(workspaceId, init),
    ),
  ])
  const items = buildReviewInboxItems(workflow, history, currentUserId, persistedPolicy)

  return {
    count: items.length,
    items,
  }
}
