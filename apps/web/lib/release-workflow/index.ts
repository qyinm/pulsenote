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

export type ReleaseWorkflowReviewOwnershipFilter = ReleaseWorkflowApprovalOwnershipFilter

export type ReleaseWorkflowMode = "overview" | "publish_pack"
export type ReleaseWorkflowWorkspaceFocus =
  | "draft"
  | "publish_pack"
  | "review"
  | "scope"
export type ReleaseWorkflowBoardStage =
  | "exported"
  | "draft"
  | "intake"
  | "publish_pack"
  | "review"

export type ReleaseWorkflowQueueItem = {
  allowedActions: WorkflowAllowedAction[]
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
  reviewLabel: string
  sourceLinkCount: number
  stageLabel: string
  summary: string
  title: string
  versionLabel: string
}

export type ReleaseWorkflowMetrics = {
  blockedRecords: number
  pendingReviewRecords: number
  readyToExportRecords: number
  recordsInQueue: number
}

export type ReleaseWorkflowBoardColumn = {
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
  draft: "Draft",
  intake: "Intake",
  publish_pack: "Publish pack",
  review: "Review",
} satisfies Record<ReleaseWorkflowListItem["releaseRecord"]["stage"], string>

const workflowReadinessLabels = {
  attention: "Needs attention",
  blocked: "Blocked",
  ready: "Ready",
} satisfies Record<ReleaseWorkflowListItem["readiness"], string>

const workflowReviewLabels = {
  approved: "Signed off",
  not_requested: "Not requested",
  pending: "Pending",
  reopened: "Reopened",
} satisfies Record<ReleaseWorkflowDetail["reviewSummary"]["state"], string>

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
  request_review: "Request review on the current draft revision.",
} satisfies Record<WorkflowAllowedAction, string>

const releaseWorkflowBoardColumnMeta = {
  intake: {
    title: "Intake",
  },
  draft: {
    title: "Draft",
  },
  review: {
    title: "Review",
  },
  publish_pack: {
    title: "Publish pack",
  },
  exported: {
    title: "Exported",
  },
} satisfies Record<ReleaseWorkflowBoardStage, { title: string }>

