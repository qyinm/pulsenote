import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceSnapshot,
} from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import { buildReviewInboxItems } from "./review-inbox"
import { createDefaultWorkspacePolicySettings } from "./workspace-policy"

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
  blockedClaimChecks: number
  exportedPacks: number
  inboxSignals: number
  pendingApprovals: number
  readyToExport: number
  releasesMissingEvidence: number
  unassignedApprovals: number
  unstartedClaimChecks: number
}

function buildHelpModules(
  workflowCount: number,
  stats: HelpCenterStats,
): LiveHelpModule[] {
  const claimCheckStatus =
    stats.blockedClaimChecks > 0
      ? `${stats.blockedClaimChecks} blocked`
      : stats.unstartedClaimChecks > 0
        ? `${stats.unstartedClaimChecks} not started`
        : "Clear now"
  const claimCheckDescription =
    stats.blockedClaimChecks > 0
      ? "Blocked claim checks are visible here so risky wording is corrected while evidence is still in view."
      : stats.unstartedClaimChecks > 0
        ? "Claim check has not run on every live release yet, so wording should not skip ahead as if the safety step were already clear."
        : "Claim check is the first place to confirm wording stays within the captured release evidence."

  return [
    {
      description:
        stats.activeIntegrations === 0
          ? "Connect a release source first so context can enter the workspace with evidence attached."
          : workflowCount === 0
            ? "Your source is connected. Ingest the first release record to start the reviewable workflow."
            : "Release context is already flowing into the workspace and can be reviewed before drafting.",
      href: "/dashboard/release-context",
      id: "release-context",
      status:
        stats.activeIntegrations === 0
          ? "Connect source"
          : workflowCount === 0
            ? "Start here"
            : `${workflowCount} records live`,
      title: "Ingest release context",
    },
    {
      description: claimCheckDescription,
      href: "/dashboard/claim-check",
      id: "claim-check",
      status: claimCheckStatus,
      title: "Run claim check",
    },
    {
      description:
        stats.unassignedApprovals > 0
          ? "Some approval requests still lack an owner, so review responsibility can drift unless it is assigned."
          : stats.pendingApprovals > 0
            ? "Approval handoff is active and should stay explicit until the reviewer records a decision."
            : "Approval guidance stays here when the queue needs a named reviewer and a visible decision trail.",
      href: "/dashboard/approval",
      id: "approval",
      status:
        stats.unassignedApprovals > 0
          ? `${stats.unassignedApprovals} unassigned`
          : stats.pendingApprovals > 0
            ? `${stats.pendingApprovals} pending`
            : "Stable",
      title: "Collect approval",
    },
    {
      description:
        stats.readyToExport > 0
          ? "Approved drafts can freeze into publish packs without recomputing from a moving target."
          : stats.exportedPacks > 0
            ? "Frozen publish packs stay visible so downstream handoff does not drift away from the approved draft."
            : "Publish-pack export should happen only after evidence, wording, and approval all agree.",
      href: "/dashboard/publish-pack",
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
        "The workflow is empty right now. Ingest a release record before expecting draft, approval, or export guidance.",
      id: "no-release-records",
      severity: "default",
      title: "No release records are in scope",
    })
  }

  if (stats.blockedClaimChecks > 0) {
    issues.push({
      description:
        stats.blockedClaimChecks === 1
          ? "One release is still blocked in claim check, so public wording should not move into approval yet."
          : `${stats.blockedClaimChecks} releases are still blocked in claim check, so approval and export should stay paused on those records.`,
      id: "blocked-claim-checks",
      severity: "destructive",
      title: "Blocked claim checks are still active",
    })
  }

  if (stats.unassignedApprovals > 0) {
    issues.push({
      description:
        stats.unassignedApprovals === 1
          ? "One approval request still has no assigned reviewer."
          : `${stats.unassignedApprovals} approval requests still have no assigned reviewer.`,
      id: "unassigned-approvals",
      severity: "destructive",
      title: "Approval handoff is missing an owner",
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
    checklist.push("Connect GitHub before expecting release context, claim check, approval, or export guidance.")
  } else if (workflowCount === 0) {
    checklist.push("Ingest the first release record so the workspace has a real workflow to guide.")
  }

  if (stats.blockedClaimChecks > 0) {
    checklist.push(
      stats.blockedClaimChecks === 1
        ? "Resolve the blocked claim check before the draft moves into approval."
        : `Resolve ${stats.blockedClaimChecks} blocked claim checks before those drafts move into approval.`,
    )
  } else if (stats.unstartedClaimChecks > 0) {
    checklist.push(
      stats.unstartedClaimChecks === 1
        ? "Run claim check on the release that has not started its safety review yet."
        : `Run claim check on the ${stats.unstartedClaimChecks} releases that have not started safety review yet.`,
    )
  }

  if (stats.unassignedApprovals > 0) {
    checklist.push(
      stats.unassignedApprovals === 1
        ? "Assign the pending approval request to a reviewer so the handoff stays attributable."
        : `Assign all ${stats.unassignedApprovals} unowned approval requests so review responsibility stays visible.`,
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
    "Keep approval notes explicit so the final publish pack stays attributable and reviewable.",
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
    blockedClaimChecks: workflow.filter(
      (item) => item.claimCheckSummary.state === "blocked",
    ).length,
    exportedPacks: workflow.filter(
      (item) => item.latestPublishPackSummary.state === "exported",
    ).length,
    inboxSignals: buildReviewInboxItems(workflow, history, currentUserId, policy).length,
    pendingApprovals: workflow.filter(
      (item) => item.approvalSummary.state === "pending",
    ).length,
    readyToExport: workflow.filter(
      (item) => item.latestPublishPackSummary.state === "ready",
    ).length,
    releasesMissingEvidence: workflow.filter((item) => item.evidenceCount === 0).length,
    unassignedApprovals: workflow.filter(
      (item) =>
        item.approvalSummary.state === "pending" &&
        item.approvalSummary.ownerUserId === null,
    ).length,
    unstartedClaimChecks: workflow.filter(
      (item) => item.claimCheckSummary.state === "not_started",
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
    apiClient
      .getWorkspacePolicySettings(workspace.workspace.id, init)
      .catch(() => createDefaultWorkspacePolicySettings(workspace.workspace.id)),
  ])

  return buildLiveHelpData(workspace, workflow, history, currentUserId, policy)
}
