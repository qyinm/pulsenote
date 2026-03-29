import { headers } from "next/headers"
import {
  FolderKanbanIcon,
  PackageCheckIcon,
  ShieldAlertIcon,
  WaypointsIcon,
} from "lucide-react"

import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import {
  DashboardPage,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { ExportFramesWorkspace } from "@/components/dashboard/export-frames-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerLiveExportFramesData } from "@/lib/export-frames"

export default async function ExportTemplatesPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let exportFramesData: Awaited<ReturnType<typeof getServerLiveExportFramesData>> | null = null
  let isUnavailable = false

  try {
    exportFramesData = await getServerLiveExportFramesData(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch {
    isUnavailable = true
    console.error("Failed to load export frames")
  }

  if (isUnavailable || !exportFramesData) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Export frames are unavailable"
          description="Live publish-pack handoff records could not be loaded right now."
        >
          <p className="text-sm text-muted-foreground">
            Try again after the current request completes or check back once the workspace data is available.
          </p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  const metrics = exportFramesData.metrics
  const priorityFrame = exportFramesData.priorityFrame

  return (
    <DashboardPage>
      {priorityFrame ? (
        <Alert variant={priorityFrame.state === "Needs review" ? "destructive" : "default"}>
          <AlertTitle>
            {priorityFrame.state === "Needs review"
              ? "Export readiness is still blocked by review work"
              : priorityFrame.state === "Ready to export"
                ? "At least one release is ready to freeze into a publish pack"
                : "Frozen publish packs remain visible as handoff records"}
          </AlertTitle>
          <AlertDescription>{priorityFrame.guardrails[0] ?? priorityFrame.summary}</AlertDescription>
        </Alert>
      ) : null}

      <MetricGrid>
        <MetricCard
          title="Export frames"
          value={String(metrics.framesInScope)}
          detail="Live release handoff scope"
          description="Each record here reflects the current publish-pack shape of a real release, not a reusable writing preset."
          badge="Live"
          icon={FolderKanbanIcon}
        />
        <MetricCard
          title="Needs review"
          value={String(metrics.needsReviewFrames)}
          detail="Blocked before export"
          description="These records still need evidence, claim-check cleanup, or approval handoff before they can freeze into a publish pack."
          icon={PackageCheckIcon}
        />
        <MetricCard
          title="Ready to export"
          value={String(metrics.readyFrames)}
          detail="Approved and waiting"
          description="These records can freeze into a publish pack without recomputing the reviewed wording."
          icon={WaypointsIcon}
        />
        <MetricCard
          title="Exported"
          value={String(metrics.exportedFrames)}
          detail="Frozen handoff records"
          description="Frozen publish packs stay visible so downstream publishing does not drift away from the approved release scope."
          icon={ShieldAlertIcon}
        />
      </MetricGrid>

      <ExportFramesWorkspace initialEntries={exportFramesData.entries} />
    </DashboardPage>
  )
}
