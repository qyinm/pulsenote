import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceSnapshot,
} from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import { buildReleaseWorkspaceHref } from "./release-workflow"
import { buildReviewInboxItems } from "./review-inbox"
import {
  createDefaultWorkspacePolicySettings,
  getWorkspacePolicySettingsOrDefault,
} from "./workspace-policy"

type HelpCenterApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getWorkspacePolicySettings" | "listReleaseWorkflow" | "listReleaseWorkflowHistory"
>

export type LiveHelpModule = {
  description: string
  href: string
  id: string
  status: string
  title: string
}

export type LiveHelpIssue = {
  description: string
  id: string
  severity: "default" | "destructive"
  title: string
}

export type LiveHelpMetrics = {
  activeStages: number
  knownLimits: number
  openSignals: number
  workflowGuides: number
}

export type LiveHelpData = {
  checklist: string[]
  issues: LiveHelpIssue[]
  metrics: LiveHelpMetrics
  modules: LiveHelpModule[]
}

type HelpCenterStats = {
  activeIntegrations: number
  blockedReviews: number
  exportedPacks: number
  inboxSignals: number
  pendingReviews: number
  readyToExport: number
  releasesMissingEvidence: number
  unassignedReviews: number
}

function buildHelpModules(
  workflowCount: number,
  stats: HelpCenterStats,
): LiveHelpModule[] {
  const reviewStatus =
    stats.blockedReviews > 0
      ? `${stats.blockedReviews} blocked`
      : stats.pendingReviews > 0
        ? `${stats.pendingReviews} pending`
        : "Clear now"
  const reviewDescription =
    stats.blockedReviews > 0
      ? "Blocked reviews are visible here so risky wording is corrected while evidence is still in view."
      : stats.pendingReviews > 0
        ? "Review is active and should stay explicit until the reviewer records a decision."
        : "Review is the first place to confirm wording stays within the captured release evidence."

  return [
    {
      description:
        stats.activeIntegrations === 0
          ? "Connect a release source first so context can enter the workspace with evidence attached."
          : workflowCount === 0
            ? "Your source is connected. Ingest the first release record to start the reviewable workflow."
            : "Release context is already flowing into the workspace and can be reviewed before drafting.",
      href: "/dashboard/new-release",
      id: "new-release",
      status:
        stats.activeIntegrations === 0
          ? "Connect source"
          : workflowCount === 0
            ? "Start here"
            : `${workflowCount} records live`,
      title: "Create release scope",
    },
    {
      description: reviewDescription,
      href: buildReleaseWorkspaceHref({
        focus: "review",
      }),
      id: "review",
      status: reviewStatus,
      title: "Run review",
    },
    {
      description:
        stats.readyToExport > 0
          ? "Approved drafts can freeze into publish packs without recomputing from a moving target."
          : stats.exportedPacks > 0
            ? "Frozen publish packs stay visible so downstream handoff does not drift away from the approved draft."
            : "Publish-pack export should happen only after evidence, wording, and review all agree.",
      href: buildReleaseWorkspaceHref({
        focus: "publish_pack",
      }),
      id: "publish-pack",
      status:
        stats.readyToExport > 0
          ? `${stats.readyToExport} ready`
          : stats.exportedPacks > 0
            ? `${stats.exportedPacks} exported`
            : "Waiting",
      title: "Export publish pack",
    },
  ]
}

function buildHelpIssues(
  workflowCount: number,
  stats: HelpCenterStats,
): LiveHelpIssue[] {
  const issues: LiveHelpIssue[] = []

  if (stats.activeIntegrations === 0) {
    issues.push({
      description:
        "No active GitHub or Linear connection is attached to this workspace, so release context cannot be ingested yet.",
      id: "no-active-integrations",
      severity: "destructive",
      title: "No active release source is connected",
    })
  }

  if (workflowCount === 0) {
    issues.push({
      description:
        "The workflow is empty right now. Ingest a release record before expecting draft, review, or export guidance.",
      id: "no-release-records",
      severity: "default",
      title: "No release records are in scope",
    })
  }

  if (stats.blockedReviews > 0) {
    issues.push({
      description:
        stats.blockedReviews === 1
          ? "One release is still blocked in review, so public wording should not move forward yet."
          : `${stats.blockedReviews} releases are still blocked in review, so export should stay paused on those records.`,
      id: "blocked-reviews",
      severity: "destructive",
      title: "Blocked reviews are still active",
    })
  }

  if (stats.unassignedReviews > 0) {
    issues.push({
      description:
        stats.unassignedReviews === 1
          ? "One review request still has no assigned reviewer."
          : `${stats.unassignedReviews} review requests still have no assigned reviewer.`,
      id: "unassigned-reviews",
      severity: "destructive",
      title: "Review handoff is missing an owner",
    })
  }

  if (stats.releasesMissingEvidence > 0) {
    issues.push({
      description:
        stats.releasesMissingEvidence === 1
          ? "One release record has no attached evidence blocks yet."
          : `${stats.releasesMissingEvidence} release records still have no attached evidence blocks.`,
      id: "missing-evidence",
      severity: "default",
      title: "Evidence coverage is incomplete",
    })
  }

  if (stats.inboxSignals > 0) {
    issues.push({
      description:
        stats.inboxSignals === 1
          ? "One operational review signal is active in the inbox."
          : `${stats.inboxSignals} operational review signals are active in the inbox.`,
      id: "inbox-signals",
      severity: "default",
      title: "Operational review signals still need attention",
    })
  }

  return issues
}

