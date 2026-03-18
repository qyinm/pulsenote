"use client"

import { useMemo, useState } from "react"
import {
  ArrowUpRightIcon,
  BookTemplateIcon,
} from "lucide-react"

import type { TemplateItem } from "@/lib/dashboard"
import { templateItems } from "@/lib/dashboard"
import { TemplateStatusBadge } from "@/components/dashboard/status-badges"
import { BulletList, EmptyState, InlineList, SurfaceCard } from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type TemplateView = "all" | "release-note" | "email" | "status-page" | "changelog"

type TemplateDetail = {
  readiness: number
  structure: string[]
  guardrails: string[]
  recentUsage: string[]
}

const templateDetails: Record<string, TemplateDetail> = {
  "template-1": {
    readiness: 94,
    structure: [
      "Start with the release change and the exact customer outcome.",
      "Follow with a short scope qualifier tied to current availability.",
      "Close with support guidance or next-step action only if it is already confirmed.",
    ],
    guardrails: [
      "Do not imply universal access if the rollout is staged.",
      "Keep evidence links available for reviewers before export.",
    ],
    recentUsage: [
      "Used in SDK rollout v2.4 publish pack.",
      "Used in audit log filters release note draft.",
    ],
  },
  "template-2": {
    readiness: 72,
    structure: [
      "Lead with the migration timeline and the customer segment affected.",
      "State billing or invoice implications without broad promises.",
      "Close with the support path and send-window context.",
    ],
    guardrails: [
      "Reconfirm plan-coverage wording before every reuse.",
      "Keep support escalation details aligned with the current brief.",
    ],
    recentUsage: [
      "Prepared for Billing migration notes.",
    ],
  },
  "template-3": {
    readiness: 61,
    structure: [
      "State the remediation outcome in plain operational language.",
      "Include the support workaround only if the support lead has approved the text.",
      "Close with a precise next-update expectation.",
    ],
    guardrails: [
      "Avoid blanket claims about every issue being resolved.",
      "Keep remediation wording scoped to the fixes already verified.",
    ],
    recentUsage: [
      "Referenced by Incident follow-up fixes.",
    ],
  },
  "template-4": {
    readiness: 88,
    structure: [
      "Keep the product change concise and concrete.",
      "Add who can use it now and any required customer action.",
      "Avoid marketing framing that cannot be traced to release evidence.",
    ],
    guardrails: [
      "Use concise scope qualifiers instead of hype language.",
      "Keep the final line action-oriented and supportable.",
    ],
    recentUsage: [
      "Used for Usage analytics export changelog card.",
    ],
  },
}

function matchesTemplateView(item: TemplateItem, view: TemplateView) {
  if (view === "release-note") {
    return item.channel === "Release note"
  }

  if (view === "email") {
    return item.channel === "Email"
  }

  if (view === "status-page") {
    return item.channel === "Status page"
  }

  if (view === "changelog") {
    return item.channel === "In-app changelog"
  }

  return true
}

export function TemplateLibraryWorkspace() {
  const [view, setView] = useState<TemplateView>("all")
  const [selectedId, setSelectedId] = useState(templateItems[0]?.id ?? "")

  const filteredItems = useMemo(() => {
    return templateItems.filter((item) => matchesTemplateView(item, view))
  }, [view])

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null
  const selectedDetail = selectedItem ? templateDetails[selectedItem.id] : null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
      <div className="grid gap-4">
        <SurfaceCard
          title="Template workspace"
          description="Filter channel-specific export templates and focus the preview on the structure that will actually be reused."
          action={<Badge variant="outline">{filteredItems.length} visible</Badge>}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Channel</span>
              <ToggleGroup
                multiple={false}
                value={[view]}
                onValueChange={(value) => {
                  const nextValue = (value[0] as TemplateView | undefined) ?? "all"
                  setView(nextValue)
                }}
                variant="outline"
                size="sm"
                spacing={1}
                className="flex-wrap"
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="release-note">Release note</ToggleGroupItem>
                <ToggleGroupItem value="email">Email</ToggleGroupItem>
                <ToggleGroupItem value="status-page">Status page</ToggleGroupItem>
                <ToggleGroupItem value="changelog">Changelog</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {selectedItem ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredItems.map((item) => {
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <span className="text-sm font-medium text-foreground">
                            {item.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.note}
                          </span>
                        </div>
                        <TemplateStatusBadge status={item.status} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.channel}</Badge>
                        <Badge variant="outline">{item.audience}</Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="No templates in this channel"
                description="Switch back to all templates or another channel to restore the library view."
              />
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4">
        {selectedItem && selectedDetail ? (
          <>
            <SurfaceCard
              title="Selected template"
              description="Preview the structure and reuse guardrails before the publish pack is assembled."
              action={<TemplateStatusBadge status={selectedItem.status} />}
              footer={
                <div className="flex w-full flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <BookTemplateIcon data-icon="inline-start" />
                    Duplicate template
                  </Button>
                  <Button variant="secondary" size="sm">
                    <ArrowUpRightIcon data-icon="inline-start" />
                    Use in publish pack
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">Reuse readiness</span>
                    <span className="text-muted-foreground">
                      {selectedDetail.readiness}%
                    </span>
                  </div>
                  <Progress value={selectedDetail.readiness} />
                </div>
                <InlineList
                  items={[
                    { label: "Channel", value: selectedItem.channel },
                    { label: "Audience", value: selectedItem.audience },
                    { label: "Owner", value: selectedItem.owner },
                    { label: "Updated", value: selectedItem.lastUpdated },
                  ]}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Template preview"
              description="Keep the export shape operational, evidence-backed, and easy to review."
            >
              <Tabs defaultValue="structure" className="gap-4">
                <TabsList variant="line" className="w-full justify-start">
                  <TabsTrigger value="structure">Structure</TabsTrigger>
                  <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
                  <TabsTrigger value="recent-use">Recent use</TabsTrigger>
                </TabsList>
                <TabsContent value="structure">
                  <BulletList items={selectedDetail.structure} />
                </TabsContent>
                <TabsContent value="guardrails">
                  <BulletList items={selectedDetail.guardrails} />
                </TabsContent>
                <TabsContent value="recent-use">
                  <BulletList items={selectedDetail.recentUsage} />
                </TabsContent>
              </Tabs>
            </SurfaceCard>
          </>
        ) : (
          <EmptyState
            title="Select a template"
            description="Choose a template from the library to inspect its structure, guardrails, and reuse state."
          />
        )}

        <SurfaceCard
          title="Export template rules"
          description="Templates should reduce review work without turning PulseNote into a generic writing tool."
        >
          <BulletList
            items={[
              "Keep every template channel-specific so public wording stays reviewable in context.",
              "Treat outdated templates as a workflow risk if they carry stale availability or plan language.",
              "Reuse structure, not broad marketing claims, when a publish pack is assembled.",
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  )
}
