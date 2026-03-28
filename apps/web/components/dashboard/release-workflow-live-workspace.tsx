"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  BadgeCheckIcon,
  FileOutputIcon,
  FileSearchIcon,
  FolderKanbanIcon,
  ShieldAlertIcon,
  TimerResetIcon,
} from "lucide-react"

import type {
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspaceMember,
  WorkflowAllowedAction,
} from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import {
  buildReleaseWorkflowApprovalNotes,
  buildReleaseWorkflowClaimCheckNotes,
  buildReleaseWorkflowEvidenceNotes,
  buildReleaseWorkflowMetrics,
  buildReleaseWorkflowPublishPackNotes,
  buildReleaseWorkflowQueueItem,
  detailToReleaseWorkflowListItem,
  getReleaseWorkflowActionLabel,
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ReleaseWorkflowMode = "approval" | "claim_check" | "overview" | "publish_pack"

type ReleaseWorkflowLiveWorkspaceProps = {
  currentUserId: string
  initialMembers: WorkspaceMember[]
  initialMembersUnavailable: boolean
  initialSelectedHistory: ReleaseWorkflowHistoryEntry[]
  initialSelectedHistoryUnavailable: boolean
  initialSelectedId: string
  initialSelectedWorkflow: ReleaseWorkflowDetail
  initialWorkflow: ReleaseWorkflowListItem[]
  mode: ReleaseWorkflowMode
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

const historyTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
  timeZoneName: "short",
})

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
  return historyTimestampFormatter.format(new Date(value))
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

  useEffect(() => {
    if (!selectedId || resourceById[selectedId]) {
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
    isLoading,
    resourceById,
    setError,
    setIsLoading,
    setResourceById,
  }
}

function buildModeMetricCards(mode: ReleaseWorkflowMode, workflow: ReleaseWorkflowListItem[], selectedWorkflow: ReleaseWorkflowDetail | null) {
  const metrics = buildReleaseWorkflowMetrics(workflow)
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
        badge: "Queue",
        description: "Pending approvals are visible before they turn into release-window drift.",
        detail: "Workspace view",
        icon: TimerResetIcon,
        title: "Pending approvals",
        value: String(metrics.pendingApprovalRecords),
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
      {
        description: "Revision-bound approval avoids publishing wording that changed after review.",
        detail: selectedWorkflow?.currentDraft ? `Draft v${selectedWorkflow.currentDraft.version}` : "No draft yet",
        icon: FolderKanbanIcon,
        title: "Approval target",
        value: selectedWorkflow?.currentDraft ? "Current draft" : "Missing draft",
      },
      {
        description: "Approved records move directly into publish-pack assembly.",
        detail: "Workspace view",
        icon: FileOutputIcon,
        title: "Ready to export",
        value: String(metrics.readyToExportRecords),
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

export function ReleaseWorkflowLiveWorkspace({
  initialMembers,
  initialMembersUnavailable,
  initialSelectedHistory,
  initialSelectedHistoryUnavailable,
  initialSelectedId,
  initialSelectedWorkflow,
  initialWorkflow,
  mode,
  workspaceId,
}: ReleaseWorkflowLiveWorkspaceProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [workflow, setWorkflow] = useState(initialWorkflow)
  const members = initialMembers
  const membersUnavailable = initialMembersUnavailable
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
    selectedId,
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
    selectedId,
  })
  const [actionError, setActionError] = useState<string | null>(null)
  const [approvalReviewerUserId, setApprovalReviewerUserId] = useState("")
  const [isRunningAction, setIsRunningAction] = useState(false)

  const queueItems = workflow.map(buildReleaseWorkflowQueueItem)
  const selectedWorkflow = getSelectedReleaseWorkflowDetail(detailById, selectedId)
  const selectedHistory = selectedId ? historyById[selectedId] ?? [] : []
  const recentHistory = selectedHistory.slice(0, 5)
  const selectedQueueItem = queueItems.find((item) => item.id === selectedId) ?? queueItems[0] ?? null
  const focusContent = buildModeFocus(selectedWorkflow, mode)
  const otherActions = (selectedWorkflow?.allowedActions ?? []).filter((action) => action !== "request_approval")
  const canRequestApproval = (selectedWorkflow?.allowedActions ?? []).includes("request_approval")

  useEffect(() => {
    setApprovalReviewerUserId(getDefaultReviewerUserId(members, selectedWorkflow))
  }, [members, selectedWorkflow])

  async function runWorkflowAction(action: WorkflowAllowedAction) {
    if (!selectedId || !selectedWorkflow) {
      return
    }

    setActionError(null)
    setIsRunningAction(true)

    try {
      const apiClient = createApiClient()
      let nextDetail: ReleaseWorkflowDetail

      if (action === "create_draft") {
        nextDetail = await apiClient.createReleaseWorkflowDraft(workspaceId, selectedId, {
          expectedLatestDraftRevisionId: selectedWorkflow.currentDraft?.id ?? null,
        })
      } else {
        const expectedDraftRevisionId = selectedWorkflow.currentDraft?.id

        if (!expectedDraftRevisionId) {
          throw new Error("The selected workflow does not have a current draft revision.")
        }

        switch (action) {
          case "run_claim_check":
            nextDetail = await apiClient.runReleaseWorkflowClaimCheck(workspaceId, selectedId, {
              expectedDraftRevisionId,
            })
            break
          case "request_approval":
            if (!approvalReviewerUserId) {
              throw new Error("Select a reviewer before requesting approval.")
            }

            nextDetail = await apiClient.requestReleaseWorkflowApproval(workspaceId, selectedId, {
              expectedDraftRevisionId,
              reviewerUserId: approvalReviewerUserId,
            })
            break
          case "approve_draft":
            nextDetail = await apiClient.approveReleaseWorkflowDraft(workspaceId, selectedId, {
              expectedDraftRevisionId,
            })
            break
          case "reopen_draft":
            nextDetail = await apiClient.reopenReleaseWorkflowDraft(workspaceId, selectedId, {
              expectedDraftRevisionId,
            })
            break
          case "create_publish_pack":
            nextDetail = await apiClient.createReleaseWorkflowPublishPack(workspaceId, selectedId, {
              expectedDraftRevisionId,
            })
            break
          default:
            throw new Error(`Unsupported workflow action: ${action}`)
        }
      }

      setDetailById((currentDetails) => ({
        ...currentDetails,
        [selectedId]: nextDetail,
      }))
      setWorkflow((currentWorkflow) =>
        currentWorkflow.map((item) =>
          item.releaseRecord.id === selectedId ? detailToReleaseWorkflowListItem(nextDetail) : item,
        ),
      )
      setDetailError(null)

      try {
        const nextHistory = await loadSelectedWorkflowHistory(selectedId)
        setHistoryById((currentHistory) => ({
          ...currentHistory,
          [selectedId]: nextHistory,
        }))
        setHistoryError(null)
      } catch (historyError) {
        setHistoryError(
          historyError instanceof Error
            ? historyError.message
            : "Recent workflow history could not be refreshed after the action completed.",
        )
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The workflow action failed.")
    } finally {
      setIsRunningAction(false)
    }
  }

  const metricCards = buildModeMetricCards(mode, workflow, selectedWorkflow)

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
              title="Founder release queue"
              description="The queue stays grounded in one workflow state machine instead of separate mock dashboards."
            >
              <SimpleTable
                columns={[
                  { key: "release", label: "Release" },
                  { key: "stage", label: "Stage" },
                  { key: "readiness", label: "Readiness" },
                  { key: "draft", label: "Draft" },
                  { key: "nextAction", label: "Next action" },
                ]}
                rows={queueItems.map((item) => ({
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
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.summary}</span>
                      </div>
                    ),
                    stage: item.stageLabel,
                  },
                }))}
                selectedRowKey={selectedId}
                onRowSelect={(rowKey) => {
                  setSelectedId(rowKey)
                  setDetailError(null)
                  setHistoryError(null)
                  setActionError(null)
                  setIsLoadingDetail(!detailById[rowKey])
                  setIsLoadingHistory(!historyById[rowKey])
                }}
                emptyTitle="No workflow records yet"
                emptyDescription="Once release context is ingested, workflow records will appear here."
              />
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
                    label: "Publish pack",
                    value: selectedQueueItem?.publishPackLabel ?? "Unknown",
                  },
                ]}
              />
            </SurfaceCard>

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
                      Assign reviewer
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
                          ? "Reload the release workflow once the reviewer roster is available."
                          : members.length === 0
                            ? "Add a workspace member before routing approval."
                            : "Approval becomes a concrete handoff once a reviewer is assigned."}
                      </p>
                      <Button
                        size="sm"
                        disabled={isRunningAction || !approvalReviewerUserId || membersUnavailable || members.length === 0}
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
