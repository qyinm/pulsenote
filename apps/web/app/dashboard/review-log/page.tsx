import { headers } from "next/headers"
import {
  ArchiveIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
} from "lucide-react"

import {
  DashboardPage,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { ReviewLogWorkspace } from "@/components/dashboard/review-log-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import {
  buildReviewLogMetrics,
  getServerReviewLogData,
} from "@/lib/dashboard/review-log"

export default async function ReviewLogPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let historyEntries: Awaited<ReturnType<typeof getServerReviewLogData>> = []
  let errorMessage: string | null = null

  try {
    historyEntries = await getServerReviewLogData(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Review history could not be loaded from the authenticated API."
  }

  if (errorMessage) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Review log is unavailable"
          description="The authenticated API request failed before the audit timeline could be rendered."
        >
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  const metrics = buildReviewLogMetrics(historyEntries)

  return (
    <DashboardPage>
      <Alert>
        <AlertTitle>Decision history should stay reviewable end to end</AlertTitle>
        <AlertDescription>
          Every blocked state, wording revision, and sign-off remains visible here so
          the final publish pack can be audited without reconstructing context from chat.
        </AlertDescription>
      </Alert>

      <MetricGrid>
        <MetricCard
          title="Logged decisions"
          value={String(metrics.loggedDecisions)}
          detail="Visible audit trail"
          description="Every review action remains visible so wording changes stay accountable."
          badge="History"
          icon={ArchiveIcon}
        />
        <MetricCard
          title="Reopened items"
          value={String(metrics.reopenedItems)}
          detail="Needs another pass"
          description="Reopened records stay explicit instead of silently disappearing from the queue."
          icon={RotateCcwIcon}
        />
        <MetricCard
          title="Signed off"
          value={String(metrics.signedOffEvents)}
          detail="Cleared for next step"
          description="Signed-off decisions keep their timestamp and reviewer context intact for later export."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Blocked events"
          value={String(metrics.blockedEvents)}
          detail="Requires another pass"
          description="Blocked claim checks and reopened drafts stay visible until the record is made reviewable again."
          icon={ShieldAlertIcon}
        />
      </MetricGrid>

      <ReviewLogWorkspace entries={historyEntries} />
    </DashboardPage>
  )
}