function buildHelpChecklist(
  workflowCount: number,
  stats: HelpCenterStats,
): string[] {
  const checklist: string[] = []

  if (stats.activeIntegrations === 0) {
    checklist.push("Connect GitHub before expecting release context, review, or export guidance.")
  } else if (workflowCount === 0) {
    checklist.push("Ingest the first release record so the workspace has a real workflow to guide.")
  }

  if (stats.blockedReviews > 0) {
    checklist.push(
      stats.blockedReviews === 1
        ? "Resolve the blocked review before the draft moves forward."
        : `Resolve ${stats.blockedReviews} blocked reviews before those drafts move forward.`,
    )
  }

  if (stats.unassignedReviews > 0) {
    checklist.push(
      stats.unassignedReviews === 1
        ? "Assign the pending review request to a reviewer so the handoff stays attributable."
        : `Assign all ${stats.unassignedReviews} unowned review requests so review responsibility stays visible.`,
    )
  }

  if (stats.readyToExport > 0) {
    checklist.push(
      stats.readyToExport === 1
        ? "Freeze the approved draft into a publish pack before downstream wording drifts."
        : `Freeze the ${stats.readyToExport} ready records into publish packs before downstream wording drifts.`,
    )
  }

  if (checklist.length > 0) {
    return checklist
  }

  return [
    "Start with evidence and source freshness before drafting anything customer-facing.",
    "Keep review notes explicit so the final publish pack stays attributable and reviewable.",
    "Use the review log when you need to understand what changed before the next handoff step.",
  ]
}

export function buildLiveHelpData(
  workspace: WorkspaceSnapshot,
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
  currentUserId: string,
  policy: Pick<
    WorkspacePolicySettings,
    "showBlockedClaimsInInbox" | "showPendingApprovalsInInbox" | "showReopenedDraftsInInbox"
  > = createDefaultWorkspacePolicySettings(workspace.workspace.id),
): LiveHelpData {
  const stats = {
    activeIntegrations: workspace.integrations.filter(
      (integration) => integration.status === "active",
    ).length,
    blockedReviews: workflow.filter(
      (item) => item.readiness === "blocked",
    ).length,
    exportedPacks: workflow.filter(
      (item) => item.latestPublishPackSummary.state === "exported",
    ).length,
    inboxSignals: buildReviewInboxItems(workflow, history, currentUserId, policy).length,
    pendingReviews: workflow.filter(
      (item) => item.reviewSummary.state === "pending",
    ).length,
    readyToExport: workflow.filter(
      (item) => item.latestPublishPackSummary.state === "ready",
    ).length,
    releasesMissingEvidence: workflow.filter((item) => item.evidenceCount === 0).length,
    unassignedReviews: workflow.filter(
      (item) =>
        item.reviewSummary.state === "pending" &&
        item.reviewSummary.ownerUserId === null,
    ).length,
  } satisfies HelpCenterStats
  const workflowCount = workflow.length
  const modules = buildHelpModules(workflowCount, stats)
  const issues = buildHelpIssues(workflowCount, stats)
  const activeStages = new Set(workflow.map((item) => item.releaseRecord.stage)).size

  return {
    checklist: buildHelpChecklist(workflowCount, stats),
    issues,
    metrics: {
      activeStages,
      knownLimits: issues.length,
      openSignals: stats.inboxSignals,
      workflowGuides: modules.length,
    },
    modules,
  }
}

export async function getServerHelpCenterData(
  requestHeaders: Headers,
  workspace: WorkspaceSnapshot,
  currentUserId: string,
  apiClient: HelpCenterApiClient = createApiClient(),
) {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const [workflow, history, policy] = await Promise.all([
    apiClient.listReleaseWorkflow(workspace.workspace.id, init),
    apiClient.listReleaseWorkflowHistory(workspace.workspace.id, init),
    getWorkspacePolicySettingsOrDefault(workspace.workspace.id, () =>
      apiClient.getWorkspacePolicySettings(workspace.workspace.id, init),
    ),
  ])

  return buildLiveHelpData(workspace, workflow, history, currentUserId, policy)
}
