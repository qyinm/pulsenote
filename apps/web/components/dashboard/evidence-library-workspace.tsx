"use client"

import Link from "next/link"
import { startTransition, useDeferredValue, useMemo, useState } from "react"
import { ArrowUpRightIcon, Link2Icon, SearchIcon } from "lucide-react"

import type { EvidenceLibraryEntry } from "@/lib/evidence-library"
import { EvidenceFreshnessBadge } from "@/components/dashboard/status-badges"
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
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type EvidenceView = "all" | "stale" | "watch" | "linked"

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatTimestamp(value: string) {
  return `${timestampFormatter.format(new Date(value))} UTC`
}

function matchesView(entry: EvidenceLibraryEntry, view: EvidenceView) {
  if (view === "stale") {
    return entry.freshness === "Stale"
  }

  if (view === "watch") {
    return entry.freshness === "Watch"
  }

  if (view === "linked") {
    return entry.linkedReleaseCount >= 2
  }

  return true
}

function buildEvidenceSearchText(entry: EvidenceLibraryEntry) {
  return [
    entry.title,
    entry.note,
    entry.providerLabel,
    entry.sourceTypeLabel,
    entry.sourceRef,
    ...entry.linkedReleases.map((release) => release.title),
    ...entry.reviewNotes,
  ]
    .join(" ")
    .toLowerCase()
}

function emptyCopy(view: EvidenceView) {
  if (view === "stale") {
    return {
      description:
        "Sources with missing, unsupported, or fully stale proof will appear here once real release evidence is linked.",
      title: "No stale evidence",
    }
  }

  if (view === "watch") {
    return {
      description:
        "Watch-state sources will appear here when evidence is usable but should be reconfirmed before approval closes.",
      title: "No watch-state evidence",
    }
  }

  if (view === "linked") {
    return {
      description:
        "High-reuse sources will appear here when one proof bundle is linked across multiple release records.",
      title: "No reused evidence",
    }
  }

  return {
    description:
      "Release evidence will appear here once source blocks are attached to live release records in this workspace.",
    title: "No evidence sources yet",
  }
}

export function EvidenceLibraryWorkspace({
  initialEntries,
}: {
  initialEntries: EvidenceLibraryEntry[]
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<EvidenceView>("all")
  const [selectedId, setSelectedId] = useState(initialEntries[0]?.id ?? "")
  const deferredQuery = useDeferredValue(query)

  const filteredItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    return initialEntries.filter((entry) => {
      if (!matchesView(entry, view)) {
        return false
      }

      if (!normalized) {
        return true
      }

      return buildEvidenceSearchText(entry).includes(normalized)
    })
  }, [deferredQuery, initialEntries, view])

  const selectedItem =
    filteredItems.find((entry) => entry.id === selectedId) ?? filteredItems[0] ?? null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <div className="grid gap-4">
        <SurfaceCard
          title="Evidence workspace"
          description="Search by source, type, or linked release and keep the proof that changes review outcomes visible."
          action={<Badge variant="outline">{filteredItems.length} visible</Badge>}
        >
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="evidence-search">Find evidence</Label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="evidence-search"
                    value={query}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      startTransition(() => {
                        setQuery(nextValue)
                      })
                    }}
                    placeholder="Search sources, refs, or linked releases"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium text-foreground">View</span>
                <ToggleGroup
                  multiple={false}
                  value={[view]}
                  onValueChange={(value) => {
                    const nextValue = (value[0] as EvidenceView | undefined) ?? "all"
                    setView(nextValue)
                  }}
                  variant="outline"
                  size="sm"
                  spacing={1}
                  className="flex-wrap"
                >
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="stale">Stale</ToggleGroupItem>
                  <ToggleGroupItem value="watch">Watch</ToggleGroupItem>
                  <ToggleGroupItem value="linked">High reuse</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {selectedItem ? (
              <div className="grid gap-3">
                {filteredItems.map((entry) => {
                  const isSelected = entry.id === selectedItem.id

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
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {entry.title}
                            </span>
                            <EvidenceFreshnessBadge freshness={entry.freshness} />
                            <Badge variant="outline">{entry.sourceTypeLabel}</Badge>
                            <Badge variant="outline">{entry.providerLabel}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.note}</p>
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground lg:text-right">
                          <span>{entry.sourceRef}</span>
                          <span>{formatTimestamp(entry.updatedAt)}</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{entry.linkedReleaseCount} linked releases</span>
                        <span>{entry.captureTrail.length} captures</span>
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
        {selectedItem ? (
          <>
            <SurfaceCard
              title="Selected evidence"
              description="Inspect the current proof bundle before a claim is drafted, revised, or approved."
              action={<EvidenceFreshnessBadge freshness={selectedItem.freshness} />}
            >
              <InlineList
                items={[
                  { label: "Provider", value: selectedItem.providerLabel },
                  { label: "Type", value: selectedItem.sourceTypeLabel },
                  { label: "Source ref", value: selectedItem.sourceRef },
                  { label: "Latest capture", value: formatTimestamp(selectedItem.updatedAt) },
                  { label: "Linked releases", value: String(selectedItem.linkedReleaseCount) },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Linked release coverage"
              description="These release records currently depend on the selected proof bundle."
              footer={
                <div className="flex w-full flex-wrap gap-2">
                  <Link
                    href="/dashboard/review-log"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <Link2Icon data-icon="inline-start" />
                    Open review log
                  </Link>
                  <Link
                    href="/dashboard/release-context"
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    <ArrowUpRightIcon data-icon="inline-start" />
                    Open release context
                  </Link>
                </div>
              }
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {selectedItem.linkedReleases.map((release) => (
                    <Badge key={release.id} variant="secondary">
                      {release.title} · {release.stageLabel} · {release.readiness}
                    </Badge>
                  ))}
                </div>
                <BulletList items={selectedItem.nextChecks} />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Review notes"
              description="Linked review notes stay visible so evidence and approval responsibility remain inspectable."
            >
              <BulletList items={selectedItem.reviewNotes} />
            </SurfaceCard>

            <SurfaceCard
              title="Capture trail"
              description="The latest capture sequence for this evidence source across linked release records."
            >
              <BulletList items={selectedItem.captureTrail} />
            </SurfaceCard>
          </>
        ) : (
          <EmptyState
            title="Select a source"
            description="Choose a source from the catalog to inspect its linked releases, review notes, and capture trail."
          />
        )}

        <SurfaceCard
          title="Evidence operating rules"
          description="Keep proof visible and current so the release workflow stays reviewable."
        >
          <BulletList
            items={[
              "Treat stale evidence as a blocker when it affects scope, availability, or plan coverage.",
              "Prefer reused sources only when every linked release still matches the same captured scope.",
              "Keep evidence visible beside the linked release records so reviewers can trace wording back to proof.",
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  )
}
