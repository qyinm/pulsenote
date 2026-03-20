"use client"

import { useEffect, useState } from "react"
import {
  FileStackIcon,
  Link2Icon,
  ShieldAlertIcon,
  StampIcon,
} from "lucide-react"

import type { ReleaseRecordSnapshot } from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import {
  buildReleaseContextEvidenceNotes,
  buildReleaseContextMetrics,
  buildReleaseContextQueueItem,
  buildReleaseContextReviewNotes,
} from "@/lib/dashboard/release-context"
import {
  BulletList,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Badge } from "@/components/ui/badge"

type ReleaseContextLiveWorkspaceProps = {
  initialReleaseRecords: ReleaseRecordSnapshot[]
  initialSelectedId: string
  initialSelectedReleaseRecord: ReleaseRecordSnapshot
  workspaceId: string
}

function readinessBadge(readiness: ReturnType<typeof buildReleaseContextQueueItem>["readiness"]) {
  if (readiness === "At risk") {
    return <Badge variant="destructive">{readiness}</Badge>
  }

  if (readiness === "Needs review") {
    return <Badge variant="secondary">{readiness}</Badge>
  }

  return <Badge variant="outline">{readiness}</Badge>
}

export function ReleaseContextLiveWorkspace({
  initialReleaseRecords,
  initialSelectedId,
  initialSelectedReleaseRecord,
  workspaceId,
}: ReleaseContextLiveWorkspaceProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [detailById, setDetailById] = useState<Record<string, ReleaseRecordSnapshot>>({
    [initialSelectedId]: initialSelectedReleaseRecord,
  })
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const queueItems = initialReleaseRecords.map(buildReleaseContextQueueItem)
  const metrics = buildReleaseContextMetrics(initialReleaseRecords)
  const selectedReleaseRecord = detailById[selectedId] ?? null
  const selectedQueueItem =
    queueItems.find((queueItem) => queueItem.id === selectedId) ?? queueItems[0] ?? null

  useEffect(() => {
    if (!selectedId || detailById[selectedId]) {
      return
    }

    let isCancelled = false

    createApiClient()
      .getReleaseRecord(workspaceId, selectedId)
      .then((releaseRecord) => {
        if (isCancelled) {
          return
        }

        setDetailById((currentDetails) => ({
          ...currentDetails,
          [selectedId]: releaseRecord,
        }))
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setDetailError(error instanceof Error ? error.message : "Selected release record could not be loaded.")
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDetail(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [detailById, selectedId, workspaceId])

  const evidenceNotes = selectedReleaseRecord
    ? buildReleaseContextEvidenceNotes(selectedReleaseRecord)
    : ["Select a release record to inspect its evidence trace."]
  const reviewNotes = selectedReleaseRecord
    ? buildReleaseContextReviewNotes(selectedReleaseRecord)
    : ["Select a release record to inspect its review state."]
  const selectedReadiness = selectedQueueItem ? readinessBadge(selectedQueueItem.readiness) : "Unknown"
  const selectedStage = selectedQueueItem?.stageLabel ?? "Unknown"
  const selectedFreshness = selectedQueueItem?.freshness ?? "Unknown"

  return (
    <>
      <MetricGrid>
        <MetricCard
          title="Intake queue"
          value={String(metrics.recordsInQueue)}
          detail={`${metrics.recordsInQueue} release records`}
          description="Every release record stays attached to the workspace that owns the evidence and review trail."
          badge="Live API"
          icon={FileStackIcon}
        />
        <MetricCard
          title="Evidence links"
          value={String(metrics.totalEvidence)}
          detail="Attached across active records"
          description="Evidence blocks and source links stay explicit before any public wording moves forward."
          icon={Link2Icon}
        />
        <MetricCard
          title="Linked claims"
          value={String(metrics.linkedClaims)}
          detail="Claims already trace to concrete evidence"
          description="Linked claim coverage is the fastest signal that a draft is ready for release review."
          icon={StampIcon}
        />
        <MetricCard
          title="Context at risk"
          value={String(metrics.atRiskRecords)}
          detail="Still blocked by evidence or review state"
          description="At-risk records should not move into drafting until the blocker is narrowed and sourced."
          badge="Safety first"
          icon={ShieldAlertIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <SurfaceCard
              title="Source intake queue"
              description="Review stored release intake records with their real evidence coverage, readiness, and review state."
              action={<Badge variant="outline">Authenticated API</Badge>}
            >
              <SimpleTable
                columns={[
                  { key: "release", label: "Release" },
                  { key: "stage", label: "Stage" },
                  { key: "sources", label: "Sources" },
                  { key: "claims", label: "Claims" },
                  { key: "freshness", label: "Freshness" },
                  { key: "readiness", label: "Readiness" },
                ]}
                rows={queueItems.map((item) => ({
                  key: item.id,
                  cells: {
                    claims: (
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{item.claimSummary}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.evidenceCount} evidence links
                        </span>
                      </div>
                    ),
                    freshness: item.freshness,
                    readiness: readinessBadge(item.readiness),
                    release: (
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.summary}
                        </span>
                      </div>
                    ),
                    sources: item.sourceSummary,
                    stage: item.stageLabel,
                  },
                }))}
                selectedRowKey={selectedId}
                onRowSelect={(rowKey) => {
                  setSelectedId(rowKey)
                  setDetailError(null)
                  setIsLoadingDetail(!detailById[rowKey])
                }}
                emptyTitle="No release context in queue"
                emptyDescription="New release intake records will appear here as GitHub evidence is synced."
              />
            </SurfaceCard>

            <SurfaceCard
              title="Selected evidence trace"
              description="Inspect the concrete source trail that supports the highlighted release record."
            >
              <BulletList items={evidenceNotes} />
            </SurfaceCard>
          </>
        }
        aside={
          <>
            <SurfaceCard
              title="Selected release context"
              description="The highlighted release record resolves from the authenticated API and keeps its review state explicit."
            >
              <InlineList
                items={[
                  { label: "Release", value: selectedQueueItem?.title ?? "Unknown release" },
                  { label: "Stage", value: selectedStage },
                  {
                    label: "Compare range",
                    value: selectedReleaseRecord?.releaseRecord.compareRange ?? "No compare range",
                  },
                  {
                    label: "Claims",
                    value: selectedQueueItem?.claimSummary ?? "No claims yet",
                  },
                  {
                    label: "Freshness",
                    value: selectedFreshness,
                  },
                  { label: "Readiness", value: selectedReadiness },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Review state"
              description="Keep the blocker, reviewer note, and current evidence state visible before drafting."
            >
              {detailError ? (
                <p className="text-sm text-destructive">{detailError}</p>
              ) : isLoadingDetail ? (
                <p className="text-sm text-muted-foreground">
                  Loading the selected release record from the authenticated API.
                </p>
              ) : (
                <BulletList items={reviewNotes} />
              )}
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
    </>
  )
}
