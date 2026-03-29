import type {
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  WorkspacePolicySettings,
  WorkspaceSnapshot,
} from "../api/client"
import { createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"
import { buildReviewInboxItems } from "../review-inbox"

type SettingsApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getWorkspacePolicySettings" | "listReleaseWorkflow" | "listReleaseWorkflowHistory"
>

export type LiveSettingsSectionItem = {
  label: string
  value: string
}

export type LiveSettingsSection = {
  description: string
  items: LiveSettingsSectionItem[]
  title: string
}

export type LiveSettingsMetrics = {
  activeIntegrations: number
  activeMembers: number
  openReviewSignals: number
  readyToExport: number
}

export type LiveSettingsData = {
  exportReadiness: LiveSettingsSection
  metrics: LiveSettingsMetrics
  notifications: LiveSettingsSection
  policy: WorkspacePolicySettings
  reviewPolicy: LiveSettingsSection
  workspaceProfile: LiveSettingsSection
}

const settingsTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatSettingsTimestamp(value: string) {
  return `${settingsTimestampFormatter.format(new Date(value))} UTC`
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    throw new Error("Invalid settings timestamp provided.")
  }

  return timestamp
}

function getLatestSyncLabel(workspace: WorkspaceSnapshot) {
  const latestSync = workspace.syncRuns
    .slice()
    .sort((left, right) => toTimestamp(right.startedAt) - toTimestamp(left.startedAt))[0]

  if (!latestSync) {
    return "No sync recorded"
  }

  if (latestSync.finishedAt) {
    return formatSettingsTimestamp(latestSync.finishedAt)
  }

  return `${latestSync.status} since ${formatSettingsTimestamp(latestSync.startedAt)}`
}

export function buildLiveSettingsData(
  workspace: WorkspaceSnapshot,
  workflow: ReleaseWorkflowListItem[],
  history: ReleaseWorkflowHistoryEntry[],
  policy: WorkspacePolicySettings,
  currentUserId: string,
): LiveSettingsData {
  const inboxItems = buildReviewInboxItems(workflow, history, currentUserId, policy)
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
  const reopenedDrafts = workflow.filter(
    (item) => item.approvalSummary.state === "reopened",
  ).length
  const readyToExport = workflow.filter(
    (item) => item.latestPublishPackSummary.state === "ready",
  ).length
  const exportedPublishPacks = history.filter(
    (entry) => entry.eventType === "publish_pack_created",
  ).length
  const releasesWithEvidence = workflow.filter((item) => item.evidenceCount > 0).length
  const releasesMissingEvidence = workflow.length - releasesWithEvidence
  const approvalAlerts = inboxItems.filter((item) => item.source === "approval").length
  const claimAlerts = inboxItems.filter((item) => item.source === "claim").length
  const reopenedAlerts = inboxItems.filter((item) => item.status === "Reopened").length

  return {
    exportReadiness: {
      description: "Export stays evidence-backed and explicit before a publish pack is handed off.",
      items: [
        { label: "Ready to export", value: String(readyToExport) },
        { label: "Publish packs exported", value: String(exportedPublishPacks) },
        { label: "Releases with evidence", value: String(releasesWithEvidence) },
        { label: "Releases missing evidence", value: String(releasesMissingEvidence) },
        {
          label: "Include evidence links",
          value: policy.includeEvidenceLinksInExport ? "Enabled" : "Disabled",
        },
        {
          label: "Include source links",
          value: policy.includeSourceLinksInExport ? "Enabled" : "Disabled",
        },
      ],
      title: "Export readiness",
    },
    metrics: {
      activeIntegrations,
      activeMembers: workspace.memberships.length,
      openReviewSignals: inboxItems.length,
      readyToExport,
    },
    notifications: {
      description: "In-product signals stay visible so blocked states and handoffs do not disappear between pages.",
      items: [
        { label: "In-product signals", value: String(inboxItems.length) },
        { label: "Approval alerts", value: String(approvalAlerts) },
        { label: "Claim alerts", value: String(claimAlerts) },
        { label: "Reopened draft alerts", value: String(reopenedAlerts) },
        {
          label: "Blocked claims in inbox",
          value: policy.showBlockedClaimsInInbox ? "Enabled" : "Disabled",
        },
        {
          label: "Pending approvals in inbox",
          value: policy.showPendingApprovalsInInbox ? "Enabled" : "Disabled",
        },
        {
          label: "Reopened drafts in inbox",
          value: policy.showReopenedDraftsInInbox ? "Enabled" : "Disabled",
        },
      ],
      title: "Notification coverage",
    },
    policy,
    reviewPolicy: {
      description: "These live workflow counts show where review is still gating public wording and publish readiness.",
      items: [
        { label: "Blocked claim checks", value: String(blockedClaimChecks) },
        { label: "Pending approvals", value: String(pendingApprovals) },
        { label: "Unassigned handoffs", value: String(unassignedApprovals) },
        { label: "Reopened drafts", value: String(reopenedDrafts) },
        { label: "Logged decisions", value: String(history.length) },
        {
          label: "Claim check before approval",
          value: policy.requireClaimCheckBeforeApproval ? "Required" : "Optional",
        },
        {
          label: "Reviewer assignment",
          value: policy.requireReviewerAssignment ? "Required" : "Optional",
        },
      ],
      title: "Review policy status",
    },
    workspaceProfile: {
      description: "Workspace routing, members, and sync coverage stay visible before approvals or exports move forward.",
      items: [
        { label: "Workspace", value: workspace.workspace.name },
        { label: "Slug", value: workspace.workspace.slug },
        { label: "Members", value: String(workspace.memberships.length) },
        { label: "Active integrations", value: String(activeIntegrations) },
        { label: "Latest sync", value: getLatestSyncLabel(workspace) },
      ],
      title: "Workspace profile",
    },
  }
}

export async function getServerSettingsData(
  requestHeaders: Headers,
  workspace: WorkspaceSnapshot,
  currentUserId: string,
  apiClient: SettingsApiClient = createApiClient(),
) {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const [workflow, history, policy] = await Promise.all([
    apiClient.listReleaseWorkflow(workspace.workspace.id, init),
    apiClient.listReleaseWorkflowHistory(workspace.workspace.id, init),
    apiClient.getWorkspacePolicySettings(workspace.workspace.id, init),
  ])

  return buildLiveSettingsData(workspace, workflow, history, policy, currentUserId)
}
