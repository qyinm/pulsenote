import type {
  ReleaseRecordSnapshot,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
} from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import { buildEvidenceLibraryData } from "./evidence-library"
import { buildReviewInboxItems } from "./review-inbox"
import {
  getReleaseWorkflowNextAction,
  getReleaseWorkflowOwnershipCue,
  getReleaseWorkflowReadinessLabel,
  getReleaseWorkflowStageLabel,
} from "./release-workflow"
import {
  createDefaultWorkspacePolicySettings,
  getWorkspacePolicySettingsOrDefault,
} from "./workspace-policy"

type SearchApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getWorkspacePolicySettings" | "listReleaseRecords" | "listReleaseWorkflow" | "listReleaseWorkflowHistory"
>

export type LiveSearchResultType =
  | "Approval handoff"
  | "Evidence source"
  | "Release workflow"
  | "Review event"
  | "Review signal"

export type LiveSearchResultTone = "attention" | "blocked" | "default"

export type LiveSearchResult = {
  id: string
  meta: string
  orderTimestamp: string
  route: string
  searchText: string
  summary: string
  title: string
  tone: LiveSearchResultTone
  type: LiveSearchResultType
}

export type LiveSearchMetrics = {
  blockedResults: number
  evidenceSources: number
  indexedRecords: number
  reviewSignals: number
}

export type LiveSearchData = {
  metrics: LiveSearchMetrics
  results: LiveSearchResult[]
  suggestedQueries: string[]
}

