"use client"

import { startTransition, useDeferredValue, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  ArchiveIcon,
  FileStackIcon,
  FolderKanbanIcon,
  PackageCheckIcon,
  SearchIcon,
  ShieldAlertIcon,
  StampIcon,
} from "lucide-react"

import {
  approvalItems,
  claimCheckItems,
  evidenceItems,
  publishAssets,
} from "@/lib/dashboard"
import { BulletList, EmptyState, InlineList } from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type InboxView = "all" | "claims" | "approvals" | "signals"
type InboxSource = "claim" | "approval" | "evidence" | "publish"

type InboxQueueItem = {
  id: string
  source: InboxSource
  title: string
  lane: string
  status: string
  owner: string
  timeLabel: string
  preview: string
  meta: string
  routeHref: string
  routeLabel: string
  routeIcon: LucideIcon
  secondaryHref: string
  secondaryLabel: string
  secondaryIcon: LucideIcon
  overview: string[]
  evidence: string[]
  nextActions: string[]
}

const blockedClaims = claimCheckItems
  .filter((item) => item.severity === "High" || item.evidenceState === "Missing source")
  .map<InboxQueueItem>((item) => ({
    id: item.id,
    source: "claim",
    title: item.release,
    lane: "Claim review",
    status: item.severity,
    owner: item.reviewer,
    timeLabel: item.evidenceState,
    preview: item.claim,
    meta: `${item.severity} severity · ${item.reviewer}`,
    routeHref: "/dashboard/claim-check",
    routeLabel: "Open claim check",
    routeIcon: ShieldAlertIcon,
    secondaryHref: "/dashboard/evidence-library",
    secondaryLabel: "View evidence",
    secondaryIcon: FolderKanbanIcon,
    overview: [
      `Public wording currently says: ${item.claim}`,
      `This record is still in ${item.severity.toLowerCase()}-tension review because the supporting proof is not stable enough for approval.`,
    ],
    evidence: [
      `Evidence state: ${item.evidenceState}`,
      "Keep the claim visible until the exact scope, availability, or plan language is proven by source material.",
    ],
    nextActions: [
      item.nextStep,
      "Return the release to approval only after the customer-facing sentence and source proof match exactly.",
    ],
  }))

const pendingApprovals = approvalItems
  .filter((item) => item.status !== "Signed off")
  .map<InboxQueueItem>((item) => ({
    id: item.id,
    source: "approval",
    title: item.release,
    lane: item.stage,
    status: item.status,
    owner: item.owner,
    timeLabel: item.dueAt,
    preview: item.note,
    meta: `${item.status} · ${item.owner}`,
    routeHref: "/dashboard/approval",
    routeLabel: "Open approval",
    routeIcon: StampIcon,
    secondaryHref: "/dashboard/review-log",
    secondaryLabel: "Decision log",
    secondaryIcon: ArchiveIcon,
    overview: [
      `This record is currently in ${item.stage.toLowerCase()} and still needs explicit human sign-off.`,
      item.note,
    ],
    evidence: [
      `Due window: ${item.dueAt}`,
      "Approval should only close once the reviewer leaves a visible decision that can be audited later.",
    ],
    nextActions: [
      "Keep the release in the approval queue until the blocking reviewer confirms the final wording.",
      "If the issue is really a scope or claim problem, route it back to claim check instead of forcing sign-off.",
    ],
  }))

const evidenceSignals = evidenceItems
  .filter((item) => item.freshness !== "Fresh")
  .map<InboxQueueItem>((item) => ({
    id: item.id,
    source: "evidence",
    title: item.source,
    lane: "Evidence watch",
    status: item.freshness,
    owner: item.owner,
    timeLabel: item.lastSynced,
    preview: item.note,
    meta: `${item.freshness} · ${item.sourceType}`,
    routeHref: "/dashboard/evidence-library",
    routeLabel: "Open evidence",
    routeIcon: FolderKanbanIcon,
    secondaryHref: "/dashboard/release-context",
    secondaryLabel: "Open intake",
    secondaryIcon: FileStackIcon,
    overview: [
      `${item.sourceType} evidence is no longer in a fully fresh state for active release work.`,
      item.note,
    ],
    evidence: [
      `Linked releases: ${item.linkedReleases}`,
      `Tag: ${item.tag}`,
    ],
    nextActions: [
      "Refresh or reconfirm this source before related claims move further into approval.",
      "Use release context to verify which release records are still depending on this evidence block.",
    ],
  }))

