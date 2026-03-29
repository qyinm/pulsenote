"use client"

import { useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  PackageCheckIcon,
  SearchIcon,
} from "lucide-react"

import type {
  LiveExportFrameEntry,
  LiveExportFrameState,
} from "@/lib/export-frames"
import {
  BulletList,
  EmptyState,
  InlineList,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ExportFrameView = "all" | "exported" | "needs_review" | "ready"

const exportFrameViews: Array<{ label: string; value: ExportFrameView }> = [
  { label: "All", value: "all" },
  { label: "Needs review", value: "needs_review" },
  { label: "Ready", value: "ready" },
  { label: "Exported", value: "exported" },
]

function renderStateBadge(state: LiveExportFrameState) {
  if (state === "Needs review") {
    return <Badge variant="destructive">{state}</Badge>
  }

  if (state === "Ready to export") {
    return <Badge variant="secondary">{state}</Badge>
  }

  return <Badge variant="outline">{state}</Badge>
}

function matchesView(entry: LiveExportFrameEntry, view: ExportFrameView) {
  switch (view) {
    case "needs_review":
      return entry.state === "Needs review"
    case "ready":
      return entry.state === "Ready to export"
    case "exported":
      return entry.state === "Exported"
    default:
      return true
  }
}

function filterEntries(entries: LiveExportFrameEntry[], view: ExportFrameView, query: string) {
  const normalized = query.trim().toLowerCase()

  return entries.filter((entry) => {
    if (!matchesView(entry, view)) {
      return false
    }

    if (!normalized) {
      return true
    }

    return [
      entry.title,
      entry.summary,
      entry.state,
      entry.stageLabel,
      entry.ownerLabel,
      entry.requestedByLabel,
      entry.lastActivityLabel,
      ...entry.guardrails,
      ...entry.frameContents,
      ...entry.recentActivity,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  })
}

function emptyCopy(view: ExportFrameView) {
  if (view === "needs_review") {
    return {
      description:
        "Blocked claim checks, missing reviewers, or incomplete evidence will appear here before export.",
      title: "No export blockers",
    }
  }

  if (view === "ready") {
    return {
      description:
        "Approved release records will appear here once they can freeze into a publish pack.",
      title: "Nothing is ready to export",
    }
  }

  if (view === "exported") {
    return {
      description:
        "Frozen publish packs will appear here after the approved draft is exported for handoff.",
      title: "No publish packs exported",
    }
  }

  return {
    description:
      "Live export frames will appear here as release records move toward publish-pack handoff.",
    title: "No export frames in scope",
  }
}

export function ExportFramesWorkspace({ initialEntries }: { initialEntries: LiveExportFrameEntry[] }) {
  const [view, setView] = useState<ExportFrameView>("all")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(initialEntries[0]?.id ?? "")
  const deferredQuery = useDeferredValue(query)

  const visibleByView = useMemo(
    () => ({
      all: filterEntries(initialEntries, "all", deferredQuery),
      exported: filterEntries(initialEntries, "exported", deferredQuery),
      needs_review: filterEntries(initialEntries, "needs_review", deferredQuery),
      ready: filterEntries(initialEntries, "ready", deferredQuery),
    }),
    [deferredQuery, initialEntries],
  )

  const currentEntries = visibleByView[view]
  const selectedEntry =
    currentEntries.find((entry) => entry.id === selectedId) ?? currentEntries[0] ?? null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
      <div className="grid gap-4">
        <SurfaceCard
          title="Export frame workspace"
          description="Inspect live release records the way a publish pack handoff will actually see them."
          action={<Badge variant="outline">{currentEntries.length} visible</Badge>}
        >
          <div className="grid gap-4">
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as ExportFrameView)}
              className="gap-3"
            >
              <TabsList variant="line" className="w-full justify-start">
                {exportFrameViews.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                    <Badge variant="secondary">{visibleByView[item.value].length}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid gap-2">
              <Label htmlFor="export-frame-search">Search export frames</Label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="export-frame-search"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder="Search release, reviewer, or export blocker"
                  className="pl-9"
                />
              </div>
            </div>

            {selectedEntry ? (
              <div className="grid gap-3 md:grid-cols-2">
                {currentEntries.map((entry) => {
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
                          : "border-border bg-card hover:border-foreground/15 hover:bg-muted/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <span className="text-sm font-medium text-foreground">
                            {entry.title}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {entry.summary}
                          </span>
                        </div>
                        {renderStateBadge(entry.state)}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{entry.stageLabel}</Badge>
                        <Badge variant="outline">{entry.draftLabel}</Badge>
                        <Badge variant="outline">{entry.evidenceCount} evidence</Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title={emptyCopy(view).title}
                description={emptyCopy(view).description}
              />
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4">
        {selectedEntry ? (
          <>
            <SurfaceCard
              title="Selected export frame"
              description="This is the live structure that will be handed off when the publish pack is frozen."
              action={renderStateBadge(selectedEntry.state)}
              footer={
                <div className="flex w-full flex-wrap gap-2">
                  <Link
                    href="/dashboard/publish-pack"
                    className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                  >
                    <PackageCheckIcon data-icon="inline-start" />
                    Open publish pack
                  </Link>
                  <Link
                    href="/dashboard/review-log"
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    <ArchiveIcon data-icon="inline-start" />
                    Open review log
                  </Link>
                </div>
              }
            >
              <InlineList
                items={[
                  { label: "Stage", value: selectedEntry.stageLabel },
                  { label: "Draft", value: selectedEntry.draftLabel },
                  { label: "Assigned reviewer", value: selectedEntry.ownerLabel },
                  { label: "Requested by", value: selectedEntry.requestedByLabel },
                  { label: "Evidence", value: String(selectedEntry.evidenceCount) },
                  { label: "Source links", value: String(selectedEntry.sourceLinkCount) },
                  { label: "Last activity", value: selectedEntry.lastActivityLabel },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Frame contents"
              description="Freeze only the wording and proof that is already visible in the workflow."
            >
              <BulletList items={selectedEntry.frameContents} />
            </SurfaceCard>

            <SurfaceCard
              title="Export guardrails"
              description="Keep the handoff explicit so nothing broadens beyond the reviewed release scope."
            >
              <BulletList items={selectedEntry.guardrails} />
            </SurfaceCard>

            <SurfaceCard
              title="Recent activity"
              description="These are the latest workflow decisions affecting this export frame."
            >
              <BulletList items={selectedEntry.recentActivity} />
            </SurfaceCard>
          </>
        ) : (
          <EmptyState
            title="No export frame selected"
            description="Choose a release from the workspace to inspect its current export handoff shape."
          />
        )}
      </div>
    </div>
  )
}
