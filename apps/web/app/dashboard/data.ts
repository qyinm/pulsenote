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
