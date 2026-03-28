import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspaceMember,
  WorkflowAllowedAction,
} from "../api/client"
import { createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"

type ReleaseWorkflowApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getReleaseWorkflowDetail" | "getReleaseWorkflowHistory" | "listReleaseWorkflow" | "listWorkspaceMembers"
>

export type ReleaseWorkflowData = {
  members: WorkspaceMember[]
  membersUnavailable: boolean
  selectedHistory: ReleaseWorkflowHistoryEntry[]
  selectedHistoryUnavailable: boolean
  selectedId: string | null
  selectedWorkflow: ReleaseWorkflowDetail | null
  workflow: ReleaseWorkflowListItem[]
}

export type ReleaseWorkflowQueueItem = {
  allowedActions: WorkflowAllowedAction[]
  approvalLabel: string
  claimCheckLabel: string
  evidenceCount: number
  id: string
  nextAction: string
  publishPackLabel: string
  readinessLabel: string
  readinessTone: ReleaseWorkflowListItem["readiness"]
  sourceLinkCount: number
  stageLabel: string
  summary: string
  title: string
  versionLabel: string
}

export type ReleaseWorkflowMetrics = {
  blockedRecords: number
  pendingApprovalRecords: number
  readyToExportRecords: number
  recordsInQueue: number
}

const workflowStageLabels = {
  approval: "Approval",
  claim_check: "Claim check",
  draft: "Draft",
  intake: "Intake",
  publish_pack: "Publish pack",
} satisfies Record<ReleaseWorkflowListItem["releaseRecord"]["stage"], string>

const workflowReadinessLabels = {
  attention: "Needs attention",
  blocked: "Blocked",
  ready: "Ready",
} satisfies Record<ReleaseWorkflowListItem["readiness"], string>

const workflowClaimCheckLabels = {
  blocked: "Blocked",
  cleared: "Clear",
  not_started: "Not started",
} satisfies Record<ReleaseWorkflowDetail["claimCheckSummary"]["state"], string>

const workflowApprovalLabels = {
  approved: "Signed off",
  not_requested: "Not requested",
  pending: "Pending",
  reopened: "Reopened",
} satisfies Record<ReleaseWorkflowDetail["approvalSummary"]["state"], string>

const workflowPublishPackLabels = {
  exported: "Exported",
  not_ready: "Not ready",
  ready: "Ready to export",
} satisfies Record<ReleaseWorkflowDetail["latestPublishPackSummary"]["state"], string>

const workflowActionLabels = {
  approve_draft: "Approve the current draft revision.",
  create_draft: "Create the next reviewable draft from release context.",
  create_publish_pack: "Freeze the approved publish pack for handoff.",
  reopen_draft: "Reopen this draft for another wording pass.",
  request_approval: "Request approval on the current checked draft.",
  run_claim_check: "Run claim check on the current draft revision.",
} satisfies Record<WorkflowAllowedAction, string>

export function createReleaseWorkflowDetailCache(
  selectedId: string,
  selectedWorkflow: ReleaseWorkflowDetail,
) {
  return {
    [selectedId]: selectedWorkflow,
  } satisfies Record<string, ReleaseWorkflowDetail>
}

export function getSelectedReleaseWorkflowDetail(
  detailById: Record<string, ReleaseWorkflowDetail>,
  selectedId: string,
) {
  if (!selectedId) {
    return null
  }

  return detailById[selectedId] ?? null
}

export function getReleaseWorkflowStageLabel(stage: ReleaseWorkflowListItem["releaseRecord"]["stage"]) {
  return workflowStageLabels[stage]
}

export function getReleaseWorkflowReadinessLabel(readiness: ReleaseWorkflowListItem["readiness"]) {
  return workflowReadinessLabels[readiness]
}

export function getReleaseWorkflowClaimCheckLabel(
  state: ReleaseWorkflowDetail["claimCheckSummary"]["state"],
) {
  return workflowClaimCheckLabels[state]
}

export function getReleaseWorkflowApprovalLabel(
  state: ReleaseWorkflowDetail["approvalSummary"]["state"],
) {
  return workflowApprovalLabels[state]
}

export function getReleaseWorkflowPublishPackLabel(
  state: ReleaseWorkflowDetail["latestPublishPackSummary"]["state"],
) {
  return workflowPublishPackLabels[state]
}

export function getReleaseWorkflowActionLabel(action: WorkflowAllowedAction) {
  return workflowActionLabels[action]
}

export function getReleaseWorkflowNextAction(item: ReleaseWorkflowListItem) {
  if (item.claimCheckSummary.blockerNotes.length > 0) {
    return item.claimCheckSummary.blockerNotes[0] as string
  }

  if (item.approvalSummary.state === "pending") {
    if (item.approvalSummary.ownerName) {
      return `Waiting on ${item.approvalSummary.ownerName} to review the current draft.`
    }

    return "Assign a reviewer before moving approval forward."
  }

  const nextAction = item.allowedActions[0]

  if (nextAction) {
    return getReleaseWorkflowActionLabel(nextAction)
  }

  if (item.latestPublishPackSummary.state === "exported") {
    return "The publish pack is already frozen for release handoff."
  }

  return "Review the latest workflow state before moving this release forward."
}

export function buildReleaseWorkflowQueueItem(
  item: ReleaseWorkflowListItem,
): ReleaseWorkflowQueueItem {
  return {
    allowedActions: item.allowedActions,
    approvalLabel: getReleaseWorkflowApprovalLabel(item.approvalSummary.state),
    claimCheckLabel: getReleaseWorkflowClaimCheckLabel(item.claimCheckSummary.state),
    evidenceCount: item.evidenceCount,
    id: item.releaseRecord.id,
    nextAction: getReleaseWorkflowNextAction(item),
    publishPackLabel: getReleaseWorkflowPublishPackLabel(item.latestPublishPackSummary.state),
    readinessLabel: getReleaseWorkflowReadinessLabel(item.readiness),
    readinessTone: item.readiness,
    sourceLinkCount: item.sourceLinkCount,
    stageLabel: getReleaseWorkflowStageLabel(item.releaseRecord.stage),
    summary: item.releaseRecord.summary ?? "No release summary is attached yet.",
    title: item.releaseRecord.title,
    versionLabel: item.currentDraft ? `Draft v${item.currentDraft.version}` : "No draft yet",
  }
}

export function buildReleaseWorkflowMetrics(
  workflow: ReleaseWorkflowListItem[],
): ReleaseWorkflowMetrics {
  return {
    blockedRecords: workflow.filter((item) => item.readiness === "blocked").length,
    pendingApprovalRecords: workflow.filter((item) => item.approvalSummary.state === "pending").length,
    readyToExportRecords: workflow.filter((item) =>
      item.latestPublishPackSummary.state === "ready" || item.latestPublishPackSummary.state === "exported"
    ).length,
    recordsInQueue: workflow.length,
  }
}

export function detailToReleaseWorkflowListItem(
  detail: ReleaseWorkflowDetail,
): ReleaseWorkflowListItem {
  return {
    allowedActions: detail.allowedActions,
    approvalSummary: detail.approvalSummary,
    claimCheckSummary: {
      blockerNotes: detail.claimCheckSummary.blockerNotes,
      draftRevisionId: detail.claimCheckSummary.draftRevisionId,
      flaggedClaims: detail.claimCheckSummary.flaggedClaims,
      state: detail.claimCheckSummary.state,
      totalClaims: detail.claimCheckSummary.totalClaims,
    },
    currentDraft:
      detail.currentDraft === null
        ? null
        : {
            createdAt: detail.currentDraft.createdAt,
            id: detail.currentDraft.id,
            version: detail.currentDraft.version,
          },
    evidenceCount: detail.evidenceBlocks.length,
    latestPublishPackSummary: detail.latestPublishPackSummary,
    readiness: detail.readiness,
    releaseRecord: {
      compareRange: detail.releaseRecord.compareRange,
      createdAt: detail.releaseRecord.createdAt,
      id: detail.releaseRecord.id,
      stage: detail.releaseRecord.stage,
      summary: detail.releaseRecord.summary,
      title: detail.releaseRecord.title,
      updatedAt: detail.releaseRecord.updatedAt,
      workspaceId: detail.releaseRecord.workspaceId,
    },
    sourceLinkCount: detail.sourceLinks.length,
  }
}

export function buildReleaseWorkflowEvidenceNotes(detail: ReleaseWorkflowDetail) {
  const evidenceNotes = detail.evidenceBlocks.map((evidenceBlock) => {
    const evidenceState =
      evidenceBlock.evidenceState.charAt(0).toUpperCase() + evidenceBlock.evidenceState.slice(1)

    return `${evidenceState}: ${evidenceBlock.title}`
  })
  const sourceLinkNotes = detail.sourceLinks.map(
    (sourceLink) => `Linked source: ${sourceLink.label}`,
  )

  if (evidenceNotes.length > 0 || sourceLinkNotes.length > 0) {
    return [...evidenceNotes, ...sourceLinkNotes]
  }

  return ["No evidence is attached to this release workflow yet."]
}

export function buildReleaseWorkflowClaimCheckNotes(detail: ReleaseWorkflowDetail) {
  if (detail.claimCheckSummary.items.length > 0) {
    return detail.claimCheckSummary.items.map((item) => {
      const state = item.status.charAt(0).toUpperCase() + item.status.slice(1)
      return `${state}: ${item.sentence}${item.note ? ` — ${item.note}` : ""}`
    })
  }

  if (detail.claimCheckSummary.blockerNotes.length > 0) {
    return detail.claimCheckSummary.blockerNotes
  }

  return ["Claim check has not produced any draft-level review notes yet."]
}

export function buildReleaseWorkflowApprovalNotes(detail: ReleaseWorkflowDetail) {
  const approvalReviewStatus = detail.reviewStatuses.find((reviewStatus) => reviewStatus.stage === "approval")

  if (approvalReviewStatus) {
    const state = approvalReviewStatus.state.charAt(0).toUpperCase() + approvalReviewStatus.state.slice(1)
    return [
      `Approval: ${state}${approvalReviewStatus.note ? ` — ${approvalReviewStatus.note}` : ""}`,
    ]
  }

  switch (detail.approvalSummary.state) {
    case "approved":
      return ["The current draft revision is approved for publish-pack assembly."]
    case "pending":
      return [
        detail.approvalSummary.ownerName
          ? `Approval has been requested and is waiting on ${detail.approvalSummary.ownerName}.`
          : "Approval has been requested but no reviewer is assigned yet.",
      ]
    case "reopened":
      return ["This draft was reopened after approval and needs another review pass."]
    default:
      return ["Approval has not been requested for the current draft revision."]
  }
}

export function buildReleaseWorkflowPublishPackNotes(detail: ReleaseWorkflowDetail) {
  if (detail.latestPublishPackSummary.state === "exported") {
    return ["The current draft revision is already frozen into a publish pack export."]
  }

  if (detail.latestPublishPackSummary.state === "ready") {
    return ["The current draft revision is approved and ready to export as a publish pack."]
  }

  return ["A publish pack will appear once the current draft is approved."]
}

export async function getServerReleaseWorkflowData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReleaseWorkflowApiClient = createApiClient(),
): Promise<ReleaseWorkflowData> {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const workflow = await apiClient.listReleaseWorkflow(workspaceId, init)
  let members: WorkspaceMember[] = []
  let membersUnavailable = false

  try {
    members = await apiClient.listWorkspaceMembers(workspaceId, init)
  } catch {
    members = []
    membersUnavailable = true
  }
  const selectedId = workflow[0]?.releaseRecord.id ?? null

  if (!selectedId) {
    return {
      members,
      membersUnavailable,
      selectedHistory: [],
      selectedHistoryUnavailable: false,
      selectedId: null,
      selectedWorkflow: null,
      workflow,
    }
  }

  const selectedWorkflow = await apiClient.getReleaseWorkflowDetail(workspaceId, selectedId, init)
  let selectedHistory: ReleaseWorkflowHistoryEntry[] = []
  let selectedHistoryUnavailable = false

  try {
    selectedHistory = await apiClient.getReleaseWorkflowHistory(workspaceId, selectedId, init)
  } catch {
    selectedHistory = []
    selectedHistoryUnavailable = true
  }

  return {
    members,
    membersUnavailable,
    selectedHistory,
    selectedHistoryUnavailable,
    selectedId,
    selectedWorkflow,
    workflow,
  }
}
