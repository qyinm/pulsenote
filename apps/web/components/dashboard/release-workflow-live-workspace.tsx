"use client"

import { useEffect, useState } from "react"
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
  ReleaseWorkflowListItem,
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
  createReleaseWorkflowDetailCache,
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

type ReleaseWorkflowMode = "approval" | "claim_check" | "overview" | "publish_pack"

type ReleaseWorkflowLiveWorkspaceProps = {
  initialSelectedId: string
  initialSelectedWorkflow: ReleaseWorkflowDetail
  initialWorkflow: ReleaseWorkflowListItem[]
  mode: ReleaseWorkflowMode
  workspaceId: string
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
  initialSelectedId,
  initialSelectedWorkflow,
  initialWorkflow,
  mode,
  workspaceId,
}: ReleaseWorkflowLiveWorkspaceProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [workflow, setWorkflow] = useState(initialWorkflow)
  const [detailById, setDetailById] = useState<Record<string, ReleaseWorkflowDetail>>(
    createReleaseWorkflowDetailCache(initialSelectedId, initialSelectedWorkflow),
  )
  const [detailError, setDetailError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isRunningAction, setIsRunningAction] = useState(false)

  const queueItems = workflow.map(buildReleaseWorkflowQueueItem)
  const selectedWorkflow = getSelectedReleaseWorkflowDetail(detailById, selectedId)
  const selectedQueueItem = queueItems.find((item) => item.id === selectedId) ?? queueItems[0] ?? null
  const focusContent = buildModeFocus(selectedWorkflow, mode)

  useEffect(() => {
    if (!selectedId || detailById[selectedId]) {
      return
    }

    let isCancelled = false
    setIsLoadingDetail(true)

    createApiClient()
      .getReleaseWorkflowDetail(workspaceId, selectedId)
      .then((workflowDetail) => {
        if (isCancelled) {
          return
        }

        setDetailById((currentDetails) => ({
          ...currentDetails,
          [selectedId]: workflowDetail,
        }))
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setDetailError(error instanceof Error ? error.message : "Selected workflow detail could not be loaded.")
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDetail(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [detailById, selectedId, workspaceId])

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
            nextDetail = await apiClient.requestReleaseWorkflowApproval(workspaceId, selectedId, {
              expectedDraftRevisionId,
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
                  setActionError(null)
                  setIsLoadingDetail(!detailById[rowKey])
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
              <div className="flex flex-wrap gap-2">
                {(selectedWorkflow?.allowedActions ?? []).map((action, index) => (
                  <Button
                    key={action}
                    variant={index === 0 ? "default" : "outline"}
                    size="sm"
                    disabled={isRunningAction}
                    onClick={() => {
                      void runWorkflowAction(action)
                    }}
                  >
                    {actionButtonLabels[action]}
                  </Button>
                ))}
                {(selectedWorkflow?.allowedActions ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No workflow commands are available for the selected record right now.
                  </p>
                ) : null}
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
          </>
        }
      />
    </>
  )
}
