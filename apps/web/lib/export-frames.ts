import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
} from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import {
  getReleaseWorkflowApprovalLabel,
  getReleaseWorkflowNextAction,
  getReleaseWorkflowPublishPackLabel,
  getReleaseWorkflowStageLabel,
} from "./release-workflow"

type ExportFramesApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "listReleaseWorkflow" | "listReleaseWorkflowHistory"
>

export type LiveExportFrameState = "Exported" | "Needs review" | "Ready to export"
export type LiveExportFrameTone = "attention" | "blocked" | "default"

export type LiveExportFrameEntry = {
  draftLabel: string
  evidenceCount: number
  frameContents: string[]
  guardrails: string[]
  id: string
  lastActivityAt: string
  lastActivityLabel: string
  ownerLabel: string
  recentActivity: string[]
  requestedByLabel: string
  sourceLinkCount: number
  stageLabel: string
  state: LiveExportFrameState
  summary: string
  title: string
  tone: LiveExportFrameTone
}

export type LiveExportFrameMetrics = {
  exportedFrames: number
  framesInScope: number
  needsReviewFrames: number
  readyFrames: number
}

export type LiveExportFramesData = {
  entries: LiveExportFrameEntry[]
  metrics: LiveExportFrameMetrics
  priorityFrame: LiveExportFrameEntry | null
}

const exportTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatExportTimestamp(value: string) {
  return `${exportTimestampFormatter.format(new Date(value))} UTC`
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    throw new Error("Invalid export frame timestamp provided.")
  }

  return timestamp
}

function getExportFrameState(item: ReleaseWorkflowListItem): LiveExportFrameState {
  if (item.latestPublishPackSummary.state === "exported") {
    return "Exported"
  }

  if (item.latestPublishPackSummary.state === "ready") {
    return "Ready to export"
  }

  return "Needs review"
}

function getExportFrameTone(item: ReleaseWorkflowListItem): LiveExportFrameTone {
  if (item.latestPublishPackSummary.state === "exported") {
    return "default"
  }

  if (
    item.readiness === "blocked" ||
    item.claimCheckSummary.state === "blocked" ||
    (item.approvalSummary.state === "pending" && item.approvalSummary.ownerUserId === null)
  ) {
    return "blocked"
  }

  if (
    item.readiness === "attention" ||
    item.approvalSummary.state === "pending" ||
    item.approvalSummary.state === "reopened"
  ) {
    return "attention"
  }

  return "default"
}

function getSortedReleaseHistory(history: ReleaseWorkflowHistoryEntry[]) {
  return history
    .slice()
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
}

function buildRecentActivity(sortedHistory: ReleaseWorkflowHistoryEntry[]) {
  const recent = sortedHistory.slice(0, 3)

  if (recent.length === 0) {
    return ["No workflow activity has been recorded for this release yet."]
  }

  return recent.map((entry) => {
    const note = entry.note ? ` — ${entry.note}` : ""
    return `${formatExportTimestamp(entry.createdAt)}: ${entry.eventLabel}${note}`
  })
}

function buildFrameContents(item: ReleaseWorkflowListItem) {
  const draftLabel = item.currentDraft
    ? `Freeze draft v${item.currentDraft.version} as the wording source for handoff.`
    : "No draft is available yet, so no wording can be frozen for export."
  const evidenceLabel = `${item.evidenceCount} evidence block${item.evidenceCount === 1 ? "" : "s"} and ${item.sourceLinkCount} linked source${item.sourceLinkCount === 1 ? "" : "s"} stay attached to this handoff.`
  const approvalLabel = `Approval state remains explicit: ${getReleaseWorkflowApprovalLabel(item.approvalSummary.state)}.`

  return [
    draftLabel,
    evidenceLabel,
    approvalLabel,
    `Publish-pack status: ${getReleaseWorkflowPublishPackLabel(item.latestPublishPackSummary.state)}.`,
  ]
}

