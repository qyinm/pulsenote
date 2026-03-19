import type { LucideIcon } from "lucide-react"
import {
  ArchiveIcon,
  CheckCheckIcon,
  CircleHelpIcon,
  FileStackIcon,
  FolderKanbanIcon,
  InboxIcon,
  PackageCheckIcon,
  SearchIcon,
  Settings2Icon,
  SquareChartGanttIcon,
  ShieldAlertIcon,
} from "lucide-react"

export type RouteGroup = "core" | "asset" | "utility"

export type RouteAction = {
  label: string
  href: string
  icon: LucideIcon
  variant?: "default" | "secondary" | "outline"
}

export type DashboardRoute = {
  href: string
  title: string
  sidebarTitle?: string
  description: string
  group: RouteGroup
  icon: LucideIcon
  badge?: string
  showInSidebar?: boolean
  primaryAction?: RouteAction
  secondaryAction?: RouteAction
}

export type ReleaseStage =
  | "Draft ready"
  | "Claim check"
  | "Approval queue"
  | "Ready to export"

export type ClaimCheckState = "Clear" | "Watch" | "Blocked"

export type ReleaseRecord = {
  id: number
  release: string
  channel: string
  status: ReleaseStage
  claimCheck: ClaimCheckState
  owner: string
  publishWindow: string
  evidenceCount: number
  summary: string
  nextAction: string
}

export type ReleaseContextItem = {
  id: string
  release: string
  sourceType: string
  coverage: string
  freshness: string
  owner: string
  evidenceCount: number
  blockers: string
  readiness: "Ready" | "Needs review" | "At risk"
}

export type ClaimCheckSeverity = "High" | "Medium" | "Low"

export type ClaimCheckItem = {
  id: string
  release: string
  claim: string
  severity: ClaimCheckSeverity
  evidenceState: "Verified" | "Needs support" | "Missing source"
  reviewer: string
  nextStep: string
}

export type ApprovalStage =
  | "Content review"
  | "Support sign-off"
  | "Legal review"
  | "Executive final"

export type ApprovalStatus = "Pending" | "In review" | "Signed off"

export type ApprovalItem = {
  id: string
  release: string
  stage: ApprovalStage
  status: ApprovalStatus
  owner: string
  dueAt: string
  note: string
}

export type PublishStatus = "Ready" | "Needs work" | "Blocked"

export type PublishAsset = {
  id: string
  asset: string
  channel: string
  status: PublishStatus
  owner: string
  lastUpdated: string
  note: string
}

export type EvidenceFreshness = "Fresh" | "Watch" | "Stale"

export type EvidenceItem = {
  id: string
  source: string
  sourceType: string
  freshness: EvidenceFreshness
  linkedReleases: number
  owner: string
  lastSynced: string
  note: string
  tag: string
}

export type ReviewLogEntry = {
  id: string
  timestamp: string
  actor: string
  action: string
  entity: string
  outcome: string
  note: string
}

export type TemplateStatus = "Current" | "Needs review" | "Draft"

export type TemplateItem = {
  id: string
  name: string
  channel: string
  status: TemplateStatus
  owner: string
  lastUpdated: string
  audience: string
  note: string
}

export type SearchResultType =
  | "Release"
  | "Claim"
  | "Evidence"
  | "Approval"
  | "Template"
  | "Help"

export type SearchResultItem = {
  id: string
  type: SearchResultType
  title: string
  summary: string
  route: string
  meta: string
}

export type SettingField =
  | {
      id: string
      type: "text" | "email"
      label: string
      value: string
      hint: string
    }
  | {
      id: string
      type: "textarea"
      label: string
      value: string
      hint: string
    }
  | {
      id: string
      type: "switch"
      label: string
      checked: boolean
      hint: string
    }
  | {
      id: string
      type: "select"
      label: string
      value: string
      hint: string
      options: string[]
    }

export type WorkspaceSettingSection = {
  id: string
  title: string
  description: string
  fields: SettingField[]
}

export type HelpModule = {
  id: string
  title: string
  description: string
  href: string
  status: string
}

export type KnownIssue = {
  id: string
  title: string
  description: string
}

