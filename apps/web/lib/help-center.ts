import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspaceSnapshot,
} from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import { buildReviewInboxItems } from "./review-inbox"

type HelpCenterApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "listReleaseWorkflow" | "listReleaseWorkflowHistory"
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

function buildHelpModules(
  workspace: WorkspaceSnapshot,
  workflow: ReleaseWorkflowListItem[],
): LiveHelpModule[] {
  const activeIntegrations = workspace.integrations.filter(
    (integration) => integration.status === "active",
  ).length
  const blockedClaimChecks = workflow.filter(
    (item) => item.claimCheckSummary.state === "blocked",
  ).length
  const pendingApprovals = workflow.filter(
    (item) => item.approvalSummary.state === "pending",
  ).length
  const unassignedApprovals = workflow.filter(
    (item) =>
      item.approvalSummary.state === "pending" &&
      item.approvalSummary.ownerUserId === null,
  ).length
  const readyToExport = workflow.filter(
    (item) => item.latestPublishPackSummary.state === "ready",
  ).length
  const exportedPacks = workflow.filter(
    (item) => item.latestPublishPackSummary.state === "exported",
  ).length

  return [
    {
      description:
        activeIntegrations === 0
          ? "Connect a release source first so context can enter the workspace with evidence attached."
          : workflow.length === 0
            ? "Your source is connected. Ingest the first release record to start the reviewable workflow."
            : "Release context is already flowing into the workspace and can be reviewed before drafting.",
      href: "/dashboard/release-context",
      id: "release-context",
      status:
        activeIntegrations === 0
          ? "Connect source"
          : workflow.length === 0
            ? "Start here"
            : `${workflow.length} records live`,
      title: "Ingest release context",
    },
    {
      description:
        blockedClaimChecks > 0
          ? "Blocked claim checks are visible here so risky wording is corrected while evidence is still in view."
          : "Claim check is the first place to confirm wording stays within the captured release evidence.",
      href: "/dashboard/claim-check",
      id: "claim-check",
      status: blockedClaimChecks > 0 ? `${blockedClaimChecks} blocked` : "Clear now",
      title: "Run claim check",
    },
    {
      description:
        unassignedApprovals > 0
          ? "Some approval requests still lack an owner, so review responsibility can drift unless it is assigned."
          : pendingApprovals > 0
            ? "Approval handoff is active and should stay explicit until the reviewer records a decision."
            : "Approval guidance stays here when the queue needs a named reviewer and a visible decision trail.",
      href: "/dashboard/approval",
      id: "approval",
      status:
        unassignedApprovals > 0
          ? `${unassignedApprovals} unassigned`
          : pendingApprovals > 0
            ? `${pendingApprovals} pending`
            : "Stable",
      title: "Collect approval",
    },
    {
      description:
        readyToExport > 0
          ? "Approved drafts can freeze into publish packs without recomputing from a moving target."
          : exportedPacks > 0
            ? "Frozen publish packs stay visible so downstream handoff does not drift away from the approved draft."
            : "Publish-pack export should happen only after evidence, wording, and approval all agree.",
      href: "/dashboard/publish-pack",
      id: "publish-pack",
      status:
        readyToExport > 0
          ? `${readyToExport} ready`
          : exportedPacks > 0
            ? `${exportedPacks} exported`
            : "Waiting",
      title: "Export publish pack",
    },
  ]
}

