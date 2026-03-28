"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import {
  FileStackIcon,
  Link2Icon,
  ShieldAlertIcon,
  StampIcon,
} from "lucide-react"

import type { GitHubConnection, ReleaseRecordSnapshot } from "@/lib/api/client"
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
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ReleaseContextLiveWorkspaceProps = {
  initialGitHubConnection: GitHubConnection | null
  initialGitHubInstallUrl: string | null
  initialReleaseRecords: ReleaseRecordSnapshot[]
  initialSelectedId: string | null
  initialSelectedReleaseRecord: ReleaseRecordSnapshot | null
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

function formatLastSyncedAt(value: string | null) {
  if (!value) {
    return "Not synced yet"
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function ReleaseContextLiveWorkspace({
  initialGitHubConnection,
  initialGitHubInstallUrl,
  initialReleaseRecords,
  initialSelectedId,
  initialSelectedReleaseRecord,
  workspaceId,
}: ReleaseContextLiveWorkspaceProps) {
  const [releaseRecords, setReleaseRecords] = useState(initialReleaseRecords)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  const [githubConnection, setGitHubConnection] = useState(initialGitHubConnection)
  const [syncMode, setSyncMode] = useState<"compare" | "release">("release")
  const [releaseTag, setReleaseTag] = useState("")
  const [compareBase, setCompareBase] = useState("main")
  const [compareHead, setCompareHead] = useState("")
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const selectedReleaseRecord =
    (selectedId
      ? releaseRecords.find((snapshot) => snapshot.releaseRecord.id === selectedId) ?? null
      : null) ??
    initialSelectedReleaseRecord
  const queueItems = releaseRecords.map(buildReleaseContextQueueItem)
  const metrics = buildReleaseContextMetrics(releaseRecords)
  const selectedQueueItem = selectedReleaseRecord
    ? buildReleaseContextQueueItem(selectedReleaseRecord)
    : (queueItems[0] ?? null)
  const evidenceNotes = selectedReleaseRecord
    ? buildReleaseContextEvidenceNotes(selectedReleaseRecord)
    : ["Run GitHub intake to create the first release record."]
  const reviewNotes = selectedReleaseRecord
    ? buildReleaseContextReviewNotes(selectedReleaseRecord)
    : ["Release review notes will appear once a synced record exists."]
  const selectedReadiness = selectedQueueItem ? readinessBadge(selectedQueueItem.readiness) : "Unknown"
  const selectedStage = selectedQueueItem?.stageLabel ?? "No stage yet"
  const selectedFreshness = selectedQueueItem?.freshness ?? "No evidence"

  async function refreshReleaseContext(preferredRecordId?: string) {
    const apiClient = createApiClient()
    const [nextReleaseRecords, nextGitHubConnection] = await Promise.all([
      apiClient.listReleaseRecords(workspaceId),
      apiClient.getGitHubConnection(workspaceId).catch(() => null),
    ])

    setReleaseRecords(nextReleaseRecords)
    setGitHubConnection(nextGitHubConnection)

    if (nextReleaseRecords.length === 0) {
      setSelectedId(null)
      return
    }

    const nextSelectedId =
      (preferredRecordId &&
      nextReleaseRecords.some((snapshot) => snapshot.releaseRecord.id === preferredRecordId)
        ? preferredRecordId
        : nextReleaseRecords[0]?.releaseRecord.id) ?? null

    setSelectedId(nextSelectedId)
  }

  async function handleReleaseSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!githubConnection) {
      setSyncError("Connect GitHub before running release intake.")
      return
    }

    if (!releaseTag.trim()) {
      setSyncError("A release tag is required.")
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    setSyncNotice(null)

    try {
      const apiClient = createApiClient()
      const result = await apiClient.syncGitHubRelease(workspaceId, {
        connectionId: githubConnection.connectionId,
        release: {
          tag: releaseTag.trim(),
        },
      })

      await refreshReleaseContext(result.releaseRecordId)
      setReleaseTag("")
      setSyncNotice(`Release ${result.release.tagName} was added to the intake queue.`)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "GitHub release intake failed.")
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleCompareSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!githubConnection) {
      setSyncError("Connect GitHub before running compare-range intake.")
      return
    }

    if (!compareBase.trim() || !compareHead.trim()) {
      setSyncError("Both compare.base and compare.head are required.")
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    setSyncNotice(null)

    try {
      const apiClient = createApiClient()
      const result = await apiClient.syncGitHubCompare(workspaceId, {
        compare: {
          base: compareBase.trim(),
          head: compareHead.trim(),
        },
        connectionId: githubConnection.connectionId,
      })

      await refreshReleaseContext(result.releaseRecordId)
      setSyncNotice(`Compare range ${compareBase.trim()}...${compareHead.trim()} was added to intake.`)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "GitHub compare intake failed.")
    } finally {
      setIsSyncing(false)
    }
  }

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

      <SurfaceCard
        title={githubConnection ? "Run release intake" : "Connect GitHub"}
        description={
          githubConnection
            ? "Sync a release tag or compare range into PulseNote so the intake queue stays attached to real GitHub evidence."
            : "Install the PulseNote GitHub App first so release intake can create reviewable release records from the selected repository."
        }
        action={
          githubConnection ? (
            <Badge variant="outline">
              {githubConnection.repositoryOwner}/{githubConnection.repositoryName}
            </Badge>
          ) : null
        }
      >
        {!githubConnection ? (
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              GitHub App install must complete before PulseNote can sync a release tag or compare range into this workspace.
            </p>
            {initialGitHubInstallUrl ? (
              <a
                href={initialGitHubInstallUrl}
                className={buttonVariants({ size: "sm" })}
              >
                Connect GitHub
              </a>
            ) : (
              <p className="text-sm text-destructive">GitHub App install is unavailable for this environment.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <InlineList
              items={[
                {
                  label: "Repository",
                  value: `${githubConnection.repositoryOwner}/${githubConnection.repositoryName}`,
                },
                {
                  label: "Last sync",
                  value: formatLastSyncedAt(githubConnection.lastSyncedAt),
                },
                {
                  label: "Connection",
                  value: githubConnection.status === "active" ? "Active" : "Disconnected",
                },
              ]}
            />

            <Tabs
              value={syncMode}
              onValueChange={(value) => setSyncMode(value as "compare" | "release")}
            >
              <TabsList>
                <TabsTrigger value="release">Release tag</TabsTrigger>
                <TabsTrigger value="compare">Compare range</TabsTrigger>
              </TabsList>

              <TabsContent value="release">
                <form className="grid gap-3" onSubmit={handleReleaseSync}>
                  <Input
                    value={releaseTag}
                    onChange={(event) => setReleaseTag(event.target.value)}
                    placeholder="v2.4.0"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className={buttonVariants({ size: "sm" })}
                    >
                      {isSyncing ? "Syncing..." : "Sync release tag"}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Use this when the shipped release already has a GitHub release or tag.
                    </p>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="compare">
                <form className="grid gap-3" onSubmit={handleCompareSync}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={compareBase}
                      onChange={(event) => setCompareBase(event.target.value)}
                      placeholder="main"
                    />
                    <Input
                      value={compareHead}
                      onChange={(event) => setCompareHead(event.target.value)}
                      placeholder="release/2026-03-28"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className={buttonVariants({ size: "sm" })}
                    >
                      {isSyncing ? "Syncing..." : "Sync compare range"}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Use this when the team shipped without a formal release tag.
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>

            {syncError ? <p className="text-sm text-destructive">{syncError}</p> : null}
            {syncNotice ? <p className="text-sm text-muted-foreground">{syncNotice}</p> : null}
          </div>
        )}
      </SurfaceCard>

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
                        <span className="text-xs text-muted-foreground">{item.summary}</span>
                      </div>
                    ),
                    sources: item.sourceSummary,
                    stage: item.stageLabel,
                  },
                }))}
                selectedRowKey={selectedId ?? undefined}
                onRowSelect={(rowKey) => {
                  setSelectedId(rowKey)
                }}
                emptyTitle="No release context in queue"
                emptyDescription="Run GitHub intake above to create the first reviewable release record."
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
              description="The highlighted release record keeps its review state explicit before drafting begins."
            >
              <InlineList
                items={[
                  { label: "Release", value: selectedQueueItem?.title ?? "No release selected" },
                  { label: "Stage", value: selectedStage },
                  {
                    label: "Compare range",
                    value: selectedReleaseRecord?.releaseRecord.compareRange ?? "No compare range",
                  },
                  {
                    label: "Claims",
                    value: selectedQueueItem?.claimSummary ?? "No claims yet",
                  },
                  { label: "Freshness", value: selectedFreshness },
                  { label: "Readiness", value: selectedReadiness },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Review state"
              description="Keep the blocker, reviewer note, and current evidence state visible before drafting."
            >
              <BulletList items={reviewNotes} />
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