const releaseWorkflowWorkspaceFocusValues = new Set<ReleaseWorkflowWorkspaceFocus>([
  "scope",
  "draft",
  "review",
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

  if (focus === "review") {
    return (
      item.releaseRecord.stage === "review" ||
      item.releaseRecord.stage === "draft" ||
      item.reviewSummary.state === "pending" ||
      item.readiness === "blocked" ||
      item.allowedActions.includes("request_review") ||
      item.allowedActions.includes("approve_draft")
    )
  }

  return (
    item.releaseRecord.stage === "publish_pack" ||
    item.latestPublishPackSummary.state === "ready" ||
    item.latestPublishPackSummary.state === "exported" ||
    item.reviewSummary.state === "approved" ||
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

export function getReleaseWorkflowReviewLabel(
  state: ReleaseWorkflowDetail["reviewSummary"]["state"],
) {
  return workflowReviewLabels[state]
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

  const normalizedCompareRange = compareRange.trim()

  if (!normalizedCompareRange) {
    return "Release tag scope"
  }

  const parts = normalizedCompareRange.split("...")

  if (parts.length !== 2) {
    return shortenCompareRef(normalizedCompareRange)
  }

  const [base, head] = parts

  return `${shortenCompareRef(base)}...${shortenCompareRef(head)}`
}

export function getReleaseWorkflowDisplayTitle(releaseRecord: Pick<ReleaseWorkflowListItem["releaseRecord"], "compareRange" | "title">) {
  const trimmedTitle = releaseRecord.title.trim()

  if (!trimmedTitle) {
    return "Untitled release"
  }

  const compareRange = releaseRecord.compareRange?.trim()

  if (!compareRange) {
    return trimmedTitle
  }

  return trimmedTitle.includes(compareRange)
    ? trimmedTitle.replace(compareRange, formatReleaseWorkflowCompareRange(compareRange))
    : trimmedTitle
}

export function getReleaseWorkflowNextAction(item: ReleaseWorkflowListItem) {
  if (item.reviewSummary.state === "pending") {
    if (item.reviewSummary.ownerName) {
      return `Waiting on ${item.reviewSummary.ownerName} to review the current draft.`
    }

    return "Assign a reviewer before moving review forward."
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

function isPendingReviewRecord(item: ReleaseWorkflowListItem) {
  return item.reviewSummary.state === "pending"
}

function matchesReviewOwnershipFilter(
  item: ReleaseWorkflowListItem,
  currentUserId: string,
  filter: ReleaseWorkflowReviewOwnershipFilter,
) {
  if (!isPendingReviewRecord(item)) {
    return false
  }

  if (filter === "all") {
    return true
  }

  if (filter === "assigned_to_me") {
    return item.reviewSummary.ownerUserId === currentUserId
  }

  if (filter === "requested_by_me") {
    return item.reviewSummary.requestedByUserId === currentUserId
  }

  return item.reviewSummary.ownerUserId === null
}

export function filterReleaseWorkflowReviewQueue(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
  filter: ReleaseWorkflowReviewOwnershipFilter,
) {
  return workflow.filter((item) => matchesReviewOwnershipFilter(item, currentUserId, filter))
}

export function filterReleaseWorkflowQueueByMode(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
  mode: ReleaseWorkflowMode,
  reviewFilter: ReleaseWorkflowReviewOwnershipFilter,
) {
  if (mode === "publish_pack") {
    return workflow.filter(
      (item) =>
        item.latestPublishPackSummary.state === "exported" ||
        item.latestPublishPackSummary.state === "ready" ||
        item.reviewSummary.state === "approved",
    )
  }

  return workflow
}

export function buildReleaseWorkflowReviewFilterCounts(
  workflow: ReleaseWorkflowListItem[],
  currentUserId: string,
): ReleaseWorkflowApprovalFilterCounts {
  return workflow.reduce<ReleaseWorkflowApprovalFilterCounts>(
    (counts, item) => {
      if (!isPendingReviewRecord(item)) {
        return counts
      }

      counts.all += 1

      if (item.reviewSummary.ownerUserId === currentUserId) {
        counts.assigned_to_me += 1
      }

      if (item.reviewSummary.requestedByUserId === currentUserId) {
        counts.requested_by_me += 1
      }

      if (item.reviewSummary.ownerUserId === null) {
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
  if (item.reviewSummary.state !== "pending") {
    return {
      description: "This release is not waiting in the review handoff queue right now.",
      label: "No active review handoff",
      tone: "attention",
    }
  }

  if (!item.reviewSummary.ownerUserId) {
    return {
      description: "Review is pending without an assigned reviewer, so this record can drift unless someone claims it.",
      label: "Reviewer missing",
      tone: "unassigned",
    }
  }

  if (item.reviewSummary.ownerUserId === currentUserId) {
    return {
      description: "You currently own the review decision for this draft revision.",
      label: "Assigned to you",
      tone: "assigned_to_me",
    }
  }

  if (item.reviewSummary.requestedByUserId === currentUserId) {
    return {
      description: item.reviewSummary.ownerName
        ? `You routed this review request to ${item.reviewSummary.ownerName}.`
        : "You requested review, but the reviewer identity is still missing from the queue.",
      label: "Requested by you",
      tone: "requested_by_me",
    }
  }

  return {
    description: item.reviewSummary.ownerName
      ? `This release is waiting on ${item.reviewSummary.ownerName} before it can move toward publish-pack export.`
      : "This release is waiting on an assigned reviewer before it can move toward publish-pack export.",
    label: item.reviewSummary.ownerName
      ? `Waiting on ${item.reviewSummary.ownerName}`
      : "Waiting on assigned reviewer",
    tone: "attention",
  }
}

export function buildReleaseWorkflowQueueItem(
  item: ReleaseWorkflowListItem,
): ReleaseWorkflowQueueItem {
  return {
    allowedActions: item.allowedActions,
    evidenceCount: item.evidenceCount,
    id: item.releaseRecord.id,
    nextAction: getReleaseWorkflowNextAction(item),
    ownerName: item.reviewSummary.ownerName,
    ownerUserId: item.reviewSummary.ownerUserId,
    publishPackLabel: getReleaseWorkflowPublishPackLabel(item.latestPublishPackSummary.state),
    requestedByName: item.reviewSummary.requestedByName,
    requestedByUserId: item.reviewSummary.requestedByUserId,
    readinessLabel: getReleaseWorkflowReadinessLabel(item.readiness),
    readinessTone: item.readiness,
    reviewLabel: getReleaseWorkflowReviewLabel(item.reviewSummary.state),
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
    pendingReviewRecords: workflow.filter((item) => item.reviewSummary.state === "pending").length,
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
    item.reviewSummary.state === "approved"
  ) {
    return "publish_pack"
  }

  if (item.releaseRecord.stage === "review") {
    return "review"
  }

  if (item.releaseRecord.stage === "draft") {
    return "draft"
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
      preferredDraftTemplateId: detail.releaseRecord.preferredDraftTemplateId,
      stage: detail.releaseRecord.stage,
      summary: detail.releaseRecord.summary,
      title: detail.releaseRecord.title,
      updatedAt: detail.releaseRecord.updatedAt,
      workspaceId: detail.releaseRecord.workspaceId,
    },
    reviewSummary: detail.reviewSummary,
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

export function buildReleaseWorkflowReviewNotes(detail: ReleaseWorkflowDetail) {
  const reviewReviewStatus = detail.reviewStatuses.find((reviewStatus) => reviewStatus.stage === "review")
  const pendingReviewerNote = detail.reviewSummary.ownerName
    ? `Review has been requested and is waiting on ${detail.reviewSummary.ownerName}.`
    : "Review has been requested but no reviewer is assigned yet."

  if (reviewReviewStatus) {
    const state = reviewReviewStatus.state.charAt(0).toUpperCase() + reviewReviewStatus.state.slice(1)

    if (reviewReviewStatus.state === "pending") {
      return [pendingReviewerNote]
    }

    return [
      `Review: ${state}${reviewReviewStatus.note ? ` — ${reviewReviewStatus.note}` : ""}`,
    ]
  }

  switch (detail.reviewSummary.state) {
    case "approved":
      return ["The current draft revision is approved for publish-pack assembly."]
    case "pending":
      return [pendingReviewerNote]
    case "reopened":
      return ["This draft was reopened after review and needs another review pass."]
    default:
      return ["Review has not been requested for the current draft revision."]
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
