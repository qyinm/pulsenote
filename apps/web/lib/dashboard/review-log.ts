import type { ReleaseWorkflowHistoryEntry } from "../api/client"
import { createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"

type ReviewLogApiClient = Pick<ReturnType<typeof createApiClient>, "listReleaseWorkflowHistory">

export type ReviewLogMetrics = {
  blockedEvents: number
  loggedDecisions: number
  reopenedItems: number
  signedOffEvents: number
}

export async function getServerReviewLogData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReviewLogApiClient = createApiClient(),
) {
  return apiClient.listReleaseWorkflowHistory(workspaceId, {
    headers: getForwardedAuthHeaders(requestHeaders),
  })
}

export function buildReviewLogMetrics(
  entries: ReleaseWorkflowHistoryEntry[],
): ReviewLogMetrics {
  let blockedEvents = 0
  let reopenedItems = 0
  let signedOffEvents = 0

  for (const entry of entries) {
    if (entry.outcome === "blocked") {
      blockedEvents += 1
    }

    if (entry.eventType === "draft_reopened") {
      reopenedItems += 1
    }

    if (entry.outcome === "signed_off") {
      signedOffEvents += 1
    }
  }

  return {
    blockedEvents,
    loggedDecisions: entries.length,
    reopenedItems,
    signedOffEvents,
  }
}
