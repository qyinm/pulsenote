import {
  DatabaseZapIcon,
  FolderKanbanIcon,
  ShieldAlertIcon,
  WaypointsIcon,
} from "lucide-react"

import {
  DashboardPage,
  MetricCard,
  MetricGrid,
} from "@/components/dashboard/surfaces"
import { EvidenceLibraryWorkspace } from "@/components/dashboard/evidence-library-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { evidenceItems } from "@/lib/dashboard"

export default function EvidenceLibraryPage() {
  return (
    <DashboardPage>
      <Alert variant="destructive">
        <AlertTitle>Evidence freshness is affecting review velocity</AlertTitle>
        <AlertDescription>
          The pricing plan scope table is still stale, so any claim about analytics
          export availability should stay blocked until the source is refreshed.
        </AlertDescription>
      </Alert>

      <MetricGrid>
        <MetricCard
          title="Evidence sources"
          value={String(evidenceItems.length)}
          detail="All visible to reviewers"
          description="Every draft claim should map back to one of these source records before it is approved."
          badge="Library"
          icon={FolderKanbanIcon}
        />
        <MetricCard
          title="Stale sources"
          value={String(
            evidenceItems.filter((item) => item.freshness === "Stale").length
          )}
          detail="Needs same-day refresh"
          description="Stale proof stays obvious so public claims do not inherit outdated scope or timing."
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Linked releases"
          value={String(
            evidenceItems.reduce((sum, item) => sum + item.linkedReleases, 0)
          )}
          detail="Across current records"
          description="Linked usage shows where a stale source could cascade into multiple release drafts."
          icon={WaypointsIcon}
        />
        <MetricCard
          title="Fresh syncs"
          value={String(
            evidenceItems.filter((item) => item.freshness === "Fresh").length
          )}
          detail="Safe to reuse"
          description="Fresh sources reduce approval loops because the evidence trail is already current."
          icon={DatabaseZapIcon}
        />
      </MetricGrid>

      <EvidenceLibraryWorkspace />
    </DashboardPage>
  )
}