export const releaseRecords: ReleaseRecord[] = [
  {
    id: 1,
    release: "SDK rollout v2.4",
    channel: "Release note",
    status: "Claim check",
    claimCheck: "Watch",
    owner: "Mina Park",
    publishWindow: "Mar 18, 16:30 KST",
    evidenceCount: 6,
    summary:
      "SDK retry logic and install fallback are drafted for customer-facing release notes.",
    nextAction:
      "Narrow the rollout scope sentence before this record moves into approval.",
  },
  {
    id: 2,
    release: "Billing migration notes",
    channel: "Customer email",
    status: "Ready to export",
    claimCheck: "Clear",
    owner: "Daniel Kim",
    publishWindow: "Mar 18, 17:00 KST",
    evidenceCount: 4,
    summary:
      "Plan transition language, invoice timing, and support contact details are aligned.",
    nextAction:
      "Export the publish pack once customer success confirms final send timing.",
  },
  {
    id: 3,
    release: "SSO admin controls",
    channel: "Release note",
    status: "Approval queue",
    claimCheck: "Blocked",
    owner: "Grace Lee",
    publishWindow: "Mar 19, 09:00 KST",
    evidenceCount: 5,
    summary:
      "Admin control changes are documented, but rollout language still overstates availability.",
    nextAction:
      "Resolve the legal note on rollout eligibility before approval can close.",
  },
  {
    id: 4,
    release: "Incident follow-up fixes",
    channel: "Status update",
    status: "Draft ready",
    claimCheck: "Clear",
    owner: "Chris Han",
    publishWindow: "Mar 18, 15:00 KST",
    evidenceCount: 3,
    summary:
      "The follow-up summary is drafted with evidence links for the remediation timeline.",
    nextAction:
      "Attach the support workaround block before this record enters claim check.",
  },
  {
    id: 5,
    release: "Usage analytics export",
    channel: "Changelog",
    status: "Claim check",
    claimCheck: "Watch",
    owner: "Ivy Song",
    publishWindow: "Mar 20, 10:00 KST",
    evidenceCount: 7,
    summary:
      "Export availability is covered, but customer action language still needs exact wording.",
    nextAction:
      "Confirm whether the rollout applies to all paid plans or only enterprise workspaces.",
  },
  {
    id: 6,
    release: "Audit log filters",
    channel: "Release note",
    status: "Approval queue",
    claimCheck: "Clear",
    owner: "Noah Lim",
    publishWindow: "Mar 20, 14:30 KST",
    evidenceCount: 5,
    summary:
      "Filter combinations, evidence links, and support guidance are ready for sign-off.",
    nextAction:
      "Collect the support lead approval and export the pack for publishing.",
  },
]

export const releaseTrendData = [
  { date: "2026-01-07", drafts: 2, warnings: 7 },
  { date: "2026-01-14", drafts: 3, warnings: 7 },
  { date: "2026-01-21", drafts: 3, warnings: 6 },
  { date: "2026-01-28", drafts: 4, warnings: 6 },
  { date: "2026-02-04", drafts: 4, warnings: 5 },
  { date: "2026-02-11", drafts: 5, warnings: 5 },
  { date: "2026-02-18", drafts: 5, warnings: 4 },
  { date: "2026-02-25", drafts: 6, warnings: 4 },
  { date: "2026-03-04", drafts: 6, warnings: 4 },
  { date: "2026-03-11", drafts: 7, warnings: 3 },
  { date: "2026-03-18", drafts: 8, warnings: 3 },
]

