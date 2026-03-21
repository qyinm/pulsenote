import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowListItem,
  WorkflowAllowedAction,
} from "../api/client"
import { createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"

type ReleaseWorkflowApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getReleaseWorkflowDetail" | "listReleaseWorkflow"
>

export type ReleaseWorkflowData = {
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

export async function getServerReleaseWorkflowData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReleaseWorkflowApiClient = createApiClient(),
): Promise<ReleaseWorkflowData> {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const workflow = await apiClient.listReleaseWorkflow(workspaceId, init)
  const selectedId = workflow[0]?.releaseRecord.id ?? null

  if (!selectedId) {
    return {
      selectedId: null,
      selectedWorkflow: null,
      workflow,
    }
  }

  const selectedWorkflow = await apiClient.getReleaseWorkflowDetail(workspaceId, selectedId, init)

  return {
    selectedId,
    selectedWorkflow,
    workflow,
  }
}
