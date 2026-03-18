import {
  FileOutputIcon,
  PackageCheckIcon,
  ShieldAlertIcon,
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
import { PublishStatusBadge } from "@/components/dashboard/status-badges"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { publishAssets } from "@/lib/dashboard"

export default function PublishPackPage() {
  const readyCount = publishAssets.filter((item) => item.status === "Ready").length

  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Export readiness"
          value="64%"
          detail="3 of 5 assets cleared"
          description="Readiness only advances when the copy, evidence, and approval note all line up."
          badge="Progress"
          icon={PackageCheckIcon}
        />
        <MetricCard
          title="Ready assets"
          value={String(readyCount)}
          detail="Can export now"
          description="These assets can move directly into the final publish pack without another edit cycle."
          icon={FileOutputIcon}
        />
        <MetricCard
          title="Needs intervention"
          value={String(
            publishAssets.filter((item) => item.status !== "Ready").length
          )}
          detail="Still in workflow"
          description="Assets remain visible until their approval and evidence gaps are fully resolved."
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Next publish window"
          value="17:00"
          detail="Billing migration email"
          description="The nearest customer-facing publish window stays visible so review can be sequenced correctly."
          icon={TimerResetIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <SurfaceCard
              title="Publish pack contents"
              description="Track channel-ready assets, owners, and the exact blockers preventing export."
            >
              <SimpleTable
                columns={[
                  { key: "asset", label: "Asset" },
                  { key: "channel", label: "Channel" },
                  { key: "status", label: "Status" },
                  { key: "owner", label: "Owner" },
                  { key: "updated", label: "Updated" },
                ]}
                rows={publishAssets.map((item) => ({
                  key: item.id,
                  cells: {
                    asset: (
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{item.asset}</span>
                        <span className="text-xs text-muted-foreground">{item.note}</span>
                      </div>
                    ),
                    channel: item.channel,
                    status: <PublishStatusBadge status={item.status} />,
                    owner: item.owner,
                    updated: item.lastUpdated,
                  },
                }))}
                emptyTitle="No assets in this publish pack"
                emptyDescription="Assets will appear as records clear approval and move into export."
              />
            </SurfaceCard>

            <SurfaceCard
              title="Export readiness"
              description="Use a single readiness signal to see whether the publish pack is actually shippable."
            >
              <div className="grid gap-4">
                <Progress value={64} />
                <BulletList
                  items={[
                    "Release note block is ready for export once the approval note is attached.",
                    "Help center excerpt still needs legal-safe availability wording.",
                    "Status update summary remains blocked until support verifies the workaround line.",
                  ]}
                />
              </div>
            </SurfaceCard>
          </>
        }
        aside={
          <>
            <Alert variant="destructive">
              <AlertTitle>1 asset is still blocked</AlertTitle>
              <AlertDescription>
                The status update summary should not export until support confirms the
                workaround wording that will appear publicly.
              </AlertDescription>
            </Alert>

            <SurfaceCard
              title="Package summary"
              description="A publish pack is ready only when the channel asset and its source trail stay connected."
            >
              <InlineList
                items={[
                  { label: "Release note", value: "Ready" },
                  { label: "Email", value: "Ready" },
                  { label: "Help center", value: "Needs legal note" },
                  { label: "Status page", value: "Blocked" },
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