const publishSignals = publishAssets
  .filter((item) => item.status !== "Ready")
  .map<InboxQueueItem>((item) => ({
    id: item.id,
    source: "publish",
    title: item.asset,
    lane: "Export blocker",
    status: item.status,
    owner: item.owner,
    timeLabel: item.lastUpdated,
    preview: item.note,
    meta: `${item.status} · ${item.channel}`,
    routeHref: "/dashboard/publish-pack",
    routeLabel: "Open publish pack",
    routeIcon: PackageCheckIcon,
    secondaryHref: "/dashboard/export-templates",
    secondaryLabel: "Open templates",
    secondaryIcon: PackageCheckIcon,
    overview: [
      `${item.channel} output is not yet ready for release export.`,
      item.note,
    ],
    evidence: [
      `Owner: ${item.owner}`,
      "Treat unfinished export assets as a real publish risk, not as a cosmetic cleanup item.",
    ],
    nextActions: [
      "Resolve the blocker before the publish window tightens around final sign-off.",
      "If the problem is structural, check the export template instead of rewriting the asset ad hoc.",
    ],
  }))

const inboxQueueItems = [
  ...blockedClaims,
  ...pendingApprovals,
  ...evidenceSignals,
  ...publishSignals,
]

const inboxViews: Array<{ value: InboxView; label: string }> = [
  { value: "all", label: "All" },
  { value: "claims", label: "Claims" },
  { value: "approvals", label: "Approvals" },
  { value: "signals", label: "Signals" },
]

const sourceIcons: Record<InboxSource, LucideIcon> = {
  claim: ShieldAlertIcon,
  approval: StampIcon,
  evidence: FolderKanbanIcon,
  publish: PackageCheckIcon,
}

