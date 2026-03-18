"use client"

import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import {
  ArrowUpRightIcon,
  Link2Icon,
  SearchIcon,
} from "lucide-react"

import type { EvidenceItem } from "@/lib/dashboard"
import { evidenceItems } from "@/lib/dashboard"
import { EvidenceFreshnessBadge } from "@/components/dashboard/status-badges"
import { BulletList, EmptyState, InlineList, SurfaceCard } from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type EvidenceView = "all" | "stale" | "watch" | "linked"

type EvidenceDetail = {
  confidence: number
  linkedReleases: string[]
  reviewers: string[]
  syncEvents: string[]
  nextChecks: string[]
}

const evidenceDetails: Record<string, EvidenceDetail> = {
  "evidence-1": {
    confidence: 92,
    linkedReleases: ["SDK rollout v2.4", "Audit log filters"],
    reviewers: ["Mina Park", "Noah Lim"],
    syncEvents: [
      "10:48 KST: rollout cohort note synced from engineering spec.",
      "10:56 KST: fallback sentence linked to release note draft.",
      "11:04 KST: claim check cross-reference attached for staged availability wording.",
    ],
    nextChecks: [
      "Keep rollout cohort wording aligned with the next engineering update.",
      "Verify the fallback sentence still matches the install path before approval closes.",
    ],
  },
  "evidence-2": {
    confidence: 95,
    linkedReleases: ["Billing migration notes"],
    reviewers: ["Daniel Kim", "Support lead"],
    syncEvents: [
      "10:14 KST: support escalation contact refreshed.",
      "10:27 KST: invoice timing note attached to the customer email draft.",
    ],
    nextChecks: [
      "Confirm the final send window before export.",
      "Keep support contact details consistent with the latest macro set.",
    ],
  },
  "evidence-3": {
    confidence: 63,
    linkedReleases: ["SSO admin controls"],
    reviewers: ["Grace Lee", "Legal"],
    syncEvents: [
      "09:58 KST: legal note added to the release record.",
      "10:21 KST: availability sentence flagged for legal-safe rewrite.",
    ],
    nextChecks: [
      "Do not reuse this note until the final approval sentence lands.",
      "Keep eligibility wording narrow and cohort-specific.",
    ],
  },
  "evidence-4": {
    confidence: 68,
    linkedReleases: ["Incident follow-up fixes"],
    reviewers: ["Chris Han", "Support lead"],
    syncEvents: [
      "08:54 KST: remediation checklist pulled into draft context.",
      "09:22 KST: support workaround line still missing from the source bundle.",
    ],
    nextChecks: [
      "Attach the workaround block before this evidence is quoted publicly.",
      "Keep remediation claims specific to the timeout classes already fixed.",
    ],
  },
  "evidence-5": {
    confidence: 41,
    linkedReleases: ["Usage analytics export"],
    reviewers: ["Ivy Song", "Pricing lead"],
    syncEvents: [
      "Yesterday: plan coverage table last synced.",
      "09:46 KST: export claim reopened because the plan scope may be outdated.",
    ],
    nextChecks: [
      "Refresh the table before approval restarts.",
      "Avoid broad paid-plan language until the updated source is in place.",
    ],
  },
  "evidence-6": {
    confidence: 90,
    linkedReleases: ["Audit log filters", "SDK rollout v2.4"],
    reviewers: ["Noah Lim", "Mina Park"],
    syncEvents: [
      "10:37 KST: demo capture synced from the latest walkthrough.",
      "10:41 KST: supported filter combinations linked to the release note and help center block.",
    ],
    nextChecks: [
      "Keep screenshot steps aligned with the shipped UI.",
      "Confirm unsupported legacy events stay excluded from public wording.",
    ],
  },
}

function matchesView(item: EvidenceItem, view: EvidenceView) {
  if (view === "stale") {
    return item.freshness === "Stale"
  }

  if (view === "watch") {
    return item.freshness === "Watch"
  }

  if (view === "linked") {
    return item.linkedReleases >= 2
  }

  return true
}

export function EvidenceLibraryWorkspace() {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<EvidenceView>("all")
  const [selectedId, setSelectedId] = useState(evidenceItems[0]?.id ?? "")
  const deferredQuery = useDeferredValue(query)

  const filteredItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    return evidenceItems.filter((item) => {
      if (!matchesView(item, view)) {
        return false
      }

      if (!normalized) {
        return true
      }

      return [item.source, item.sourceType, item.tag, item.note, item.owner]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
  }, [deferredQuery, view])

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null

  const selectedDetail = selectedItem ? evidenceDetails[selectedItem.id] : null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <div className="grid gap-4">
        <SurfaceCard
          title="Evidence workspace"
          description="Search by source, tag, or owner and focus the catalog on the evidence that still changes review outcomes."
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
                    placeholder="Search sources, tags, or owners"
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
                {filteredItems.map((item) => {
                  const detail = evidenceDetails[item.id]
                  const isSelected = item.id === selectedItem.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
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
                              {item.source}
                            </span>
                            <EvidenceFreshnessBadge freshness={item.freshness} />
                            <Badge variant="outline">{item.tag}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.note}</p>
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground lg:text-right">
                          <span>{item.sourceType}</span>
                          <span>{item.lastSynced}</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{item.owner}</span>
                        <span>{item.linkedReleases} linked releases</span>
                        <span>{detail.confidence}% confidence</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="No evidence matched this view"
                description="Try a broader keyword or switch back to all sources to recover the full catalog."
              />
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4">
        {selectedItem && selectedDetail ? (
          <>
            <SurfaceCard
              title="Selected evidence"
              description="Inspect the current proof bundle before a claim is drafted, revised, or approved."
              action={<EvidenceFreshnessBadge freshness={selectedItem.freshness} />}
            >
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">Evidence confidence</span>
                    <span className="text-muted-foreground">
                      {selectedDetail.confidence}%
                    </span>
                  </div>
                  <Progress value={selectedDetail.confidence} />
                </div>
                <InlineList
                  items={[
                    { label: "Owner", value: selectedItem.owner },
                    { label: "Type", value: selectedItem.sourceType },
                    { label: "Tag", value: selectedItem.tag },
                    { label: "Last synced", value: selectedItem.lastSynced },
                    {
                      label: "Reviewers",
                      value: selectedDetail.reviewers.join(", "),
                    },
                  ]}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Linked release coverage"
              description="These release records currently depend on the selected source."
              footer={
                <div className="flex w-full flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Link2Icon data-icon="inline-start" />
                    Copy evidence link
                  </Button>
                  <Button variant="secondary" size="sm">
                    <ArrowUpRightIcon data-icon="inline-start" />
                    Open release record
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {selectedDetail.linkedReleases.map((release) => (
                    <Badge key={release} variant="secondary">
                      {release}
                    </Badge>
                  ))}
                </div>
                <BulletList items={selectedDetail.nextChecks} />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Sync trail"
              description="A short audit trail for the selected evidence source."
            >
              <BulletList items={selectedDetail.syncEvents} />
            </SurfaceCard>
          </>
        ) : (
          <EmptyState
            title="Select a source"
            description="Choose a source from the catalog to inspect its linked releases, review owners, and sync trail."
          />
        )}

        <SurfaceCard
          title="Evidence operating rules"
          description="Keep proof visible and current so the release workflow stays reviewable."
        >
          <BulletList
            items={[
              "Treat stale evidence as a blocker when it affects scope, availability, or plan coverage.",
              "Prefer high-reuse sources that already support multiple release records when wording must stay consistent.",
              "Keep reviewer ownership explicit so the next sync action is obvious before approval restarts.",
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  )
}