export const releaseContextQueue: ReleaseContextItem[] = [
  {
    id: "context-1",
    release: "SDK rollout v2.4",
    sourceType: "PR + spec",
    coverage: "84%",
    freshness: "Updated 14 min ago",
    owner: "Mina Park",
    evidenceCount: 6,
    blockers: "Rollout cohort wording still needs exact scope.",
    readiness: "Needs review",
  },
  {
    id: "context-2",
    release: "Billing migration notes",
    sourceType: "Issue + support brief",
    coverage: "96%",
    freshness: "Updated 28 min ago",
    owner: "Daniel Kim",
    evidenceCount: 4,
    blockers: "Waiting for final send time from customer success.",
    readiness: "Ready",
  },
  {
    id: "context-3",
    release: "SSO admin controls",
    sourceType: "PR + security review",
    coverage: "79%",
    freshness: "Updated 43 min ago",
    owner: "Grace Lee",
    evidenceCount: 5,
    blockers: "Availability language overstates rollout eligibility.",
    readiness: "At risk",
  },
  {
    id: "context-4",
    release: "Audit log filters",
    sourceType: "Spec + release checklist",
    coverage: "91%",
    freshness: "Updated 1 hr ago",
    owner: "Noah Lim",
    evidenceCount: 5,
    blockers: "Support walkthrough screenshots not attached yet.",
    readiness: "Needs review",
  },
  {
    id: "context-5",
    release: "Incident follow-up fixes",
    sourceType: "Status thread + postmortem",
    coverage: "88%",
    freshness: "Updated 2 hr ago",
    owner: "Chris Han",
    evidenceCount: 3,
    blockers: "Need a concrete workaround sentence before draft handoff.",
    readiness: "Needs review",
  },
]

export const releaseContextActivities = [
  "09:14 KST: spec excerpts synced into SDK rollout record.",
  "10:02 KST: support brief attached to billing migration intake.",
  "10:27 KST: legal note appended to SSO availability claim.",
  "11:08 KST: release checklist imported for audit log filters.",
]

export const claimCheckItems: ClaimCheckItem[] = [
  {
    id: "claim-1",
    release: "SDK rollout v2.4",
    claim: "Retry logic now covers all failed installs automatically.",
    severity: "Medium",
    evidenceState: "Needs support",
    reviewer: "Mina Park",
    nextStep: "Constrain the promise to the rollout cohort already confirmed.",
  },
  {
    id: "claim-2",
    release: "SSO admin controls",
    claim: "All enterprise workspaces can enable the control immediately.",
    severity: "High",
    evidenceState: "Missing source",
    reviewer: "Grace Lee",
    nextStep: "Replace with phased availability language and attach the legal note.",
  },
  {
    id: "claim-3",
    release: "Usage analytics export",
    claim: "Exports are available on every paid plan.",
    severity: "High",
    evidenceState: "Needs support",
    reviewer: "Ivy Song",
    nextStep: "Verify plan scope against pricing guidance before approval.",
  },
  {
    id: "claim-4",
    release: "Incident follow-up fixes",
    claim: "The remediation removes every known timeout scenario.",
    severity: "Medium",
    evidenceState: "Verified",
    reviewer: "Chris Han",
    nextStep: "Rephrase to describe the specific timeout classes addressed.",
  },
  {
    id: "claim-5",
    release: "Audit log filters",
    claim: "Teams can filter every event type from the new panel.",
    severity: "Low",
    evidenceState: "Verified",
    reviewer: "Noah Lim",
    nextStep: "Confirm the unsupported legacy event types in a footnote.",
  },
]

export const approvalItems: ApprovalItem[] = [
  {
    id: "approval-1",
    release: "Billing migration notes",
    stage: "Support sign-off",
    status: "Pending",
    owner: "Daniel Kim",
    dueAt: "Today, 16:40",
    note: "Need confirmation that support macros are ready before export.",
  },
  {
    id: "approval-2",
    release: "SSO admin controls",
    stage: "Legal review",
    status: "In review",
    owner: "Grace Lee",
    dueAt: "Today, 17:10",
    note: "Legal is reviewing the rollout eligibility sentence.",
  },
  {
    id: "approval-3",
    release: "Audit log filters",
    stage: "Support sign-off",
    status: "Signed off",
    owner: "Noah Lim",
    dueAt: "Today, 15:20",
    note: "Support approved the issue-response guidance.",
  },
  {
    id: "approval-4",
    release: "SDK rollout v2.4",
    stage: "Content review",
    status: "In review",
    owner: "Mina Park",
    dueAt: "Today, 16:10",
    note: "PMM is tightening customer-facing scope language.",
  },
  {
    id: "approval-5",
    release: "Usage analytics export",
    stage: "Executive final",
    status: "Pending",
    owner: "Ivy Song",
    dueAt: "Tomorrow, 09:00",
    note: "Executive sign-off is blocked on final plan coverage wording.",
  },
]

