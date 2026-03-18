import {
  ArchiveIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TimerResetIcon,
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
import { reviewLogEntries } from "@/lib/dashboard"
import { Badge } from "@/components/ui/badge"

export default function ReviewLogPage() {
  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Decisions today"
          value={String(reviewLogEntries.length)}
          detail="Visible audit trail"
          description="Every review action remains visible so wording changes stay accountable."
          badge="Today"
          icon={ArchiveIcon}
        />
        <MetricCard
          title="Reopened items"
          value="1"
          detail="Needs another pass"
          description="Reopened records stay explicit instead of silently disappearing from the queue."
          icon={RotateCcwIcon}
        />
        <MetricCard
          title="Signed off"
          value="2"
          detail="Cleared for next step"
          description="Signed-off decisions keep their timestamp and reviewer context intact for later export."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Average resolution"
          value="26m"
          detail="From warning to update"
          description="Operational timing helps the team spot where review friction is accumulating."
          icon={TimerResetIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <SurfaceCard
            title="Chronological audit trail"
            description="Every change, approval decision, and blocked state is recorded in the same operational log."
          >
            <div className="grid gap-3">
              {reviewLogEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {entry.actor}
                    </span>
                    <Badge variant="outline">{entry.timestamp}</Badge>
                    <Badge
                      variant={entry.outcome === "Blocked" ? "destructive" : "secondary"}
                    >
                      {entry.outcome}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    {entry.action} on {entry.entity}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        }
        aside={
          <>
            <SurfaceCard
              title="Active filters"
              description="Saved filters keep the audit trail scannable without hiding important review events."
            >
              <InlineList
                items={[
                  { label: "Scope", value: "Today" },
                  { label: "Outcome", value: "All decision types" },
                  { label: "Linked releases", value: "Active workflow records" },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Why the log matters"
              description="PulseNote keeps decision history inspectable, especially when publish responsibility is shared."
            >
              <BulletList
                items={[
                  "Approvers can see exactly when wording changed and who changed it.",
                  "Blocked states remain visible until the release is safe to move forward.",
                  "Export packs can link back to this log when the final publish trail is reviewed.",
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
