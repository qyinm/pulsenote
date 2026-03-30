import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceMember,
  WorkflowAllowedAction,
} from "../api/client"
import { ApiError, createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"
import { createDefaultWorkspacePolicySettings } from "../workspace-policy"

type ReleaseWorkflowApiClient = Pick<
  ReturnType<typeof createApiClient>,
  | "getReleaseWorkflowDetail"
  | "getReleaseWorkflowHistory"
  | "getWorkspacePolicySettings"
  | "listReleaseWorkflow"
  | "listWorkspaceMembers"
>

export type ReleaseWorkflowData = {
  members: WorkspaceMember[]
  membersUnavailable: boolean
  policy: WorkspacePolicySettings
  selectedHistory: ReleaseWorkflowHistoryEntry[]
  selectedHistoryUnavailable: boolean
  selectedId: string | null
  selectedWorkflow: ReleaseWorkflowDetail | null
  workflow: ReleaseWorkflowListItem[]
}

export type ReleaseWorkflowApprovalOwnershipFilter =
  | "all"
  | "assigned_to_me"
  | "requested_by_me"
  | "unassigned"

export type ReleaseWorkflowMode = "approval" | "claim_check" | "overview" | "publish_pack"
export type ReleaseWorkflowWorkspaceFocus =
  | "approval"
  | "claim_check"
  | "draft"
  | "publish_pack"
  | "scope"
export type ReleaseWorkflowBoardStage =
  | "approval"
  | "claim_check"
  | "exported"
  | "intake"
  | "publish_pack"

export type ReleaseWorkflowQueueItem = {
  allowedActions: WorkflowAllowedAction[]
  approvalLabel: string
  claimCheckLabel: string
  evidenceCount: number
  id: string
  nextAction: string
  ownerName: string | null
  ownerUserId: string | null
  publishPackLabel: string
  requestedByName: string | null
  requestedByUserId: string | null
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

export type ReleaseWorkflowBoardColumn = {
  description: string
  items: ReleaseWorkflowQueueItem[]
  stage: ReleaseWorkflowBoardStage
  title: string
}

export type ReleaseWorkflowApprovalFilterCounts = Record<
  ReleaseWorkflowApprovalOwnershipFilter,
  number
>

export type ReleaseWorkflowOwnershipCue = {
  description: string
  label: string
  tone: "attention" | "assigned_to_me" | "requested_by_me" | "unassigned"
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

const releaseWorkflowBoardColumnMeta = {
  intake: {
    description: "New scopes live here until PulseNote turns them into a reviewable draft.",
    title: "Intake",
  },
  claim_check: {
    description: "Drafted releases stay here until wording, evidence, and risky claims are checked.",
    title: "Claim check",
  },
  approval: {
    description: "These releases are waiting on one explicit reviewer handoff before export.",
    title: "Approval",
  },
  publish_pack: {
    description: "Approved releases gather frozen handoff context before they are exported.",
    title: "Publish pack",
  },
  exported: {
    description: "These releases already have a frozen publish pack artifact attached to them.",
    title: "Exported",
  },
} satisfies Record<ReleaseWorkflowBoardStage, { description: string; title: string }>

const releaseWorkflowWorkspaceFocusValues = new Set<ReleaseWorkflowWorkspaceFocus>([
  "scope",
  "draft",
  "claim_check",
  "approval",
  "publish_pack",
])

export function isReleaseWorkflowWorkspaceFocus(
  value: string | null | undefined,
): value is ReleaseWorkflowWorkspaceFocus {
  return value !== null && value !== undefined && releaseWorkflowWorkspaceFocusValues.has(value as ReleaseWorkflowWorkspaceFocus)
}

export function buildReleaseWorkspaceHref({
  focus,
  selectedId,
}: {
  focus?: ReleaseWorkflowWorkspaceFocus | null
  selectedId?: string | null
}) {
  const encodedSelectedId = selectedId ? encodeURIComponent(selectedId) : null
  const searchParams = new URLSearchParams()

  if (focus) {
    searchParams.set("focus", focus)
  }

  const query = searchParams.toString()
  const basePath = encodedSelectedId
    ? `/dashboard/releases/${encodedSelectedId}`
    : "/dashboard/releases"

  return query ? `${basePath}?${query}` : basePath
}

function matchesReleaseWorkflowFocus(
  item: ReleaseWorkflowListItem,
  focus: ReleaseWorkflowWorkspaceFocus,
) {
  if (focus === "scope") {
    return true
  }

  if (focus === "draft") {
    return item.currentDraft !== null
  }

  if (focus === "claim_check") {
    return (
      item.releaseRecord.stage === "claim_check" ||
      item.releaseRecord.stage === "draft" ||
      item.claimCheckSummary.state === "blocked" ||
      item.allowedActions.includes("run_claim_check")
    )
  }

  if (focus === "approval") {
    return (
      item.releaseRecord.stage === "approval" ||
      item.approvalSummary.state === "pending" ||
      item.allowedActions.includes("request_approval") ||
      item.allowedActions.includes("approve_draft")
    )
  }

  return (
    item.releaseRecord.stage === "publish_pack" ||
    item.latestPublishPackSummary.state === "ready" ||
    item.latestPublishPackSummary.state === "exported" ||
    item.approvalSummary.state === "approved" ||
    item.allowedActions.includes("create_publish_pack")
  )
}

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

function isCommitLikeRef(value: string) {
  return /^[0-9a-f]{12,40}$/i.test(value)
}

function shortenCompareRef(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return trimmedValue
  }

  if (isCommitLikeRef(trimmedValue)) {
    return trimmedValue.slice(0, 7)
  }

  return trimmedValue
}

export function formatReleaseWorkflowCompareRange(compareRange: string | null) {
  if (!compareRange) {
    return "Release tag scope"
  }

  const [base, head] = compareRange.split("...")

  if (!base || !head) {
    return shortenCompareRef(compareRange)
  }

  return `${shortenCompareRef(base)}...${shortenCompareRef(head)}`
}

export function getReleaseWorkflowDisplayTitle(releaseRecord: Pick<ReleaseWorkflowListItem["releaseRecord"], "compareRange" | "title">) {
  const trimmedTitle = releaseRecord.title.trim()

  if (!trimmedTitle) {
    return "Untitled release"
  }

  if (!releaseRecord.compareRange) {
    return trimmedTitle
  }

  return trimmedTitle.replace(
    releaseRecord.compareRange,
    formatReleaseWorkflowCompareRange(releaseRecord.compareRange),
  )
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

function isPendingApprovalRecord(item: ReleaseWorkflowListItem) {
  return item.approvalSummary.state === "pending"
}

function matchesApprovalOwnershipFilter(
  item: ReleaseWorkflowListItem,
  currentUserId: string,
  filter: ReleaseWorkflowApprovalOwnershipFilter,
) {
  if (!isPendingApprovalRecord(item)) {
    return false
  }

  if (filter === "all") {
    return true
  }

  if (filter === "assigned_to_me") {
    return item.approvalSummary.ownerUserId === currentUserId
  }

  if (filter === "requested_by_me") {
    return item.approvalSummary.requestedByUserId === currentUserId
  }

  return item.approvalSummary.ownerUserId === null
}

export function filterReleaseWorkflowApprovalQueue(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
  filter: ReleaseWorkflowApprovalOwnershipFilter,
) {
  return workflow.filter((item) => matchesApprovalOwnershipFilter(item, currentUserId, filter))
}

export function filterReleaseWorkflowQueueByMode(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
  mode: ReleaseWorkflowMode,
  approvalFilter: ReleaseWorkflowApprovalOwnershipFilter,
) {
  if (mode === "approval") {
    return filterReleaseWorkflowApprovalQueue(workflow, currentUserId, approvalFilter)
  }

  if (mode === "claim_check") {
    return workflow.filter((item) => item.currentDraft !== null)
  }

  if (mode === "publish_pack") {
    return workflow.filter(
      (item) =>
        item.latestPublishPackSummary.state === "exported" ||
        item.latestPublishPackSummary.state === "ready" ||
        item.approvalSummary.state === "approved",
    )
  }

  return workflow
}

export function buildReleaseWorkflowApprovalFilterCounts(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
): ReleaseWorkflowApprovalFilterCounts {
  return workflow.reduce<ReleaseWorkflowApprovalFilterCounts>(
    (counts, item) => {
      if (!isPendingApprovalRecord(item)) {
        return counts
      }

      counts.all += 1

      if (item.approvalSummary.ownerUserId === currentUserId) {
        counts.assigned_to_me += 1
      }

      if (item.approvalSummary.requestedByUserId === currentUserId) {
        counts.requested_by_me += 1
      }

      if (item.approvalSummary.ownerUserId === null) {
        counts.unassigned += 1
      }

      return counts
    },
    {
      all: 0,
      assigned_to_me: 0,
      requested_by_me: 0,
      unassigned: 0,
    },
  )
}

export function getReleaseWorkflowOwnershipCue(
  item: ReleaseWorkflowListItem,
  currentUserId: string,
): ReleaseWorkflowOwnershipCue {
  if (item.approvalSummary.state !== "pending") {
    return {
      description: "This release is not waiting in the approval handoff queue right now.",
      label: "No active approval handoff",
      tone: "attention",
    }
  }

  if (!item.approvalSummary.ownerUserId) {
    return {
      description: "Approval is pending without an assigned reviewer, so this record can drift unless someone claims it.",
      label: "Reviewer missing",
      tone: "unassigned",
    }
  }

  if (item.approvalSummary.ownerUserId === currentUserId) {
    return {
      description: "You currently own the approval decision for this draft revision.",
      label: "Assigned to you",
      tone: "assigned_to_me",
    }
  }

  if (item.approvalSummary.requestedByUserId === currentUserId) {
    return {
      description: item.approvalSummary.ownerName
        ? `You routed this approval request to ${item.approvalSummary.ownerName}.`
        : "You requested approval, but the reviewer identity is still missing from the queue.",
      label: "Requested by you",
      tone: "requested_by_me",
    }
  }

  return {
    description: item.approvalSummary.ownerName
      ? `This release is waiting on ${item.approvalSummary.ownerName} before it can move toward publish-pack export.`
      : "This release is waiting on an assigned reviewer before it can move toward publish-pack export.",
    label: item.approvalSummary.ownerName
      ? `Waiting on ${item.approvalSummary.ownerName}`
      : "Waiting on assigned reviewer",
    tone: "attention",
  }
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
    ownerName: item.approvalSummary.ownerName,
    ownerUserId: item.approvalSummary.ownerUserId,
    publishPackLabel: getReleaseWorkflowPublishPackLabel(item.latestPublishPackSummary.state),
    requestedByName: item.approvalSummary.requestedByName,
    requestedByUserId: item.approvalSummary.requestedByUserId,
    readinessLabel: getReleaseWorkflowReadinessLabel(item.readiness),
    readinessTone: item.readiness,
    sourceLinkCount: item.sourceLinkCount,
    stageLabel: getReleaseWorkflowStageLabel(item.releaseRecord.stage),
    summary: item.releaseRecord.summary ?? "No release summary is attached yet.",
    title: getReleaseWorkflowDisplayTitle(item.releaseRecord),
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

export function getReleaseWorkflowBoardStage(
  item: ReleaseWorkflowListItem,
): ReleaseWorkflowBoardStage {
  if (item.latestPublishPackSummary.state === "exported") {
    return "exported"
  }

  if (
    item.releaseRecord.stage === "publish_pack" ||
    item.latestPublishPackSummary.state === "ready" ||
    item.approvalSummary.state === "approved"
  ) {
    return "publish_pack"
  }

  if (item.releaseRecord.stage === "approval") {
    return "approval"
  }

  if (item.releaseRecord.stage === "claim_check" || item.releaseRecord.stage === "draft") {
    return "claim_check"
  }

  return "intake"
}

export function buildReleaseWorkflowBoardColumns(
  workflow: ReleaseWorkflowListItem[],
): ReleaseWorkflowBoardColumn[] {
  const boardStagesInOrder = Object.keys(
    releaseWorkflowBoardColumnMeta,
  ) as ReleaseWorkflowBoardStage[]
  const itemsByStage = new Map<ReleaseWorkflowBoardStage, ReleaseWorkflowQueueItem[]>(
    boardStagesInOrder.map((stage) => [stage, []]),
  )

  for (const item of workflow) {
    const stage = getReleaseWorkflowBoardStage(item)
    itemsByStage.get(stage)?.push({
      ...buildReleaseWorkflowQueueItem(item),
      stageLabel: releaseWorkflowBoardColumnMeta[stage].title,
    })
  }

  return boardStagesInOrder.map((stage) => ({
      description: releaseWorkflowBoardColumnMeta[stage].description,
      items: itemsByStage.get(stage) ?? [],
      stage,
      title: releaseWorkflowBoardColumnMeta[stage].title,
    }))
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
  const pendingReviewerNote = detail.approvalSummary.ownerName
    ? `Approval has been requested and is waiting on ${detail.approvalSummary.ownerName}.`
    : "Approval has been requested but no reviewer is assigned yet."

  if (approvalReviewStatus) {
    const state = approvalReviewStatus.state.charAt(0).toUpperCase() + approvalReviewStatus.state.slice(1)

    if (approvalReviewStatus.state === "pending") {
      return [pendingReviewerNote]
    }

    return [
      `Approval: ${state}${approvalReviewStatus.note ? ` — ${approvalReviewStatus.note}` : ""}`,
    ]
  }

  switch (detail.approvalSummary.state) {
    case "approved":
      return ["The current draft revision is approved for publish-pack assembly."]
    case "pending":
      return [pendingReviewerNote]
    case "reopened":
      return ["This draft was reopened after approval and needs another review pass."]
    default:
      return ["Approval has not been requested for the current draft revision."]
  }
}

export function buildReleaseWorkflowPublishPackNotes(detail: ReleaseWorkflowDetail) {
  if (detail.latestPublishPackSummary.state === "exported") {
    const notes = ["The current draft revision is already frozen into a publish pack export."]
    const includedEvidenceCount =
      detail.latestPublishPackArtifact?.evidenceSnapshots.length ??
      detail.latestPublishPackSummary.includedEvidenceCount
    const includedSourceLinkCount =
      detail.latestPublishPackArtifact?.sourceSnapshots.length ??
      detail.latestPublishPackSummary.includedSourceLinkCount

    if (detail.latestPublishPackArtifact) {
      notes.push(
        detail.latestPublishPackArtifact.context.exportedByName
          ? `The frozen handoff was exported by ${detail.latestPublishPackArtifact.context.exportedByName}.`
          : "The frozen handoff keeps its exporter identity explicit.",
      )
      notes.push(
        `The frozen handoff includes ${pluralize("evidence link", includedEvidenceCount)} and ${pluralize("source link", includedSourceLinkCount)}.`,
      )
    }

    return notes
  }

  if (detail.latestPublishPackSummary.state === "ready") {
    return ["The current draft revision is approved and ready to export as a publish pack."]
  }

  return ["A publish pack will appear once the current draft is approved."]
}

function pluralize(word: string, count: number) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

export function buildReleaseWorkflowPublishPackArtifactNotes(detail: ReleaseWorkflowDetail) {
  const artifact = detail.latestPublishPackArtifact

  if (!artifact) {
    return ["No frozen publish pack has been created for this release yet."]
  }

  const approvalOwner = artifact.context.approvalOwnerName ?? "an unnamed reviewer"
  const requester = artifact.context.approvalRequestedByName ?? "an unnamed requester"

  return [
    `Exported ${artifact.exportedAt} by ${artifact.context.exportedByName ?? "an unknown workspace user"}.`,
    `Approval was frozen as ${artifact.context.approvalState.replaceAll("_", " ")} with ${approvalOwner} as the reviewer and ${requester} as the requester.`,
    artifact.policy.includeEvidenceLinksInExport
      ? `Evidence links were included in the frozen handoff (${artifact.evidenceSnapshots.length} total).`
      : "Evidence links were intentionally excluded from the frozen handoff by workspace policy.",
    artifact.policy.includeSourceLinksInExport
      ? `Source links were included in the frozen handoff (${artifact.sourceSnapshots.length} total).`
      : "Source links were intentionally excluded from the frozen handoff by workspace policy.",
  ]
}

export async function getServerReleaseWorkflowData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReleaseWorkflowApiClient = createApiClient(),
  preferredSelectedId?: string | null,
  preferredFocusSection?: ReleaseWorkflowWorkspaceFocus | null,
): Promise<ReleaseWorkflowData> {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const workflow = await apiClient.listReleaseWorkflow(workspaceId, init)
  let policy = createDefaultWorkspacePolicySettings(workspaceId)
  let members: WorkspaceMember[] = []
  let membersUnavailable = false

  try {
    policy = await apiClient.getWorkspacePolicySettings(workspaceId, init)
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 503)) {
      throw error
    }
  }

  try {
    members = await apiClient.listWorkspaceMembers(workspaceId, init)
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 503)) {
      throw error
    }

    members = []
    membersUnavailable = true
  }
  const selectedFromFocus = preferredFocusSection
    ? workflow.find((item) => matchesReleaseWorkflowFocus(item, preferredFocusSection))?.releaseRecord.id
    : null
  const selectedId =
    (preferredSelectedId &&
    workflow.some((item) => item.releaseRecord.id === preferredSelectedId)
      ? preferredSelectedId
      : selectedFromFocus ?? workflow[0]?.releaseRecord.id) ?? null

  if (!selectedId) {
    return {
      members,
      membersUnavailable,
      policy,
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
    policy,
    selectedHistory,
    selectedHistoryUnavailable,
    selectedId,
    selectedWorkflow,
    workflow,
  }
}