export const publishAssets: PublishAsset[] = [
  {
    id: "asset-1",
    asset: "Release note block",
    channel: "Release note",
    status: "Ready",
    owner: "Mina Park",
    lastUpdated: "8 min ago",
    note: "Copy is ready once the approval note is attached.",
  },
  {
    id: "asset-2",
    asset: "Customer email",
    channel: "Email",
    status: "Ready",
    owner: "Daniel Kim",
    lastUpdated: "12 min ago",
    note: "Timing copy and support CTA are aligned.",
  },
  {
    id: "asset-3",
    asset: "Help center excerpt",
    channel: "Help center",
    status: "Needs work",
    owner: "Grace Lee",
    lastUpdated: "24 min ago",
    note: "Still missing the legal-safe availability note.",
  },
  {
    id: "asset-4",
    asset: "Status update summary",
    channel: "Status page",
    status: "Blocked",
    owner: "Chris Han",
    lastUpdated: "31 min ago",
    note: "Blocked until the workaround note is verified by support.",
  },
  {
    id: "asset-5",
    asset: "Changelog card",
    channel: "In-app changelog",
    status: "Needs work",
    owner: "Ivy Song",
    lastUpdated: "44 min ago",
    note: "Audience-specific wording still needs a plan qualifier.",
  },
]

export const evidenceItems: EvidenceItem[] = [
  {
    id: "evidence-1",
    source: "SDK rollout spec excerpt",
    sourceType: "Spec",
    freshness: "Fresh",
    linkedReleases: 2,
    owner: "Mina Park",
    lastSynced: "10 min ago",
    note: "Primary source for retry logic scope and fallback language.",
    tag: "Availability",
  },
  {
    id: "evidence-2",
    source: "Billing migration support brief",
    sourceType: "Support note",
    freshness: "Fresh",
    linkedReleases: 1,
    owner: "Daniel Kim",
    lastSynced: "18 min ago",
    note: "Confirms invoice timing and escalation contact details.",
    tag: "Customer timing",
  },
  {
    id: "evidence-3",
    source: "SSO eligibility review",
    sourceType: "Legal note",
    freshness: "Watch",
    linkedReleases: 1,
    owner: "Grace Lee",
    lastSynced: "59 min ago",
    note: "Still missing a final sign-off sentence for availability claims.",
    tag: "Eligibility",
  },
  {
    id: "evidence-4",
    source: "Incident remediation checklist",
    sourceType: "Runbook",
    freshness: "Watch",
    linkedReleases: 1,
    owner: "Chris Han",
    lastSynced: "2 hr ago",
    note: "Checklist is complete, but support workaround is not yet linked.",
    tag: "Remediation",
  },
  {
    id: "evidence-5",
    source: "Pricing plan scope table",
    sourceType: "Internal doc",
    freshness: "Stale",
    linkedReleases: 1,
    owner: "Ivy Song",
    lastSynced: "1 day ago",
    note: "Requires a same-day sync before claims about paid plans go live.",
    tag: "Plan coverage",
  },
  {
    id: "evidence-6",
    source: "Audit log filter walkthrough",
    sourceType: "Demo capture",
    freshness: "Fresh",
    linkedReleases: 2,
    owner: "Noah Lim",
    lastSynced: "20 min ago",
    note: "Supports customer steps and supported filter combinations.",
    tag: "How-to",
  },
]

export const reviewLogEntries: ReviewLogEntry[] = [
  {
    id: "log-1",
    timestamp: "11:18 KST",
    actor: "Grace Lee",
    action: "Escalated claim",
    entity: "SSO admin controls",
    outcome: "Blocked",
    note: "Availability sentence now requires legal review before publish.",
  },
  {
    id: "log-2",
    timestamp: "10:52 KST",
    actor: "Daniel Kim",
    action: "Attached evidence",
    entity: "Billing migration notes",
    outcome: "Ready",
    note: "Support brief now covers timing and contact details.",
  },
  {
    id: "log-3",
    timestamp: "10:31 KST",
    actor: "Mina Park",
    action: "Reworded claim",
    entity: "SDK rollout v2.4",
    outcome: "Watch",
    note: "Automatic install recovery wording narrowed to staged rollout.",
  },
  {
    id: "log-4",
    timestamp: "09:47 KST",
    actor: "Noah Lim",
    action: "Closed review",
    entity: "Audit log filters",
    outcome: "Signed off",
    note: "Support guidance and filter matrix match current product behavior.",
  },
  {
    id: "log-5",
    timestamp: "09:22 KST",
    actor: "Chris Han",
    action: "Requested revision",
    entity: "Incident follow-up fixes",
    outcome: "Draft updated",
    note: "Asked for an explicit workaround line before claim check continues.",
  },
]