function buildFrameGuardrails(item: ReleaseWorkflowListItem) {
  const guardrails: string[] = []

  if (item.claimCheckSummary.blockerNotes.length > 0) {
    guardrails.push(...item.claimCheckSummary.blockerNotes.slice(0, 2))
  }

  if (item.evidenceCount === 0) {
    guardrails.push("Attach at least one evidence block before a publish pack is frozen.")
  }

  if (item.sourceLinkCount === 0) {
    guardrails.push("Add a linked source so reviewers can inspect the proof behind the frozen wording.")
  }

  if (item.approvalSummary.state === "pending") {
    guardrails.push(
      item.approvalSummary.ownerName
        ? `Wait for ${item.approvalSummary.ownerName} to close the approval handoff before export.`
        : "Assign a reviewer before the approval handoff can move toward export.",
    )
  }

  if (item.approvalSummary.state === "not_requested") {
    guardrails.push("Request approval on the current draft before trying to export a publish pack.")
  }

  if (item.approvalSummary.state === "reopened") {
    guardrails.push("This draft was reopened, so the next export must wait for another review pass.")
  }

  if (item.latestPublishPackSummary.state === "exported") {
    guardrails.push("Treat the frozen publish pack as the handoff artifact; reopen the draft instead of editing around it.")
  } else if (item.latestPublishPackSummary.state === "ready") {
    guardrails.push("Freeze the approved draft promptly so the exported pack matches the reviewed wording.")
  }

  if (guardrails.length > 0) {
    return guardrails
  }

  return [getReleaseWorkflowNextAction(item)]
}

function buildLastActivityLabel(
  item: ReleaseWorkflowListItem,
  sortedHistory: ReleaseWorkflowHistoryEntry[],
) {
  const latestHistory = sortedHistory[0]

  if (latestHistory) {
    return `${latestHistory.eventLabel} · ${formatExportTimestamp(latestHistory.createdAt)}`
  }

  return `Workflow updated · ${formatExportTimestamp(item.releaseRecord.updatedAt)}`
}

function compareExportFrames(left: LiveExportFrameEntry, right: LiveExportFrameEntry) {
  const toneRank = {
    blocked: 0,
    attention: 1,
    default: 2,
  } satisfies Record<LiveExportFrameTone, number>

  const leftToneRank = toneRank[left.tone]
  const rightToneRank = toneRank[right.tone]

  if (leftToneRank !== rightToneRank) {
    return leftToneRank - rightToneRank
  }

  return toTimestamp(right.lastActivityAt) - toTimestamp(left.lastActivityAt)
}

export function buildLiveExportFramesData(
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
): LiveExportFramesData {
  const historyByReleaseId = new Map<string, ReleaseWorkflowHistoryEntry[]>()

  for (const entry of history) {
    const current = historyByReleaseId.get(entry.releaseRecordId)

    if (current) {
      current.push(entry)
      continue
    }

    historyByReleaseId.set(entry.releaseRecordId, [entry])
  }

  const entries = workflow
    .map((item) => {
      const releaseHistory = historyByReleaseId.get(item.releaseRecord.id) ?? []
      const sortedHistory = getSortedReleaseHistory(releaseHistory)
      const latestHistory = sortedHistory[0]

      return {
        draftLabel: item.currentDraft
          ? `Draft v${item.currentDraft.version}`
          : "No draft yet",
        evidenceCount: item.evidenceCount,
        frameContents: buildFrameContents(item),
        guardrails: buildFrameGuardrails(item),
        id: item.releaseRecord.id,
        lastActivityAt: latestHistory?.createdAt ?? item.releaseRecord.updatedAt,
        lastActivityLabel: buildLastActivityLabel(item, sortedHistory),
        ownerLabel: item.approvalSummary.ownerName ?? "Reviewer missing",
        recentActivity: buildRecentActivity(sortedHistory),
        requestedByLabel: item.approvalSummary.requestedByName ?? "No requester recorded",
        sourceLinkCount: item.sourceLinkCount,
        stageLabel: getReleaseWorkflowStageLabel(item.releaseRecord.stage),
        state: getExportFrameState(item),
        summary: item.releaseRecord.summary ?? getReleaseWorkflowNextAction(item),
        title: item.releaseRecord.title,
        tone: getExportFrameTone(item),
      } satisfies LiveExportFrameEntry
    })
    .sort(compareExportFrames)

  return {
    entries,
    metrics: {
      exportedFrames: entries.filter((entry) => entry.state === "Exported").length,
      framesInScope: entries.length,
      needsReviewFrames: entries.filter((entry) => entry.state === "Needs review").length,
      readyFrames: entries.filter((entry) => entry.state === "Ready to export").length,
    },
    priorityFrame:
      entries.find((entry) => entry.tone === "blocked") ??
      entries.find((entry) => entry.tone === "attention") ??
      entries.find((entry) => entry.state === "Ready to export") ??
      null,
  }
}

export async function getServerLiveExportFramesData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ExportFramesApiClient = createApiClient(),
) {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const [workflow, history] = await Promise.all([
    apiClient.listReleaseWorkflow(workspaceId, init),
    apiClient.listReleaseWorkflowHistory(workspaceId, init),
  ])

  return buildLiveExportFramesData(workflow, history)
}