function buildHelpIssues(
  workspace: WorkspaceSnapshot,
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
  currentUserId: string,
): LiveHelpIssue[] {
  const activeIntegrations = workspace.integrations.filter(
    (integration) => integration.status === "active",
  ).length
  const blockedClaimChecks = workflow.filter(
    (item) => item.claimCheckSummary.state === "blocked",
  ).length
  const unassignedApprovals = workflow.filter(
    (item) =>
      item.approvalSummary.state === "pending" &&
      item.approvalSummary.ownerUserId === null,
  ).length
  const releasesMissingEvidence = workflow.filter((item) => item.evidenceCount === 0).length
  const inboxSignals = buildReviewInboxItems(workflow, history, currentUserId).length
  const issues: LiveHelpIssue[] = []

  if (activeIntegrations === 0) {
    issues.push({
      description:
        "No active GitHub or Linear connection is attached to this workspace, so release context cannot be ingested yet.",
      id: "no-active-integrations",
      severity: "destructive",
      title: "No active release source is connected",
    })
  }

  if (workflow.length === 0) {
    issues.push({
      description:
        "The workflow is empty right now. Ingest a release record before expecting draft, approval, or export guidance.",
      id: "no-release-records",
      severity: "default",
      title: "No release records are in scope",
    })
  }

  if (blockedClaimChecks > 0) {
    issues.push({
      description:
        blockedClaimChecks === 1
          ? "One release is still blocked in claim check, so public wording should not move into approval yet."
          : `${blockedClaimChecks} releases are still blocked in claim check, so approval and export should stay paused on those records.`,
      id: "blocked-claim-checks",
      severity: "destructive",
      title: "Blocked claim checks are still active",
    })
  }

  if (unassignedApprovals > 0) {
    issues.push({
      description:
        unassignedApprovals === 1
          ? "One approval request still has no assigned reviewer."
          : `${unassignedApprovals} approval requests still have no assigned reviewer.`,
      id: "unassigned-approvals",
      severity: "destructive",
      title: "Approval handoff is missing an owner",
    })
  }

  if (releasesMissingEvidence > 0) {
    issues.push({
      description:
        releasesMissingEvidence === 1
          ? "One release record has no attached evidence blocks yet."
          : `${releasesMissingEvidence} release records still have no attached evidence blocks.`,
      id: "missing-evidence",
      severity: "default",
      title: "Evidence coverage is incomplete",
    })
  }

  if (inboxSignals > 0) {
    issues.push({
      description:
        inboxSignals === 1
          ? "One operational review signal is active in the inbox."
          : `${inboxSignals} operational review signals are active in the inbox.`,
      id: "inbox-signals",
      severity: "default",
      title: "Operational review signals still need attention",
    })
  }

  return issues
}

function buildHelpChecklist(
  workspace: WorkspaceSnapshot,
  workflow: ReleaseWorkflowListItem[],
): string[] {
  const activeIntegrations = workspace.integrations.filter(
    (integration) => integration.status === "active",
  ).length
  const blockedClaimChecks = workflow.filter(
    (item) => item.claimCheckSummary.state === "blocked",
  ).length
  const unassignedApprovals = workflow.filter(
    (item) =>
      item.approvalSummary.state === "pending" &&
      item.approvalSummary.ownerUserId === null,
  ).length
  const readyToExport = workflow.filter(
    (item) => item.latestPublishPackSummary.state === "ready",
  ).length
  const checklist: string[] = []

  if (activeIntegrations === 0) {
    checklist.push("Connect GitHub before expecting release context, claim check, approval, or export guidance.")
  } else if (workflow.length === 0) {
    checklist.push("Ingest the first release record so the workspace has a real workflow to guide.")
  }

  if (blockedClaimChecks > 0) {
    checklist.push(
      blockedClaimChecks === 1
        ? "Resolve the blocked claim check before the draft moves into approval."
        : `Resolve ${blockedClaimChecks} blocked claim checks before those drafts move into approval.`,
    )
  }

  if (unassignedApprovals > 0) {
    checklist.push(
      unassignedApprovals === 1
        ? "Assign the pending approval request to a reviewer so the handoff stays attributable."
        : `Assign all ${unassignedApprovals} unowned approval requests so review responsibility stays visible.`,
    )
  }

  if (readyToExport > 0) {
    checklist.push(
      readyToExport === 1
        ? "Freeze the approved draft into a publish pack before downstream wording drifts."
        : `Freeze the ${readyToExport} ready records into publish packs before downstream wording drifts.`,
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
): LiveHelpData {
  const modules = buildHelpModules(workspace, workflow)
  const issues = buildHelpIssues(workspace, workflow, history, currentUserId)
  const activeStages = new Set(workflow.map((item) => item.releaseRecord.stage)).size
  const openSignals = buildReviewInboxItems(workflow, history, currentUserId).length

  return {
    checklist: buildHelpChecklist(workspace, workflow),
    issues,
    metrics: {
      activeStages,
      knownLimits: issues.length,
      openSignals,
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

  const [workflow, history] = await Promise.all([
    apiClient.listReleaseWorkflow(workspace.workspace.id, init),
    apiClient.listReleaseWorkflowHistory(workspace.workspace.id, init),
  ])

  return buildLiveHelpData(workspace, workflow, history, currentUserId)
}