export const templateItems: TemplateItem[] = [
  {
    id: "template-1",
    name: "Release note template",
    channel: "Release note",
    status: "Current",
    owner: "Mina Park",
    lastUpdated: "Mar 16",
    audience: "Product and support",
    note: "Default structure for proof-linked feature announcements.",
  },
  {
    id: "template-2",
    name: "Customer migration email",
    channel: "Email",
    status: "Needs review",
    owner: "Daniel Kim",
    lastUpdated: "Mar 14",
    audience: "Billing admins",
    note: "Needs updated guidance for plan-specific availability language.",
  },
  {
    id: "template-3",
    name: "Status follow-up pack",
    channel: "Status page",
    status: "Draft",
    owner: "Chris Han",
    lastUpdated: "Mar 12",
    audience: "Affected customers",
    note: "Includes remediation summary and support follow-up blocks.",
  },
  {
    id: "template-4",
    name: "Changelog highlight",
    channel: "In-app changelog",
    status: "Current",
    owner: "Ivy Song",
    lastUpdated: "Mar 11",
    audience: "Workspace admins",
    note: "Optimized for concise scope wording and call-to-action clarity.",
  },
]

export const searchResults: SearchResultItem[] = [
  {
    id: "search-1",
    type: "Release",
    title: "SDK rollout v2.4",
    summary: "Draft, claim warning, and publish target all in one release record.",
    route: "/dashboard",
    meta: "Owner Mina Park · Claim check",
  },
  {
    id: "search-2",
    type: "Claim",
    title: "SSO availability sentence",
    summary: "Blocked claim because rollout eligibility is not fully proven.",
    route: "/dashboard/claim-check",
    meta: "High severity · Grace Lee",
  },
  {
    id: "search-3",
    type: "Evidence",
    title: "Pricing plan scope table",
    summary: "Source used to verify which plans can access analytics export.",
    route: "/dashboard/evidence-library",
    meta: "Stale · Internal doc",
  },
  {
    id: "search-4",
    type: "Approval",
    title: "Billing migration support sign-off",
    summary: "Pending support approval before the publish pack exports.",
    route: "/dashboard/approval",
    meta: "Due today · Daniel Kim",
  },
  {
    id: "search-5",
    type: "Template",
    title: "Customer migration email",
    summary: "Reusable export template for billing and account migration notices.",
    route: "/dashboard/export-templates",
    meta: "Needs review · Email",
  },
  {
    id: "search-6",
    type: "Help",
    title: "How claim check works",
    summary: "Guidance on narrowing unsupported public language before approval.",
    route: "/dashboard/help",
    meta: "Workflow guide",
  },
]

