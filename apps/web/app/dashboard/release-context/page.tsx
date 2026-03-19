"use client"

import { useState } from "react"
import {
  FileStackIcon,
  RefreshCcwIcon,
  ShieldAlertIcon,
  StampIcon,
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
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Badge } from "@/components/ui/badge"
import {
  releaseContextActivities,
  releaseContextQueue,
} from "@/lib/dashboard"

function readinessBadge(readiness: (typeof releaseContextQueue)[number]["readiness"]) {
  if (readiness === "At risk") {
    return <Badge variant="destructive">{readiness}</Badge>
  }

  if (readiness === "Needs review") {
    return <Badge variant="secondary">{readiness}</Badge>
  }

  return <Badge variant="outline">{readiness}</Badge>
}

export default function ReleaseContextPage() {
  const [selectedId, setSelectedId] = useState(releaseContextQueue[0]?.id ?? "")

  if (releaseContextQueue.length === 0) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="No release context in queue"
          description="New release context will appear here as evidence is ingested."
        />
      </DashboardPage>
    )
  }

  const selected =
    releaseContextQueue.find((item) => item.id === selectedId) ?? releaseContextQueue[0]
  const totalEvidence = releaseContextQueue.reduce(
    (sum, item) => sum + item.evidenceCount,
    0
  )

  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Intake queue"
          value={String(releaseContextQueue.length)}
          detail="5 active release records"
          description="Every record still maps back to concrete source evidence before drafting."
          badge="Today"
          icon={FileStackIcon}
        />
        <MetricCard
          title="Average coverage"
          value="88%"
          detail="2 records need tighter scope"
          description="Coverage reflects source completeness across specs, issues, and support notes."
          badge="Evidence first"
          icon={StampIcon}
        />
        <MetricCard
          title="Evidence links"
          value={String(totalEvidence)}
          detail="Attached across active records"
          description="Higher link density keeps every claim traceable when draft copy moves forward."
          icon={RefreshCcwIcon}
        />
        <MetricCard
          title="Context at risk"
          value={String(
            releaseContextQueue.filter((item) => item.readiness === "At risk").length
          )}
          detail="Requires scope correction"
          description="Records at risk should not move into drafting until the source wording is narrowed."
          badge="Safety first"
          icon={ShieldAlertIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <SurfaceCard
              title="Source intake queue"
              description="Check the coverage, freshness, and blocker state for every incoming release record."
              action={<Badge variant="outline">Sample data</Badge>}
            >
              <SimpleTable
                columns={[
                  { key: "release", label: "Release" },
                  { key: "sourceType", label: "Source type" },
                  { key: "coverage", label: "Coverage" },
                  { key: "evidence", label: "Evidence links" },
                  { key: "freshness", label: "Freshness" },
                  { key: "readiness", label: "Readiness" },
                ]}
                rows={releaseContextQueue.map((item) => ({
                  key: item.id,
                  cells: {
                    release: (
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{item.release}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.blockers}
                        </span>
                      </div>
                    ),
                    sourceType: item.sourceType,
                    coverage: item.coverage,
                    evidence: item.evidenceCount,
                    freshness: item.freshness,
                    readiness: readinessBadge(item.readiness),
                  },
                }))}
                selectedRowKey={selected.id}
                onRowSelect={setSelectedId}
                emptyTitle="No release context in queue"
                emptyDescription="New release context will appear here as evidence is ingested."
              />
            </SurfaceCard>

            <SurfaceCard
              title="Recent ingest activity"
              description="The latest evidence and source updates that changed draft readiness."
            >
              <BulletList items={releaseContextActivities} />
            </SurfaceCard>
          </>
        }
        aside={
          <>
            <SurfaceCard
              title="Selected release context"
              description="Use this side panel to inspect the currently highlighted release record."
            >
              <InlineList
                items={[
                  { label: "Release", value: selected.release },
                  { label: "Owner", value: selected.owner },
                  { label: "Source type", value: selected.sourceType },
                  { label: "Coverage", value: selected.coverage },
                  { label: "Freshness", value: selected.freshness },
                  { label: "Readiness", value: readinessBadge(selected.readiness) },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Draft handoff rules"
              description="PulseNote keeps handoff criteria explicit before any draft is considered ready."
            >
              <BulletList
                items={[
                  "Every customer-facing sentence must trace to a source in the current intake record.",
                  "Availability wording must reflect the actual rollout cohort, not a broader launch assumption.",
                  "Support guidance should already exist before workaround or migration steps are published.",
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