function filterItems(view: InboxView, query: string) {
  const normalized = query.trim().toLowerCase()

  return inboxQueueItems.filter((item) => {
    const matchesView =
      view === "all"
        ? true
        : view === "claims"
          ? item.source === "claim"
          : view === "approvals"
            ? item.source === "approval"
            : item.source === "evidence" || item.source === "publish"

    if (!matchesView) {
      return false
    }

    if (!normalized) {
      return true
    }

    return [
      item.title,
      item.lane,
      item.status,
      item.owner,
      item.preview,
      item.meta,
      item.timeLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  })
}

function stateBadge(item: InboxQueueItem) {
  if (item.status === "High" || item.status === "Blocked" || item.status === "Stale") {
    return <Badge variant="destructive">{item.status}</Badge>
  }

  if (
    item.status === "Pending" ||
    item.status === "In review" ||
    item.status === "Medium" ||
    item.status === "Watch" ||
    item.status === "Needs work"
  ) {
    return <Badge variant="secondary">{item.status}</Badge>
  }

  return <Badge variant="outline">{item.status}</Badge>
}

function emptyCopy(view: InboxView) {
  if (view === "claims") {
    return {
      title: "No blocked claims",
      description:
        "High-risk wording will appear here when a release still needs evidence or scope correction.",
    }
  }

  if (view === "approvals") {
    return {
      title: "No pending approvals",
      description:
        "Approval work will appear here when a release is waiting for a human sign-off step.",
    }
  }

  if (view === "signals") {
    return {
      title: "No operational signals",
      description:
        "Evidence freshness issues and export blockers will appear here when they affect the queue.",
    }
  }

  return {
    title: "Inbox is clear",
    description:
      "Blocked claims, pending approvals, and workflow pressure will appear here as the queue changes.",
  }
}

export function ReviewInboxWorkspace() {
  const [view, setView] = useState<InboxView>("all")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(inboxQueueItems[0]?.id ?? "")
  const deferredQuery = useDeferredValue(query)

  const visibleByView = useMemo(
    () => ({
      all: filterItems("all", deferredQuery),
      claims: filterItems("claims", deferredQuery),
      approvals: filterItems("approvals", deferredQuery),
      signals: filterItems("signals", deferredQuery),
    }),
    [deferredQuery]
  )

  const currentItems = visibleByView[view]
  const selectedItem =
    currentItems.find((item) => item.id === selectedId) ?? currentItems[0] ?? null

  return (
    <div className="grid h-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:grid-cols-[25rem_minmax(0,1fr)]">
      <aside className="flex h-full min-h-0 flex-col border-b border-border/70 bg-muted/10 lg:border-r lg:border-b-0">
        <div className="grid gap-4 border-b border-border/70 px-4 py-4">
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-foreground">Inbox queue</h2>
              <Badge variant="outline">{currentItems.length}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep blocked claims, approvals, and publish pressure visible in one
              operational list.
            </p>
          </div>

          <Tabs
            value={view}
            onValueChange={(value) => setView(value as InboxView)}
            className="gap-3"
          >
            <TabsList variant="line" className="w-full justify-start">
              {inboxViews.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                  <Badge variant="secondary">{visibleByView[item.value].length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-2">
            <Label htmlFor="review-inbox-search">Search queue</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="review-inbox-search"
                value={query}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value
                  startTransition(() => {
                    setQuery(nextValue)
                  })
                }}
                placeholder="Search release, owner, or review note"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {currentItems.length ? (
            <div className="grid gap-0">
              {currentItems.map((item) => (
                <InboxListRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title={emptyCopy(view).title}
                description={emptyCopy(view).description}
              />
            </div>
          )}
        </div>
      </aside>

      <main className="flex h-full min-h-0 flex-col bg-background">
        {selectedItem ? (
          <>
            <div className="border-b border-border/70 px-5 py-5 lg:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedItem.lane}</Badge>
                    {stateBadge(selectedItem)}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    {selectedItem.title}
                  </h2>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                    {selectedItem.preview}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={selectedItem.routeHref}
                    className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                  >
                    <selectedItem.routeIcon data-icon="inline-start" />
                    {selectedItem.routeLabel}
                  </Link>
                  <Link
                    href={selectedItem.secondaryHref}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <selectedItem.secondaryIcon data-icon="inline-start" />
                    {selectedItem.secondaryLabel}
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <MetaPill label="Owner" value={selectedItem.owner} />
                <MetaPill label="Queue" value={selectedItem.lane} />
                <MetaPill label="Status" value={selectedItem.status} />
                <MetaPill label="Updated" value={selectedItem.timeLabel} />
              </div>
            </div>

            <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="min-h-0 overflow-y-auto px-5 py-5 lg:px-6">
                <div className="grid gap-4">
                  <DetailCard
                    title="Overview"
                    description="What is currently true about this release record."
                  >
                    <BulletList items={selectedItem.overview} />
                  </DetailCard>

                  <DetailCard
                    title="Evidence and scope"
                    description="Why this item is still visible in the queue."
                  >
                    <BulletList items={selectedItem.evidence} />
                  </DetailCard>

                  <DetailCard
                    title="Next action"
                    description="What should happen before this item can move forward."
                  >
                    <BulletList items={selectedItem.nextActions} />
                  </DetailCard>
                </div>
              </div>

              <aside className="min-h-0 overflow-y-auto border-t border-border/70 bg-muted/10 px-5 py-5 xl:border-t-0 xl:border-l lg:px-6">
                <div className="grid gap-5">
                  <section className="grid gap-3">
                    <h3 className="text-sm font-medium text-foreground">Workflow position</h3>
                    <InlineList
                      items={[
                        { label: "Queue", value: selectedItem.lane },
                        { label: "Owner", value: selectedItem.owner },
                        { label: "Latest marker", value: selectedItem.timeLabel },
                      ]}
                    />
                  </section>

                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-sm font-medium text-foreground">Review before publish</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Keep this item reviewable in its native workflow surface instead
                      of resolving it through silent edits.
                    </p>
                  </div>

                  <section className="grid gap-3">
                    <h3 className="text-sm font-medium text-foreground">Related actions</h3>
                    <div className="grid gap-2">
                      <Link
                        href={selectedItem.routeHref}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "justify-start"
                        )}
                      >
                        <selectedItem.routeIcon data-icon="inline-start" />
                        {selectedItem.routeLabel}
                      </Link>
                      <Link
                        href={selectedItem.secondaryHref}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "justify-start"
                        )}
                      >
                        <selectedItem.secondaryIcon data-icon="inline-start" />
                        {selectedItem.secondaryLabel}
                      </Link>
                      <Link
                        href="/dashboard/review-log"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "justify-start"
                        )}
                      >
                        <ArchiveIcon data-icon="inline-start" />
                        Open review log
                      </Link>
                    </div>
                  </section>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No item selected"
              description="Choose an inbox record to inspect its release context and next review action."
            />
          </div>
        )}
      </main>
    </div>
  )
}

function InboxListRow({
  item,
  isSelected,
  onSelect,
}: {
  item: InboxQueueItem
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  const Icon = sourceIcons[item.source]

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(
        "cursor-pointer border-b border-border/70 px-4 py-4 text-left transition-colors duration-200 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isSelected ? "bg-background" : "bg-transparent hover:bg-background/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          <Icon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.lane}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{item.timeLabel}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {stateBadge(item)}
            <span className="text-xs text-muted-foreground">{item.owner}</span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.preview}
          </p>
        </div>
      </div>
    </button>
  )
}

function DetailCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4 shadow-xs">
      <div className="grid gap-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Separator className="my-4" />
      {children}
    </section>
  )
}

function MetaPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
      {label} · <span className="font-medium text-foreground">{value}</span>
    </span>
  )
}
