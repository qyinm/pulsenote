"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import {
  BadgeCheckIcon,
  FileOutputIcon,
  FileSearchIcon,
  FolderKanbanIcon,
  LayoutGridIcon,
  Rows3Icon,
  ShieldAlertIcon,
  TimerResetIcon,
} from "lucide-react"

import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceMember,
  WorkflowAllowedAction,
} from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import {
  type ReleaseWorkflowApprovalOwnershipFilter,
  type ReleaseWorkflowBoardColumn,
  buildReleaseWorkflowBoardColumns,
  buildReleaseWorkspaceHref,
  type ReleaseWorkflowMode,
  type ReleaseWorkflowQueueItem,
  type ReleaseWorkflowWorkspaceFocus,
  buildReleaseWorkflowApprovalFilterCounts,
  buildReleaseWorkflowApprovalNotes,
  buildReleaseWorkflowClaimCheckNotes,
  buildReleaseWorkflowEvidenceNotes,
  buildReleaseWorkflowMetrics,
  buildReleaseWorkflowPublishPackArtifactNotes,
  buildReleaseWorkflowPublishPackNotes,
  buildReleaseWorkflowQueueItem,
  detailToReleaseWorkflowListItem,
  filterReleaseWorkflowQueueByMode,
  getReleaseWorkflowActionLabel,
  getReleaseWorkflowOwnershipCue,
  getSelectedReleaseWorkflowDetail,
} from "@/lib/release-workflow"
import {
  BulletList,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { formatUtcTimestamp } from "@/lib/format"
import {
  buildReleaseDraftEditorFields,
  getReleaseDraftTemplateOption,
} from "@/lib/draft-templates"
import { cn } from "@/lib/utils"

const approvalOwnershipFilters: Array<{
  label: string
  value: ReleaseWorkflowApprovalOwnershipFilter
}> = [
  { label: "All pending", value: "all" },
  { label: "Assigned to me", value: "assigned_to_me" },
  { label: "Requested by me", value: "requested_by_me" },
  { label: "Unassigned", value: "unassigned" },
]

type ReleaseWorkflowWorkspaceView = "board" | "list"

type ReleaseWorkflowLiveWorkspaceProps = {
  currentUserId: string
  initialMembers: WorkspaceMember[]
  initialMembersUnavailable: boolean
  initialPolicy: WorkspacePolicySettings
  initialSelectedHistory: ReleaseWorkflowHistoryEntry[]
  initialSelectedHistoryUnavailable: boolean
  initialSelectedId: string
  initialSelectedWorkflow: ReleaseWorkflowDetail
  initialWorkflow: ReleaseWorkflowListItem[]
  mode: ReleaseWorkflowMode
  overviewVariant?: "detail" | "workspace"
  preferredFocusSection?: ReleaseWorkflowWorkspaceFocus | null
  workspaceId: string
}

type SelectedWorkflowResourceParams<T> = {
  initialIsLoading?: boolean
  initialSelectedId: string
  initialValue: T | null
  loadFailureMessage: string
  loadResource: (selectedId: string) => Promise<T>
  selectedId: string | null
}

const actionButtonLabels = {
  approve_draft: "Approve draft",
  create_draft: "Create draft",
  create_publish_pack: "Create publish pack",
  reopen_draft: "Reopen draft",
  request_approval: "Request approval",
  run_claim_check: "Run claim check",
} satisfies Record<WorkflowAllowedAction, string>

function statusBadge(tone: "attention" | "blocked" | "ready", label: string) {
  if (tone === "blocked") {
    return <Badge variant="destructive">{label}</Badge>
  }

  if (tone === "attention") {
    return <Badge variant="secondary">{label}</Badge>
  }

  return <Badge variant="outline">{label}</Badge>
}

function approvalBadge(state: ReleaseWorkflowDetail["approvalSummary"]["state"]) {
  if (state === "approved") {
    return <Badge variant="outline">Signed off</Badge>
  }

  if (state === "pending") {
    return <Badge variant="secondary">Pending</Badge>
  }

  if (state === "reopened") {
    return <Badge variant="destructive">Reopened</Badge>
  }

  return <Badge variant="secondary">Not requested</Badge>
}

function publishPackBadge(state: ReleaseWorkflowDetail["latestPublishPackSummary"]["state"]) {
  if (state === "exported") {
    return <Badge variant="outline">Exported</Badge>
  }

  if (state === "ready") {
    return <Badge variant="secondary">Ready to export</Badge>
  }

  return <Badge variant="destructive">Not ready</Badge>
}

function claimCheckBadge(state: ReleaseWorkflowDetail["claimCheckSummary"]["state"]) {
  if (state === "cleared") {
    return <Badge variant="outline">Clear</Badge>
  }

  if (state === "blocked") {
    return <Badge variant="destructive">Blocked</Badge>
  }

  return <Badge variant="secondary">Not started</Badge>
}

function historyOutcomeBadge(outcome: ReleaseWorkflowHistoryEntry["outcome"]) {
  if (outcome === "blocked") {
    return <Badge variant="destructive">Blocked</Badge>
  }

  if (outcome === "signed_off") {
    return <Badge variant="outline">Signed off</Badge>
  }

  if (outcome === "revision") {
    return <Badge variant="secondary">Revision</Badge>
  }

  return <Badge variant="secondary">Progressed</Badge>
}

function ownershipCueBadge(cue: ReturnType<typeof getReleaseWorkflowOwnershipCue>) {
  if (cue.tone === "unassigned") {
    return <Badge variant="destructive">{cue.label}</Badge>
  }

  if (cue.tone === "assigned_to_me") {
    return <Badge variant="outline">{cue.label}</Badge>
  }

  return <Badge variant="secondary">{cue.label}</Badge>
}

function getWorkspaceMemberLabel(member: WorkspaceMember) {
  const name = member.user.fullName?.trim() || member.user.email
  return `${name} · ${member.membership.role}`
}

function getDefaultReviewerUserId(
  members: WorkspaceMember[],
  selectedWorkflow: ReleaseWorkflowDetail | null,
) {
  const currentOwnerUserId = selectedWorkflow?.approvalSummary.ownerUserId

  if (currentOwnerUserId && members.some((member) => member.user.id === currentOwnerUserId)) {
    return currentOwnerUserId
  }

  return ""
}

function formatHistoryTimestamp(value: string) {
  return formatUtcTimestamp(value)
}

function buildDraftFieldValues(draftFieldSnapshots: Array<{ content: string; fieldKey: string }>) {
  return Object.fromEntries(
    draftFieldSnapshots.map((fieldSnapshot) => [fieldSnapshot.fieldKey, fieldSnapshot.content]),
  )
}

function buildDraftLinkedEvidenceItems(
  detail: ReleaseWorkflowDetail,
  draftFieldSnapshots: Array<{ fieldKey: string; label?: string }>,
) {
  const singleVisibleLabel = draftFieldSnapshots[0]?.label ?? "Draft content"
  const fieldKeyLabel = new Map(
    draftFieldSnapshots.map((fieldSnapshot) => [
      fieldSnapshot.fieldKey,
      fieldSnapshot.label ?? fieldSnapshot.fieldKey.replaceAll("_", " "),
    ]),
  )

  return detail.currentDraft?.evidenceRefs.slice(0, 5).map((evidenceRef) => {
    const linkedEvidence = detail.evidenceBlocks.find(
      (evidenceBlock) => evidenceBlock.id === evidenceRef.evidenceBlockId,
    )
    const targetLabel =
      fieldKeyLabel.get(evidenceRef.fieldKey) ??
      (draftFieldSnapshots.length === 1
        ? singleVisibleLabel
        : evidenceRef.fieldKey.replaceAll("_", " "))

    return linkedEvidence
      ? `${linkedEvidence.title} -> ${targetLabel}`
      : `Evidence ref ${evidenceRef.evidenceBlockId} -> ${targetLabel}`
  }) ?? []
}

function buildDraftEditorFieldSnapshots(
  draft: ReleaseWorkflowDetail["currentDraft"],
) {
  if (!draft) {
    return []
  }

  return buildReleaseDraftEditorFields(draft)
}

function buildPublishPackArtifactEvidenceItems(detail: ReleaseWorkflowDetail) {
  const artifact = detail.latestPublishPackArtifact

  if (!artifact || artifact.evidenceSnapshots.length === 0) {
    return []
  }

  return artifact.evidenceSnapshots.map((evidenceSnapshot) => {
    const evidenceState =
      evidenceSnapshot.evidenceState.charAt(0).toUpperCase() + evidenceSnapshot.evidenceState.slice(1)

    return `${evidenceState}: ${evidenceSnapshot.title} (${evidenceSnapshot.sourceType.replaceAll("_", " ")})`
  })
}

function buildPublishPackArtifactSourceItems(detail: ReleaseWorkflowDetail) {
  const artifact = detail.latestPublishPackArtifact

  if (!artifact || artifact.sourceSnapshots.length === 0) {
    return []
  }

  return artifact.sourceSnapshots.map((sourceSnapshot) => `Linked source: ${sourceSnapshot.label}`)
}

function getPublishPackArtifactCounts(detail: ReleaseWorkflowDetail) {
  const artifact = detail.latestPublishPackArtifact

  return {
    includedEvidenceCount: artifact?.evidenceSnapshots.length ?? 0,
    includedSourceLinkCount: artifact?.sourceSnapshots.length ?? 0,
  }
}

function getQueuedWorkflowItem(
  queueSourceById: Map<string, ReleaseWorkflowListItem>,
  releaseRecordId: string,
) {
  return queueSourceById.get(releaseRecordId) ?? null
}

function useSelectedWorkflowResource<T>({
  initialIsLoading = false,
  initialSelectedId,
  initialValue,
  loadFailureMessage,
  loadResource,
  selectedId,
}: SelectedWorkflowResourceParams<T>) {
  const [resourceById, setResourceById] = useState<Record<string, T>>(() => {
    if (initialValue === null) {
      return {}
    }

    return {
      [initialSelectedId]: initialValue,
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(initialIsLoading)
  const derivedIsLoading = selectedId ? !resourceById[selectedId] || isLoading : isLoading

  useEffect(() => {
    if (!selectedId) {
      return
    }

    if (resourceById[selectedId]) {
      return
    }

    let isCancelled = false

    loadResource(selectedId)
      .then((resource) => {
        if (isCancelled) {
          return
        }

        setResourceById((currentResources) => ({
          ...currentResources,
          [selectedId]: resource,
        }))
        setError(null)
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setError(error instanceof Error ? error.message : loadFailureMessage)
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [loadFailureMessage, loadResource, resourceById, selectedId])

  return {
    error,
    isLoading: derivedIsLoading,
    resourceById,
    setError,
    setIsLoading,
    setResourceById,
  }
}

function buildModeMetricCards(
  mode: ReleaseWorkflowMode,
  workflow: ReleaseWorkflowListItem[],
  selectedWorkflow: ReleaseWorkflowDetail | null,
  currentUserId: string,
) {
  const metrics = buildReleaseWorkflowMetrics(workflow)
  const approvalFilterCounts = buildReleaseWorkflowApprovalFilterCounts(workflow, currentUserId)
  const selectedClaimCount = selectedWorkflow?.claimCheckSummary.totalClaims ?? 0
  const selectedFlaggedClaims = selectedWorkflow?.claimCheckSummary.flaggedClaims ?? 0
  const selectedEvidenceCount = selectedWorkflow?.evidenceBlocks.length ?? 0

  if (mode === "claim_check") {
    return [
      {
        badge: "Queue",
        description: "Blocked claim checks stay visible before they can move into approval.",
        detail: `${selectedFlaggedClaims} flagged`,
        icon: ShieldAlertIcon,
        title: "Current claim review",
        value: String(selectedClaimCount),
      },
      {
        description: "Workspace-wide blocked records are visible so risky wording never hides in another queue.",
        detail: "Workspace view",
        icon: FileSearchIcon,
        title: "Blocked records",
        value: String(metrics.blockedRecords),
      },
      {
        description: "Source evidence stays attached while you tighten wording.",
        detail: "Selected release",
        icon: FolderKanbanIcon,
        title: "Evidence blocks",
        value: String(selectedEvidenceCount),
      },
      {
        description: "Only clean drafts should move forward into approval.",
        detail: "Ready for sign-off",
        icon: BadgeCheckIcon,
        title: "Approval-ready records",
        value: String(workflow.filter((item) => item.allowedActions.includes("request_approval")).length),
      },
    ]
  }

  if (mode === "approval") {
    return [
      {
        badge: "Ownership",
        description: "Keep the drafts you personally need to review visible before they stall the release window.",
        detail: "Current reviewer",
        icon: TimerResetIcon,
        title: "Assigned to you",
        value: String(approvalFilterCounts.assigned_to_me),
      },
      {
        description: "Requests you routed should stay visible until another reviewer closes the loop.",
        detail: "Requester queue",
        icon: FolderKanbanIcon,
        title: "Requested by you",
        value: String(approvalFilterCounts.requested_by_me),
      },
      {
        description: "Pending approvals without a reviewer are an explicit handoff gap, not background noise.",
        detail: "Needs routing",
        icon: ShieldAlertIcon,
        title: "Unassigned approvals",
        value: String(approvalFilterCounts.unassigned),
      },
      {
        description: "The selected release keeps one explicit approval state at a time.",
        detail: "Selected release",
        icon: BadgeCheckIcon,
        title: "Current approval state",
        value:
          selectedWorkflow?.approvalSummary.state === "approved"
            ? "Signed off"
            : selectedWorkflow?.approvalSummary.state === "pending"
              ? "Pending"
              : selectedWorkflow?.approvalSummary.state === "reopened"
                ? "Reopened"
                : "Not requested",
      },
    ]
  }

  if (mode === "publish_pack") {
    return [
      {
        badge: "Export",
        description: "Only approved drafts should produce a frozen publish pack.",
        detail: "Workspace view",
        icon: FileOutputIcon,
        title: "Ready to export",
        value: String(metrics.readyToExportRecords),
      },
      {
        description: "This selected release shows whether a publish pack is frozen yet.",
        detail: "Selected release",
        icon: BadgeCheckIcon,
        title: "Current publish pack",
        value:
          selectedWorkflow?.latestPublishPackSummary.state === "exported"
            ? "Exported"
            : selectedWorkflow?.latestPublishPackSummary.state === "ready"
              ? "Ready"
              : "Blocked",
      },
      {
        description: "Export should stay blocked until the release wording is fully reviewed.",
        detail: "Workspace view",
        icon: ShieldAlertIcon,
        title: "Blocked records",
        value: String(metrics.blockedRecords),
      },
      {
        description: "The selected export remains tied to its evidence trail and source links.",
        detail: "Selected release",
        icon: FolderKanbanIcon,
        title: "Linked sources",
        value: String(selectedWorkflow?.sourceLinks.length ?? 0),
      },
    ]
  }

  return [
    {
      badge: "Live API",
      description: "Each release keeps one explicit workflow stage and reviewable next step.",
      detail: `${metrics.recordsInQueue} active records`,
      icon: FolderKanbanIcon,
      title: "Founder release queue",
      value: String(metrics.recordsInQueue),
    },
    {
      description: "Blocked claim checks stay visible before they can leak into approval or export.",
      detail: "Needs wording or evidence",
      icon: ShieldAlertIcon,
      title: "Blocked records",
      value: String(metrics.blockedRecords),
    },
    {
      description: "Approval is bound to an exact draft revision instead of a vague release state.",
      detail: "Human sign-off",
      icon: BadgeCheckIcon,
      title: "Pending approvals",
      value: String(metrics.pendingApprovalRecords),
    },
    {
      description: "Approved drafts can freeze into publish packs without recomputing from scratch.",
      detail: "Workspace view",
      icon: FileOutputIcon,
      title: "Ready to export",
      value: String(metrics.readyToExportRecords),
    },
  ]
}

function buildModeFocus(detail: ReleaseWorkflowDetail | null, mode: ReleaseWorkflowMode) {
  if (!detail) {
    return {
      description: "Select a release record to inspect the current workflow state.",
      notes: ["Select a release record to inspect the current workflow state."],
      title: "Selected workflow details",
    }
  }

  if (mode === "claim_check") {
    return {
      description: "Claim check stays explicit before any draft can move into approval.",
      notes: buildReleaseWorkflowClaimCheckNotes(detail),
      title: "Claim check notes",
    }
  }

  if (mode === "approval") {
    return {
      description: "Approval stays revision-bound so the team always knows what wording was reviewed.",
      notes: buildReleaseWorkflowApprovalNotes(detail),
      title: "Approval notes",
    }
  }

  if (mode === "publish_pack") {
    return {
      description: "Publish packs freeze the approved draft instead of recomputing from a moving target.",
      notes: buildReleaseWorkflowPublishPackNotes(detail),
      title: "Publish pack notes",
    }
  }

  return {
    description: "Evidence, review state, and export readiness stay connected in one workflow view.",
    notes: [
      ...buildReleaseWorkflowEvidenceNotes(detail).slice(0, 3),
      ...buildReleaseWorkflowClaimCheckNotes(detail).slice(0, 2),
    ],
    title: "Workflow evidence trail",
  }
}

function OverviewBoardCard({
  currentUserId,
  isSelected,
  item,
  onSelect,
  queuedWorkflowItem,
}: {
  currentUserId: string
  isSelected: boolean
  item: ReleaseWorkflowQueueItem
  onSelect: (releaseRecordId: string) => void
  queuedWorkflowItem: ReleaseWorkflowListItem | null
}) {
  const ownershipCue = queuedWorkflowItem
    ? getReleaseWorkflowOwnershipCue(queuedWorkflowItem, currentUserId)
    : null

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(
        "grid min-w-0 gap-4 overflow-hidden rounded-3xl border border-border/70 bg-background p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isSelected && "border-foreground/35 bg-muted/20 shadow-sm ring-1 ring-foreground/10",
      )}
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-1">
            <span className="line-clamp-2 text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">
              {item.title}
            </span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
              {item.stageLabel}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {statusBadge(item.readinessTone, item.readinessLabel)}
            {queuedWorkflowItem?.approvalSummary.state === "pending" && ownershipCue
              ? ownershipCueBadge(ownershipCue)
              : null}
          </div>
        </div>
        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
          {item.summary}
        </p>
      </div>
      <div className="grid grid-cols-[auto,minmax(0,1fr)] gap-x-3 gap-y-2 rounded-2xl border border-border/60 bg-muted/15 p-3 text-xs text-muted-foreground">
        <div className="self-start">
          <span>Draft</span>
        </div>
        <span className="min-w-0 text-right font-medium text-foreground [overflow-wrap:anywhere]">
          {item.versionLabel}
        </span>
        <div className="self-start">
          <span>Reviewer</span>
        </div>
        <span className="min-w-0 text-right font-medium text-foreground [overflow-wrap:anywhere]">
          {item.ownerName ?? "Not assigned"}
        </span>
        <div className="self-start">
          <span>Proof</span>
        </div>
        <span className="min-w-0 text-right font-medium text-foreground [overflow-wrap:anywhere]">
          {item.evidenceCount} evidence · {item.sourceLinkCount} sources
        </span>
      </div>
      <div className="grid gap-1 rounded-2xl bg-muted/30 p-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Next</p>
        <p className="line-clamp-3 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">
          {item.nextAction}
        </p>
      </div>
    </button>
  )
}

function renderOverviewBoard({
  activeSelectedId,
  boardColumns,
  currentUserId,
  onSelect,
  queueSourceById,
}: {
  activeSelectedId: string
  boardColumns: ReleaseWorkflowBoardColumn[]
  currentUserId: string
  onSelect: (releaseRecordId: string) => void
  queueSourceById: Map<string, ReleaseWorkflowListItem>
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max snap-x gap-5 pb-1">
      {boardColumns.map((column) => (
        <div
          key={column.stage}
          className="grid w-[320px] shrink-0 snap-start content-start gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4"
        >
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{column.title}</p>
              <Badge variant="secondary">{column.items.length}</Badge>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{column.description}</p>
          </div>
          <div className="grid gap-3">
            {column.items.length > 0 ? (
              column.items.map((item) => (
                <OverviewBoardCard
                  key={item.id}
                  currentUserId={currentUserId}
                  isSelected={item.id === activeSelectedId}
                  item={item}
                  onSelect={onSelect}
                  queuedWorkflowItem={getQueuedWorkflowItem(queueSourceById, item.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                No releases in this stage.
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

export function ReleaseWorkflowLiveWorkspace({
  currentUserId,
  initialMembers,
  initialMembersUnavailable,
  initialPolicy,
  initialSelectedHistory,
  initialSelectedHistoryUnavailable,
  initialSelectedId,
  initialSelectedWorkflow,
  initialWorkflow,
  mode,
  overviewVariant = "workspace",
  preferredFocusSection = null,
  workspaceId,
}: ReleaseWorkflowLiveWorkspaceProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [workflow, setWorkflow] = useState(initialWorkflow)
  const [workspaceView, setWorkspaceView] = useState<ReleaseWorkflowWorkspaceView>("board")
  const [approvalOwnershipFilter, setApprovalOwnershipFilter] =
    useState<ReleaseWorkflowApprovalOwnershipFilter>("all")
  const [actionError, setActionError] = useState<string | null>(null)
  const [approvalReviewerUserId, setApprovalReviewerUserId] = useState("")
  const [draftFieldValues, setDraftFieldValues] = useState<Record<string, string>>(
    buildDraftFieldValues(buildDraftEditorFieldSnapshots(initialSelectedWorkflow.currentDraft)),
  )
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isRunningAction, setIsRunningAction] = useState(false)
  const members = initialMembers
  const membersUnavailable = initialMembersUnavailable
  const queueSource = filterReleaseWorkflowQueueByMode(
    workflow,
    currentUserId,
    mode,
    approvalOwnershipFilter,
  )
  const queueSourceById = new Map(queueSource.map((item) => [item.releaseRecord.id, item]))
  const queueItems = queueSource.map(buildReleaseWorkflowQueueItem)
  const boardColumns = buildReleaseWorkflowBoardColumns(queueSource)
  const isOverviewDetailPage = mode === "overview" && overviewVariant === "detail"
  const activeSelectedId =
    queueItems.some((item) => item.id === selectedId) ? selectedId : (queueItems[0]?.id ?? "")
  const overviewSelectedId = isOverviewDetailPage ? activeSelectedId : ""
  const loadSelectedWorkflowDetail = useCallback(
    (releaseRecordId: string) => createApiClient().getReleaseWorkflowDetail(workspaceId, releaseRecordId),
    [workspaceId],
  )
  const loadSelectedWorkflowHistory = useCallback(
    (releaseRecordId: string) => createApiClient().getReleaseWorkflowHistory(workspaceId, releaseRecordId),
    [workspaceId],
  )
  const {
    error: detailError,
    isLoading: isLoadingDetail,
    resourceById: detailById,
    setError: setDetailError,
    setIsLoading: setIsLoadingDetail,
    setResourceById: setDetailById,
  } = useSelectedWorkflowResource({
    initialIsLoading: false,
    initialSelectedId,
    initialValue: initialSelectedWorkflow,
    loadFailureMessage: "Selected workflow detail could not be loaded.",
    loadResource: loadSelectedWorkflowDetail,
    selectedId: activeSelectedId,
  })
  const {
    error: historyError,
    isLoading: isLoadingHistory,
    resourceById: historyById,
    setError: setHistoryError,
    setIsLoading: setIsLoadingHistory,
    setResourceById: setHistoryById,
  } = useSelectedWorkflowResource({
    initialIsLoading: initialSelectedHistoryUnavailable,
    initialSelectedId,
    initialValue: initialSelectedHistoryUnavailable ? null : initialSelectedHistory,
    loadFailureMessage: "Selected workflow history could not be loaded.",
    loadResource: loadSelectedWorkflowHistory,
    selectedId: activeSelectedId,
  })
  const selectedWorkflow = getSelectedReleaseWorkflowDetail(detailById, activeSelectedId)
  const selectedHistory = activeSelectedId ? historyById[activeSelectedId] ?? [] : []
  const recentHistory = selectedHistory.slice(0, 5)
  const approvalRequiresReviewer = initialPolicy.requireReviewerAssignment
  const currentDraft = selectedWorkflow?.currentDraft ?? null
  const draftEditorFieldSnapshots = buildDraftEditorFieldSnapshots(currentDraft)
  const selectedDraftRevisionId = currentDraft?.id ?? null
  const isDraftEditable = selectedWorkflow?.releaseRecord.stage === "draft" && selectedWorkflow.currentDraft !== null
  const hasDraftFieldChanges =
    draftEditorFieldSnapshots.some(
      (fieldSnapshot) => (draftFieldValues[fieldSnapshot.fieldKey] ?? "") !== fieldSnapshot.content,
    )
  const selectedQueueItem = queueItems.find((item) => item.id === activeSelectedId) ?? queueItems[0] ?? null
  const selectedQueueSourceItem = selectedQueueItem
    ? getQueuedWorkflowItem(queueSourceById, selectedQueueItem.id)
    : null
  const selectedOwnershipCue = selectedQueueSourceItem
    ? getReleaseWorkflowOwnershipCue(selectedQueueSourceItem, currentUserId)
    : null
  const focusContent = buildModeFocus(selectedWorkflow, mode)
  const otherActions = (selectedWorkflow?.allowedActions ?? []).filter((action) => {
    if (action === "request_approval") {
      return false
    }

    return action === "create_draft" || selectedDraftRevisionId !== null
  })
  const canRequestApproval =
    selectedDraftRevisionId !== null &&
    (selectedWorkflow?.allowedActions ?? []).includes("request_approval")

  async function applyNextWorkflowDetail(
    nextDetail: ReleaseWorkflowDetail,
    historyLoadFailureMessage: string,
  ) {
    if (!activeSelectedId) {
      return
    }

    setDetailById((currentDetails) => ({
      ...currentDetails,
      [activeSelectedId]: nextDetail,
    }))
    setWorkflow((currentWorkflow) =>
      currentWorkflow.map((item) =>
        item.releaseRecord.id === activeSelectedId ? detailToReleaseWorkflowListItem(nextDetail) : item,
      ),
    )
    setDetailError(null)

    try {
      const nextHistory = await loadSelectedWorkflowHistory(activeSelectedId)
      setHistoryById((currentHistory) => ({
        ...currentHistory,
        [activeSelectedId]: nextHistory,
      }))
      setHistoryError(null)
    } catch (historyError) {
      setHistoryError(
        historyError instanceof Error ? historyError.message : historyLoadFailureMessage,
      )
    }
  }

  const detailFocusSection: "approval" | "draft" | "publish_pack" =
    preferredFocusSection === "approval" || preferredFocusSection === "publish_pack"
      ? preferredFocusSection
      : "draft"

  function getDetailSectionCardClassName(section: "approval" | "draft" | "publish_pack") {
    return cn(
      "scroll-mt-24",
      detailFocusSection === section && "ring-2 ring-foreground/15 ring-offset-0",
    )
  }

  useEffect(() => {
    if (selectedId === activeSelectedId) {
      return
    }

    setSelectedId(activeSelectedId)
  }, [activeSelectedId, selectedId])

  useEffect(() => {
    setApprovalReviewerUserId(getDefaultReviewerUserId(members, selectedWorkflow))
  }, [members, selectedWorkflow])

  useEffect(() => {
    setDraftFieldValues(buildDraftFieldValues(buildDraftEditorFieldSnapshots(currentDraft)))
    setDraftSaveError(null)
  }, [currentDraft])

  async function runWorkflowAction(action: WorkflowAllowedAction) {
    if (!activeSelectedId || !selectedWorkflow) {
      return
    }

    setActionError(null)
    setIsRunningAction(true)

    try {
      const apiClient = createApiClient()
      let nextDetail: ReleaseWorkflowDetail

      if (action === "create_draft") {
        nextDetail = await apiClient.createReleaseWorkflowDraft(workspaceId, activeSelectedId, {
          expectedLatestDraftRevisionId: selectedWorkflow.currentDraft?.id ?? null,
        })
      } else {
        if (!selectedDraftRevisionId) {
          setActionError("The selected workflow does not have a current draft revision yet.")
          return
        }

        switch (action) {
          case "run_claim_check":
            nextDetail = await apiClient.runReleaseWorkflowClaimCheck(workspaceId, activeSelectedId, {
              expectedDraftRevisionId: selectedDraftRevisionId,
            })
            break
          case "request_approval":
            if (approvalRequiresReviewer && !approvalReviewerUserId) {
              throw new Error("Select a reviewer before requesting approval.")
            }

            nextDetail = await apiClient.requestReleaseWorkflowApproval(workspaceId, activeSelectedId, {
              expectedDraftRevisionId: selectedDraftRevisionId,
              ...(approvalReviewerUserId ? { reviewerUserId: approvalReviewerUserId } : {}),
            })
            break
          case "approve_draft":
            nextDetail = await apiClient.approveReleaseWorkflowDraft(workspaceId, activeSelectedId, {
              expectedDraftRevisionId: selectedDraftRevisionId,
            })
            break
          case "reopen_draft":
            nextDetail = await apiClient.reopenReleaseWorkflowDraft(workspaceId, activeSelectedId, {
              expectedDraftRevisionId: selectedDraftRevisionId,
            })
            break
          case "create_publish_pack":
            nextDetail = await apiClient.createReleaseWorkflowPublishPack(
              workspaceId,
              activeSelectedId,
              {
                expectedDraftRevisionId: selectedDraftRevisionId,
              },
            )
            break
          default:
            throw new Error(`Unsupported workflow action: ${action}`)
        }
      }

      await applyNextWorkflowDetail(
        nextDetail,
        "Recent workflow history could not be refreshed after the action completed.",
      )
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The workflow action failed.")
    } finally {
      setIsRunningAction(false)
    }
  }

  async function saveDraftFields() {
    if (!activeSelectedId || !selectedWorkflow?.currentDraft) {
      return
    }

    setDraftSaveError(null)
    setIsSavingDraft(true)

    try {
      const apiClient = createApiClient()
      const nextDetail = await apiClient.updateReleaseWorkflowDraft(
        workspaceId,
        activeSelectedId,
        selectedWorkflow.currentDraft.id,
        {
          evidenceRefs: selectedWorkflow.currentDraft.evidenceRefs,
          fieldSnapshots: draftEditorFieldSnapshots.map((fieldSnapshot) => ({
            ...fieldSnapshot,
            content: draftFieldValues[fieldSnapshot.fieldKey] ?? "",
          })),
        },
      )

      await applyNextWorkflowDetail(
        nextDetail,
        "Recent workflow history could not be refreshed after the draft was saved.",
      )
    } catch (error) {
      setDraftSaveError(error instanceof Error ? error.message : "The draft could not be saved.")
    } finally {
      setIsSavingDraft(false)
    }
  }

  const metricCards = buildModeMetricCards(mode, workflow, selectedWorkflow, currentUserId)
  const selectedDraftTemplate = getReleaseDraftTemplateOption(
    selectedWorkflow?.releaseRecord.preferredDraftTemplateId,
  )
  const handleSelectQueueItem = useCallback(
    (rowKey: string) => {
      if (mode === "overview" && !isOverviewDetailPage) {
        router.push(
          buildReleaseWorkspaceHref({
            selectedId: rowKey,
          }),
        )
        return
      }

      setSelectedId(rowKey)
      setDetailError(null)
      setHistoryError(null)
      setActionError(null)
      setIsLoadingDetail(!detailById[rowKey])
      setIsLoadingHistory(!historyById[rowKey])
    },
    [
      detailById,
      historyById,
      isOverviewDetailPage,
      mode,
      router,
      setDetailError,
      setHistoryError,
      setIsLoadingDetail,
      setIsLoadingHistory,
    ],
  )

  function renderQueueTable() {
    return (
      <SimpleTable
        columns={[
          { key: "release", label: "Release" },
          { key: "stage", label: "Stage" },
          { key: "readiness", label: "Readiness" },
          { key: "draft", label: "Draft" },
          { key: "nextAction", label: "Next action" },
        ]}
        rows={queueItems.map((item) => {
          const queuedWorkflowItem = getQueuedWorkflowItem(queueSourceById, item.id)
          const ownershipCue = queuedWorkflowItem
            ? getReleaseWorkflowOwnershipCue(queuedWorkflowItem, currentUserId)
            : null

          return {
            key: item.id,
            cells: {
              draft: item.versionLabel,
              nextAction: (
                <div className="grid gap-1">
                  <span className="font-medium text-foreground">{item.nextAction}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.evidenceCount} evidence blocks · {item.sourceLinkCount} source links
                  </span>
                </div>
              ),
              readiness: statusBadge(item.readinessTone, item.readinessLabel),
              release: (
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{item.title}</span>
                    {queuedWorkflowItem?.approvalSummary.state === "pending" && ownershipCue
                      ? ownershipCueBadge(ownershipCue)
                      : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.summary}</span>
                </div>
              ),
              stage: item.stageLabel,
            },
          }
        })}
        selectedRowKey={activeSelectedId}
        onRowSelect={handleSelectQueueItem}
        emptyTitle={mode === "approval" ? "No approvals in this view" : "No workflow records yet"}
        emptyDescription={
          mode === "approval"
            ? "Pending approvals will appear here once a release is routed into explicit reviewer handoff."
            : "Once release context is ingested, workflow records will appear here."
        }
      />
    )
  }

  function renderOverviewList() {
    return (
      <SimpleTable
        columns={[
          { key: "release", label: "Release" },
          { key: "stage", label: "Stage" },
          { key: "reviewer", label: "Reviewer" },
          { key: "proof", label: "Proof" },
          { key: "nextAction", label: "Next action" },
        ]}
        rows={queueItems.map((item) => {
          const queuedWorkflowItem = getQueuedWorkflowItem(queueSourceById, item.id)
          const ownershipCue = queuedWorkflowItem
            ? getReleaseWorkflowOwnershipCue(queuedWorkflowItem, currentUserId)
            : null

          return {
            key: item.id,
            cells: {
              nextAction: (
                <div className="grid gap-1">
                  <span className="font-medium text-foreground">{item.nextAction}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.versionLabel} · {item.readinessLabel}
                  </span>
                </div>
              ),
              proof: (
                <span className="text-sm text-foreground">
                  {item.evidenceCount} evidence · {item.sourceLinkCount} sources
                </span>
              ),
              release: (
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{item.title}</span>
                    {ownershipCue ? ownershipCueBadge(ownershipCue) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.summary}</span>
                </div>
              ),
              reviewer: item.ownerName ?? "Not assigned",
              stage: item.stageLabel,
            },
          }
        })}
        selectedRowKey={overviewSelectedId}
        onRowSelect={handleSelectQueueItem}
        emptyTitle="No releases yet"
        emptyDescription="Create one release scope first, then PulseNote will keep the workflow visible here."
      />
    )
  }

  if (mode === "overview" && !isOverviewDetailPage) {
    return (
      <SurfaceCard
        title="Releases"
        description="Track every release from one board or one list. Open a release to inspect its full workflow."
      >
        <div className="grid gap-4">
          <Tabs
            value={workspaceView}
            onValueChange={(value) => setWorkspaceView(value as ReleaseWorkflowWorkspaceView)}
            className="gap-3"
          >
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="board">
                <LayoutGridIcon data-icon="inline-start" />
                Board
              </TabsTrigger>
              <TabsTrigger value="list">
                <Rows3Icon data-icon="inline-start" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {workspaceView === "board"
            ? renderOverviewBoard({
                activeSelectedId: overviewSelectedId,
                boardColumns,
                currentUserId,
                onSelect: handleSelectQueueItem,
                queueSourceById,
              })
            : renderOverviewList()}
        </div>
      </SurfaceCard>
    )
  }

  if (isOverviewDetailPage) {
    return (
      <>
        <SurfaceCard
          title={selectedQueueItem?.title ?? "Release workflow"}
          description={
            selectedQueueItem?.summary ??
            "Open one release as an editable draft and move it through approval and publish."
          }
          action={
            <Link
              href="/dashboard/releases"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Back to releases
            </Link>
          }
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {selectedQueueItem
                ? statusBadge(selectedQueueItem.readinessTone, selectedQueueItem.readinessLabel)
                : null}
              {selectedQueueItem ? <Badge variant="outline">{selectedQueueItem.stageLabel}</Badge> : null}
              {selectedQueueSourceItem?.approvalSummary.state === "pending" && selectedOwnershipCue
                ? ownershipCueBadge(selectedOwnershipCue)
                : null}
              {selectedQueueItem ? <Badge variant="secondary">{selectedQueueItem.versionLabel}</Badge> : null}
              <Badge variant="outline">{selectedDraftTemplate.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                This page stays centered on the current draft. Scope and safety checks stay in the
                workflow state, but they do not take over the main writing surface.
              </p>
              <div className="flex flex-wrap gap-2">
                {(selectedWorkflow?.allowedActions ?? []).includes("create_draft") ? (
                  <Button
                    size="sm"
                    disabled={isRunningAction}
                    onClick={() => {
                      void runWorkflowAction("create_draft")
                    }}
                  >
                    {actionButtonLabels.create_draft}
                  </Button>
                ) : null}
                {canRequestApproval ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      isRunningAction ||
                      (approvalRequiresReviewer &&
                        (!approvalReviewerUserId || membersUnavailable || members.length === 0))
                    }
                    onClick={() => {
                      void runWorkflowAction("request_approval")
                    }}
                  >
                    {actionButtonLabels.request_approval}
                  </Button>
                ) : null}
                {selectedDraftRevisionId !== null &&
                (selectedWorkflow?.allowedActions ?? []).includes("approve_draft") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRunningAction}
                    onClick={() => {
                      void runWorkflowAction("approve_draft")
                    }}
                  >
                    {actionButtonLabels.approve_draft}
                  </Button>
                ) : null}
                {selectedDraftRevisionId !== null &&
                (selectedWorkflow?.allowedActions ?? []).includes("create_publish_pack") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRunningAction}
                    onClick={() => {
                      void runWorkflowAction("create_publish_pack")
                    }}
                  >
                    {actionButtonLabels.create_publish_pack}
                  </Button>
                ) : null}
              </div>
            </div>
            {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
          </div>
        </SurfaceCard>

        {detailError && !selectedWorkflow ? (
          <SurfaceCard
            title="Release workflow is unavailable"
            description="The selected release could not be loaded from the authenticated API."
          >
            <p className="text-sm text-destructive">{detailError}</p>
          </SurfaceCard>
        ) : isLoadingDetail && !selectedWorkflow ? (
          <SurfaceCard
            title="Loading release workflow"
            description="PulseNote is loading the selected release from the authenticated API."
          >
            <p className="text-sm text-muted-foreground">
              Loading the selected release workflow from the authenticated API.
            </p>
          </SurfaceCard>
        ) : !selectedWorkflow ? (
          <SurfaceCard
            title="Release workflow is unavailable"
            description="The selected release could not be resolved in this workspace."
          >
            <p className="text-sm text-muted-foreground">
              Return to the releases board and pick a release record again.
            </p>
          </SurfaceCard>
        ) : (
          <div className="grid gap-4">
            <div id="draft" className={getDetailSectionCardClassName("draft")}>
              <SurfaceCard
                title="Draft"
                description="Compose the current release output here, then move it through approval and publish."
                action={
                  isDraftEditable ? (
                    <Button
                      size="sm"
                      disabled={isSavingDraft || isRunningAction || !hasDraftFieldChanges}
                      onClick={() => {
                        void saveDraftFields()
                      }}
                    >
                      {isSavingDraft ? "Saving…" : "Save draft"}
                    </Button>
                  ) : undefined
                }
              >
                {selectedWorkflow.currentDraft ? (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {selectedWorkflow.currentDraft.templateLabel} v{selectedWorkflow.currentDraft.templateVersion}
                      </Badge>
                      <Badge variant="secondary">Draft v{selectedWorkflow.currentDraft.version}</Badge>
                      <Badge variant="outline">
                        {selectedWorkflow.currentDraft.evidenceRefs.length} linked refs
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatHistoryTimestamp(selectedWorkflow.currentDraft.createdAt)}
                      </span>
                    </div>
                    <div className="grid gap-4">
                      {draftEditorFieldSnapshots.map((fieldSnapshot) => (
                        <div
                          key={fieldSnapshot.fieldKey}
                          className="grid gap-3 rounded-3xl border border-border/70 bg-background p-6 shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="grid gap-1">
                              <p className="text-sm font-medium text-foreground">Draft content</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedDraftTemplate.description}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {fieldSnapshot.contentFormat.replaceAll("_", " ")}
                              </Badge>
                            </div>
                          </div>
                          {isDraftEditable ? (
                            fieldSnapshot.contentFormat === "plain_text" ? (
                              <Input
                                className="h-12 border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0"
                                value={draftFieldValues[fieldSnapshot.fieldKey] ?? ""}
                                onChange={(event) =>
                                  setDraftFieldValues((currentValues) => ({
                                    ...currentValues,
                                    [fieldSnapshot.fieldKey]: event.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <Textarea
                                className="min-h-[420px] resize-y border-0 bg-transparent px-0 py-0 text-base leading-7 shadow-none focus-visible:ring-0"
                                value={draftFieldValues[fieldSnapshot.fieldKey] ?? ""}
                                onChange={(event) =>
                                  setDraftFieldValues((currentValues) => ({
                                    ...currentValues,
                                    [fieldSnapshot.fieldKey]: event.target.value,
                                  }))
                                }
                              />
                            )
                          ) : (
                            <p className="min-w-0 whitespace-pre-wrap text-base leading-7 text-foreground [overflow-wrap:anywhere]">
                              {fieldSnapshot.content}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {draftSaveError ? (
                      <p className="text-sm text-destructive">{draftSaveError}</p>
                    ) : null}
                    {!isDraftEditable ? (
                      <p className="text-sm text-muted-foreground">
                        Reopen the draft to edit these fields after claim check or approval begins.
                      </p>
                    ) : null}
                    {selectedWorkflow.currentDraft.evidenceRefs.length > 0 ? (
                      <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">Attached proof</p>
                        <BulletList
                          items={buildDraftLinkedEvidenceItems(selectedWorkflow, draftEditorFieldSnapshots)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-3xl border border-dashed border-border/70 bg-muted/20 p-8">
                    <p className="text-sm text-muted-foreground">
                      Create the first draft and PulseNote will open the release output directly here.
                    </p>
                    {(selectedWorkflow.allowedActions ?? []).includes("create_draft") ? (
                      <div>
                        <Button
                          size="sm"
                          disabled={isRunningAction}
                          onClick={() => {
                            void runWorkflowAction("create_draft")
                          }}
                        >
                          {actionButtonLabels.create_draft}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </SurfaceCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div id="approval" className={getDetailSectionCardClassName("approval")}>
                <SurfaceCard
                  title="Approval"
                  description="Move the current draft into explicit reviewer sign-off."
                >
                  <div className="grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    {approvalBadge(selectedWorkflow.approvalSummary.state)}
                    {selectedOwnershipCue && selectedQueueSourceItem?.approvalSummary.state === "pending"
                      ? ownershipCueBadge(selectedOwnershipCue)
                      : null}
                  </div>
                  <InlineList
                    items={[
                      {
                        label: "Assigned reviewer",
                        value:
                          selectedWorkflow.approvalSummary.ownerName ??
                          (selectedWorkflow.approvalSummary.ownerUserId
                            ? "Unknown reviewer"
                            : "Not assigned"),
                      },
                      {
                        label: "Requested by",
                        value:
                          selectedWorkflow.approvalSummary.requestedByName ??
                          (selectedWorkflow.approvalSummary.requestedByUserId
                            ? "Unknown requester"
                            : "Not requested"),
                      },
                    ]}
                  />
                  {canRequestApproval ? (
                    <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                      <Label htmlFor="detail-approval-reviewer" className="text-sm font-medium">
                        {approvalRequiresReviewer ? "Assign reviewer" : "Assign reviewer (optional)"}
                      </Label>
                      <Select
                        value={approvalReviewerUserId}
                        onValueChange={(value) => {
                          setApprovalReviewerUserId(value ?? "")
                        }}
                        disabled={members.length === 0 || membersUnavailable}
                      >
                        <SelectTrigger id="detail-approval-reviewer">
                          <SelectValue
                            placeholder={
                              membersUnavailable
                                ? "Reviewer roster is unavailable"
                                : members.length === 0
                                  ? "No workspace members available"
                                  : "Choose a reviewer"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.user.id} value={member.user.id}>
                              {getWorkspaceMemberLabel(member)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={
                            isRunningAction ||
                            (approvalRequiresReviewer &&
                              (!approvalReviewerUserId || membersUnavailable || members.length === 0))
                          }
                          onClick={() => {
                            void runWorkflowAction("request_approval")
                          }}
                        >
                          {actionButtonLabels.request_approval}
                        </Button>
                        {selectedDraftRevisionId !== null &&
                        (selectedWorkflow.allowedActions ?? []).includes("approve_draft") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRunningAction}
                            onClick={() => {
                              void runWorkflowAction("approve_draft")
                            }}
                          >
                            {actionButtonLabels.approve_draft}
                          </Button>
                        ) : null}
                        {selectedDraftRevisionId !== null &&
                        (selectedWorkflow.allowedActions ?? []).includes("reopen_draft") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRunningAction}
                            onClick={() => {
                              void runWorkflowAction("reopen_draft")
                            }}
                          >
                            {actionButtonLabels.reopen_draft}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedDraftRevisionId !== null &&
                      (selectedWorkflow.allowedActions ?? []).includes("approve_draft") ? (
                        <Button
                          size="sm"
                          disabled={isRunningAction}
                          onClick={() => {
                            void runWorkflowAction("approve_draft")
                          }}
                        >
                          {actionButtonLabels.approve_draft}
                        </Button>
                      ) : null}
                      {selectedDraftRevisionId !== null &&
                      (selectedWorkflow.allowedActions ?? []).includes("reopen_draft") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRunningAction}
                          onClick={() => {
                            void runWorkflowAction("reopen_draft")
                          }}
                        >
                          {actionButtonLabels.reopen_draft}
                        </Button>
                      ) : null}
                    </div>
                  )}
                  <BulletList items={buildReleaseWorkflowApprovalNotes(selectedWorkflow)} />
                  </div>
                </SurfaceCard>
              </div>

              <div id="publish_pack" className={getDetailSectionCardClassName("publish_pack")}>
                <SurfaceCard
                  title="Publish pack"
                  description="Freeze the approved draft into a publish-ready artifact."
                  action={
                    selectedDraftRevisionId !== null &&
                    (selectedWorkflow.allowedActions ?? []).includes("create_publish_pack") ? (
                      <Button
                        size="sm"
                        disabled={isRunningAction}
                        onClick={() => {
                          void runWorkflowAction("create_publish_pack")
                        }}
                      >
                        {actionButtonLabels.create_publish_pack}
                      </Button>
                    ) : undefined
                  }
                >
                  {selectedWorkflow.latestPublishPackArtifact ? (
                    <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2">
                      {publishPackBadge(selectedWorkflow.latestPublishPackSummary.state)}
                      <Badge variant="outline">
                        {getPublishPackArtifactCounts(selectedWorkflow).includedEvidenceCount} evidence
                      </Badge>
                      <Badge variant="outline">
                        {getPublishPackArtifactCounts(selectedWorkflow).includedSourceLinkCount} sources
                      </Badge>
                    </div>
                    <InlineList
                      items={[
                        {
                          label: "Exported at",
                          value: formatHistoryTimestamp(
                            selectedWorkflow.latestPublishPackArtifact.exportedAt,
                          ),
                        },
                        {
                          label: "Exported by",
                          value:
                            selectedWorkflow.latestPublishPackArtifact.context.exportedByName ??
                            "Unknown exporter",
                        },
                      ]}
                    />
                    <BulletList items={buildReleaseWorkflowPublishPackArtifactNotes(selectedWorkflow)} />
                    </div>
                  ) : (
                    <BulletList items={buildReleaseWorkflowPublishPackNotes(selectedWorkflow)} />
                  )}
                </SurfaceCard>
              </div>
            </div>

            {historyError ? (
              <p className="text-sm text-destructive">{historyError}</p>
            ) : isLoadingHistory && recentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Loading the recent workflow history for this release.
              </p>
            ) : recentHistory.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {recentHistory.map((entry) => (
                  <span key={entry.id} className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">
                    {entry.eventLabel} · {formatHistoryTimestamp(entry.createdAt)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <MetricGrid>
        {metricCards.map((card) => (
          <MetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            detail={card.detail}
            description={card.description}
            badge={card.badge}
            icon={card.icon}
          />
        ))}
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <SurfaceCard
              title="Release workspace"
              description="Each release stays grounded in one workflow state machine instead of separate operational tabs."
            >
              {mode === "approval" ? (
                <div className="mb-4 grid gap-3">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-foreground">Ownership filters</p>
                    <p className="text-sm text-muted-foreground">
                      Keep the sign-off queue sorted by reviewer ownership before approval goes stale.
                    </p>
                  </div>
                  <Tabs
                    value={approvalOwnershipFilter}
                    onValueChange={(value) =>
                      setApprovalOwnershipFilter(value as ReleaseWorkflowApprovalOwnershipFilter)
                    }
                    className="gap-3"
                  >
                    <TabsList variant="line" className="w-full justify-start">
                      {approvalOwnershipFilters.map((filter) => (
                        <TabsTrigger key={filter.value} value={filter.value}>
                          {filter.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              ) : null}
              {renderQueueTable()}
            </SurfaceCard>

            <SurfaceCard
              title={focusContent.title}
              description={focusContent.description}
            >
              {detailError && !selectedWorkflow ? (
                <p className="text-sm text-destructive">{detailError}</p>
              ) : isLoadingDetail && !selectedWorkflow ? (
                <p className="text-sm text-muted-foreground">
                  Loading the selected release workflow from the authenticated API.
                </p>
              ) : (
                <BulletList items={focusContent.notes} />
              )}
            </SurfaceCard>
          </>
        }
        aside={
          <>
            <SurfaceCard
              title="Selected workflow state"
              description="One release record owns the current stage, current draft revision, and next safe actions."
            >
              <InlineList
                items={[
                  { label: "Release", value: selectedQueueItem?.title ?? "Unknown release" },
                  { label: "Stage", value: selectedQueueItem?.stageLabel ?? "Unknown stage" },
                  {
                    label: "Readiness",
                    value: selectedQueueItem
                      ? selectedQueueItem.readinessLabel
                      : "Unknown readiness",
                  },
                  {
                    label: "Claim check",
                    value: selectedQueueItem?.claimCheckLabel ?? "Unknown",
                  },
                  {
                    label: "Approval",
                    value: selectedQueueItem?.approvalLabel ?? "Unknown",
                  },
                  {
                    label: "Assigned reviewer",
                    value:
                      selectedWorkflow?.approvalSummary.ownerName ??
                      (selectedWorkflow?.approvalSummary.ownerUserId ? "Unknown reviewer" : "Not assigned"),
                  },
                  {
                    label: "Requested by",
                    value:
                      selectedWorkflow?.approvalSummary.requestedByName ??
                      (selectedWorkflow?.approvalSummary.requestedByUserId ? "Unknown requester" : "Not requested"),
                  },
                  {
                    label: "Ownership cue",
                    value: selectedOwnershipCue?.label ?? "No active ownership cue",
                  },
                  {
                    label: "Publish pack",
                    value: selectedQueueItem?.publishPackLabel ?? "Unknown",
                  },
                ]}
              />
            </SurfaceCard>

            {mode === "approval" && selectedOwnershipCue ? (
              <SurfaceCard
                title="Ownership cue"
                description="Reviewer handoff stays visible so pending approvals do not turn into silent queue drift."
              >
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {ownershipCueBadge(selectedOwnershipCue)}
                    {selectedWorkflow?.approvalSummary.ownerName ? (
                      <Badge variant="secondary">
                        Reviewer · {selectedWorkflow.approvalSummary.ownerName}
                      </Badge>
                    ) : null}
                    {selectedWorkflow?.approvalSummary.requestedByName ? (
                      <Badge variant="secondary">
                        Requested by · {selectedWorkflow.approvalSummary.requestedByName}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedOwnershipCue.description}</p>
                </div>
              </SurfaceCard>
            ) : null}

            <SurfaceCard
              title="Workflow actions"
              description="Commands stay explicit so the server can reject stale or unsafe transitions."
            >
              {actionError ? (
                <p className="mb-3 text-sm text-destructive">{actionError}</p>
              ) : null}
              <div className="grid gap-3">
                {canRequestApproval ? (
                  <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <Label htmlFor="approval-reviewer" className="text-sm font-medium">
                      {approvalRequiresReviewer ? "Assign reviewer" : "Assign reviewer (optional)"}
                    </Label>
                    <Select
                      value={approvalReviewerUserId}
                      onValueChange={(value) => {
                        setApprovalReviewerUserId(value ?? "")
                      }}
                      disabled={members.length === 0 || membersUnavailable}
                    >
                      <SelectTrigger id="approval-reviewer">
                        <SelectValue
                          placeholder={
                            membersUnavailable
                              ? "Reviewer roster is unavailable"
                              : members.length === 0
                                ? "No workspace members available"
                                : "Choose a reviewer"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.user.id} value={member.user.id}>
                            {getWorkspaceMemberLabel(member)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {membersUnavailable
                          ? approvalRequiresReviewer
                            ? "Reload the release workflow once the reviewer roster is available."
                            : "Reviewer routing is optional here, so approval can still be requested without loading the roster."
                          : members.length === 0
                            ? approvalRequiresReviewer
                              ? "Add a workspace member before routing approval."
                              : "Reviewer routing is optional in this workspace, so approval can proceed without assigning one."
                            : approvalRequiresReviewer
                              ? "Approval becomes a concrete handoff once a reviewer is assigned."
                              : "Assigning a reviewer keeps ownership explicit, but this workspace allows approval requests without one."}
                      </p>
                      <Button
                        size="sm"
                        disabled={
                          isRunningAction ||
                          (approvalRequiresReviewer &&
                            (!approvalReviewerUserId || membersUnavailable || members.length === 0))
                        }
                        onClick={() => {
                          void runWorkflowAction("request_approval")
                        }}
                      >
                        {actionButtonLabels.request_approval}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {otherActions.map((action, index) => (
                    <Button
                      key={action}
                      variant={!canRequestApproval && index === 0 ? "default" : "outline"}
                      size="sm"
                      disabled={isRunningAction}
                      onClick={() => {
                        void runWorkflowAction(action)
                      }}
                    >
                      {actionButtonLabels[action]}
                    </Button>
                  ))}
                  {!canRequestApproval && otherActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No workflow commands are available for the selected record right now.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4">
                <BulletList items={(selectedWorkflow?.allowedActions ?? []).map(getReleaseWorkflowActionLabel)} />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Current release signals"
              description="Evidence, approval, and export state stay visible while the selected record changes."
            >
              {selectedWorkflow ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    {claimCheckBadge(selectedWorkflow.claimCheckSummary.state)}
                    {approvalBadge(selectedWorkflow.approvalSummary.state)}
                    {publishPackBadge(selectedWorkflow.latestPublishPackSummary.state)}
                  </div>
                  <BulletList items={buildReleaseWorkflowEvidenceNotes(selectedWorkflow).slice(0, 4)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a workflow record to inspect its evidence and state signals.
                </p>
              )}
            </SurfaceCard>

            {mode === "publish_pack" ? (
              <SurfaceCard
                title="Frozen publish pack artifact"
                description="The exported handoff keeps exact wording, linked proof, and reviewer context attached to one immutable record."
              >
                {!selectedWorkflow ? (
                  <p className="text-sm text-muted-foreground">
                    Select a workflow record to inspect its frozen publish pack artifact.
                  </p>
                ) : selectedWorkflow.latestPublishPackArtifact ? (
                  <div className="grid gap-4">
                    <InlineList
                      items={[
                        {
                          label: "Export ID",
                          value: selectedWorkflow.latestPublishPackArtifact.exportId,
                        },
                        {
                          label: "Exported at",
                          value: formatHistoryTimestamp(selectedWorkflow.latestPublishPackArtifact.exportedAt),
                        },
                        {
                          label: "Exported by",
                          value:
                            selectedWorkflow.latestPublishPackArtifact.context.exportedByName ??
                            "Unknown exporter",
                        },
                        {
                          label: "Approval reviewer",
                          value:
                            selectedWorkflow.latestPublishPackArtifact.context.approvalOwnerName ??
                            "Not captured",
                        },
                        {
                          label: "Requested by",
                          value:
                            selectedWorkflow.latestPublishPackArtifact.context.approvalRequestedByName ??
                            "Not captured",
                        },
                        {
                          label: "Evidence links",
                          value: String(getPublishPackArtifactCounts(selectedWorkflow).includedEvidenceCount),
                        },
                        {
                          label: "Source links",
                          value: String(getPublishPackArtifactCounts(selectedWorkflow).includedSourceLinkCount),
                        },
                      ]}
                    />

                    <BulletList items={buildReleaseWorkflowPublishPackArtifactNotes(selectedWorkflow)} />

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">Frozen release notes</p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {selectedWorkflow.latestPublishPackArtifact.releaseNotesBody ??
                            "No frozen release notes body was available."}
                        </p>
                      </div>
                      <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">Frozen changelog</p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {selectedWorkflow.latestPublishPackArtifact.changelogBody ??
                            "No frozen changelog body was available."}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">Included evidence links</p>
                        {selectedWorkflow.latestPublishPackArtifact.evidenceSnapshots.length > 0 ? (
                          <BulletList items={buildPublishPackArtifactEvidenceItems(selectedWorkflow)} />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No evidence links were frozen into this publish pack artifact.
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">Included source links</p>
                        {selectedWorkflow.latestPublishPackArtifact.sourceSnapshots.length > 0 ? (
                          <BulletList items={buildPublishPackArtifactSourceItems(selectedWorkflow)} />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No source links were frozen into this publish pack artifact.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedWorkflow.latestPublishPackSummary.state === "ready" ? (
                  <p className="text-sm text-muted-foreground">
                    The current draft is approved and ready to freeze, but no publish pack artifact exists yet.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Export the current approved draft before expecting a frozen publish pack artifact here.
                  </p>
                )}
              </SurfaceCard>
            ) : null}

            <SurfaceCard
              title="Recent history"
              description="The last recorded workflow events stay attached to the selected release before another handoff."
              action={
                <Link
                  href="/dashboard/review-log"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Open review log
                </Link>
              }
            >
              {historyError ? (
                <p className="text-sm text-destructive">{historyError}</p>
              ) : isLoadingHistory && recentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Loading the recent workflow history for this release record.
                </p>
              ) : recentHistory.length > 0 ? (
                <div className="grid gap-3">
                  {recentHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {entry.eventLabel}
                            </span>
                            {historyOutcomeBadge(entry.outcome)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.actorName ?? "Unknown reviewer"} · {formatHistoryTimestamp(entry.createdAt)}
                          </p>
                        </div>
                        {entry.draftVersion ? (
                          <Badge variant="secondary">Draft v{entry.draftVersion}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {entry.note ?? "No review note was stored for this event."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No workflow history has been recorded for this release yet.
                </p>
              )}
            </SurfaceCard>
          </>
        }
      />
    </>
  )
}