export const workspaceSettings: WorkspaceSettingSection[] = [
  {
    id: "workspace",
    title: "Workspace profile",
    description: "Keep reviewer ownership and release routing explicit.",
    fields: [
      {
        id: "workspace-name",
        type: "text",
        label: "Workspace name",
        value: "PulseNote Release Ops",
        hint: "Shown in sample exports and approval summaries.",
      },
      {
        id: "workspace-email",
        type: "email",
        label: "Review inbox",
        value: "ops@pulsenote.app",
        hint: "Receives approval handoff notices and export reminders.",
      },
    ],
  },
  {
    id: "policy",
    title: "Review policy",
    description: "Define the minimum review required before anything is publishable.",
    fields: [
      {
        id: "policy-legal",
        type: "switch",
        label: "Require legal review for availability claims",
        checked: true,
        hint: "Applied when a release mentions phased or plan-gated access.",
      },
      {
        id: "policy-support",
        type: "switch",
        label: "Require support sign-off for customer action blocks",
        checked: true,
        hint: "Ensures the published guidance matches current macros and playbooks.",
      },
      {
        id: "policy-note",
        type: "textarea",
        label: "Approval note template",
        value:
          "Confirm the claim is evidence-backed, scope is explicit, and customer action is reviewable.",
        hint: "Shown to approvers before they sign off.",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Keep the team informed without hiding blocked states.",
    fields: [
      {
        id: "notif-blocked",
        type: "switch",
        label: "Notify claim owners when a record becomes blocked",
        checked: true,
        hint: "Immediate notice when a release cannot move toward approval.",
      },
      {
        id: "notif-export",
        type: "switch",
        label: "Send export reminders one hour before publish window",
        checked: false,
        hint: "Useful for teams that publish on a fixed release cadence.",
      },
    ],
  },
  {
    id: "exports",
    title: "Export defaults",
    description: "Set the packaging rules for publish-ready release output.",
    fields: [
      {
        id: "export-format",
        type: "select",
        label: "Default publish pack format",
        value: "Markdown + checklist",
        hint: "Used when the owner exports without overriding settings.",
        options: ["Markdown + checklist", "Plain text summary", "HTML email block"],
      },
      {
        id: "export-links",
        type: "switch",
        label: "Include evidence links in exported review summary",
        checked: true,
        hint: "Keeps final publish packs reviewable after handoff.",
      },
    ],
  },
]

export const helpModules: HelpModule[] = [
  {
    id: "help-1",
    title: "Ingest release context",
    description: "Bring in evidence first so draft copy stays concrete and reviewable.",
    href: "/dashboard/release-context",
    status: "Start here",
  },
  {
    id: "help-2",
    title: "Run claim check",
    description: "Catch unsupported language before it reaches approval or export.",
    href: "/dashboard/claim-check",
    status: "High priority",
  },
  {
    id: "help-3",
    title: "Collect approval",
    description: "Move through content, support, legal, and final sign-off cleanly.",
    href: "/dashboard/approval",
    status: "Workflow",
  },
  {
    id: "help-4",
    title: "Export publish pack",
    description: "Package approved release communication with evidence and channel context.",
    href: "/dashboard/publish-pack",
    status: "Final step",
  },
]

export const knownIssues: KnownIssue[] = [
  {
    id: "issue-1",
    title: "Template previews use sample data only",
    description:
      "Current previews reflect mock release records and should not be treated as live publish output.",
  },
  {
    id: "issue-2",
    title: "Search indexes route metadata and sample workflow state",
    description:
      "Search is implemented with typed mock data until backend indexing is connected.",
  },
]

const releaseContextBadge = String(
  releaseContextQueue.filter((item) => item.readiness !== "Ready").length
)
const claimCheckBadge = String(
  claimCheckItems.filter((item) => item.severity !== "Low").length
)
const approvalBadge = String(
  approvalItems.filter((item) => item.status !== "Signed off").length
)
export const inboxQueueBadge = String(
  claimCheckItems.filter(
    (item) => item.severity === "High" || item.evidenceState === "Missing source"
  ).length +
    approvalItems.filter((item) => item.status !== "Signed off").length +
    evidenceItems.filter((item) => item.freshness !== "Fresh").length +
    publishAssets.filter((item) => item.status !== "Ready").length
)
const publishBadge = String(
  publishAssets.filter((item) => item.status !== "Ready").length
)
const evidenceBadge = String(evidenceItems.length)
const reviewLogBadge = "24h"
const templateBadge = String(
  templateItems.filter((item) => item.status !== "Current").length
)

export const dashboardRoutes: DashboardRoute[] = [
  {
    href: "/dashboard",
    title: "Release Dashboard",
    sidebarTitle: "Overview",
    description:
      "Track release context, claim checks, approvals, and publish packs from one operational surface.",
    group: "core",
    icon: SquareChartGanttIcon,
    primaryAction: {
      label: "Open approvals",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Export pack",
      href: "/dashboard/publish-pack",
      icon: PackageCheckIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/inbox",
    title: "Inbox",
    description:
      "Review blocked claims, pending approvals, and workflow pressure from one release communication queue.",
    group: "core",
    icon: InboxIcon,
    badge: inboxQueueBadge,
    showInSidebar: false,
    primaryAction: {
      label: "Open claim check",
      href: "/dashboard/claim-check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open approval",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/release-context",
    title: "Release Context",
    description:
      "Review intake coverage, evidence completeness, and source freshness before drafting starts.",
    group: "core",
    icon: FileStackIcon,
    badge: releaseContextBadge,
    primaryAction: {
      label: "Open claim checks",
      href: "/dashboard/claim-check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "View evidence",
      href: "/dashboard/evidence-library",
      icon: FolderKanbanIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/claim-check",
    title: "Claim Check",
    description:
      "See risky public language, missing evidence, and the next reviewer action before approval.",
    group: "core",
    icon: ShieldAlertIcon,
    badge: claimCheckBadge,
    primaryAction: {
      label: "Send to approval",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/approval",
    title: "Approval",
    description:
      "Track who needs to sign off, what is blocking the queue, and how close each release is to publish-ready.",
    group: "core",
    icon: CheckCheckIcon,
    badge: approvalBadge,
    primaryAction: {
      label: "Prepare export",
      href: "/dashboard/publish-pack",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Decision log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/publish-pack",
    title: "Publish Pack",
    description:
      "Assemble channel-ready assets, export status, and the evidence summary required before publication.",
    group: "core",
    icon: PackageCheckIcon,
    badge: publishBadge,
    primaryAction: {
      label: "Open templates",
      href: "/dashboard/export-templates",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Evidence library",
      href: "/dashboard/evidence-library",
      icon: FolderKanbanIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/evidence-library",
    title: "Evidence Library",
    description:
      "Inspect synced sources, freshness risk, and which release records depend on each evidence block.",
    group: "asset",
    icon: FolderKanbanIcon,
    badge: evidenceBadge,
    primaryAction: {
      label: "Open intake queue",
      href: "/dashboard/release-context",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Search workspace",
      href: "/dashboard/search",
      icon: SearchIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/review-log",
    title: "Review Log",
    description:
      "Follow every wording change, approval decision, and publish block in one chronological audit trail.",
    group: "asset",
    icon: ArchiveIcon,
    badge: reviewLogBadge,
    primaryAction: {
      label: "Back to approval",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Get help",
      href: "/dashboard/help",
      icon: CircleHelpIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/export-templates",
    title: "Export Templates",
    description:
      "Manage channel-specific export structures so every publish pack stays consistent and reviewable.",
    group: "asset",
    icon: PackageCheckIcon,
    badge: templateBadge,
    primaryAction: {
      label: "Go to publish pack",
      href: "/dashboard/publish-pack",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open settings",
      href: "/dashboard/settings",
      icon: Settings2Icon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/settings",
    title: "Settings",
    description:
      "Define review policy, notification defaults, and export rules for this release communication workspace.",
    group: "utility",
    icon: Settings2Icon,
    primaryAction: {
      label: "Open templates",
      href: "/dashboard/export-templates",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Help center",
      href: "/dashboard/help",
      icon: CircleHelpIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/search",
    title: "Search",
    description:
      "Search release records, claims, evidence, approvals, and templates from one command-style workspace.",
    group: "utility",
    icon: SearchIcon,
    primaryAction: {
      label: "Open release context",
      href: "/dashboard/release-context",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Evidence library",
      href: "/dashboard/evidence-library",
      icon: FolderKanbanIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/help",
    title: "Help Center",
    sidebarTitle: "Get Help",
    description:
      "Follow the release workflow, see known limits, and route blocked questions to the right owner fast.",
    group: "utility",
    icon: CircleHelpIcon,
    primaryAction: {
      label: "Run claim check",
      href: "/dashboard/claim-check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open settings",
      href: "/dashboard/settings",
      icon: Settings2Icon,
      variant: "secondary",
    },
  },
]

export const coreRoutes = dashboardRoutes.filter(
  (route) => route.group === "core" && route.showInSidebar !== false
)
export const assetRoutes = dashboardRoutes.filter(
  (route) => route.group === "asset" && route.showInSidebar !== false
)
export const utilityRoutes = dashboardRoutes.filter(
  (route) => route.group === "utility" && route.showInSidebar !== false
)

export function getDashboardRoute(pathname: string | null | undefined) {
  return (
    dashboardRoutes.find((route) => route.href === pathname) ??
    dashboardRoutes[0]
  )
}