function getToneRank(tone: LiveSearchResultTone) {
  if (tone === "blocked") {
    return 0
  }

  if (tone === "attention") {
    return 1
  }

  return 2
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid timestamp string in orderTimestamp: ${value}`)
  }

  return timestamp
}

function buildSearchResultSort(left: LiveSearchResult, right: LiveSearchResult) {
  const toneRank = getToneRank(left.tone) - getToneRank(right.tone)

  if (toneRank !== 0) {
    return toneRank
  }

  return toTimestamp(right.orderTimestamp) - toTimestamp(left.orderTimestamp)
}

function buildWorkflowSearchResults(
  workflow: ReleaseWorkflowListItem[],
): LiveSearchResult[] {
  return workflow.map((item) => ({
    id: `release:${item.releaseRecord.id}`,
    meta: `${getReleaseWorkflowStageLabel(item.releaseRecord.stage)} · ${getReleaseWorkflowReadinessLabel(item.readiness)} · ${item.evidenceCount} evidence blocks`,
    orderTimestamp: item.releaseRecord.updatedAt,
    route: "/dashboard/release-workflow",
    searchText: [
      item.releaseRecord.title,
      item.releaseRecord.summary ?? "",
      getReleaseWorkflowNextAction(item),
      item.approvalSummary.ownerName ?? "",
      item.approvalSummary.requestedByName ?? "",
      getReleaseWorkflowStageLabel(item.releaseRecord.stage),
      getReleaseWorkflowReadinessLabel(item.readiness),
    ]
      .join(" ")
      .toLowerCase(),
    summary: item.releaseRecord.summary ?? getReleaseWorkflowNextAction(item),
    title: item.releaseRecord.title,
    tone:
      item.readiness === "blocked"
        ? "blocked"
        : item.readiness === "attention"
          ? "attention"
          : "default",
    type: "Release workflow",
  }))
}

function buildApprovalSearchResults(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
): LiveSearchResult[] {
  return workflow
    .filter((item) => item.approvalSummary.state === "pending")
    .map((item) => {
      const cue = getReleaseWorkflowOwnershipCue(item, currentUserId)
      const ownerLabel = item.approvalSummary.ownerName ?? "Reviewer missing"

      return {
        id: `approval:${item.releaseRecord.id}`,
        meta: `${cue.label} · ${ownerLabel}`,
        orderTimestamp: item.approvalSummary.updatedAt ?? item.releaseRecord.updatedAt,
        route: "/dashboard/approval",
        searchText: [
          item.releaseRecord.title,
          cue.label,
          cue.description,
          item.approvalSummary.ownerName ?? "",
          item.approvalSummary.requestedByName ?? "",
          item.currentDraft ? `draft v${item.currentDraft.version}` : "",
        ]
          .join(" ")
          .toLowerCase(),
        summary: cue.description,
        title: item.releaseRecord.title,
        tone:
          cue.tone === "unassigned"
            ? "blocked"
            : cue.tone === "assigned_to_me" || cue.tone === "requested_by_me"
              ? "attention"
              : "default",
        type: "Approval handoff",
      } satisfies LiveSearchResult
    })
}

function buildHistorySearchResults(
  history: ReleaseWorkflowHistoryEntry[],
): LiveSearchResult[] {
  return history.map((entry) => ({
    id: `history:${entry.id}`,
    meta: `${entry.eventLabel} · ${getReleaseWorkflowStageLabel(entry.stage)}${entry.draftVersion ? ` · Draft v${entry.draftVersion}` : ""}`,
    orderTimestamp: entry.createdAt,
    route: "/dashboard/review-log",
    searchText: [
      entry.releaseTitle,
      entry.eventLabel,
      entry.note ?? "",
      entry.actorName ?? "",
      entry.outcome,
      getReleaseWorkflowStageLabel(entry.stage),
      entry.draftVersion ? `draft v${entry.draftVersion}` : "",
    ]
      .join(" ")
      .toLowerCase(),
    summary: entry.note ?? `${entry.eventLabel} recorded for this release workflow item.`,
    title: entry.releaseTitle,
    tone:
      entry.outcome === "blocked"
        ? "blocked"
        : entry.outcome === "revision"
          ? "attention"
          : "default",
    type: "Review event",
  }))
}

function buildEvidenceSearchResults(
  snapshots: ReleaseRecordSnapshot[],
): LiveSearchResult[] {
  const evidence = buildEvidenceLibraryData(snapshots)

  return evidence.entries.map((entry) => ({
    id: `evidence:${entry.id}`,
    meta: `${entry.sourceTypeLabel} · ${entry.providerLabel} · ${entry.linkedReleaseCount} linked releases`,
    orderTimestamp: entry.updatedAt,
    route: "/dashboard/evidence-library",
    searchText: [
      entry.title,
      entry.note,
      entry.sourceRef,
      entry.providerLabel,
      entry.sourceTypeLabel,
      ...entry.linkedReleases.map((release) => release.title),
      ...entry.reviewNotes,
    ]
      .join(" ")
      .toLowerCase(),
    summary: entry.note,
    title: entry.title,
    tone:
      entry.freshness === "Stale"
        ? "blocked"
        : entry.freshness === "Watch"
          ? "attention"
          : "default",
    type: "Evidence source",
  }))
}

function buildSignalSearchResults(
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
  currentUserId: string,
  policy: Pick<
    WorkspacePolicySettings,
    "showBlockedClaimsInInbox" | "showPendingApprovalsInInbox" | "showReopenedDraftsInInbox"
  >,
): LiveSearchResult[] {
  return buildReviewInboxItems(workflow, history, currentUserId, policy).map((item) => ({
    id: `signal:${item.id}`,
    meta: `${item.status} · ${item.lane}`,
    orderTimestamp: item.orderTimestamp,
    route: item.routeHref,
    searchText: [
      item.title,
      item.preview,
      item.owner,
      item.meta,
      ...item.overview,
      ...item.evidence,
      ...item.nextActions,
    ]
      .join(" ")
      .toLowerCase(),
    summary: item.preview,
    title: item.title,
    tone:
      item.status === "Blocked" || item.status === "Unassigned"
        ? "blocked"
        : item.status === "Pending" || item.status === "Reopened"
          ? "attention"
          : "default",
    type: "Review signal",
  }))
}

function buildSuggestedQueries(results: LiveSearchResult[]) {
  const suggestions: string[] = []
  let hasBlockedShortcut = false
  let hasApproval = false
  let hasEvidence = false
  let hasReopened = false
  let hasAssigned = false

  for (const result of results) {
    if (!hasBlockedShortcut && result.tone === "blocked" && result.searchText.includes("blocked")) {
      hasBlockedShortcut = true
    }

    if (!hasApproval && result.type === "Approval handoff") {
      hasApproval = true
    }

    if (!hasEvidence && result.type === "Evidence source") {
      hasEvidence = true
    }

    if (!hasReopened && result.searchText.includes("reopened")) {
      hasReopened = true
    }

    if (!hasAssigned && result.searchText.includes("assigned to you")) {
      hasAssigned = true
    }

    if (hasBlockedShortcut && hasApproval && hasEvidence && hasReopened && hasAssigned) {
      break
    }
  }

  if (hasBlockedShortcut) {
    suggestions.push("blocked")
  }

  if (hasApproval) {
    suggestions.push("approval")
  }

  if (hasEvidence) {
    suggestions.push("evidence")
  }

  if (hasReopened) {
    suggestions.push("reopened")
  }

  if (hasAssigned) {
    suggestions.push("assigned")
  }

  if (suggestions.length === 0) {
    suggestions.push("release")
  }

  return suggestions.slice(0, 5)
}

export function buildLiveSearchData(
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
  snapshots: ReleaseRecordSnapshot[],
  currentUserId: string,
  policy: Pick<
    WorkspacePolicySettings,
    "showBlockedClaimsInInbox" | "showPendingApprovalsInInbox" | "showReopenedDraftsInInbox"
  > = createDefaultWorkspacePolicySettings(),
): LiveSearchData {
  const results = [
    ...buildWorkflowSearchResults(workflow),
    ...buildApprovalSearchResults(workflow, currentUserId),
    ...buildEvidenceSearchResults(snapshots),
    ...buildHistorySearchResults(history),
    ...buildSignalSearchResults(workflow, history, currentUserId, policy),
  ].sort(buildSearchResultSort)

  return {
    metrics: {
      blockedResults: results.filter((result) => result.tone === "blocked").length,
      evidenceSources: results.filter((result) => result.type === "Evidence source").length,
      indexedRecords: results.length,
      reviewSignals: results.filter((result) => result.type === "Review signal").length,
    },
    results,
    suggestedQueries: buildSuggestedQueries(results),
  }
}

export async function getServerLiveSearchData(
  requestHeaders: Headers,
  workspaceId: string,
  currentUserId: string,
  apiClient: SearchApiClient = createApiClient(),
) {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const [workflow, history, snapshots, policy] = await Promise.all([
    apiClient.listReleaseWorkflow(workspaceId, init),
    apiClient.listReleaseWorkflowHistory(workspaceId, init),
    apiClient.listReleaseRecords(workspaceId, init),
    getWorkspacePolicySettingsOrDefault(workspaceId, () =>
      apiClient.getWorkspacePolicySettings(workspaceId, init),
    ),
  ])

  return buildLiveSearchData(workflow, history, snapshots, currentUserId, policy)
}
