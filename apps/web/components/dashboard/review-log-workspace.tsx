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

import type { ReviewLogEntry } from "@/lib/dashboard"
import { reviewLogEntries } from "@/lib/dashboard"
import { BulletList, EmptyState, InlineList, SurfaceCard } from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type LogView = "all" | "blocked" | "signed-off" | "revisions"

type ReviewDetail = {
  linkedEvidence: string[]
  decisionContext: string[]
  nextOwners: string[]
}

const reviewDetails: Record<string, ReviewDetail> = {
  "log-1": {
    linkedEvidence: ["SSO eligibility review", "Release rollout note"],
    decisionContext: [
      "Legal required a narrower rollout sentence before the release could enter approval.",
      "The claim stayed visible in the queue instead of being silently rewritten later.",
    ],
    nextOwners: ["Grace Lee", "Legal"],
  },
  "log-2": {
    linkedEvidence: ["Billing migration support brief"],
    decisionContext: [
      "Support timing and escalation details are now fully backed by the current brief.",
      "This evidence attachment cleared the release for the next approval step.",
    ],
    nextOwners: ["Daniel Kim", "Support lead"],
  },
  "log-3": {
    linkedEvidence: ["SDK rollout spec excerpt"],
    decisionContext: [
      "The release wording was narrowed to the staged rollout already proven in source material.",
      "The claim remains in watch state until the next engineering update lands.",
    ],
    nextOwners: ["Mina Park", "PMM"],
  },
  "log-4": {
    linkedEvidence: ["Audit log filter walkthrough", "Support guidance note"],
    decisionContext: [
      "Support confirmed the public guidance matches the current product behavior.",
      "The signed-off state cleared the release for publish-pack assembly.",
    ],
    nextOwners: ["Noah Lim", "Support lead"],
  },
  "log-5": {
    linkedEvidence: ["Incident remediation checklist"],
    decisionContext: [
      "The revision request preserved the missing workaround context in the audit trail.",
      "Drafting cannot continue until the support path is linked to the record.",
    ],
    nextOwners: ["Chris Han", "Support lead"],
  },
}

function matchesLogView(entry: ReviewLogEntry, view: LogView) {
  if (view === "blocked") {
    return entry.outcome === "Blocked"
  }

  if (view === "signed-off") {
    return entry.outcome === "Signed off"
  }

  if (view === "revisions") {
    return entry.action === "Requested revision" || entry.action === "Reworded claim"
  }

  return true
}

function outcomeBadge(outcome: string) {
  if (outcome === "Blocked") {
    return <Badge variant="destructive">{outcome}</Badge>
  }

  if (outcome === "Signed off" || outcome === "Ready") {
    return <Badge variant="outline">{outcome}</Badge>
  }

  return <Badge variant="secondary">{outcome}</Badge>
}

export function ReviewLogWorkspace() {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<LogView>("all")
  const [selectedId, setSelectedId] = useState(reviewLogEntries[0]?.id ?? "")
  const deferredQuery = useDeferredValue(query)

  const filteredEntries = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    return reviewLogEntries.filter((entry) => {
      if (!matchesLogView(entry, view)) {
        return false
      }

      if (!normalized) {
        return true
      }

      return [entry.actor, entry.action, entry.entity, entry.outcome, entry.note]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
  }, [deferredQuery, view])

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null
  const selectedDetail = selectedEntry ? reviewDetails[selectedEntry.id] : null

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
                    placeholder="Search actor, release, outcome, or note"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Filter</span>
                <ToggleGroup
                  multiple={false}
                  value={view}
                  onValueChange={(value) => {
                    const nextValue = (value as LogView | null) ?? "all"
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
                              {entry.action}
                            </span>
                            {outcomeBadge(entry.outcome)}
                          </div>
                          <p className="text-sm text-foreground">{entry.entity}</p>
                          <p className="text-sm text-muted-foreground">{entry.note}</p>
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground lg:text-right">
                          <span>{entry.actor}</span>
                          <span>{entry.timestamp}</span>
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
        {selectedEntry && selectedDetail ? (
          <>
            <SurfaceCard
              title="Selected decision"
              description="A single audit event with its evidence context and next owner."
              action={outcomeBadge(selectedEntry.outcome)}
            >
              <div className="grid gap-4">
                <InlineList
                  items={[
                    { label: "Actor", value: selectedEntry.actor },
                    { label: "Action", value: selectedEntry.action },
                    { label: "Entity", value: selectedEntry.entity },
                    { label: "Timestamp", value: selectedEntry.timestamp },
                    {
                      label: "Next owners",
                      value: selectedDetail.nextOwners.join(", "),
                    },
                  ]}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Why this entry changed workflow state"
              description="The log keeps both the rationale and the release impact visible."
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {selectedDetail.linkedEvidence.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
                <BulletList items={selectedDetail.decisionContext} />
              </div>
            </SurfaceCard>
          </>
        ) : (
          <EmptyState
            title="Select an audit entry"
            description="Pick an item from the log to inspect its linked evidence and follow-up owners."
          />
        )}

        <SurfaceCard
          title="Saved review views"
          description="Use narrow views without losing the audit trail."
        >
          <div className="grid gap-3">
            {[
              {
                title: "Blocked this morning",
                meta: "Escalations requiring legal or scope review",
                icon: ShieldAlertIcon,
              },
              {
                title: "Signed off today",
                meta: "Ready-to-export records with explicit decision history",
                icon: StampIcon,
              },
              {
                title: "Recent revisions",
                meta: "Wording changes made before approval restarts",
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
