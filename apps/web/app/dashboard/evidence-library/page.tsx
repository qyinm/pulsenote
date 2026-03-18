import {
  DatabaseZapIcon,
  FolderKanbanIcon,
  ShieldAlertIcon,
  WaypointsIcon,
} from "lucide-react"

import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { EvidenceFreshnessBadge } from "@/components/dashboard/status-badges"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { evidenceItems } from "@/lib/dashboard"

export default function EvidenceLibraryPage() {
  const staleItem = evidenceItems.find((item) => item.freshness === "Stale") ?? evidenceItems[0]

  return (
    <DashboardPage>
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

      <DashboardSplit
        main={
          <>
            <SurfaceCard
              title="Filter library"
              description="Use short queries and tags to narrow the evidence catalog fast."
            >
              <div className="grid gap-3">
                <Input
                  defaultValue="availability"
                  aria-label="Filter evidence library"
                />
                <div className="flex flex-wrap gap-2">
                  {["Availability", "Plan coverage", "How-to", "Eligibility"].map((tag) => (
                    <Badge key={tag} variant={tag === "Availability" ? "secondary" : "outline"}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Evidence catalog"
              description="Inspect freshness, release usage, and owner before a source is reused in public copy."
            >
              <SimpleTable
                columns={[
                  { key: "source", label: "Source" },
                  { key: "type", label: "Type" },
                  { key: "freshness", label: "Freshness" },
                  { key: "linked", label: "Linked releases" },
                  { key: "owner", label: "Owner" },
                  { key: "synced", label: "Last synced" },
                ]}
                rows={evidenceItems.map((item) => ({
                  key: item.id,
                  cells: {
                    source: (
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">{item.note}</span>
                      </div>
                    ),
                    type: item.sourceType,
                    freshness: <EvidenceFreshnessBadge freshness={item.freshness} />,
                    linked: item.linkedReleases,
                    owner: item.owner,
                    synced: item.lastSynced,
                  },
                }))}
                emptyTitle="No evidence sources"
                emptyDescription="The evidence library will populate as release context is ingested."
              />
            </SurfaceCard>
          </>
        }
        aside={
          <>
            <Alert variant="destructive">
              <AlertTitle>1 source is stale</AlertTitle>
              <AlertDescription>
                The pricing plan scope table should be refreshed before the analytics
                export claim moves into approval.
              </AlertDescription>
            </Alert>

            <SurfaceCard
              title="Selected evidence"
              description="Inspect the source the workflow depends on before reusing its wording."
            >
              <InlineList
                items={[
                  { label: "Source", value: staleItem.source },
                  { label: "Type", value: staleItem.sourceType },
                  { label: "Freshness", value: staleItem.freshness },
                  { label: "Owner", value: staleItem.owner },
                  { label: "Tag", value: staleItem.tag },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Library guidance"
              description="Evidence should help reviewers move faster, not make them hunt for the truth."
            >
              <BulletList
                items={[
                  "Update stale sources before they are quoted in customer-facing copy.",
                  "Tag evidence by outcome so release context can pull the right source faster.",
                  "Keep support and legal notes in the same library when they affect public scope.",
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
