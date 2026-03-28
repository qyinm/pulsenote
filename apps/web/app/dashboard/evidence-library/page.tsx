import { headers } from "next/headers"
import {
  DatabaseZapIcon,
  FolderKanbanIcon,
  ShieldAlertIcon,
  WaypointsIcon,
} from "lucide-react"

import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { EvidenceLibraryWorkspace } from "@/components/dashboard/evidence-library-workspace"
import {
  DashboardPage,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerEvidenceLibraryData } from "@/lib/evidence-library"

export default async function EvidenceLibraryPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let evidenceData: Awaited<ReturnType<typeof getServerEvidenceLibraryData>> | null = null
  let errorMessage: string | null = null

  try {
    evidenceData = await getServerEvidenceLibraryData(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading evidence sources."
  }

  if (errorMessage) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Evidence library is unavailable"
          description="The authenticated API request failed before live evidence sources could be rendered."
        >
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  const metrics = evidenceData?.metrics ?? {
    freshSources: 0,
    linkedReleaseRecords: 0,
    staleSources: 0,
    totalSources: 0,
  }
  const priorityEntry = evidenceData?.priorityEntry ?? null

  return (
    <DashboardPage>
      {priorityEntry ? (
        <Alert variant={priorityEntry.freshness === "Stale" ? "destructive" : "default"}>
          <AlertTitle>
            {priorityEntry.freshness === "Stale"
              ? "Evidence freshness is affecting review velocity"
              : "Evidence should be reconfirmed before approval closes"}
          </AlertTitle>
          <AlertDescription>
            {priorityEntry.note}
          </AlertDescription>
        </Alert>
      ) : null}

      <MetricGrid>
        <MetricCard
          title="Evidence sources"
          value={String(metrics.totalSources)}
          detail="Live workspace catalog"
          description="Every draft claim should map back to one of these source records before it is approved."
          badge="Library"
          icon={FolderKanbanIcon}
        />
        <MetricCard
          title="Stale sources"
          value={String(metrics.staleSources)}
          detail="Need refresh before approval"
          description="Missing, unsupported, or stale proof stays visible before public wording moves forward."
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Linked release records"
          value={String(metrics.linkedReleaseRecords)}
          detail="Currently depend on evidence"
          description="Linked usage shows where one source change can affect multiple release records."
          icon={WaypointsIcon}
        />
        <MetricCard
          title="Fresh sources"
          value={String(metrics.freshSources)}
          detail="Ready to reuse"
          description="Fresh sources shorten approval loops because reviewers can inspect current proof immediately."
          icon={DatabaseZapIcon}
        />
      </MetricGrid>

      <EvidenceLibraryWorkspace initialEntries={evidenceData?.entries ?? []} />
    </DashboardPage>
  )
}
