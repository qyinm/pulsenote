import type { WorkspacePolicySettings } from "./api/client"

export function createDefaultWorkspacePolicySettings(
  workspaceId: string,
): WorkspacePolicySettings {
  const timestamp = new Date().toISOString()

  return {
    createdAt: timestamp,
    includeEvidenceLinksInExport: true,
    includeSourceLinksInExport: true,
    requireClaimCheckBeforeApproval: true,
    requireReviewerAssignment: true,
    showBlockedClaimsInInbox: true,
    showPendingApprovalsInInbox: true,
    showReopenedDraftsInInbox: true,
    updatedAt: timestamp,
    workspaceId,
  }
}
