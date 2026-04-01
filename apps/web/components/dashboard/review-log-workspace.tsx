"use client"

import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import {
  Clock3Icon,
  SearchIcon,
  ShieldAlertIcon,
  StampIcon,
} from "lucide-react"

import type { ReleaseWorkflowHistoryEntry } from "@/lib/api/client"
import { BulletList, EmptyState, InlineList, SurfaceCard } from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatUtcTimestamp } from "@/lib/format"
import { cn } from "@/lib/utils"

type LogView = "all" | "blocked" | "signed-off" | "revisions"

function matchesLogView(entry: ReleaseWorkflowHistoryEntry, view: LogView) {
  if (view === "blocked") {
    return entry.outcome === "blocked"
  }

  if (view === "signed-off") {
    return entry.outcome === "signed_off"
  }

  if (view === "revisions") {
    return entry.outcome === "revision" || entry.eventType === "draft_reopened"
  }

  return true
}

function outcomeLabel(outcome: ReleaseWorkflowHistoryEntry["outcome"]) {
  switch (outcome) {
    case "blocked":
      return "Blocked"
    case "progressed":
      return "Progressed"
    case "revision":
      return "Revision"
    case "signed_off":
      return "Signed off"
  }
}

function outcomeBadge(outcome: ReleaseWorkflowHistoryEntry["outcome"]) {
  const label = outcomeLabel(outcome)

  if (outcome === "blocked") {
    return <Badge variant="destructive">{label}</Badge>
  }

  if (outcome === "signed_off") {
    return <Badge variant="outline">{label}</Badge>
  }

  return <Badge variant="secondary">{label}</Badge>
}

function formatTimestamp(value: string) {
  return formatUtcTimestamp(value)
}

function formatStageLabel(stage: ReleaseWorkflowHistoryEntry["stage"]) {
  switch (stage) {
    case "review":
      return "Claim check"
    case "publish_pack":
      return "Publish pack"
    default:
      return stage.charAt(0).toUpperCase() + stage.slice(1)
  }
}

function buildDecisionContext(entry: ReleaseWorkflowHistoryEntry) {
  const context = [
    `${entry.eventLabel} moved the release through ${formatStageLabel(entry.stage).toLowerCase()} review.`,
    `${entry.evidenceCount} evidence blocks and ${entry.sourceLinkCount} source links stayed attached to this record.`,
  ]

  if (entry.publishPackExportId) {
    context.push(`Publish pack export ${entry.publishPackExportId} was frozen from this workflow step.`)
  }

  if (entry.note) {
    context.push(entry.note)
  }

  return context
}

export function ReviewLogWorkspace({
  entries,
}: {
  entries: ReleaseWorkflowHistoryEntry[]
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<LogView>("all")
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? "")
  const deferredQuery = useDeferredValue(query)

  const filteredEntries = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    return entries.filter((entry) => {
      if (!matchesLogView(entry, view)) {
        return false
      }

      if (!normalized) {
        return true
      }

      return [
        entry.actorName ?? "Unknown reviewer",
        entry.eventLabel,
        entry.note ?? "",
        entry.releaseTitle,
        formatStageLabel(entry.stage),
        outcomeLabel(entry.outcome),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
  }, [deferredQuery, entries, view])

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
      <div className="grid gap-4">
        <SurfaceCard
          title="Review log workspace"
          description="Filter by outcome or revision state, then inspect the exact audit trail that changed release readiness."
          action={<Badge variant="outline">{filteredEntries.length} entries</Badge>}
        >
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="review-search">Search review history</Label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="review-search"
                    value={query}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      startTransition(() => {
                        setQuery(nextValue)
                      })
                    }}
                    placeholder="Search reviewer, release, event, or note"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Filter</span>
                <ToggleGroup
                  multiple={false}
                  value={[view]}
                  onValueChange={(value) => {
                    const nextValue = (value[0] as LogView | undefined) ?? "all"
                    setView(nextValue)
                  }}
                  variant="outline"
                  size="sm"
                  spacing={1}
                  className="flex-wrap"
                >
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="blocked">Blocked</ToggleGroupItem>
                  <ToggleGroupItem value="signed-off">Signed off</ToggleGroupItem>
                  <ToggleGroupItem value="revisions">Revisions</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {selectedEntry ? (
              <div className="grid gap-3">
                {filteredEntries.map((entry) => {
                  const isSelected = entry.id === selectedEntry.id

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring/50",
                        isSelected
                          ? "border-foreground/20 bg-muted/40 shadow-xs"
                          : "border-border bg-card hover:border-foreground/15 hover:bg-muted/20"
                      )}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {entry.eventLabel}
                            </span>
                            {outcomeBadge(entry.outcome)}
                          </div>
                          <p className="text-sm text-foreground">{entry.releaseTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.note ?? "No reviewer note was stored for this event."}
                          </p>
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground lg:text-right">
                          <span>{entry.actorName ?? "Unknown reviewer"}</span>
                          <span>{formatTimestamp(entry.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="No audit entries matched this filter"
                description="Reset the current filter or search term to restore the full review timeline."
              />
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4">
        {selectedEntry ? (
          <>
            <SurfaceCard
              title="Selected decision"
              description="A single audit event with the release, draft, and evidence context that changed workflow state."
              action={outcomeBadge(selectedEntry.outcome)}
            >
              <div className="grid gap-4">
                <InlineList
                  items={[
                    {
                      label: "Actor",
                      value: selectedEntry.actorName ?? "Unknown reviewer",
                    },
                    { label: "Action", value: selectedEntry.eventLabel },
                    { label: "Release", value: selectedEntry.releaseTitle },
                    { label: "Stage", value: formatStageLabel(selectedEntry.stage) },
                    {
                      label: "Draft",
                      value:
                        selectedEntry.draftVersion === null
                          ? "No draft revision"
                          : `Draft v${selectedEntry.draftVersion}`,
                    },
                    {
                      label: "Timestamp",
                      value: formatTimestamp(selectedEntry.createdAt),
                    },
                  ]}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Why this entry changed workflow state"
              description="The audit log keeps both the release context and the human note visible."
            >
              <div className="grid gap-4">
                <InlineList
                  items={[
                    {
                      label: "Evidence blocks",
                      value: String(selectedEntry.evidenceCount),
                    },
                    {
                      label: "Source links",
                      value: String(selectedEntry.sourceLinkCount),
                    },
                    {
                      label: "Export",
                      value: selectedEntry.publishPackExportId ?? "Not exported at this step",
                    },
                  ]}
                />
                <BulletList items={buildDecisionContext(selectedEntry)} />
              </div>
            </SurfaceCard>
          </>
        ) : (
          <EmptyState
            title="No review history yet"
            description="Run draft, claim check, review, and publish-pack actions to build a visible audit trail."
          />
        )}

        <SurfaceCard
          title="Saved review views"
          description="Use narrow views without losing the audit trail."
        >
          <div className="grid gap-3">
            {[
              {
                title: "Blocked follow-up",
                meta: "Claim checks and reopened drafts that still need another pass",
                icon: ShieldAlertIcon,
              },
              {
                title: "Signed off",
                meta: "Approved or exported records with explicit decision history",
                icon: StampIcon,
              },
              {
                title: "Recent revisions",
                meta: "Draft creation and reopen events before review resumes",
                icon: Clock3Icon,
              },
            ].map((viewItem) => (
              <div
                key={viewItem.title}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3"
              >
                <viewItem.icon className="mt-0.5 text-muted-foreground" />
                <div className="grid gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {viewItem.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {viewItem.meta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
